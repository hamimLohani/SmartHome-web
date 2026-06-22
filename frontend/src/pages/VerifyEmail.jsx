// ═══════════════════════════════════════════════════════════
// VERIFY EMAIL PAGE
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found.');
      return;
    }

    verifyToken(token);
  }, [searchParams]);

  async function verifyToken(token) {
    try {
      const res = await fetch(`${API_URL}/auth/verify/${token}`);
      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.error || 'Verification failed.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-card animate-fade-in" style={{ textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 20, animation: 'pulse-glow 1.5s infinite' }}>⏳</div>
            <h2 className="auth-title" style={{ color: '#f1f5f9' }}>Verifying your email...</h2>
            <p style={{ color: '#94a3b8', marginTop: 12 }}>Please wait while we confirm your account.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
            <h2 className="auth-title" style={{ color: '#f1f5f9' }}>Email Verified!</h2>
            <p style={{ color: '#94a3b8', marginTop: 12, lineHeight: 1.6 }}>{message}</p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>
              → Continue to Login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 20 }}>❌</div>
            <h2 className="auth-title" style={{ color: '#f1f5f9' }}>Verification Failed</h2>
            <p style={{ color: '#f87171', marginTop: 12, lineHeight: 1.6 }}>{message}</p>
            <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link to="/register" className="btn btn-secondary">Register Again</Link>
              <Link to="/login" className="btn btn-primary">Go to Login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
