// ═══════════════════════════════════════════════════════════
// ADMIN MESSAGES — Real-time chat with clients
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRealtime } from '../../hooks/useRealtime';
import toast from 'react-hot-toast';
import './AdminMessages.css';

export default function AdminMessages() {
  const { user, api } = useAuth();
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { if (selectedClient) fetchMessages(selectedClient.id); }, [selectedClient]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useRealtime('messages', 'INSERT', (payload) => {
    if (selectedClient && (payload.new.sender_id === selectedClient.id || payload.new.receiver_id === selectedClient.id)) {
      setMessages(prev => [...prev, payload.new]);
    }
  });

  async function fetchClients() {
    try { const d = await api('/admin/clients'); setClients(d.clients || []); }
    catch { toast.error('Failed to load clients'); }
    finally { setLoading(false); }
  }

  async function fetchMessages(clientId) {
    try { const d = await api(`/messages/${clientId}`); setMessages(d.messages || []); }
    catch { toast.error('Failed to load messages'); }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!newMsg.trim() || !selectedClient) return;
    try {
      const d = await api('/messages', { method: 'POST', body: JSON.stringify({ receiver_id: selectedClient.id, content: newMsg }) });
      setMessages(prev => [...prev, d.message]);
      setNewMsg('');
    } catch (err) { toast.error(err.message); }
  }

  if (loading) return <div className="page-container"><div className="skeleton skeleton-title" /><div className="skeleton" style={{height:500}} /></div>;

  return (
    <div className="page-container">
      <h1 className="page-title">💬 Messages</h1>
      <p className="page-subtitle">Chat with your clients in real-time</p>

      <div className="messages-layout">
        {/* Client list */}
        <div className="messages-sidebar">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <input className="form-input" placeholder="Search clients..." style={{ fontSize: 13 }} />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {clients.map(c => (
              <div key={c.id} className={`messages-client-item ${selectedClient?.id === c.id ? 'active' : ''}`} onClick={() => setSelectedClient(c)}>
                <div className="messages-client-avatar">{c.name?.charAt(0)}</div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{c.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="messages-chat">
          {!selectedClient ? (
            <div className="flex-center" style={{ flex: 1, flexDirection: 'column', color: 'var(--text-tertiary)', gap: 12 }}>
              <span style={{ fontSize: 48 }}>💬</span>
              <span>Select a client to start chatting</span>
            </div>
          ) : (
            <>
              <div className="messages-chat-header">
                <div className="messages-client-avatar">{selectedClient.name?.charAt(0)}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{selectedClient.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{selectedClient.email}</div>
                </div>
              </div>
              <div className="messages-chat-body">
                {messages.length === 0 && (
                  <div className="empty-state" style={{ padding: 40 }}>
                    <div className="empty-state-icon">💬</div>
                    <div className="empty-state-title">No messages yet</div>
                    <div className="empty-state-text">Start the conversation!</div>
                  </div>
                )}
                {messages.map(m => (
                  <div key={m.id} className={`message-bubble ${m.sender_id === user.id ? 'sent' : 'received'}`}>
                    <div className="message-content">{m.content}</div>
                    <div className="message-time">{new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form className="messages-chat-input" onSubmit={sendMessage}>
                <input className="form-input" placeholder="Type a message..." value={newMsg} onChange={e => setNewMsg(e.target.value)} style={{ flex: 1 }} />
                <button type="submit" className="btn btn-primary" disabled={!newMsg.trim()}>Send →</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
