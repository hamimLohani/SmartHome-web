// ═══════════════════════════════════════════════════════════
// ADMIN COMPLAINTS — Ticket management
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const P_BADGES = { low:'badge-neutral', normal:'badge-primary', high:'badge-warning', urgent:'badge-danger' };
const S_BADGES = { open:'badge-warning', in_progress:'badge-primary', resolved:'badge-success' };

export default function AdminComplaints() {
  const { api } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => { fetchComplaints(); }, [filter]);

  async function fetchComplaints() {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const d = await api(`/complaints${params}`);
      setComplaints(d.complaints || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  async function handleUpdate() {
    try {
      const payload = {};
      if (reply) payload.admin_reply = reply;
      if (newStatus) payload.status = newStatus;
      await api(`/complaints/${selected.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      toast.success('Complaint updated!');
      setSelected(null); setReply(''); setNewStatus('');
      fetchComplaints();
    } catch (err) { toast.error(err.message); }
  }

  if (loading) return <div className="page-container"><div className="skeleton skeleton-title" /><div className="skeleton" style={{height:400}} /></div>;

  return (
    <div className="page-container">
      <h1 className="page-title">📝 Complaints</h1>
      <p className="page-subtitle">Manage client complaints and support tickets</p>

      <div className="flex-gap" style={{ marginBottom: 20 }}>
        {['all','open','in_progress','resolved'].map(s => (
          <button key={s} className={`btn btn-sm ${filter===s?'btn-primary':'btn-secondary'}`} onClick={() => setFilter(s)}>
            {s.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}
          </button>
        ))}
      </div>

      {complaints.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📝</div><div className="empty-state-title">No complaints</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {complaints.map(c => (
            <div key={c.id} className="card" style={{ padding: '16px 20px' }}>
              <div className="flex-between">
                <div className="flex-gap">
                  <span className={`badge ${P_BADGES[c.priority]}`}>{c.priority}</span>
                  <span className={`badge ${S_BADGES[c.status]}`}>{c.status.replace('_',' ')}</span>
                  <strong>{c.subject}</strong>
                </div>
                <div className="flex-gap">
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{c.users?.name} · {new Date(c.created_at).toLocaleDateString()}</span>
                  <button className="btn btn-primary btn-sm" onClick={() => { setSelected(c); setNewStatus(c.status); }}>Reply</button>
                </div>
              </div>
              <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>{c.message}</p>
              {c.admin_reply && (
                <div style={{ marginTop: 10, background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Your Reply:</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{c.admin_reply}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Reply to Complaint</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={{ marginBottom: 16, background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>{selected.users?.name} writes:</div>
              <strong>{selected.subject}</strong>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{selected.message}</p>
            </div>
            <div className="form-group">
              <label className="form-label">Update Status</label>
              <select className="form-select" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Your Reply</label>
              <textarea className="form-input" placeholder="Type your reply..." value={reply} onChange={e => setReply(e.target.value)} rows={4} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdate}>Send Reply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
