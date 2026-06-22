// ═══════════════════════════════════════════════════════════
// ADMIN REQUESTS — Approve / Reject client requests
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const TYPE_LABELS = { add_room:'Add Room', remove_room:'Remove Room', add_device:'Add Device', remove_device:'Remove Device', change_board:'Change Board', other:'Other' };
const STATUS_BADGES = { pending:'badge-warning', approved:'badge-success', rejected:'badge-danger' };

export default function AdminRequests() {
  const { api } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionModal, setActionModal] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => { fetchRequests(); }, [filter]);

  async function fetchRequests() {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const d = await api(`/requests${params}`);
      setRequests(d.requests || []);
    } catch { toast.error('Failed to load requests'); }
    finally { setLoading(false); }
  }

  async function handleAction(status) {
    try {
      await api(`/requests/${actionModal.id}/status`, { method: 'PUT', body: JSON.stringify({ status, admin_note: note }) });
      toast.success(`Request ${status}!`);
      setActionModal(null);
      setNote('');
      fetchRequests();
    } catch (err) { toast.error(err.message); }
  }

  if (loading) return <div className="page-container"><div className="skeleton skeleton-title" /><div className="skeleton" style={{height:400}} /></div>;

  return (
    <div className="page-container">
      <h1 className="page-title">📋 Requests Management</h1>
      <p className="page-subtitle">Review and respond to client requests</p>

      <div className="flex-gap" style={{ marginBottom: 20 }}>
        {['all','pending','approved','rejected'].map(s => (
          <button key={s} className={`btn btn-sm ${filter===s?'btn-primary':'btn-secondary'}`} onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">No requests found</div></div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Client</th><th>Type</th><th>Description</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.users?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{r.users?.email}</div>
                  </td>
                  <td><span className="badge badge-neutral">{TYPE_LABELS[r.type] || r.type}</span></td>
                  <td style={{ maxWidth: 250, color: 'var(--text-secondary)', fontSize: 13 }}>{r.description}</td>
                  <td><span className={`badge ${STATUS_BADGES[r.status]}`}>{r.status}</span></td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>
                    {r.status === 'pending' && (
                      <button className="btn btn-primary btn-sm" onClick={() => setActionModal(r)}>Review</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {actionModal && (
        <div className="modal-overlay" onClick={() => setActionModal(null)}>
          <div className="modal animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Review Request</h3>
              <button className="modal-close" onClick={() => setActionModal(null)}>✕</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 8 }}><strong>Client:</strong> {actionModal.users?.name}</div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 8 }}><strong>Type:</strong> {TYPE_LABELS[actionModal.type]}</div>
              <div style={{ background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: 14 }}>{actionModal.description}</div>
            </div>
            <div className="form-group">
              <label className="form-label">Admin Note (optional)</label>
              <textarea className="form-input" placeholder="Add a note for the client..." value={note} onChange={e => setNote(e.target.value)} rows={3} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleAction('rejected')}>✕ Reject</button>
              <button className="btn btn-success" onClick={() => handleAction('approved')}>✓ Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
