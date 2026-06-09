import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  requiredRole?: UserRole | UserRole[];
}

export default function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { session, user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: '3px solid var(--border-color)',
            borderTopColor: 'var(--teal)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Authenticating...
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Role-based access check
  if (requiredRole && user) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role)) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 48 }}>🚫</div>
          <h2 style={{ color: 'var(--text-heading)' }}>Access Denied</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            You don't have permission to access this page.
          </p>
        </div>
      );
    }
  }

  return <Outlet />;
}
