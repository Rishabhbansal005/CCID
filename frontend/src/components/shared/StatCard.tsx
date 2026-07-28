import React from 'react';

interface StatCardProps {
  icon?: React.ReactNode;
  label: string;
  value: number | string;
  color?: string;
  colorMuted?: string;
  change?: { value: number; label: string };
  onClick?: () => void;
}

export default function StatCard({
  icon,
  label,
  value,
  color = 'var(--accent)',
  colorMuted = 'var(--accent-muted)',
  change,
  onClick,
}: StatCardProps) {
  return (
    <div
      className="stat-card"
      style={{
        ['--stat-color' as string]: color,
        ['--stat-color-muted' as string]: colorMuted,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      {icon && (
        <div className="stat-card-icon">{icon}</div>
      )}
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {change && (
        <div
          className="stat-card-change"
          style={{ color: change.value >= 0 ? 'var(--status-ok)' : 'var(--status-crit)' }}
        >
          <span>{change.value >= 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(change.value)}% {change.label}</span>
        </div>
      )}
    </div>
  );
}
