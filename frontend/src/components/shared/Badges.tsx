import React from 'react';
import type { CaseStatus, CasePriority, FindingSeverity, RiskLevel, ProcessingStatus } from '@/types';

// ============================================================
// Status Badge
// ============================================================
interface StatusBadgeProps {
  status: CaseStatus;
}
export function StatusBadge({ status }: StatusBadgeProps) {
  const labels: Record<CaseStatus, string> = {
    open: 'Open',
    active: 'Active',
    pending_review: 'Review',
    closed: 'Closed',
    archived: 'Archived',
  };
  return (
    <span className={`badge badge-status-${status}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ============================================================
// Priority Badge
// ============================================================
interface PriorityBadgeProps {
  priority: CasePriority;
}
export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const icons: Record<CasePriority, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
  };
  return (
    <span className={`badge badge-priority-${priority}`}>
      {icons[priority]} {priority}
    </span>
  );
}

// ============================================================
// Severity Badge
// ============================================================
interface SeverityBadgeProps {
  severity: FindingSeverity;
}
export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span className={`badge badge-severity-${severity}`}>
      {severity}
    </span>
  );
}

// ============================================================
// Risk Level Badge
// ============================================================
interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
}
export function RiskBadge({ level, score }: RiskBadgeProps) {
  return (
    <span className={`badge badge-risk-${level}`}>
      {score != null ? `${score}/25` : level}
    </span>
  );
}

// ============================================================
// Processing Status Badge
// ============================================================
interface ProcessingBadgeProps {
  status: ProcessingStatus;
}
export function ProcessingBadge({ status }: ProcessingBadgeProps) {
  const configs: Record<ProcessingStatus, { label: string; style: React.CSSProperties }> = {
    pending: { label: 'Pending', style: { background: 'var(--warning-muted)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.3)' } },
    processing: { label: 'Processing...', style: { background: 'var(--info-muted)', color: 'var(--info)', border: '1px solid rgba(59, 130, 246, 0.3)' } },
    analyzed: { label: 'Analyzed', style: { background: 'var(--success-muted)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)' } },
    error: { label: 'Error', style: { background: 'var(--danger-muted)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)' } },
    skipped: { label: 'Skipped', style: { background: 'rgba(100,116,139,0.15)', color: 'var(--text-muted)' } },
  };
  const { label, style } = configs[status] ?? configs.pending;
  return <span className="badge" style={style}>{label}</span>;
}
