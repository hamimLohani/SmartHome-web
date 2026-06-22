// ═══════════════════════════════════════════════════════════
// REGISTER PAGE
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const validate = () => {
    const errs = {};
    if (!form.name || form.name.length < 2) errs.name = 'Name must be at least 2 characters';
    if (!form.email) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format';
    if (form.password.length < 8) errs.password = 'Min 8 characters required';
    else if (!/[A-Z]/.test(form.password)) errs.password = 'Need at least 1 uppercase letter';
    else if (!/[0-9]/.test(form.password)) errs.password = 'Need at least 1 number';
    else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password)) errs.password = 'Need at least 1 symbol';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    const p = form.password;
    if (!p) return { score: 0, label: '', color: '' };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p)) score++;
    if (p.length >= 12) score++;

    const levels = [
      { label: 'Very weak', color: '#ef4444' },
      { label: 'Weak', color: '#f59e0b' },
      { label: 'Fair', color: '#eab308' },
      { label: 'Good', color: '#22c55e' },
      { label: 'Strong', color: '#16a34a' },
    ];
    return { score, ...levels[Math.min(score - 1, 4)] };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);

    setLoading(true);
    try {
      await register(form);
      setSuccess(true);
      toast.success('Registration successful! Check your email.');
    } catch (err) {
      toast.error(err.message);
      setErrors({ general: err.message });
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength();

  if (success) {
    return (
      <div className="auth-layout">
        <div className="auth-card animate-fade-in" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>📧</div>
          <h2 className="auth-title" style={{ color: '#f1f5f9' }}>Check your email!</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.7, margin: '16px 0 24px' }}>
            We've sent a verification link to <strong style={{ color: '#38bdf8' }}>{form.email}</strong>.
            Please click the link to activate your account.
          </p>
          <p style={{ color: '#64748b', fontSize: 13 }}>
            Didn't receive it? Check your spam folder or{' '}
            <button onClick={() => setSuccess(false)} style={{ color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              try again
            </button>
          </p>
          <div className="auth-link" style={{ marginTop: 24 }}>
            <Link to="/login">← Back to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <div className="auth-card animate-fade-in">
        <div className="auth-logo">
          <h1>🏠 Smart Home</h1>
          <p>Manage your home, intelligently</p>
        </div>

        <h2 className="auth-title">Create account</h2>
        <p className="auth-subtitle">Get started with your smart home journey</p>

        {errors.general && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#f87171' }}>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Full Name</label>
            <input id="reg-name" type="text" name="name" className={`form-input ${errors.name ? 'error' : ''}`} placeholder="John Doe" value={form.name} onChange={handleChange} />
            {errors.name && <span className="form-error">⚠ {errors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email Address</label>
            <input id="reg-email" type="email" name="email" className={`form-input ${errors.email ? 'error' : ''}`} placeholder="your@gmail.com" value={form.email} onChange={handleChange} />
            {errors.email && <span className="form-error">⚠ {errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-phone">Phone Number <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span></label>
            <input id="reg-phone" type="tel" name="phone" className="form-input" placeholder="+880 1XXX-XXXXXX" value={form.phone} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <input id="reg-password" type="password" name="password" className={`form-input ${errors.password ? 'error' : ''}`} placeholder="Min 8 chars, 1 upper, 1 number, 1 symbol" value={form.password} onChange={handleChange} />
            {form.password && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength.score ? strength.color : 'rgba(100,116,139,0.2)', transition: 'all 0.3s' }} />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: strength.color, fontWeight: 500 }}>{strength.label}</span>
              </div>
            )}
            {errors.password && <span className="form-error">⚠ {errors.password}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
            <input id="reg-confirm" type="password" name="confirmPassword" className={`form-input ${errors.confirmPassword ? 'error' : ''}`} placeholder="Re-enter your password" value={form.confirmPassword} onChange={handleChange} />
            {errors.confirmPassword && <span className="form-error">⚠ {errors.confirmPassword}</span>}
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '⏳ Creating account...' : '→ Create Account'}
          </button>
        </form>

        <div className="auth-link">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
