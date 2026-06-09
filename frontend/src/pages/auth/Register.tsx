import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const ROLES = [
  { value: 'investigator', label: '🔍 Investigator — Full investigation access' },
  { value: 'viewer', label: '👁️ Viewer — Read-only access' },
];

export default function Register() {
  const { signUp, session } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', fullName: '', role: 'investigator' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Once session is set after registration, navigate to dashboard
  useEffect(() => {
    if (session && success) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, success, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await signUp(form.email, form.password, form.fullName, form.role);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-bg-grid" />
        <div className="auth-card animate-in" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
          <h2 style={{ color: 'var(--success)', marginBottom: 12 }}>Account Created!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            {session
              ? 'Logging you in...'
              : 'Check your email to confirm your account, then sign in.'}
          </p>
          {!session && <Link to="/login" className="btn btn-primary">Go to Sign In</Link>}
          {session && <div className="spinner-border text-info" style={{ width: 28, height: 28 }} />}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-grid" />
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      <div className="auth-card animate-in">
        <div className="auth-logo">
          <div className="auth-logo-icon">🔍</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-heading)' }}>CCID</div>
            <div style={{ fontSize: 11, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Request Access
            </div>
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Create Account</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
          Register for access to the investigation platform
        </p>

        {error && (
          <div className="alert alert-danger mb-3" role="alert" style={{ fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="reg-fullname" className="form-label">Full Name</label>
            <input
              id="reg-fullname"
              name="fullName"
              type="text"
              className="form-control"
              placeholder="Detective John Smith"
              value={form.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="reg-email" className="form-label">Email Address</label>
            <input
              id="reg-email"
              name="email"
              type="email"
              className="form-control"
              placeholder="investigator@agency.gov"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="reg-role" className="form-label">Access Role</label>
            <select
              id="reg-role"
              name="role"
              className="form-select"
              value={form.role}
              onChange={handleChange}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label htmlFor="reg-password" className="form-label">Password</label>
            <input
              id="reg-password"
              name="password"
              type="password"
              className="form-control"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="reg-confirm" className="form-label">Confirm Password</label>
            <input
              id="reg-confirm"
              name="confirmPassword"
              type="password"
              className="form-control"
              placeholder="Repeat password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button
            id="btn-register"
            type="submit"
            className="btn btn-primary w-100 btn-lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Creating account...
              </>
            ) : (
              '🔐 Create Account'
            )}
          </button>
        </form>

        <div className="glow-line" />

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          Already have access?{' '}
          <Link to="/login" style={{ color: 'var(--teal)', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
