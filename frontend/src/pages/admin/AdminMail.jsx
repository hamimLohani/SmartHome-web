// ═══════════════════════════════════════════════════════════
// ADMIN MAIL — Compose and broadcast emails
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const TEMPLATES = [
  { label: 'Welcome', subject: 'Welcome to Smart Home!', content: '<h2>Welcome aboard!</h2><p>Thank you for joining our Smart Home platform. Your account is ready to use.</p>' },
  { label: 'Maintenance', subject: 'Scheduled Maintenance Notice', content: '<h2>Maintenance Scheduled</h2><p>We will be performing scheduled maintenance. Services may be briefly unavailable.</p>' },
  { label: 'Update', subject: 'System Update Available', content: '<h2>New Update Available</h2><p>A new firmware update is available for your ESP32 boards. Please update at your earliest convenience.</p>' },
];

export default function AdminMail() {
  const { api } = useAuth();
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ to: '', subject: '', content: '', broadcast: false });
  const [sending, setSending] = useState(false);

  useEffect(() => { fetchClients(); }, []);

  async function fetchClients() {
    try { const d = await api('/admin/clients'); setClients(d.clients || []); }
    catch { /* silent */ }
  }

  function applyTemplate(t) {
    setForm(prev => ({ ...prev, subject: t.subject, content: t.content }));
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!form.subject || !form.content) return toast.error('Subject and content required');
    if (!form.broadcast && !form.to) return toast.error('Select a recipient or enable broadcast');

    setSending(true);
    try {
      const d = await api('/admin/email', { method: 'POST', body: JSON.stringify(form) });
      toast.success(d.message || 'Email sent!');
      setForm({ to: '', subject: '', content: '', broadcast: false });
    } catch (err) { toast.error(err.message); }
    finally { setSending(false); }
  }

  return (
    <div className="page-container">
      <h1 className="page-title">📧 Mail Center</h1>
      <p className="page-subtitle">Send emails to individual clients or broadcast to all</p>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h3 className="section-title">Compose Email</h3>
          <form onSubmit={handleSend}>
            <div className="form-group">
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <label className="form-label" style={{ margin: 0 }}>Recipient</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.broadcast} onChange={e => setForm({...form, broadcast: e.target.checked, to: ''})} />
                  Broadcast to all
                </label>
              </div>
              {!form.broadcast && (
                <select className="form-select" value={form.to} onChange={e => setForm({...form, to: e.target.value})} required={!form.broadcast}>
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.email}>{c.name} ({c.email})</option>)}
                </select>
              )}
              {form.broadcast && (
                <div style={{ padding: '10px 14px', background: 'var(--warning-bg)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--accent-dark)' }}>
                  📢 This will be sent to all {clients.length} verified clients
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input className="form-input" placeholder="Email subject..." value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Content (HTML supported)</label>
              <textarea className="form-input" placeholder="Email content..." value={form.content} onChange={e => setForm({...form, content: e.target.value})} required rows={8} style={{ fontFamily: 'monospace', fontSize: 13 }} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={sending}>
              {sending ? '⏳ Sending...' : '📤 Send Email'}
            </button>
          </form>
        </div>

        <div>
          <div className="card">
            <h3 className="section-title">Email Templates</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TEMPLATES.map((t, i) => (
                <button key={i} className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => applyTemplate(t)}>
                  <span>📄</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{t.subject}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3 className="section-title">Preview</h3>
            {form.content ? (
              <div
                style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: 14, lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: form.content }}
              />
            ) : (
              <div style={{ color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center', padding: 20 }}>
                Email preview will appear here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
