// ═══════════════════════════════════════════════════════════
// HOUSE MAP CANVAS — Interactive house visualization
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useCallback } from 'react';
import './HouseMapCanvas.css';

const ROOM_COLORS = {
  bedroom: '#bfdbfe',
  kitchen: '#fed7aa',
  bathroom: '#99f6e4',
  living_room: '#bbf7d0',
  garage: '#e5e7eb',
  office: '#c7d2fe',
  dining: '#fde68a',
  hallway: '#f3e8ff',
  other: '#e0f2fe',
};

const DEVICE_ICONS = {
  light: { icon: '💡', activeColor: '#fbbf24' },
  fan: { icon: '🌀', activeColor: '#38bdf8' },
  temperature: { icon: '🌡️', activeColor: '#ef4444' },
  humidity: { icon: '💧', activeColor: '#3b82f6' },
  gas: { icon: '⚡', activeColor: '#f97316' },
  fire: { icon: '🔥', activeColor: '#dc2626' },
  motion: { icon: '📡', activeColor: '#8b5cf6' },
  relay: { icon: '🔌', activeColor: '#22c55e' },
  other: { icon: '⚙️', activeColor: '#64748b' },
};

export default function HouseMapCanvas({
  rooms = [],
  onRoomClick,
  onDeviceClick,
  onRoomDrag,
  onRoomResize,
  onRoomDragEnd,
  onRoomResizeEnd,
  onDeviceDrag,
  onDeviceDragEnd,
  editable = false,
  readOnly = false,
}) {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [draggingDevice, setDraggingDevice] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [deviceOffset, setDeviceOffset] = useState({ x: 0, y: 0 });

  const snapToGrid = (val) => Math.round(val / 20) * 20;

  // Handle room interaction
  const handleMouseDown = useCallback((e, room, type = 'drag') => {
    if (readOnly || !editable) return;
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (type === 'resize') {
      setResizing(room.id);
      setOffset({ x: mouseX - (room.position_x + room.width), y: mouseY - (room.position_y + room.height) });
    } else {
      setDragging(room.id);
      setOffset({ x: mouseX - room.position_x, y: mouseY - room.position_y });
    }
  }, [readOnly, editable]);

  // Handle device dragging interaction
  const handleDeviceMouseDown = useCallback((e, device, room) => {
    if (readOnly || !editable) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Use current positions or defaults
    const devX = device.position_x || 10;
    const devY = device.position_y || 10;

    setDraggingDevice({
      id: device.id,
      roomId: room.id,
    });

    // Offset of cursor relative to device top-left (on canvas coordinates)
    const deviceCanvasX = room.position_x + devX;
    const deviceCanvasY = room.position_y + devY;

    setDeviceOffset({
      x: mouseX - deviceCanvasX,
      y: mouseY - deviceCanvasY,
    });
  }, [readOnly, editable]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging && !resizing && !draggingDevice) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (dragging) {
      const x = snapToGrid(Math.max(0, mouseX - offset.x));
      const y = snapToGrid(Math.max(0, mouseY - offset.y));
      onRoomDrag?.(dragging, x, y);
    }

    if (resizing) {
      const room = rooms.find((r) => r.id === resizing);
      if (room) {
        const w = snapToGrid(Math.max(100, mouseX - room.position_x - offset.x + room.width));
        const h = snapToGrid(Math.max(100, mouseY - room.position_y - offset.y + room.height));
        onRoomResize?.(resizing, w, h);
      }
    }

    if (draggingDevice) {
      const room = rooms.find((r) => r.id === draggingDevice.roomId);
      if (room) {
        const devCanvasX = mouseX - deviceOffset.x;
        const devCanvasY = mouseY - deviceOffset.y;

        // Position relative to the room top-left corner
        let relativeX = devCanvasX - room.position_x;
        let relativeY = devCanvasY - room.position_y;

        // Constraint boundaries (keep device inside room)
        const deviceWidth = 60;
        const deviceHeight = 44;
        relativeX = Math.max(5, Math.min(room.width - deviceWidth - 5, relativeX));
        relativeY = Math.max(25, Math.min(room.height - deviceHeight - 5, relativeY)); // Leave space at top for label

        // 5px step snapping
        relativeX = Math.round(relativeX / 5) * 5;
        relativeY = Math.round(relativeY / 5) * 5;

        onDeviceDrag?.(draggingDevice.id, room.id, relativeX, relativeY);
      }
    }
  }, [dragging, resizing, draggingDevice, offset, deviceOffset, rooms, onRoomDrag, onRoomResize, onDeviceDrag]);

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      const room = rooms.find((r) => r.id === dragging);
      if (room) onRoomDragEnd?.(dragging, room.position_x, room.position_y);
    }
    if (resizing) {
      const room = rooms.find((r) => r.id === resizing);
      if (room) onRoomResizeEnd?.(resizing, room.width, room.height);
    }
    if (draggingDevice) {
      const room = rooms.find((r) => r.id === draggingDevice.roomId);
      const device = room?.devices?.find((d) => d.id === draggingDevice.id);
      if (device) {
        onDeviceDragEnd?.(device.id, device.position_x || 10, device.position_y || 10);
      }
    }
    setDragging(null);
    setResizing(null);
    setDraggingDevice(null);
  }, [dragging, resizing, draggingDevice, rooms, onRoomDragEnd, onRoomResizeEnd, onDeviceDragEnd]);

  const handleRoomClick = useCallback((e, room) => {
    // Calculate click coordinates relative to the room
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.round((e.clientX - rect.left) / 5) * 5;
    const clickY = Math.round((e.clientY - rect.top) / 5) * 5;
    onRoomClick?.(room, clickX, clickY);
  }, [onRoomClick]);

  return (
    <div
      className="house-map-canvas"
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Grid background */}
      <div className="canvas-grid" />

      {rooms.length === 0 && (
        <div className="canvas-empty">
          <div className="empty-state-icon">🏠</div>
          <div className="empty-state-title">No rooms yet</div>
          <div className="empty-state-text">Add rooms to start building your house map</div>
        </div>
      )}

      {rooms.map((room) => (
        <div
          key={room.id}
          className={`map-room ${dragging === room.id ? 'dragging' : ''}`}
          style={{
            left: room.position_x,
            top: room.position_y,
            width: room.width,
            height: room.height,
            background: ROOM_COLORS[room.type] || room.color || '#e0f2fe',
            position: 'absolute',
          }}
          onMouseDown={(e) => {
            // Avoid room dragging when clicking interactive child elements
            if (e.target.closest('.map-device') || e.target.closest('.map-room-resize')) return;
            handleMouseDown(e, room);
          }}
          onClick={(e) => {
            // Only trigger click on the room body itself
            if (e.target.closest('.map-device') || e.target.closest('.map-room-resize')) return;
            handleRoomClick(e, room);
          }}
        >
          {/* Room label */}
          <div className="map-room-label">
            <span className="map-room-name">{room.name}</span>
            <span className="map-room-type">{room.type?.replace('_', ' ')}</span>
          </div>

          {/* ESP32 board indicator */}
          {room.esp32_boards?.map((board) => (
            <div key={board.id} className="map-board-indicator" title={`${board.name} (${board.mac_address})`}>
              <span className={`badge-dot ${board.is_online ? 'online' : 'offline'}`} />
              <span className="map-board-label">📟 {board.name}</span>
            </div>
          ))}

          {/* Device icons */}
          {room.devices?.map((device, idx) => {
            const info = DEVICE_ICONS[device.type] || DEVICE_ICONS.other;
            
            // Layout logic if coordinates are not set
            let x = device.position_x;
            let y = device.position_y;
            if (x === undefined || y === undefined || (x === 0 && y === 0)) {
              x = 10 + (idx * 50) % (room.width - 60);
              y = 35 + Math.floor(idx / 2) * 50;
            }

            return (
              <button
                key={device.id}
                className={`map-device absolute ${device.is_on ? 'active' : ''} ${device.type === 'fan' && device.is_on ? 'spinning' : ''}`}
                onMouseDown={(e) => handleDeviceMouseDown(e, device, room)}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeviceClick?.(device, room);
                }}
                title={`${device.name}: ${device.is_on ? 'ON' : 'OFF'}${device.value !== undefined && device.value !== null ? ` (${device.value}${device.unit || ''})` : ''}`}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  ...(device.is_on ? { '--active-color': info.activeColor } : {}),
                }}
              >
                <span className="map-device-icon">{info.icon}</span>
                <span className="map-device-name">{device.name}</span>
                {['temperature', 'humidity', 'gas'].includes(device.type) && (
                  <span className="map-device-value">{device.value}{device.unit}</span>
                )}
              </button>
            );
          })}

          {/* Resize handle */}
          {editable && (
            <div
              className="map-room-resize"
              onMouseDown={(e) => handleMouseDown(e, room, 'resize')}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export { ROOM_COLORS, DEVICE_ICONS };
