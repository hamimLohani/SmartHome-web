// ═══════════════════════════════════════════════════════════
// REQUESTS PAGE — Client requests to admin
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const REQUEST_TYPES = [
  { value: 'add_room', label: '🏠 Add Room' },
  { value: 'remove_room', label: '🗑️ Remove Room' },
  { value: 'add_device', label: '➕ Add Device' },
  { value: 'remove_device', label: '➖ Remove Device' },
  { value: 'change_board', label: '🔄 Change ESP32 Board' },
  { value: 'other', label: '📝 Other' },
];

const STATUS_BADGES = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
};

export default function Requests() {
  const { api } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'add_room', description: '' });
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchRequests(); }, []);

  async function fetchRequests() {
    try {
      const data = await api('/requests');
      setRequests(data.requests || []);
    } catch { toast.error('Failed to load requests'); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api('/requests', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Request submitted!');
      setShowForm(false);
      setForm({ type: 'add_room', description: '' });
      fetchRequests();
    } catch (err) { toast.error(err.message); }
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  if (loading) return <div className="page-container"><div className="skeleton skeleton-title" /><div className="skeleton skeleton-card" style={{height:300}} /></div>;

  return (
    <div className="page-container">
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">📋 My Requests</h1>
          <p className="page-subtitle">Submit requests to your admin for house modifications</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ New Request'}
        </button>
      </div>

      {showForm && (
        <div className="card animate-slide-up" style={{ marginBottom: 24 }}>
          <h3 className="section-title">New Request</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Request Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                {REQUEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" placeholder="Describe what you need..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} required rows={4} />
            </div>
            <button type="submit" className="btn btn-primary">Submit Request</button>
          </form>
        </div>
      )}

      <div className="flex-gap" style={{ marginBottom: 20 }}>
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)} {s !== 'all' && `(${requests.filter(r => r.status === s).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No requests yet</div>
          <div className="empty-state-text">Submit a request to get started</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Type</th><th>Description</th><th>Status</th><th>Admin Note</th><th>Date</th></tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td><span className="badge badge-neutral">{REQUEST_TYPES.find(t => t.value === r.type)?.label || r.type}</span></td>
                  <td style={{ maxWidth: 300 }}>{r.description}</td>
                  <td><span className={`badge ${STATUS_BADGES[r.status]}`}>{r.status}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{r.admin_note || '—'}</td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: 13, whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
