import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import findingsApi from '@/api/findings';
import { format } from 'date-fns';
import type { FindingSeverity, FindingStatus } from '@/types';

interface CaseFindingsProps {
  caseId: string;
}

export default function CaseFindings({ caseId }: CaseFindingsProps) {
  const [severityFilter, setSeverityFilter] = useState<FindingSeverity | ''>('');
  const [statusFilter, setStatusFilter] = useState<FindingStatus | ''>('');

  const { data: findings, isLoading, error } = useQuery({
    queryKey: ['findings', caseId],
    queryFn: () => findingsApi.listForCase(caseId),
  });

  if (isLoading) {
    return <div className="text-center p-4">Loading findings...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">Error loading findings.</div>;
  }

  const getSeverityBadge = (severity: FindingSeverity) => {
    switch (severity) {
      case 'critical': return <span className="badge bg-danger">Critical</span>;
      case 'high': return <span className="badge bg-warning text-dark">High</span>;
      case 'medium': return <span className="badge bg-info text-dark">Medium</span>;
      case 'low': return <span className="badge bg-secondary">Low</span>;
      case 'informational': return <span className="badge bg-light text-dark border">Info</span>;
      default: return <span className="badge bg-secondary">{severity}</span>;
    }
  };

  const filteredFindings = findings?.filter(f => 
    (!severityFilter || f.severity === severityFilter) &&
    (!statusFilter || f.status === statusFilter)
  ) || [];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex gap-3">
          <select 
            className="form-select form-select-sm" 
            style={{ width: 180 }}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as FindingSeverity | '')}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="informational">Informational</option>
          </select>
          <select 
            className="form-select form-select-sm" 
            style={{ width: 180 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FindingStatus | '')}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="confirmed">Confirmed</option>
            <option value="false_positive">False Positive</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {filteredFindings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <div className="empty-state-title">No Findings</div>
          <div className="empty-state-text">No findings match your filters or have been created yet.</div>
        </div>
      ) : (
        <div className="row g-4">
          {filteredFindings.map((finding) => (
            <div key={finding.id} className="col-12 col-xl-6">
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="card-title mb-0" style={{ fontSize: 16 }}>{finding.title}</h5>
                    <div>{getSeverityBadge(finding.severity)}</div>
                  </div>
                  <p className="card-text" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                    {finding.description}
                  </p>
                  
                  <div className="mt-3">
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Indicators of Compromise:</div>
                    {finding.ioc_indicators && finding.ioc_indicators.length > 0 ? (
                      <div className="d-flex flex-wrap gap-2">
                        {finding.ioc_indicators.map((ioc, idx) => (
                          <span key={idx} className="badge" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--teal)' }}>
                            {ioc.type.toUpperCase()}: {ioc.value}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>None recorded</span>
                    )}
                  </div>
                </div>
                <div className="card-footer bg-transparent" style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)' }}>
                  <span>Status: <strong style={{ textTransform: 'capitalize' }}>{finding.status.replace('_', ' ')}</strong></span>
                  <span>{finding.analysis_source ? `Source: ${finding.analysis_source}` : format(new Date(finding.created_at), 'MMM d, yyyy HH:mm')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
