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
  editable = false,
  readOnly = false,
}) {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const snapToGrid = (val) => Math.round(val / 20) * 20;

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

  const handleMouseMove = useCallback((e) => {
    if (!dragging && !resizing) return;
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
        const w = snapToGrid(Math.max(80, mouseX - room.position_x - offset.x + room.width));
        const h = snapToGrid(Math.max(80, mouseY - room.position_y - offset.y + room.height));
        onRoomResize?.(resizing, w, h);
      }
    }
  }, [dragging, resizing, offset, rooms, onRoomDrag, onRoomResize]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
  }, []);

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
          }}
          onMouseDown={(e) => handleMouseDown(e, room)}
          onClick={() => onRoomClick?.(room)}
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
          <div className="map-devices">
            {room.devices?.map((device) => {
              const info = DEVICE_ICONS[device.type] || DEVICE_ICONS.other;
              return (
                <button
                  key={device.id}
                  className={`map-device ${device.is_on ? 'active' : ''} ${device.type === 'fan' && device.is_on ? 'spinning' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeviceClick?.(device, room);
                  }}
                  title={`${device.name}: ${device.is_on ? 'ON' : 'OFF'}${device.value ? ` (${device.value}${device.unit || ''})` : ''}`}
                  style={device.is_on ? { '--active-color': info.activeColor } : {}}
                >
                  <span className="map-device-icon">{info.icon}</span>
                  <span className="map-device-name">{device.name}</span>
                  {['temperature', 'humidity', 'gas'].includes(device.type) && (
                    <span className="map-device-value">{device.value}{device.unit}</span>
                  )}
                </button>
              );
            })}
          </div>

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
