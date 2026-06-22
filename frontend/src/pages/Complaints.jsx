// ═══════════════════════════════════════════════════════════
// COMPLAINTS PAGE — Ticket system for clients
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const PRIORITY_BADGES = { low: 'badge-neutral', normal: 'badge-primary', high: 'badge-warning', urgent: 'badge-danger' };
const STATUS_BADGES = { open: 'badge-warning', in_progress: 'badge-primary', resolved: 'badge-success' };

export default function Complaints() {
  const { api } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', message: '', priority: 'normal' });
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { fetchComplaints(); }, []);

  async function fetchComplaints() {
    try { const d = await api('/complaints'); setComplaints(d.complaints || []); }
    catch { toast.error('Failed to load complaints'); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api('/complaints', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Complaint submitted!');
      setShowForm(false);
      setForm({ subject: '', message: '', priority: 'normal' });
      fetchComplaints();
    } catch (err) { toast.error(err.message); }
  }

  if (loading) return <div className="page-container"><div className="skeleton skeleton-title" /><div className="skeleton skeleton-card" style={{height:300}} /></div>;

  return (
    <div className="page-container">
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">📝 Complaints</h1>
          <p className="page-subtitle">Submit and track your complaints</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ New Complaint'}
        </button>
      </div>

      {showForm && (
        <div className="card animate-slide-up" style={{ marginBottom: 24 }}>
          <h3 className="section-title">New Complaint</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input className="form-input" placeholder="Brief subject..." value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                  <option value="low">Low</option><option value="normal">Normal</option>
                  <option value="high">High</option><option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea className="form-input" placeholder="Describe your issue in detail..." value={form.message} onChange={e => setForm({...form, message: e.target.value})} required rows={4} />
            </div>
            <button type="submit" className="btn btn-primary">Submit Complaint</button>
          </form>
        </div>
      )}

      {complaints.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📝</div><div className="empty-state-title">No complaints</div><div className="empty-state-text">Everything running smoothly!</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {complaints.map(c => (
            <div key={c.id} className="card" style={{ cursor: 'pointer', padding: '16px 20px' }} onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
              <div className="flex-between">
                <div className="flex-gap">
                  <span className={`badge ${PRIORITY_BADGES[c.priority]}`}>{c.priority}</span>
                  <strong style={{ fontSize: 15 }}>{c.subject}</strong>
                </div>
                <div className="flex-gap">
                  <span className={`badge ${STATUS_BADGES[c.status]}`}>{c.status.replace('_', ' ')}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              {expanded === c.id && (
                <div className="animate-slide-up" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12 }}>{c.message}</p>
                  {c.admin_reply && (
                    <div style={{ background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary)' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Admin Reply:</div>
                      <p style={{ color: 'var(--text-primary)', margin: 0 }}>{c.admin_reply}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
