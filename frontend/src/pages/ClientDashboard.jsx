// ═══════════════════════════════════════════════════════════
// CLIENT DASHBOARD — House Map + Device Control
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../hooks/useRealtime';
import HouseMapCanvas from '../components/HouseMapCanvas';
import toast from 'react-hot-toast';
import './ClientDashboard.css';

export default function ClientDashboard() {
  const { api } = useAuth();
  const [houses, setHouses] = useState([]);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [setupForm, setSetupForm] = useState({ name: '', address: '' });
  const [newRoom, setNewRoom] = useState({ name: '', type: 'bedroom' });
  const [newBoard, setNewBoard] = useState({ room_id: '', name: '', mac_address: '' });
  const [newDevice, setNewDevice] = useState({ board_id: '', room_id: '', name: '', type: 'light', pin_number: '' });

  useEffect(() => { fetchHouses(); }, []);

  // Real-time device updates
  useRealtime('devices', 'UPDATE', (payload) => {
    setHouses(prev => prev.map(house => ({
      ...house,
      rooms: house.rooms?.map(room => ({
        ...room,
        devices: room.devices?.map(d =>
          d.id === payload.new.id ? { ...d, ...payload.new } : d
        )
      }))
    })));
  });

  async function fetchHouses() {
    try {
      const data = await api('/houses');
      setHouses(data.houses || []);
      if (data.houses?.length > 0) {
        setSelectedHouse(data.houses[0]);
      } else {
        setShowSetup(true);
      }
    } catch (err) {
      toast.error('Failed to load houses');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateHouse(e) {
    e.preventDefault();
    try {
      const data = await api('/houses', {
        method: 'POST',
        body: JSON.stringify(setupForm),
      });
      toast.success('House created!');
      setSelectedHouse(data.house);
      setSetupStep(2);
      fetchHouses();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleAddRoom(e) {
    e.preventDefault();
    if (!selectedHouse) return;
    try {
      await api('/rooms', {
        method: 'POST',
        body: JSON.stringify({
          house_id: selectedHouse.id,
          ...newRoom,
          position_x: Math.random() * 300,
          position_y: Math.random() * 200,
        }),
      });
      toast.success('Room added!');
      setNewRoom({ name: '', type: 'bedroom' });
      fetchHouses();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleAddBoard(e) {
    e.preventDefault();
    try {
      await api('/esp32', {
        method: 'POST',
        body: JSON.stringify(newBoard),
      });
      toast.success('ESP32 board registered!');
      setNewBoard({ room_id: '', name: '', mac_address: '' });
      fetchHouses();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleAddDevice(e) {
    e.preventDefault();
    try {
      await api('/devices', {
        method: 'POST',
        body: JSON.stringify({ ...newDevice, pin_number: parseInt(newDevice.pin_number) }),
      });
      toast.success('Device added!');
      setNewDevice({ board_id: '', room_id: '', name: '', type: 'light', pin_number: '' });
      fetchHouses();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDeviceControl(deviceId, action, value) {
    try {
      const data = await api(`/devices/${deviceId}/control`, {
        method: 'POST',
        body: JSON.stringify({ action, value }),
      });
      toast.success(`${data.device.name} ${data.device.is_on ? 'ON' : 'OFF'}`);
      fetchHouses();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function handleRoomDrag(roomId, x, y) {
    setHouses(prev => prev.map(house => ({
      ...house,
      rooms: house.rooms?.map(room =>
        room.id === roomId ? { ...room, position_x: x, position_y: y } : room
      )
    })));
  }

  async function handleRoomDragEnd(roomId, x, y) {
    try {
      await api(`/rooms/${roomId}`, {
        method: 'PUT',
        body: JSON.stringify({ position_x: x, position_y: y }),
      });
    } catch (err) {
      console.error('Failed to save room position:', err);
    }
  }

  function handleRoomResize(roomId, w, h) {
    setHouses(prev => prev.map(house => ({
      ...house,
      rooms: house.rooms?.map(room =>
        room.id === roomId ? { ...room, width: w, height: h } : room
      )
    })));
  }

  async function handleRoomResizeEnd(roomId, w, h) {
    try {
      await api(`/rooms/${roomId}`, {
        method: 'PUT',
        body: JSON.stringify({ width: w, height: h }),
      });
    } catch (err) {
      console.error('Failed to save room size:', err);
    }
  }

  function handleDeviceDrag(deviceId, roomId, x, y) {
    setHouses(prev => prev.map(house => ({
      ...house,
      rooms: house.rooms?.map(room =>
        room.id === roomId ? {
          ...room,
          devices: room.devices?.map(d =>
            d.id === deviceId ? { ...d, position_x: x, position_y: y } : d
          )
        } : room
      )
    })));
  }

  async function handleDeviceDragEnd(deviceId, x, y) {
    try {
      await api(`/devices/${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ position_x: x, position_y: y }),
      });
    } catch (err) {
      console.error('Failed to save device position:', err);
      toast.error('Failed to save device position');
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-card" style={{ height: 500 }} />
      </div>
    );
  }

  // Setup wizard layout
  if (showSetup) {
    return (
      <div className="page-container animate-fade-in">
        <div className="flex-between" style={{ marginBottom: 20 }}>
          <div>
            <h1 className="page-title">🏠 Set Up Your Smart Home</h1>
            <p className="page-subtitle">Configure your house layout and register devices step-by-step</p>
          </div>
          {houses.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setShowSetup(false); fetchHouses(); }}>
              ✕ Close Setup
            </button>
          )}
        </div>

        <div className="setup-steps">
          {['House Info', 'Add Rooms', 'ESP32 Boards', 'Add Devices'].map((label, i) => (
            <div key={i} className={`setup-step ${setupStep > i + 1 ? 'done' : ''} ${setupStep === i + 1 ? 'active' : ''}`}>
              <div className="setup-step-number">{setupStep > i + 1 ? '✓' : i + 1}</div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {setupStep === 1 ? (
          <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
            <form onSubmit={handleCreateHouse}>
              <h3 className="section-title">Step 1: House Information</h3>
              <div className="form-group">
                <label className="form-label">House Name</label>
                <input className="form-input" placeholder="My Smart Home" value={setupForm.name} onChange={e => setSetupForm({...setupForm, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-input" placeholder="123 Smart Street" value={setupForm.address} onChange={e => setSetupForm({...setupForm, address: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary">Next →</button>
            </form>
          </div>
        ) : (
          <div className="setup-wizard-container">
            {/* Sidebar form column */}
            <div className="setup-wizard-sidebar card">
              {setupStep === 2 && (
                <div>
                  <h3 className="section-title">Step 2: Add Rooms</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Create room blocks below. Once added, you can click, drag, and resize them on the grid to match your floor plan.
                  </p>
                  <form onSubmit={handleAddRoom} className="form-group">
                    <div style={{ marginBottom: 12 }}>
                      <label className="form-label">Room Name</label>
                      <input className="form-input" placeholder="e.g. Master Bedroom" value={newRoom.name} onChange={e => setNewRoom({...newRoom, name: e.target.value})} required />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label className="form-label">Room Type</label>
                      <select className="form-select" value={newRoom.type} onChange={e => setNewRoom({...newRoom, type: e.target.value})}>
                        <option value="bedroom">Bedroom</option>
                        <option value="kitchen">Kitchen</option>
                        <option value="bathroom">Bathroom</option>
                        <option value="living_room">Living Room</option>
                        <option value="garage">Garage</option>
                        <option value="office">Office</option>
                        <option value="dining">Dining</option>
                        <option value="hallway">Hallway</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm w-full">+ Add Room</button>
                  </form>
                  {selectedHouse?.rooms?.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Rooms in House:</span>
                      <div className="room-list" style={{ marginTop: 8 }}>
                        {selectedHouse.rooms.map(r => (
                          <div key={r.id} className="room-chip" style={{ background: r.color, opacity: 0.85 }}>
                            {r.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex-between" style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSetupStep(1)}>← Back</button>
                    <button className="btn btn-primary btn-sm" onClick={() => setSetupStep(3)} disabled={!selectedHouse?.rooms?.length}>Next →</button>
                  </div>
                </div>
              )}

              {setupStep === 3 && (
                <div>
                  <h3 className="section-title">Step 3: Register ESP32 Boards</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Assign ESP32 microcontrollers to specific rooms. You will mount devices to these boards.
                  </p>
                  <form onSubmit={handleAddBoard}>
                    <div className="form-group">
                      <label className="form-label">Room Location</label>
                      <select className="form-select" value={newBoard.room_id} onChange={e => setNewBoard({...newBoard, room_id: e.target.value})} required>
                        <option value="">Select room...</option>
                        {selectedHouse?.rooms?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Board Name</label>
                      <input className="form-input" placeholder="e.g. ESP32 Controller" value={newBoard.name} onChange={e => setNewBoard({...newBoard, name: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">MAC Address</label>
                      <input className="form-input" placeholder="AA:BB:CC:DD:EE:FF" value={newBoard.mac_address} onChange={e => setNewBoard({...newBoard, mac_address: e.target.value.toUpperCase()})} required pattern="^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$" />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm w-full" style={{ marginBottom: 16 }}>+ Register Board</button>
                  </form>
                  <div className="flex-between" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSetupStep(2)}>← Back</button>
                    <button className="btn btn-primary btn-sm" onClick={() => setSetupStep(4)}>Next →</button>
                  </div>
                </div>
              )}

              {setupStep === 4 && (
                <div>
                  <h3 className="section-title">Step 4: Add Devices</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Click a room on the right map preview to target it, then fill out the device details below.
                  </p>
                  <form onSubmit={handleAddDevice}>
                    <div className="form-group">
                      <label className="form-label">Target Room</label>
                      <select className="form-select" value={newDevice.room_id} onChange={e => {
                        const nextVal = { ...newDevice, room_id: e.target.value };
                        // Clear board if selected room changes, ensuring valid boards are fetched
                        nextVal.board_id = '';
                        setNewDevice(nextVal);
                      }} required>
                        <option value="">Select room...</option>
                        {selectedHouse?.rooms?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Parent ESP32 Board</label>
                      <select className="form-select" value={newDevice.board_id} onChange={e => setNewDevice({...newDevice, board_id: e.target.value})} required>
                        <option value="">Select board...</option>
                        {selectedHouse?.rooms?.find(r => r.id === newDevice.room_id)?.esp32_boards?.map(b => (
                          <option key={b.id} value={b.id}>{b.name} ({b.mac_address})</option>
                        )) || selectedHouse?.rooms?.flatMap(r => r.esp32_boards || []).map(b => (
                          <option key={b.id} value={b.id}>{b.name} ({b.mac_address})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Device Name</label>
                      <input className="form-input" placeholder="e.g. Main Ceiling Light" value={newDevice.name} onChange={e => setNewDevice({...newDevice, name: e.target.value})} required />
                    </div>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Device Type</label>
                        <select className="form-select" value={newDevice.type} onChange={e => setNewDevice({...newDevice, type: e.target.value})}>
                          <option value="light">💡 Light</option>
                          <option value="fan">🌀 Fan</option>
                          <option value="temperature">🌡️ Temperature</option>
                          <option value="humidity">💧 Humidity</option>
                          <option value="gas">⚡ Gas Sensor</option>
                          <option value="fire">🔥 Fire Sensor</option>
                          <option value="motion">📡 Motion</option>
                          <option value="relay">🔌 Relay</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">GPIO Pin</label>
                        <input className="form-input" type="number" min="0" max="40" placeholder="GPIO Pin" value={newDevice.pin_number} onChange={e => setNewDevice({...newDevice, pin_number: e.target.value})} required />
                      </div>
                    </div>
                    {newDevice.position_x !== undefined && (
                      <div style={{ fontSize: 11, color: 'var(--primary)', marginBottom: 12, fontWeight: 500 }}>
                        📍 Spawn coordinates: Room local ({newDevice.position_x}px, {newDevice.position_y}px)
                      </div>
                    )}
                    <button type="submit" className="btn btn-primary btn-sm w-full" style={{ marginBottom: 16 }}>+ Add Device</button>
                  </form>
                  <div className="flex-between" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSetupStep(3)}>← Back</button>
                    <button className="btn btn-success btn-sm" onClick={() => { setShowSetup(false); fetchHouses(); }}>✓ Finish Setup</button>
                  </div>
                </div>
              )}
            </div>

            {/* Live Interactive Map Column */}
            <div className="setup-wizard-preview">
              <h4 style={{ marginBottom: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>House Floor Plan Live Preview</h4>
              <div className="wizard-canvas-wrapper" style={{ height: 600, border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <HouseMapCanvas
                  rooms={selectedHouse?.rooms || []}
                  editable={setupStep === 2 || setupStep === 4}
                  onRoomDrag={handleRoomDrag}
                  onRoomResize={handleRoomResize}
                  onRoomDragEnd={handleRoomDragEnd}
                  onRoomResizeEnd={handleRoomResizeEnd}
                  onDeviceDrag={handleDeviceDrag}
                  onDeviceDragEnd={handleDeviceDragEnd}
                  onRoomClick={(room, clickX, clickY) => {
                    if (setupStep === 4) {
                      setNewDevice(prev => ({
                        ...prev,
                        room_id: room.id,
                        position_x: clickX,
                        position_y: clickY,
                      }));
                      toast.success(`Click coordinates captured in "${room.name}"!`);
                    }
                  }}
                />
              </div>
              {setupStep === 2 && (
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
                  💡 Drag room blocks to lay them out. Resize them from the bottom-right corner of each room. They snap to grid!
                </p>
              )}
              {setupStep === 4 && (
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
                  💡 Click anywhere inside a room block to set the device target position, then submit the form. Drag the device icons to position them exactly.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const house = selectedHouse || houses[0];

  return (
    <div className="page-container">
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">🏠 {house?.name || 'My Home'}</h1>
          <p className="page-subtitle">{house?.address || 'Interactive house map — click devices to control them'}</p>
        </div>
        <div className="flex-gap">
          {houses.length > 1 && (
            <select className="form-select" style={{ width: 200 }} value={house?.id} onChange={e => setSelectedHouse(houses.find(h => h.id === e.target.value))}>
              {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => { setShowSetup(true); setSetupStep(2); }}>
            + Setup Wizard
          </button>
        </div>
      </div>

      {/* House Map */}
      <HouseMapCanvas
        rooms={house?.rooms || []}
        editable={true}
        onRoomDrag={handleRoomDrag}
        onRoomResize={handleRoomResize}
        onRoomDragEnd={handleRoomDragEnd}
        onRoomResizeEnd={handleRoomResizeEnd}
        onDeviceDrag={handleDeviceDrag}
        onDeviceDragEnd={handleDeviceDragEnd}
        onDeviceClick={(device) => setSelectedDevice(device)}
        onRoomClick={(room) => setSelectedRoom(room)}
      />

      {/* Device Control Modal */}
      {selectedDevice && (
        <div className="modal-overlay" onClick={() => setSelectedDevice(null)}>
          <div className="modal animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {selectedDevice.type === 'light' ? '💡' : selectedDevice.type === 'fan' ? '🌀' : '⚙️'}{' '}
                {selectedDevice.name}
              </h3>
              <button className="modal-close" onClick={() => setSelectedDevice(null)}>✕</button>
            </div>

            <div className="device-control-panel">
              {/* Toggle */}
              <div className="flex-between" style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Power</span>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={selectedDevice.is_on}
                    onChange={() => handleDeviceControl(selectedDevice.id, 'toggle')}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {/* Slider for fan/light */}
              {['fan', 'light'].includes(selectedDevice.type) && (
                <div style={{ marginBottom: 20 }}>
                  <div className="flex-between" style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                      {selectedDevice.type === 'fan' ? 'Speed' : 'Brightness'}
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>
                      {Math.round(selectedDevice.value || 0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedDevice.value || 0}
                    onChange={e => handleDeviceControl(selectedDevice.id, 'set_value', parseInt(e.target.value))}
                    className="device-slider"
                    style={{ width: '100%' }}
                  />
                </div>
              )}

              {/* Sensor values */}
              {['temperature', 'humidity', 'gas', 'fire', 'motion'].includes(selectedDevice.type) && (
                <div className="sensor-display">
                  <div className="sensor-big-value">
                    {selectedDevice.value || 0}
                    <span className="sensor-unit">{selectedDevice.unit || ''}</span>
                  </div>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Current reading</span>
                </div>
              )}

              {/* Device info */}
              <div style={{ marginTop: 20, padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  Type: {selectedDevice.type} · Pin: {selectedDevice.pin_number} · Status: {selectedDevice.is_on ? '🟢 ON' : '🔴 OFF'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
