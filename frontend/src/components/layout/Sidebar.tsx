import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
  path: string;
  label: string;
  section?: string;
  badge?: number;
  icon: React.ReactNode;
}

// Clean SVG icons — no emojis
const Icons = {
  dashboard: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  ),
  cases: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
      <path d="M2 4h12v10H2z" />
      <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M5 8h6M5 11h4" />
    </svg>
  ),
  evidence: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" strokeLinecap="round" />
      <path d="M7 5v2M7 9h.01" strokeLinecap="round" />
    </svg>
  ),
  findings: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
      <path d="M8 2L2 14h12L8 2z" strokeLinejoin="round" />
      <path d="M8 7v3M8 11.5h.01" strokeLinecap="round" />
    </svg>
  ),
  timeline: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
      <circle cx="4" cy="4" r="1.5" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="12" cy="8" r="1.5" />
      <path d="M5.5 4.5L10.5 7M5.5 11.5L10.5 9" />
    </svg>
  ),
  risk: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
      <path d="M8 1.5L2 14.5h12L8 1.5z" strokeLinejoin="round" />
      <path d="M8 6v4" strokeLinecap="round" />
      <circle cx="8" cy="12" r=".5" fill="currentColor" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
      <path d="M3 1h7l3 3v11H3V1z" />
      <path d="M10 1v3h3" />
      <path d="M5.5 8h5M5.5 11h3" strokeLinecap="round" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 16 16" fill="currentColor" width="18" height="18">
      <path d="M8 1L2 3.5V8c0 3.5 2.5 6 6 7.5C14 14 16 11.5 16 8V3.5L8 1zM8 2.2l5.5 2v3.8c0 2.8-2 5-5.5 6.3C5 13 3 10.8 3 8V4.2L8 2.2z" />
    </svg>
  ),
  chevronLeft: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
      <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chevronRight: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
      <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
      <path d="M6 2H2v12h4M10 5l4 3-4 3M14 8H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard',  icon: Icons.dashboard, label: 'Dashboard',       section: 'OVERVIEW' },
  { path: '/cases',      icon: Icons.cases,     label: 'Cases',            section: 'INVESTIGATION' },
  { path: '/evidence',   icon: Icons.evidence,  label: 'Evidence',         section: 'INVESTIGATION' },
  { path: '/findings',   icon: Icons.findings,  label: 'Findings',         section: 'INVESTIGATION' },
  { path: '/timeline',   icon: Icons.timeline,  label: 'Timeline',         section: 'ANALYSIS' },
  { path: '/risk',       icon: Icons.risk,      label: 'Risk Assessment',  section: 'ANALYSIS' },
  { path: '/reports',    icon: Icons.reports,   label: 'Reports',          section: 'OUTPUT' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(' ');
      return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].substring(0, 2).toUpperCase();
    }
    return email?.substring(0, 2).toUpperCase() ?? 'U?';
  };

  const groupedItems = NAV_ITEMS.reduce<Record<string, NavItem[]>>((acc, item) => {
    const key = item.section ?? 'OTHER';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Branding */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">{Icons.shield}</div>
        {!collapsed && (
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title">CCID</span>
            <span className="sidebar-logo-subtitle">Investigation Platform</span>
          </div>
        )}
        <button
          onClick={onToggle}
          style={{
            marginLeft: collapsed ? 'auto' : 'auto',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s',
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
        >
          {collapsed ? Icons.chevronRight : Icons.chevronLeft}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {Object.entries(groupedItems).map(([section, items]) => (
          <div key={section}>
            {!collapsed && (
              <div className="sidebar-section-label">{section}</div>
            )}
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-nav-item${isActive ? ' active' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <span className="nav-icon-wrap">{item.icon}</span>
                {!collapsed && <span className="nav-label">{item.label}</span>}
                {!collapsed && item.badge && item.badge > 0 && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="sidebar-footer">
        {!collapsed ? (
          <div
            className="sidebar-user"
            onClick={handleSignOut}
            title="Sign out"
          >
            <div className="sidebar-avatar">
              {getInitials(user?.full_name, user?.email)}
            </div>
            <div className="sidebar-user-info" style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user?.full_name || user?.email}
              </div>
              <div style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                {user?.role}
              </div>
            </div>
            <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              {Icons.logout}
            </span>
          </div>
        ) : (
          <div
            className="sidebar-avatar"
            onClick={handleSignOut}
            style={{ margin: '4px auto', cursor: 'pointer' }}
            title={`${user?.full_name || user?.email} — Sign out`}
          >
            {getInitials(user?.full_name, user?.email)}
          </div>
        )}
      </div>
    </aside>
  );
}
