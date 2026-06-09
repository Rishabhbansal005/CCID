import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/cases': 'Cases',
  '/evidence': 'Evidence',
  '/findings': 'Findings',
  '/timeline': 'Timeline',
  '/risk': 'Risk Assessment',
  '/reports': 'Reports',
  '/forensics': 'Forensic Tools',
};

interface TopbarProps {
  onMenuToggle?: () => void;
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const { pathname } = useLocation();
  const { user } = useAuth();

  // Build breadcrumb from current path
  const pathParts = pathname.split('/').filter(Boolean);

  return (
    <header className="topbar">
      {/* Mobile menu toggle */}
      <button
        className="topbar-icon-btn d-md-none"
        onClick={onMenuToggle}
        title="Toggle menu"
      >
        ☰
      </button>

      {/* Breadcrumbs */}
      <div className="topbar-breadcrumb">
        <Link to="/dashboard" className="topbar-breadcrumb-item" style={{ textDecoration: 'none' }}>
          Home
        </Link>
        {pathParts.map((part, idx) => {
          const path = '/' + pathParts.slice(0, idx + 1).join('/');
          const isLast = idx === pathParts.length - 1;
          const label = ROUTE_LABELS[path] || (part.length === 36
            ? part.substring(0, 8) + '...'
            : part.charAt(0).toUpperCase() + part.slice(1));

          return (
            <React.Fragment key={path}>
              <span className="topbar-breadcrumb-sep">›</span>
              {isLast ? (
                <span className="topbar-breadcrumb-item active">{label}</span>
              ) : (
                <Link to={path} className="topbar-breadcrumb-item" style={{ textDecoration: 'none' }}>
                  {label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Right Actions */}
      <div className="topbar-actions">
        {/* Status Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: 'var(--success)',
            background: 'var(--success-muted)',
            padding: '4px 10px',
            borderRadius: '20px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', animation: 'pulse-glow 2s infinite' }} />
          System Online
        </div>

        {/* Role badge */}
        {user && (
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--teal)',
              background: 'var(--teal-muted)',
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {user.role}
          </div>
        )}

        {/* Notifications (placeholder) */}
        <button className="topbar-icon-btn" title="Notifications">
          🔔
        </button>
      </div>
    </header>
  );
}
