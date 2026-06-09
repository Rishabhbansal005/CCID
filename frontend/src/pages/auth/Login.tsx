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

  // Navigate to dashboard once session is confirmed in context
  useEffect(() => {
    if (session) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      // Don't navigate here — wait for session to update via useEffect above
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Background effects */}
      <div className="auth-bg-grid" />
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      <div className="auth-card animate-in">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🔍</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-heading)' }}>CCID</div>
            <div style={{ fontSize: 11, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Cyber Crime Investigation
            </div>
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Welcome back</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>
          Sign in to access the investigation platform
        </p>

        {error && (
          <div className="alert alert-danger mb-3" role="alert" style={{ fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="login-email" className="form-label">Email Address</label>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label htmlFor="login-password" className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: 12, cursor: 'pointer', padding: 0 }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            id="btn-login"
            type="submit"
            className="btn btn-primary w-100 btn-lg"
            disabled={loading || !email || !password}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Signing in...
              </>
            ) : (
              '🔐 Sign In'
            )}
          </button>
        </form>

        <div className="glow-line" />

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--teal)', fontWeight: 600 }}>
            Request access
          </Link>
        </p>

        {/* Security notice */}
        <div style={{
          marginTop: 24,
          padding: '10px 14px',
          background: 'rgba(0,212,255,0.05)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          fontSize: 11,
          color: 'var(--text-muted)',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
        }}>
          <span>🔒</span>
          <span>This system is for authorized investigators only. All access is logged and monitored.</span>
        </div>
      </div>
    </div>
  );
}
