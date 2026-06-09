import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SeverityBadge } from '@/components/shared/Badges';
import type { FindingSeverity } from '@/types';
import { formatDistanceToNow } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────
export interface Finding {
  id: string;
  case_id: string;
  evidence_id: string | null;
  finding_number: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  category: string | null;
  mitre_tactic: string | null;
  mitre_technique: string | null;
  status: 'open' | 'investigating' | 'confirmed' | 'false_positive' | 'resolved';
  tags: string[];
  ioc_indicators: IocIndicator[];
  recommendations: string | null;
  created_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  case?: { case_number: string; title: string };
  evidence?: { original_file_name: string } | null;
}

export interface IocIndicator {
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email' | 'filename' | 'registry' | 'other';
  value: string;
  description?: string;
}

// ─── Constants ────────────────────────────────────────────────
export const SEVERITIES: { value: FindingSeverity; label: string; color: string }[] = [
  { value: 'critical',      label: '🔴 Critical',      color: '#ef4444' },
  { value: 'high',          label: '🟠 High',           color: '#f97316' },
  { value: 'medium',        label: '🟡 Medium',         color: '#f59e0b' },
  { value: 'low',           label: '🟢 Low',            color: '#22c55e' },
  { value: 'informational', label: '🔵 Informational',  color: '#3b82f6' },
];

export const FINDING_STATUSES = [
  { value: 'open',           label: 'Open',           color: 'var(--info)' },
  { value: 'investigating',  label: 'Investigating',  color: 'var(--warning)' },
  { value: 'confirmed',      label: 'Confirmed',      color: 'var(--danger)' },
  { value: 'false_positive', label: 'False Positive', color: 'var(--text-muted)' },
  { value: 'resolved',       label: 'Resolved',       color: 'var(--success)' },
];

export const MITRE_TACTICS = [
  'Reconnaissance', 'Resource Development', 'Initial Access', 'Execution',
  'Persistence', 'Privilege Escalation', 'Defense Evasion', 'Credential Access',
  'Discovery', 'Lateral Movement', 'Collection', 'Command and Control',
  'Exfiltration', 'Impact',
];

export const CATEGORIES = [
  { value: 'malware',              label: 'Malware' },
  { value: 'intrusion',            label: 'Intrusion' },
  { value: 'data_exfiltration',    label: 'Data Exfiltration' },
  { value: 'privilege_escalation', label: 'Privilege Escalation' },
  { value: 'lateral_movement',     label: 'Lateral Movement' },
  { value: 'persistence',          label: 'Persistence' },
  { value: 'defense_evasion',      label: 'Defense Evasion' },
  { value: 'credential_access',    label: 'Credential Access' },
  { value: 'discovery',            label: 'Discovery' },
  { value: 'collection',           label: 'Collection' },
  { value: 'command_control',      label: 'Command & Control' },
  { value: 'exfiltration',         label: 'Exfiltration' },
  { value: 'impact',               label: 'Impact' },
  { value: 'fraud',                label: 'Fraud' },
  { value: 'policy_violation',     label: 'Policy Violation' },
  { value: 'other',                label: 'Other' },
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'false_positive', label: 'False Positive' },
  { value: 'resolved', label: 'Resolved' },
];

const SEVERITY_FILTER_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'informational', label: 'Informational' },
];

// ─── Finding Status Badge ──────────────────────────────────────
export function FindingStatusBadge({ status }: { status: Finding['status'] }) {
  const cfg = FINDING_STATUSES.find((s) => s.value === status) ?? FINDING_STATUSES[0];
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      padding: '2px 9px',
      borderRadius: 20,
      border: `1px solid ${cfg.color}44`,
      background: `${cfg.color}18`,
      color: cfg.color,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {cfg.label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function FindingsList() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ search: '', status: '', severity: '' });

  const { data: findings = [], isLoading, error, refetch } = useQuery({
    queryKey: ['findings', 'list'],
    queryFn: async (): Promise<Finding[]> => {
      const { data, error } = await supabase
        .from('findings')
        .select(`
          *,
          case:cases(case_number, title)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Finding[];
    },
    staleTime: 30_000,
  });

  // Client-side filtering
  const filtered = findings.filter((f) => {
    if (filters.status && f.status !== filters.status) return false;
    if (filters.severity && f.severity !== filters.severity) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        f.finding_number.toLowerCase().includes(q) ||
        f.case?.case_number?.toLowerCase().includes(q) ||
        f.mitre_technique?.toLowerCase().includes(q) || false
      );
    }
    return true;
  });

  // Stats
  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const openCount = findings.filter((f) => f.status === 'open' || f.status === 'investigating').length;
  const confirmedCount = findings.filter((f) => f.status === 'confirmed').length;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Findings Management</h1>
          <p className="page-header-subtitle">
            {findings.length} finding{findings.length !== 1 ? 's' : ''} across all cases
          </p>
        </div>
        <div className="page-header-actions">
          <Link to="/findings/new" className="btn btn-primary" id="btn-new-finding">
            + New Finding
          </Link>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Findings', value: findings.length, icon: '🎯', color: 'var(--teal)', muted: 'var(--teal-muted)' },
          { label: 'Critical', value: criticalCount, icon: '🔴', color: 'var(--danger)', muted: 'var(--danger-muted)' },
          { label: 'Open / Active', value: openCount, icon: '⚡', color: 'var(--warning)', muted: 'var(--warning-muted)' },
          { label: 'Confirmed', value: confirmedCount, icon: '✅', color: 'var(--success)', muted: 'var(--success-muted)' },
        ].map((stat) => (
          <div key={stat.label} className="col-6 col-xl-3">
            <div className="stat-card" style={{ ['--stat-color' as string]: stat.color, ['--stat-color-muted' as string]: stat.muted }}>
              <div className="stat-card-icon">{stat.icon}</div>
              <div className="stat-card-value">{isLoading ? '—' : stat.value}</div>
              <div className="stat-card-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="card">
        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="search-wrapper" style={{ flex: 1, minWidth: 200 }}>
            <span className="search-icon">🔍</span>
            <input
              id="finding-search"
              type="text"
              className="form-control"
              placeholder="Search findings, case #, MITRE technique..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <select
            id="finding-filter-severity"
            className="form-select"
            style={{ width: 'auto' }}
            value={filters.severity}
            onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))}
          >
            {SEVERITY_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            id="finding-filter-status"
            className="form-select"
            style={{ width: 'auto' }}
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {(filters.search || filters.status || filters.severity) && (
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setFilters({ search: '', status: '', severity: '' })}
            >
              Clear
            </button>
          )}
        </div>

        {/* Table Body */}
        <div className="card-body" style={{ padding: 0 }}>
          {error ? (
            <div className="alert alert-danger m-4">
              ⚠️ Failed to load findings from Supabase. Make sure you've run migration 004.
            </div>
          ) : isLoading ? (
            <div style={{ padding: 24 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 8 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎯</div>
              <div className="empty-state-title">
                {filters.search || filters.status || filters.severity
                  ? 'No findings match your filters'
                  : 'No findings yet'}
              </div>
              <div className="empty-state-text">
                {filters.search || filters.status || filters.severity
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Document investigation findings as you uncover them during your analysis.'}
              </div>
              {!filters.search && !filters.status && !filters.severity && (
                <Link to="/findings/new" className="btn btn-primary">
                  Create First Finding
                </Link>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table table-clickable mb-0">
                <thead>
                  <tr>
                    <th>Finding #</th>
                    <th>Title</th>
                    <th>Case</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>MITRE Tactic</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr
                      key={f.id}
                      onClick={() => navigate(`/findings/${f.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <span className="font-mono" style={{ color: 'var(--teal)', fontSize: 12 }}>
                          {f.finding_number}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                          {f.title}
                        </div>
                        {f.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                            {f.tags.slice(0, 2).map((tag) => (
                              <span key={tag} style={{ fontSize: 10, background: 'var(--purple-muted)', color: 'var(--purple)', padding: '1px 6px', borderRadius: 20 }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        {f.case ? (
                          <Link
                            to={`/cases/${f.case_id}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: 'var(--teal)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                          >
                            {f.case.case_number}
                          </Link>
                        ) : '—'}
                      </td>
                      <td><SeverityBadge severity={f.severity} /></td>
                      <td><FindingStatusBadge status={f.status} /></td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {f.mitre_tactic ?? '—'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                          <Link
                            to={`/findings/${f.id}`}
                            className="btn btn-sm btn-outline-primary"
                            id={`btn-view-finding-${f.id}`}
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer count */}
        {filtered.length > 0 && (
          <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {filtered.length} of {findings.length} findings
          </div>
        )}
      </div>
    </div>
  );
}
