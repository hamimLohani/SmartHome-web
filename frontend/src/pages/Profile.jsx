// ═══════════════════════════════════════════════════════════
// PROFILE PAGE — Client profile management
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, api, checkAuth } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [tab, setTab] = useState('profile');

  async function handleProfileSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/auth/profile', { method: 'PUT', body: JSON.stringify(form) });
      await checkAuth();
      toast.success('Profile updated!');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) return toast.error('Passwords do not match');
    if (pwForm.new_password.length < 8) return toast.error('Password too short');
    setChangingPw(true);
    try {
      await api('/auth/change-password', { method: 'PUT', body: JSON.stringify({ current_password: pwForm.current_password, new_password: pwForm.new_password }) });
      toast.success('Password changed!');
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) { toast.error(err.message); }
    finally { setChangingPw(false); }
  }

  return (
    <div className="page-container">
      <h1 className="page-title">👤 Profile</h1>
      <p className="page-subtitle">Manage your account settings</p>

      {/* Avatar banner */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: 'var(--radius-xl)', padding: '32px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 800, color: 'white', flexShrink: 0 }}>
          {user?.name?.charAt(0)?.toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>{user?.name}</div>
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{user?.email}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <span className={`badge ${user?.is_verified ? 'badge-success' : 'badge-warning'}`}>
              {user?.is_verified ? '✓ Verified' : 'Unverified'}
            </span>
            <span className="badge badge-primary">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-gap" style={{ marginBottom: 24 }}>
        <button className={`btn ${tab === 'profile' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('profile')}>Profile Info</button>
        <button className={`btn ${tab === 'security' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('security')}>Security</button>
      </div>

      {tab === 'profile' && (
        <div className="card" style={{ maxWidth: 560 }}>
          <h3 className="section-title">Personal Information</h3>
          <form onSubmit={handleProfileSave}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" value={user?.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>Email cannot be changed</span>
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" placeholder="+880 1XXX-XXXXXX" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </form>
        </div>
      )}

      {tab === 'security' && (
        <div className="card" style={{ maxWidth: 560 }}>
          <h3 className="section-title">Change Password</h3>
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input type="password" className="form-input" placeholder="Your current password" value={pwForm.current_password} onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" className="form-input" placeholder="Min 8 chars, 1 uppercase, 1 number" value={pwForm.new_password} onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input type="password" className="form-input" placeholder="Re-enter new password" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={changingPw}>
              {changingPw ? '⏳ Changing...' : '🔐 Change Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
