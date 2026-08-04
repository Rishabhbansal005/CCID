import React, { useState } from 'react';
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
import LiveThreatMap from '@/components/dashboard/LiveThreatMap';

/* ─── Emergency Helplines Data ─────────────────────────────── */
const HELPLINES = [
  { service: 'National Police Helpline', number: '112' },
  { service: 'Women Helpline', number: '1091' },
  { service: 'Child Helpline (CHILDLINE)', number: '1098' },
  { service: 'Senior Citizens Helpline', number: '14567' },
  { service: 'Cyber Crime Helpline', number: '1930' },
  { service: 'Anti-Human Trafficking', number: '1091 / 112' },
  { service: 'Railway Police Helpline', number: '1512 / 182' },
  { service: 'Traffic Helpline', number: 'City-wise' },
];

/* ─── Helpline Marquee Component ───────────────────────────── */
function HelplineMarquee() {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  const handleCopy = (number: string, idx: number) => {
    navigator.clipboard.writeText(number).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1800);
    });
  };

  const items = [...HELPLINES, ...HELPLINES];

  return (
    <>
      <style>{`
        @keyframes hl-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .hl-track {
          animation: hl-scroll 44s linear infinite;
        }
        .hl-track.hl-paused {
          animation-play-state: paused;
        }
      `}</style>

      {/* Outer wrapper — fixed height, clips everything inside */}
      <div
        style={{
          position: 'relative',       /* establishes stacking context     */
          width: '100%',
          height: 52,
          marginBottom: 28,
          flexShrink: 0,
          overflow: 'hidden',         /* HARD clip — nothing escapes       */
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(90deg,rgba(12,18,32,0.98),rgba(8,13,22,0.98))',
          boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
          display: 'flex',
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* ── Red badge (static, in flow) */}
        <div style={{
          position: 'relative',
          zIndex: 3,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 18px',
          background: 'rgba(244,63,94,0.12)',
          borderRight: '1px solid rgba(244,63,94,0.2)',
          color: '#f43f5e',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          fontFamily: 'JetBrains Mono,monospace',
          whiteSpace: 'nowrap',
        }}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13">
            <path d="M10 2a8 8 0 100 16A8 8 0 0010 2z" />
            <path d="M10 8v4M10 14h.01" strokeLinecap="round" />
          </svg>
          SOS HELPLINES
        </div>

        {/* ── Scroll viewport (fills remaining width) */}
        <div style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',         /* clips the absolute track           */
          /* fade edges */
          maskImage: 'linear-gradient(to right,transparent,#000 24px,#000 calc(100% - 24px),transparent)',
          WebkitMaskImage: 'linear-gradient(to right,transparent,#000 24px,#000 calc(100% - 24px),transparent)',
        }}>
          {/*
            KEY FIX: position:absolute + left:0 means this div is
            completely OUT OF NORMAL FLOW — it can never affect
            the width of the page or any sibling element.
          */}
          <div
            className={`hl-track${paused ? ' hl-paused' : ''}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              paddingLeft: 16,
              whiteSpace: 'nowrap',
            }}
          >
            {items.map((h, i) => (
              <button
                key={i}
                onClick={() => handleCopy(h.number, i % HELPLINES.length)}
                title={`Click to copy ${h.number}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 12px',
                  background: copiedIdx === i % HELPLINES.length
                    ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${copiedIdx === i % HELPLINES.length
                    ? 'rgba(34,211,238,0.35)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 7,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  outline: 'none',
                  flexShrink: 0,
                  lineHeight: 1,
                  transition: 'background 0.15s,border-color 0.15s',
                }}
              >
                <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'Inter,sans-serif' }}>
                  {h.service}
                </span>
                <span style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono,monospace',
                  color: copiedIdx === i % HELPLINES.length ? '#22d3ee' : '#818cf8',
                }}>
                  {copiedIdx === i % HELPLINES.length ? '✓ Copied!' : h.number}
                </span>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10"
                  style={{ color: '#475569', flexShrink: 0 }}>
                  <rect x="5" y="5" width="9" height="9" rx="1.5" />
                  <path d="M3 11V2h9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}


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

      {/* ── Emergency Helplines Marquee ──────────────────── */}
      <HelplineMarquee />

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
              <div className="section-heading" style={{ marginTop: 24 }}>Cyber Police Locations</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {CYBER_POLICE_LOCATIONS.map((loc) => (
                  <div key={loc.name} style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ color: '#f1f5f9', fontWeight: 500, fontSize: 12.5 }}>{loc.name}</span>
                      <span className="sys-status-dot ok" style={{ fontSize: 10 }}>
                        <svg viewBox="0 0 8 8" width="5" height="5"><circle cx="4" cy="4" r="3.5" fill="currentColor" /></svg>
                        {loc.status}
                      </span>
                    </div>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name + ', ' + loc.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4, display: 'inline-block', textDecoration: 'none' }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                      📍 {loc.address}
                    </a>
                    <div style={{ color: '#818cf8', fontSize: 11, fontFamily: 'var(--font-mono)' }}>📞 {loc.phone}</div>
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
  { icon: I.newcase, label: 'New Case', desc: 'Open a new investigation', path: '/cases/new' },
  { icon: I.upload, label: 'Upload Evidence', desc: 'Attach files to a case', path: '/evidence' },
  { icon: I.generate, label: 'Generate Report', desc: 'Export a PDF investigation report', path: '/reports/new' },
];

const SYS_STATUS = [
  { label: 'Database', ok: true },
  { label: 'Storage', ok: true },
  { label: 'Volatility', ok: true },
  { label: 'Wireshark', ok: true },
  { label: 'Mobile Forensics', ok: true },
  { label: 'SIEM & Logs', ok: true },
];

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const CYBER_POLICE_LOCATIONS = [
  { name: 'National Cyber HQ', address: 'Block 4, CGO Complex, New Delhi', phone: '011-2436-1234 (Mob: +91 9876543210)', status: 'Online' },
  { name: 'Cyber Crime Station (Gurugram)', address: 'Sector 43, Gurugram, Haryana', phone: '0124-222-2222 (Mob: +91 9123456789)', status: 'Online' },
  { name: 'Cyber Crime Station (Noida)', address: 'Sector 36, Noida, Uttar Pradesh', phone: '0120-234-5678 (Mob: +91 9876543211)', status: 'Online' },
  { name: 'Cyber Cell (Dwarka)', address: 'Sector 19, Dwarka, New Delhi', phone: '011-2567-8901 (Mob: +91 9988776655)', status: 'Online' },
  { name: 'Cyber Crime Cell (Faridabad)', address: 'Sector 21C, Faridabad, Haryana', phone: '0129-243-5678 (Mob: +91 9876541122)', status: 'Online' },
  { name: 'Cyber Crime Cell (Mumbai)', address: 'BKC, Bandra East, Mumbai', phone: '022-2650-4567 (Mob: +91 8765432109)', status: 'Online' },
  { name: 'Cyber Station (Bengaluru)', address: 'Infantry Road, Bengaluru', phone: '080-2294-3232 (Mob: +91 7654321098)', status: 'Online' },
  { name: 'Forensics Lab (Hyderabad)', address: 'Red Hills, Nampally, Hyderabad', phone: '040-2323-8899 (Mob: +91 6543210987)', status: 'Online' },
  { name: 'Cyber Crime Cell (Chennai)', address: 'Vepery, Chennai, Tamil Nadu', phone: '044-2849-1111 (Mob: +91 9444444444)', status: 'Online' },
  { name: 'Cyber Crime Station (Kolkata)', address: 'Lalbazar, Kolkata, West Bengal', phone: '033-2214-3000 (Mob: +91 9333333333)', status: 'Online' },
  { name: 'Cyber Cell (Pune)', address: 'Shivajinagar, Pune, Maharashtra', phone: '020-2612-4222 (Mob: +91 9222222222)', status: 'Online' },
];
