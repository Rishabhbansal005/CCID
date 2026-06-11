import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import StatCard from '@/components/shared/StatCard';
import { StatusBadge, PriorityBadge } from '@/components/shared/Badges';
import type { Case, CasePriority } from '@/types';
import dashboardApi from '@/api/dashboard';
import casesApi from '@/api/cases';
import { formatDistanceToNow } from 'date-fns';

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
};

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats(),
  });

  const { data: recentCases = [], isLoading: isLoadingCases } = useQuery({
    queryKey: ['cases', 'recent'],
    queryFn: async () => {
      const res = await casesApi.list();
      return res.items.slice(0, 5);
    },
  });

  const isLoading = isLoadingStats || isLoadingCases;

  // Priority distribution for pie chart
  const priorityDist = stats?.priority_distribution || [];

  const trendData = stats?.trend_data || [];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">
            Good {getTimeGreeting()}, {user?.full_name?.split(' ')[0] ?? 'Investigator'} 👋
          </h1>
          <p className="page-header-subtitle">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' '} · CCID Investigation Platform
          </p>
        </div>
        <Link to="/cases/new" className="btn btn-primary">
          + New Case
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            icon="🗂️"
            label="Total Cases"
            value={isLoading ? '...' : stats?.total_cases ?? 0}
            color="var(--teal)"
            colorMuted="var(--teal-muted)"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            icon="🔴"
            label="Critical Findings"
            value={isLoading ? '...' : stats?.critical_findings ?? 0}
            color="var(--danger)"
            colorMuted="var(--danger-muted)"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            icon="⚡"
            label="Active Investigations"
            value={isLoading ? '...' : stats?.active_cases ?? 0}
            color="var(--orange)"
            colorMuted="var(--orange-muted)"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            icon="✅"
            label="Closed Cases"
            value={isLoading ? '...' : stats?.closed_cases ?? 0}
            color="var(--success)"
            colorMuted="var(--success-muted)"
          />
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard
            icon="🔬"
            label="Total Evidence Analyzed"
            value={isLoading ? '...' : stats?.total_evidence ?? 0}
            color="var(--teal)"
            colorMuted="var(--teal-muted)"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard
            icon="🕸️"
            label="Multi-Source Correlations"
            value={isLoading ? '...' : stats?.total_correlations ?? 0}
            color="var(--purple)"
            colorMuted="rgba(168, 85, 247, 0.15)"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard
            icon="🚨"
            label="Critical Attack Chains"
            value={isLoading ? '...' : stats?.critical_correlations ?? 0}
            color="var(--danger)"
            colorMuted="var(--danger-muted)"
          />
        </div>
      </div>

      {/* Reports & Findings Stat */}
      <h6 style={{ fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 16px 0', fontSize: 14 }}>
        📄 Activity Overview
      </h6>
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            icon="📄"
            label="Reports Generated"
            value={isLoading ? '...' : stats?.reports_generated ?? 0}
            color="var(--blue)"
            colorMuted="rgba(59, 130, 246, 0.1)"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            icon="🧠"
            label="Total Findings"
            value={isLoading ? '...' : stats?.total_findings ?? 0}
            color="var(--teal)"
            colorMuted="rgba(45, 212, 191, 0.1)"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            icon="🔬"
            label="Total Evidence"
            value={isLoading ? '...' : stats?.total_evidence ?? 0}
            color="var(--orange)"
            colorMuted="rgba(249, 115, 22, 0.1)"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="row g-3 mb-4">
        {/* Trend Chart */}
        <div className="col-12 col-xl-8">
          <div className="card h-100">
            <div className="card-header">
              <h6 style={{ fontWeight: 700, color: 'var(--text-heading)', margin: 0, fontSize: 14 }}>
                📈 Case Trends (6 Months)
              </h6>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
                    cursor={{ stroke: 'var(--teal)', strokeWidth: 1 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                  <Area type="monotone" dataKey="cases" name="New Cases" stroke="#00d4ff" strokeWidth={2} fill="url(#colorCases)" dot={false} />
                  <Area type="monotone" dataKey="closed" name="Closed" stroke="#10b981" strokeWidth={2} fill="url(#colorClosed)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="col-12 col-xl-4">
          <div className="card h-100">
            <div className="card-header">
              <h6 style={{ fontWeight: 700, color: 'var(--text-heading)', margin: 0, fontSize: 14 }}>
                🎯 Priority Breakdown
              </h6>
            </div>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {priorityDist.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📊</div>
                  <div className="empty-state-text">No cases yet</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={priorityDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {priorityDist.map((entry) => (
                        <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Cases + Quick Actions */}
      <div className="row g-3">
        {/* Recent Cases */}
        <div className="col-12 col-xl-8">
          <div className="card">
            <div className="card-header">
              <h6 style={{ fontWeight: 700, color: 'var(--text-heading)', margin: 0, fontSize: 14 }}>
                🕐 Recent Cases
              </h6>
              <Link to="/cases" style={{ fontSize: 12, color: 'var(--teal)' }}>
                View all →
              </Link>
            </div>
            <div className="card-body" style={{ padding: '0 !important' }}>
              {isLoading ? (
                <div style={{ padding: 24 }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton" style={{ height: 48, marginBottom: 12, borderRadius: 8 }} />
                  ))}
                </div>
              ) : recentCases.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🗂️</div>
                  <div className="empty-state-title">No cases yet</div>
                  <div className="empty-state-text">Create your first investigation case to get started.</div>
                  <Link to="/cases/new" className="btn btn-primary">Create First Case</Link>
                </div>
              ) : (
                <div style={{ padding: '0 20px' }}>
                  <table className="table table-clickable mb-0">
                    <thead>
                      <tr>
                        <th>Case #</th>
                        <th>Title</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCases.map((c) => (
                        <tr key={c.id} onClick={() => window.location.href = `/cases/${c.id}`}>
                          <td>
                            <span className="font-mono" style={{ color: 'var(--teal)', fontSize: 12 }}>
                              {c.case_number}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                              {c.title}
                            </span>
                          </td>
                          <td><PriorityBadge priority={c.priority} /></td>
                          <td><StatusBadge status={c.status} /></td>
                          <td style={{ fontSize: 12 }}>
                            {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-12 col-xl-4">
          <div className="card h-100">
            <div className="card-header">
              <h6 style={{ fontWeight: 700, color: 'var(--text-heading)', margin: 0, fontSize: 14 }}>
                ⚡ Quick Actions
              </h6>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {QUICK_ACTIONS.map((action) => (
                  <Link
                    key={action.path}
                    to={action.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 16px',
                      background: 'var(--bg-input)',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      transition: 'var(--transition)',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)';
                      (e.currentTarget as HTMLElement).style.background = 'var(--teal-muted)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-input)';
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{action.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {action.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {action.description}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* System Status */}
              <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  System Status
                </div>
                {[
                  { label: 'Database', ok: true },
                  { label: 'Storage', ok: true },
                  { label: 'Volatility 3', ok: false },
                  { label: 'Wireshark', ok: false },
                ].map((s) => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: s.ok ? 'var(--success)' : 'var(--text-muted)', background: s.ok ? 'var(--success-muted)' : 'rgba(100,116,139,0.1)', padding: '2px 8px', borderRadius: 20 }}>
                      {s.ok ? '● Online' : '○ Not Configured'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { icon: '🗂️', label: 'New Case', description: 'Open a new investigation', path: '/cases/new' },
  { icon: '🔬', label: 'Upload Evidence', description: 'Add files to a case', path: '/evidence' },
  { icon: '📄', label: 'Generate Report', description: 'Create PDF investigation report', path: '/reports' },
  { icon: '🔌', label: 'Forensic Tools', description: 'View tool integration status', path: '/forensics' },
];

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
