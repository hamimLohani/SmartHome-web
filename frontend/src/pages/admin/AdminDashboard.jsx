// ═══════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { api } = useAuth();
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [s, c] = await Promise.all([api('/admin/stats'), api('/admin/clients')]);
      setStats(s.stats);
      setClients(c.clients || []);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  }

  if (loading) return (
    <div className="page-container">
      <div className="skeleton skeleton-title" />
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
      </div>
      <div className="skeleton" style={{ height: 400 }} />
    </div>
  );

  const statCards = [
    { label: 'Total Clients', value: stats?.totalClients ?? 0, icon: '👥', color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
    { label: 'Online Boards', value: `${stats?.onlineBoards ?? 0}/${stats?.totalBoards ?? 0}`, icon: '📟', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    { label: 'Pending Requests', value: stats?.pendingRequests ?? 0, icon: '📋', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Open Complaints', value: stats?.openComplaints ?? 0, icon: '📝', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  ];

  return (
    <div className="page-container">
      <h1 className="page-title">⚡ Admin Dashboard</h1>
      <p className="page-subtitle">System overview and client management</p>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Clients Table */}
      <div className="card">
        <div className="flex-between" style={{ marginBottom: 20 }}>
          <h2 className="section-title" style={{ margin: 0 }}>Registered Clients</h2>
          <Link to="/admin/clients" className="btn btn-secondary btn-sm">View All →</Link>
        </div>
        {clients.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No clients yet</div>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>House</th><th>Rooms</th><th>Boards</th><th>Last Active</th></tr>
              </thead>
              <tbody>
                {clients.slice(0, 8).map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex-gap" style={{ gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13 }}>
                          {c.name?.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 500 }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.email}</td>
                    <td>{c.houses?.[0]?.name || <span style={{ color: 'var(--text-tertiary)' }}>No house</span>}</td>
                    <td>{c.roomsCount || 0} rooms</td>
                    <td>
                      <span className={`badge ${c.onlineBoards > 0 ? 'badge-success' : 'badge-neutral'}`}>
                        {c.onlineBoards}/{c.totalBoards} online
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
                      {c.last_active ? new Date(c.last_active).toLocaleDateString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
