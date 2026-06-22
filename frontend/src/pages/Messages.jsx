// ═══════════════════════════════════════════════════════════
// CLIENT MESSAGES — Chat with admin
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../hooks/useRealtime';
import toast from 'react-hot-toast';
import './Messages.css';

export default function Messages() {
  const { user, api } = useAuth();
  const [messages, setMessages] = useState([]);
  const [adminId, setAdminId] = useState(null);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  useEffect(() => { fetchMessages(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useRealtime('messages', 'INSERT', (payload) => {
    setMessages(prev => {
      const exists = prev.find(m => m.id === payload.new.id);
      if (exists) return prev;
      return [...prev, payload.new];
    });
  });

  async function fetchMessages() {
    try {
      // Get admin ID first
      const adminData = await api('/messages/admin');
      const aid = adminData.adminId;
      setAdminId(aid);
      if (aid) {
        const d = await api(`/messages/${aid}`);
        setMessages(d.messages || []);
      }
    } catch { toast.error('Failed to load messages'); }
    finally { setLoading(false); }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!newMsg.trim() || !adminId) return;
    try {
      const d = await api('/messages', { method: 'POST', body: JSON.stringify({ receiver_id: adminId, content: newMsg }) });
      setMessages(prev => [...prev, d.message]);
      setNewMsg('');
    } catch (err) { toast.error(err.message); }
  }

  if (loading) return <div className="page-container"><div className="skeleton skeleton-title" /><div className="skeleton" style={{height:400}} /></div>;

  return (
    <div className="page-container">
      <h1 className="page-title">💬 Messages</h1>
      <p className="page-subtitle">Chat directly with your system administrator</p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18, fontWeight: 700 }}>A</div>
          <div>
            <div style={{ fontWeight: 600 }}>System Admin</div>
            <div style={{ fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="badge-dot online" style={{ width: 6, height: 6 }} />
              Available
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ height: 500, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg-secondary)' }}>
          {messages.length === 0 && (
            <div className="empty-state" style={{ padding: 60 }}>
              <div className="empty-state-icon">💬</div>
              <div className="empty-state-title">No messages yet</div>
              <div className="empty-state-text">Start a conversation with your admin for any help or questions</div>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender_id === user.id ? 'flex-end' : 'flex-start', gap: 4 }}>
              <div style={{
                maxWidth: '70%',
                padding: '10px 16px',
                borderRadius: 14,
                borderBottomRightRadius: m.sender_id === user.id ? 4 : 14,
                borderBottomLeftRadius: m.sender_id === user.id ? 14 : 4,
                background: m.sender_id === user.id ? 'linear-gradient(135deg, #0ea5e9, #6366f1)' : 'var(--bg-tertiary)',
                color: m.sender_id === user.id ? 'white' : 'var(--text-primary)',
                fontSize: 14,
                lineHeight: 1.5,
              }}>
                {m.content}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', padding: '0 4px' }}>
                {new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: 12, padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            placeholder="Type your message..."
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
          />
          <button type="submit" className="btn btn-primary" disabled={!newMsg.trim()}>Send →</button>
        </form>
      </div>
    </div>
  );
}
