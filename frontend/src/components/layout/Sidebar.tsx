import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  section?: string;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', icon: '⚡', label: 'Dashboard', section: 'MAIN' },
  { path: '/cases', icon: '🗂️', label: 'Cases', section: 'INVESTIGATION' },
  { path: '/evidence', icon: '🔬', label: 'Evidence', section: 'INVESTIGATION' },
  { path: '/findings', icon: '🎯', label: 'Findings', section: 'INVESTIGATION' },
  { path: '/timeline', icon: '📅', label: 'Timeline', section: 'ANALYSIS' },
  { path: '/risk', icon: '🛡️', label: 'Risk Assessment', section: 'ANALYSIS' },
  { path: '/reports', icon: '📄', label: 'Reports', section: 'REPORTING' },
  { path: '/forensics', icon: '🔌', label: 'Forensic Tools', section: 'TOOLS' },
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
        ? parts[0][0] + parts[parts.length - 1][0]
        : parts[0].substring(0, 2);
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
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🔍</div>
        {!collapsed && (
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title">CCID</span>
            <span className="sidebar-logo-subtitle">Investigation</span>
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
            fontSize: '16px',
            padding: '4px',
            borderRadius: '4px',
            transition: 'color 0.2s',
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '▶' : '◀'}
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
                <span className="nav-icon">{item.icon}</span>
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
        {!collapsed && (
          <div
            className="sidebar-user"
            onClick={handleSignOut}
            title="Click to sign out"
          >
            <div className="sidebar-avatar">
              {getInitials(user?.full_name, user?.email)}
            </div>
            <div className="sidebar-user-info" style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.full_name || user?.email}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {user?.role}
              </div>
            </div>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>⤴</span>
          </div>
        )}
        {collapsed && (
          <div
            className="sidebar-avatar"
            onClick={handleSignOut}
            style={{ margin: '0 auto', cursor: 'pointer' }}
            title={`${user?.full_name || user?.email} — Click to sign out`}
          >
            {getInitials(user?.full_name, user?.email)}
          </div>
        )}
      </div>
    </aside>
  );
}
