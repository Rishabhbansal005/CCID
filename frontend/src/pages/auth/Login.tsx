import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const { signIn, session } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (session) navigate('/dashboard', { replace: true });
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-grid" />

      <div className="auth-card animate-in">
        {/* Logo / Brand */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            {/* Shield icon */}
            <svg viewBox="0 0 20 20" fill="white" width="22" height="22">
              <path d="M10 1L3 4v6c0 4.5 3 8 7 9 4-1 7-4.5 7-9V4L10 1zm0 1.6L18 5v5c0 3.8-2.6 6.7-6 7.7l-2-.7C7.3 16 5 13.3 5 10V5l5-2.4z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)', letterSpacing: '0.04em' }}>
              CCID
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
              Investigation Platform
            </div>
          </div>
        </div>

        <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: 'var(--text-heading)' }}>
          Sign in
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
          Enter your credentials to access the platform.
        </p>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 14px',
              background: 'var(--status-crit-bg)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius)',
              marginBottom: 20,
              fontSize: 13,
              color: 'var(--status-crit)',
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 5v3M8 10h.01" strokeLinecap="round" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="login-email" className="form-label">Email</label>
            <input
              id="login-email"
              type="email"
              className="form-control"
              placeholder="investigator@agency.gov"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <label htmlFor="login-password" className="form-label" style={{ marginBottom: 0 }}>
                Password
              </label>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); alert('Contact your administrator to reset your password.'); }}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: 'var(--text-secondary)', fontSize: 12,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Forgot password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: 38 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                style={{
                  position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  color: 'var(--text-muted)', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center',
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15">
                    <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" />
                    <circle cx="8" cy="8" r="2" />
                    <path d="M2 2l12 12" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15">
                    <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" />
                    <circle cx="8" cy="8" r="2" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            id="btn-login"
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading || !email || !password}
            style={{ height: 40, justifyContent: 'center' }}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" />
                Authenticating…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="glow-line" style={{ margin: '24px 0' }} />

        <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-secondary)' }}>
          Need access?{' '}
          <Link to="/register" style={{ color: 'var(--accent-light)', fontWeight: 500 }}>
            Request an account
          </Link>
        </p>

        {/* Security notice */}
        <div
          style={{
            marginTop: 20,
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border-dim)',
            fontSize: 11,
            color: 'var(--text-muted)',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14" style={{ flexShrink: 0, marginTop: 1 }}>
            <rect x="3" y="7" width="10" height="8" rx="1" />
            <path d="M5 7V5a3 3 0 0 1 6 0v2" strokeLinecap="round" />
          </svg>
          <span>
            Authorized personnel only. All sessions are logged and monitored.
          </span>
        </div>
      </div>
    </div>
  );
}
