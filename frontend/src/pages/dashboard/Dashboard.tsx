import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import StatCard from '@/components/shared/StatCard';
import { StatusBadge, PriorityBadge } from '@/components/shared/Badges';
import type { Case } from '@/types';
import dashboardApi from '@/api/dashboard';
import casesApi from '@/api/cases';
import { formatDistanceToNow } from 'date-fns';

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#f43f5e',
  high: '#fb923c',
  medium: '#fbbf24',
  low: '#34d399',
};

/* ─── SVG Icon set ─────────────────────────────────────────── */
const I = {
  cases: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
      <path d="M3 5h14v13H3z" strokeLinejoin="round" />
      <path d="M7 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M7 10h6M7 14h4" strokeLinecap="round" />
    </svg>
  ),
  critical: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
      <path d="M10 2L2 17h16L10 2z" strokeLinejoin="round" />
      <path d="M10 8v5M10 15h.01" strokeLinecap="round" />
    </svg>
  ),
  active: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6v4.5l3 1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  closed: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M7 10l2.5 2.5L13 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  evidence: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13 13l4 4" strokeLinecap="round" />
    </svg>
  ),
  correlation: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
      <circle cx="5" cy="5" r="2.5" />
      <circle cx="15" cy="5" r="2.5" />
      <circle cx="10" cy="15" r="2.5" />
      <path d="M7 6L8.5 12.5M13 6L11.5 12.5M7.5 5.5h5" />
    </svg>
  ),
  attack: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
      <path d="M10 2l2 7h7l-5.5 4 2 7L10 16l-5.5 4 2-7L1 9h7z" strokeLinejoin="round" />
    </svg>
  ),
  report: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
      <path d="M4 2h9l4 4v13H4V2z" strokeLinejoin="round" />
      <path d="M13 2v4h4" />
      <path d="M7 10h6M7 14h4" strokeLinecap="round" />
    </svg>
  ),
  newcase: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
      <path d="M3 5h14v13H3z" strokeLinejoin="round" />
      <path d="M7 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M10 9v6M7 12h6" strokeLinecap="round" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
      <path d="M4 14v3h12v-3" />
      <path d="M10 3v10M7 6l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  generate: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
      <path d="M4 2h9l4 4v12H4V2z" strokeLinejoin="round" />
      <path d="M13 2v4h4" />
      <path d="M7 10h6M7 14h4" strokeLinecap="round" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
      <path d="M8 3v10M3 8h10" strokeLinecap="round" />
    </svg>
  ),
};

/* ─── Stat card configs ─────────────────────────────────────── */
const STAT_CARDS = [
  {
    id: 'total_cases',
    label: 'Total Cases',
    icon: I.cases,
    color: '#6366f1',
    colorMuted: 'rgba(99,102,241,0.12)',
  },
  {
    id: 'critical_findings',
    label: 'Critical Findings',
    icon: I.critical,
    color: '#f43f5e',
    colorMuted: 'rgba(244,63,94,0.12)',
  },
  {
    id: 'active_cases',
    label: 'Active Cases',
    icon: I.active,
    color: '#f59e0b',
    colorMuted: 'rgba(245,158,11,0.12)',
  },
  {
    id: 'closed_cases',
    label: 'Closed',
    icon: I.closed,
    color: '#22d3ee',
    colorMuted: 'rgba(34,211,238,0.10)',
  },
];

const SEC_STATS = [
  {
    id: 'total_evidence',
    label: 'Evidence Items',
    icon: I.evidence,
    color: '#6366f1',
    colorMuted: 'rgba(99,102,241,0.12)',
  },
  {
    id: 'total_correlations',
    label: 'Correlations',
    icon: I.correlation,
    color: '#a78bfa',
    colorMuted: 'rgba(167,139,250,0.12)',
  },
  {
    id: 'critical_correlations',
    label: 'Attack Chains',
    icon: I.attack,
    color: '#f43f5e',
    colorMuted: 'rgba(244,63,94,0.12)',
  },
];

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
  const priorityDist = stats?.priority_distribution || [];
  const trendData = stats?.trend_data || [];

  return (
    <div className="animate-in">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">
            {getTimeGreeting()}, {user?.full_name?.split(' ')[0] ?? 'Investigator'}
          </h1>
          <p className="page-header-subtitle">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
            {' · '}CCID Investigation Platform
          </p>
        </div>
        <Link to="/cases/new" className="btn btn-primary">
          {I.plus} New Case
        </Link>
      </div>

      {/* ── Primary KPI Row ──────────────────────────────── */}
      <div className="row g-3 mb-3">
        {STAT_CARDS.map((s) => (
          <div key={s.id} className="col-12 col-sm-6 col-xl-3">
            <StatCard
              icon={s.icon}
              label={s.label}
              value={isLoading ? '—' : (stats as any)?.[s.id] ?? 0}
              color={s.color}
              colorMuted={s.colorMuted}
            />
          </div>
        ))}
      </div>

      {/* ── Secondary Stats Row ──────────────────────────── */}
      <div className="row g-3 mb-4">
        {SEC_STATS.map((s) => (
          <div key={s.id} className="col-12 col-sm-6 col-xl-4">
            <StatCard
              icon={s.icon}
              label={s.label}
              value={isLoading ? '—' : (stats as any)?.[s.id] ?? 0}
              color={s.color}
              colorMuted={s.colorMuted}
            />
          </div>
        ))}
      </div>

      {/* ── Charts Row ──────────────────────────────────── */}
      <div className="row g-3 mb-4">
        {/* Trend chart */}
        <div className="col-12 col-xl-8">
          <div className="card h-100">
            <div className="card-header">
              <span className="card-title">Case Volume — 6 Month Trend</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={218}>
                <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <defs>
                    <linearGradient id="gNew" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gClosed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#475569', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#475569', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(10,14,26,0.95)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#cbd5e1',
                      fontFamily: 'Inter, sans-serif',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}
                    cursor={{ stroke: 'rgba(99,102,241,0.2)', strokeWidth: 1 }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}
                  />
                  <Area
                    type="monotone" dataKey="cases" name="New"
                    stroke="#6366f1" strokeWidth={2}
                    fill="url(#gNew)" dot={false} activeDot={{ r: 4, fill: '#6366f1' }}
                  />
                  <Area
                    type="monotone" dataKey="closed" name="Closed"
                    stroke="#22d3ee" strokeWidth={2}
                    fill="url(#gClosed)" dot={false} activeDot={{ r: 4, fill: '#22d3ee' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Priority Donut */}
        <div className="col-12 col-xl-4">
          <div className="card h-100">
            <div className="card-header">
              <span className="card-title">Priority Distribution</span>
            </div>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {priorityDist.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 16px' }}>
                  <div className="empty-state-icon">{I.cases}</div>
                  <div className="empty-state-text">No case data yet</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={priorityDist}
                      cx="50%" cy="50%"
                      innerRadius={54} outerRadius={80}
                      paddingAngle={2} dataKey="value"
                    >
                      {priorityDist.map((entry: any) => (
                        <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(10,14,26,0.95)',
                        border: '1px solid rgba(99,102,241,0.2)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#cbd5e1',
                      }}
                    />
                    <Legend
                      formatter={(v) => (
                        <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
                          {v}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row ──────────────────────────────────── */}
      <div className="row g-3">
        {/* Recent Cases */}
        <div className="col-12 col-xl-8">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Cases</span>
              <Link to="/cases" style={{ fontSize: 12, color: '#818cf8', fontFamily: 'monospace' }}>
                View all →
              </Link>
            </div>
            <div style={{ padding: '0 4px' }}>
              {isLoading ? (
                <div style={{ padding: 20 }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton" style={{ height: 44, marginBottom: 8, borderRadius: 6 }} />
                  ))}
                </div>
              ) : recentCases.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-title">No cases yet</div>
                  <div className="empty-state-text">Start by creating your first investigation case.</div>
                  <Link to="/cases/new" className="btn btn-primary">{I.plus} Create Case</Link>
                </div>
              ) : (
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
                    {recentCases.map((c: Case) => (
                      <tr key={c.id} onClick={() => window.location.href = `/cases/${c.id}`}>
                        <td>
                          <span className="font-mono" style={{ color: '#818cf8', fontSize: 12 }}>
                            {c.case_number}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{c.title}</span>
                        </td>
                        <td><PriorityBadge priority={c.priority} /></td>
                        <td><StatusBadge status={c.status} /></td>
                        <td>
                          <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#475569' }}>
                            {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions + System Status */}
        <div className="col-12 col-xl-4">
          <div className="card h-100">
            <div className="card-header">
              <span className="card-title">Quick Actions</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 22 }}>
                {QUICK_ACTIONS.map((a) => (
                  <Link key={a.path} to={a.path} className="quick-action-link">
                    <span className="quick-action-icon">{a.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#f1f5f9' }}>{a.label}</div>
                      <div style={{ fontSize: 11, color: '#475569' }}>{a.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="section-heading">System Status</div>
              {SYS_STATUS.map((s) => (
                <div key={s.label} className="sys-status-row">
                  <span style={{ color: '#94a3b8', fontSize: 12.5 }}>{s.label}</span>
                  <span className={`sys-status-dot ${s.ok ? 'ok' : 'off'}`}>
                    <svg viewBox="0 0 8 8" width="6" height="6">
                      <circle cx="4" cy="4" r="3.5" fill="currentColor" />
                    </svg>
                    {s.ok ? 'Online' : 'Offline'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { icon: I.newcase, label: 'New Case', desc: 'Open a new investigation', path: '/cases/new' },
  { icon: I.upload, label: 'Upload Evidence', desc: 'Attach files to a case', path: '/evidence' },
  { icon: I.generate, label: 'Generate Report', desc: 'Export a PDF investigation report', path: '/reports/new' },
];

const SYS_STATUS = [
  { label: 'Database', ok: true },
  { label: 'Storage', ok: true },
  { label: 'Volatility', ok: false },
  { label: 'Wireshark', ok: false },
];

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
