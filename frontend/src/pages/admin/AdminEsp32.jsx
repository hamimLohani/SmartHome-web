// ═══════════════════════════════════════════════════════════
// ADMIN ESP32 MONITORING — All boards across all clients
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function AdminEsp32() {
  const { api } = useAuth();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBoards(); const iv = setInterval(fetchBoards, 30000); return () => clearInterval(iv); }, []);

  async function fetchBoards() {
    try { const d = await api('/admin/esp32'); setBoards(d.boards || []); }
    catch { toast.error('Failed to load boards'); }
    finally { setLoading(false); }
  }

  async function reboot(boardId, name) {
    if (!confirm(`Reboot "${name}"?`)) return;
    try {
      await api(`/esp32/${boardId}/reboot`, { method: 'POST' });
      toast.success(`Reboot command sent to ${name}`);
    } catch (err) { toast.error(err.message); }
  }

  function signalBar(rssi) {
    if (!rssi) return { bars: 0, color: 'var(--text-tertiary)' };
    if (rssi > -50) return { bars: 4, color: 'var(--success)' };
    if (rssi > -65) return { bars: 3, color: 'var(--success)' };
    if (rssi > -75) return { bars: 2, color: 'var(--warning)' };
    return { bars: 1, color: 'var(--danger)' };
  }

  const online = boards.filter(b => b.is_online).length;

  if (loading) return <div className="page-container"><div className="skeleton skeleton-title" /><div className="skeleton" style={{height:400}} /></div>;

  return (
    <div className="page-container">
      <h1 className="page-title">📟 ESP32 Monitoring</h1>
      <p className="page-subtitle">Real-time status of all registered ESP32 boards</p>

      <div className="grid-4" style={{ marginBottom: 28 }}>
        {[
          { label: 'Total Boards', value: boards.length, icon: '📟', color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
          { label: 'Online', value: online, icon: '🟢', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
          { label: 'Offline', value: boards.length - online, icon: '🔴', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
          { label: 'Online Rate', value: boards.length ? `${Math.round(online/boards.length*100)}%` : '—', icon: '📊', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        ].map((s,i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div><div className="stat-value" style={{ color: s.color }}>{s.value}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Board</th><th>Owner / Room</th><th>MAC Address</th><th>IP Address</th><th>Firmware</th><th>Signal</th><th>Last Seen</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {boards.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 40 }}>No ESP32 boards registered</td></tr>
            ) : (
              boards.map(b => {
                const sig = signalBar(b.signal_strength);
                return (
                  <tr key={b.id}>
                    <td><div style={{ fontWeight: 600 }}>{b.name}</div></td>
                    <td>
                      <div style={{ fontSize: 13 }}>{b.rooms?.houses?.users?.name || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{b.rooms?.name}</div>
                    </td>
                    <td><code style={{ fontSize: 12, background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>{b.mac_address}</code></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{b.ip_address || '—'}</td>
                    <td><span className="badge badge-neutral">v{b.firmware_version}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18 }}>
                        {[1,2,3,4].map(n => (
                          <div key={n} style={{ width: 4, height: n*4+2, background: n <= sig.bars ? sig.color : 'var(--border)', borderRadius: 1, transition: 'background 0.3s' }} />
                        ))}
                        {b.signal_strength && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 4 }}>{b.signal_strength}dBm</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {b.last_seen ? new Date(b.last_seen).toLocaleString() : 'Never'}
                    </td>
                    <td>
                      <span className={`badge ${b.is_online ? 'badge-success' : 'badge-neutral'}`}>
                        <span className={`badge-dot ${b.is_online ? 'online' : 'offline'}`} />
                        {b.is_online ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => reboot(b.id, b.name)}>🔄 Reboot</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
