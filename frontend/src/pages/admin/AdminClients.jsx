// ═══════════════════════════════════════════════════════════
// ADMIN CLIENTS — Client management with house map view
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import HouseMapCanvas from '../../components/HouseMapCanvas';
import toast from 'react-hot-toast';

export default function AdminClients() {
  const { api } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientHouses, setClientHouses] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchClients(); }, []);

  async function fetchClients() {
    try { const d = await api('/admin/clients'); setClients(d.clients || []); }
    catch { toast.error('Failed to load clients'); }
    finally { setLoading(false); }
  }

  async function viewClientHouse(client) {
    setSelectedClient(client);
    try {
      const d = await api(`/admin/clients/${client.id}/house`);
      setClientHouses(d.houses || []);
    } catch { toast.error('Failed to load client house'); }
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="page-container"><div className="skeleton skeleton-title" /><div className="skeleton" style={{height:400}} /></div>;

  return (
    <div className="page-container">
      <h1 className="page-title">👥 Clients</h1>
      <p className="page-subtitle">Manage all registered clients and their smart homes</p>

      <div style={{ marginBottom: 20 }}>
        <input className="form-input" style={{ maxWidth: 320 }} placeholder="🔍 Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid-auto">
        {filtered.map(c => (
          <div key={c.id} className="card" style={{ cursor: 'pointer' }} onClick={() => viewClientHouse(c)}>
            <div className="flex-gap" style={{ marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18 }}>
                {c.name?.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{c.email}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>{c.roomsCount || 0}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Rooms</div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--success)' }}>{c.onlineBoards || 0}/{c.totalBoards || 0}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Boards Online</div>
              </div>
            </div>
            <div className="flex-between">
              <span className={`badge ${c.is_verified ? 'badge-success' : 'badge-warning'}`}>{c.is_verified ? '✓ Verified' : 'Unverified'}</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Last: {c.last_active ? new Date(c.last_active).toLocaleDateString() : 'Never'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* House Map Modal */}
      {selectedClient && (
        <div className="modal-overlay" onClick={() => setSelectedClient(null)}>
          <div className="modal animate-slide-up" style={{ maxWidth: 900, width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🏠 {selectedClient.name}'s House Map</h3>
              <button className="modal-close" onClick={() => setSelectedClient(null)}>✕</button>
            </div>
            {clientHouses.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">🏠</div><div className="empty-state-title">No house configured yet</div></div>
            ) : (
              clientHouses.map(h => (
                <div key={h.id}>
                  <div style={{ marginBottom: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <strong>{h.name}</strong> {h.address && <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>— {h.address}</span>}
                    <span className={`badge ${h.status === 'approved' ? 'badge-success' : h.status === 'rejected' ? 'badge-danger' : 'badge-warning'} ml-8`} style={{ marginLeft: 10 }}>{h.status}</span>
                  </div>
                  <HouseMapCanvas rooms={h.rooms || []} readOnly={true} />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
