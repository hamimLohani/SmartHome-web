// ═══════════════════════════════════════════════════════════
// DEVICE CONTROL PAGE — Full device management per house
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../hooks/useRealtime';
import toast from 'react-hot-toast';
import './DeviceControl.css';

const DEVICE_ICONS = { light: '💡', fan: '🌀', temperature: '🌡️', humidity: '💧', gas: '⚡', fire: '🔥', motion: '📡', relay: '🔌', other: '⚙️' };
const SENSOR_TYPES = ['temperature', 'humidity', 'gas', 'fire', 'motion'];

export default function DeviceControl() {
  const { api } = useAuth();
  const [houses, setHouses] = useState([]);
  const [house, setHouse] = useState(null);
  const [filterRoom, setFilterRoom] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logDevice, setLogDevice] = useState(null);

  useEffect(() => { fetchHouses(); }, []);

  useRealtime('devices', 'UPDATE', (payload) => {
    setHouses(prev => prev.map(h => ({
      ...h,
      rooms: h.rooms?.map(r => ({
        ...r,
        devices: r.devices?.map(d => d.id === payload.new.id ? { ...d, ...payload.new } : d)
      }))
    })));
  });

  async function fetchHouses() {
    try {
      const d = await api('/houses');
      setHouses(d.houses || []);
      if (d.houses?.[0]) setHouse(d.houses[0]);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  async function control(deviceId, action, value) {
    try {
      const d = await api(`/devices/${deviceId}/control`, {
        method: 'POST',
        body: JSON.stringify({ action, value }),
      });
      toast.success(`${action === 'toggle' ? (d.device.is_on ? 'Turned ON' : 'Turned OFF') : 'Value set'}`);
      fetchHouses();
    } catch (err) { toast.error(err.message); }
  }

  async function fetchLogs(device) {
    setLogDevice(device);
    try {
      const d = await api(`/devices/${device.id}/logs`);
      setLogs(d.logs || []);
      setShowLogs(true);
    } catch { toast.error('Failed to load logs'); }
  }

  const allDevices = house?.rooms?.flatMap(r =>
    (r.devices || []).map(d => ({ ...d, roomName: r.name }))
  ) || [];

  const filtered = allDevices.filter(d => {
    if (filterRoom !== 'all' && d.room_id !== filterRoom) return false;
    if (filterType !== 'all' && d.type !== filterType) return false;
    return true;
  });

  const isSensor = (type) => SENSOR_TYPES.includes(type);

  if (loading) return (
    <div className="page-container">
      <div className="skeleton skeleton-title" />
      <div className="grid-auto">{[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 160 }} />)}</div>
    </div>
  );

  return (
    <div className="page-container">
      <h1 className="page-title">⚙️ Device Control</h1>
      <p className="page-subtitle">Control all your smart devices from one place</p>

      {/* Filters */}
      <div className="flex-between" style={{ marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div className="flex-gap" style={{ flexWrap: 'wrap' }}>
          <select className="form-select" style={{ width: 180 }} value={filterRoom} onChange={e => setFilterRoom(e.target.value)}>
            <option value="all">All Rooms</option>
            {house?.rooms?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select className="form-select" style={{ width: 160 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            {Object.keys(DEVICE_ICONS).map(t => <option key={t} value={t}>{DEVICE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          {filtered.length} device{filtered.length !== 1 ? 's' : ''}
          {' · '}
          {filtered.filter(d => d.is_on).length} on
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex-gap" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => {
          filtered.filter(d => !isSensor(d.type)).forEach(d => control(d.id, 'turn_on'));
        }}>💡 All ON</button>
        <button className="btn btn-secondary btn-sm" onClick={() => {
          filtered.filter(d => !isSensor(d.type)).forEach(d => control(d.id, 'turn_off'));
        }}>🔴 All OFF</button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚙️</div>
          <div className="empty-state-title">No devices found</div>
          <div className="empty-state-text">Add devices in the House Map section</div>
        </div>
      ) : (
        <div className="grid-auto">
          {filtered.map(device => (
            <div key={device.id} className={`device-card ${device.is_on ? 'on' : ''} ${device.type === 'fire' && device.value > 0 ? 'alert' : ''}`}>
              <div className="device-card-header">
                <span className="device-card-icon" style={{ animation: device.type === 'fan' && device.is_on ? 'spin-fan 1s linear infinite' : 'none' }}>
                  {DEVICE_ICONS[device.type] || '⚙️'}
                </span>
                <div style={{ flex: 1 }}>
                  <div className="device-card-name">{device.name}</div>
                  <div className="device-card-room">{device.roomName}</div>
                </div>
                {!isSensor(device.type) && (
                  <label className="toggle">
                    <input type="checkbox" checked={device.is_on} onChange={() => control(device.id, 'toggle')} />
                    <span className="toggle-slider" />
                  </label>
                )}
              </div>

              {/* Sensor value display */}
              {isSensor(device.type) && (
                <div className="device-card-sensor">
                  <span className="device-card-sensor-value">
                    {device.type === 'fire' ? (device.value > 0 ? '🔥 DETECTED' : '✅ Safe')
                     : device.type === 'motion' ? (device.is_on ? '👤 Detected' : '— Clear')
                     : `${device.value ?? '—'}${device.unit || ''}`}
                  </span>
                </div>
              )}

              {/* Brightness/Speed slider */}
              {['light', 'fan'].includes(device.type) && device.is_on && (
                <div style={{ marginTop: 12 }}>
                  <div className="flex-between" style={{ marginBottom: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span>{device.type === 'fan' ? 'Speed' : 'Brightness'}</span>
                    <span style={{ fontWeight: 700 }}>{Math.round(device.value ?? 0)}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100"
                    value={device.value ?? 0}
                    onChange={e => control(device.id, 'set_value', parseInt(e.target.value))}
                    className="device-slider"
                    style={{ width: '100%' }}
                  />
                </div>
              )}

              <div className="device-card-footer">
                <span className={`badge ${device.is_on ? 'badge-success' : 'badge-neutral'}`}>
                  {device.is_on ? 'ON' : 'OFF'}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => fetchLogs(device)}>📋 Logs</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Logs Modal */}
      {showLogs && (
        <div className="modal-overlay" onClick={() => setShowLogs(false)}>
          <div className="modal animate-slide-up" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📋 {logDevice?.name} Logs</h3>
              <button className="modal-close" onClick={() => setShowLogs(false)}>✕</button>
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {logs.length === 0 ? (
                <div className="empty-state" style={{ padding: 40 }}><div className="empty-state-title">No logs yet</div></div>
              ) : (
                <table className="table" style={{ fontSize: 12 }}>
                  <thead><tr><th>Time</th><th>Action</th><th>Old</th><th>New</th><th>By</th></tr></thead>
                  <tbody>
                    {logs.map((l, i) => (
                      <tr key={i}>
                        <td style={{ whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleTimeString()}</td>
                        <td>{l.action}</td>
                        <td style={{ color: 'var(--text-tertiary)' }}>{l.old_value ?? '—'}</td>
                        <td style={{ color: 'var(--success)' }}>{l.new_value ?? '—'}</td>
                        <td style={{ color: 'var(--text-tertiary)' }}>{l.triggered_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
