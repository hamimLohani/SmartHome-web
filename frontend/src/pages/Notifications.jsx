// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS PAGE — Full notification feed
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TYPE_CONFIG = {
  emergency: { icon: '🚨', class: 'notif-page-emergency' },
  danger:    { icon: '⚠️', class: 'notif-page-danger' },
  warning:   { icon: '⚡', class: 'notif-page-warning' },
  info:      { icon: 'ℹ️', class: 'notif-page-info' },
  success:   { icon: '✅', class: 'notif-page-success' },
};

export default function Notifications() {
  const { api } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchNotifs(); }, []);

  async function fetchNotifs() {
    try { const d = await api('/notifications'); setNotifications(d.notifications || []); }
    catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  }

  async function markRead(id) {
    try {
      await api(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* silent */ }
  }

  async function markAllRead() {
    try {
      await api('/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All marked as read');
    } catch { /* silent */ }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;

  function formatTime(d) {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(d).toLocaleDateString();
  }

  if (loading) return (
    <div className="page-container">
      <div className="skeleton skeleton-title" />
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, marginBottom: 10 }} />)}
    </div>
  );

  return (
    <div className="page-container">
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">🔔 Notifications</h1>
          <p className="page-subtitle">{unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-secondary" onClick={markAllRead}>✓ Mark all read</button>
        )}
      </div>

      <div className="flex-gap" style={{ marginBottom: 20 }}>
        {['all', 'unread'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>
            {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <div className="empty-state-title">{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(n => {
            const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
            return (
              <div
                key={n.id}
                className={`card ${!n.is_read ? 'notif-unread' : ''}`}
                style={{
                  padding: '14px 20px',
                  borderLeft: `4px solid ${n.type === 'emergency' ? 'var(--emergency)' : n.type === 'danger' ? 'var(--danger)' : n.type === 'warning' ? 'var(--warning)' : 'var(--primary)'}`,
                  cursor: !n.is_read ? 'pointer' : 'default',
                  background: !n.is_read ? 'rgba(14,165,233,0.03)' : 'var(--bg-card)',
                }}
                onClick={() => !n.is_read && markRead(n.id)}
              >
                <div className="flex-between">
                  <div className="flex-gap">
                    <span style={{ fontSize: 20 }}>{config.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{n.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{n.message}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{formatTime(n.created_at)}</span>
                    {!n.is_read && <span className="badge badge-primary" style={{ fontSize: 10 }}>New</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
