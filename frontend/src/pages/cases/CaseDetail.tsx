import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import casesApi from '@/api/cases';
import evidenceApi from '@/api/evidence';
import { StatusBadge, PriorityBadge } from '@/components/shared/Badges';
import { format } from 'date-fns';
import type { CaseStatus, CasePriority } from '@/types';

type ActiveTab = 'overview' | 'evidence' | 'findings' | 'timeline' | 'risk' | 'reports';

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<{ status: CaseStatus; priority: CasePriority; description: string }>({
    status: 'open',
    priority: 'medium',
    description: '',
  });

  const { data: caseData, isLoading, error } = useQuery({
    queryKey: ['case', id],
    queryFn: () => casesApi.get(id!),
    enabled: !!id,
  });

  const { data: stats } = useQuery({
    queryKey: ['case-stats', id],
    queryFn: () => casesApi.getStats(id!),
    enabled: !!id,
  });

  const { data: evidence } = useQuery({
    queryKey: ['evidence', id],
    queryFn: () => evidenceApi.listForCase(id!),
    enabled: !!id && activeTab === 'evidence',
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<typeof editForm>) => casesApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      setEditing(false);
    },
  });

  React.useEffect(() => {
    if (caseData) {
      setEditForm({
        status: caseData.status,
        priority: caseData.priority,
        description: caseData.description ?? '',
      });
    }
  }, [caseData]);

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: 'var(--text-muted)' }}>Loading case...</div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🚫</div>
        <div className="empty-state-title">Case Not Found</div>
        <div className="empty-state-text">This case doesn't exist or you don't have access.</div>
        <Link to="/cases" className="btn btn-primary">Back to Cases</Link>
      </div>
    );
  }

  const c = caseData;

  const TABS: { key: ActiveTab; label: string; count?: number }[] = [
    { key: 'overview', label: '📋 Overview' },
    { key: 'evidence', label: '🔬 Evidence', count: stats?.evidence_count },
    { key: 'findings', label: '🎯 Findings', count: stats?.findings_count },
    { key: 'timeline', label: '📅 Timeline', count: stats?.timeline_events },
    { key: 'risk', label: '🛡️ Risk' },
    { key: 'reports', label: '📄 Reports' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <Link to="/cases" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13 }}>
              ← Cases
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span className="font-mono" style={{ color: 'var(--teal)', fontSize: 13 }}>
              {c.case_number}
            </span>
          </div>
          <h1 className="page-header-title">{c.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <StatusBadge status={c.status} />
            <PriorityBadge priority={c.priority} />
            {c.category && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {c.category.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-outline-secondary"
            onClick={() => setEditing(!editing)}
          >
            {editing ? 'Cancel' : '✏️ Edit'}
          </button>
          <Link to={`/evidence?case=${id}`} className="btn btn-primary">
            + Upload Evidence
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="row g-3 mb-4">
          {[
            { label: 'Evidence', value: stats.evidence_count, icon: '🔬', color: 'var(--teal)' },
            { label: 'Findings', value: stats.findings_count, icon: '🎯', color: 'var(--orange)' },
            { label: 'Critical', value: stats.critical_findings, icon: '🔴', color: 'var(--danger)' },
            { label: 'Events', value: stats.timeline_events, icon: '📅', color: 'var(--purple)' },
          ].map((s) => (
            <div key={s.label} className="col-6 col-xl-3">
              <div className="card" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="card">
        <div style={{ padding: '0 20px' }}>
          <ul className="nav nav-tabs" style={{ marginBottom: 0 }}>
            {TABS.map((tab) => (
              <li key={tab.key} className="nav-item">
                <button
                  className={`nav-link ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="nav-badge" style={{ marginLeft: 6 }}>{tab.count}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-body">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              {editing ? (
                <div>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        value={editForm.status}
                        onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as CaseStatus }))}
                      >
                        {['open','active','pending_review','closed','archived'].map((s) => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label">Priority</label>
                      <select
                        className="form-select"
                        value={editForm.priority}
                        onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value as CasePriority }))}
                      >
                        {['low','medium','high','critical'].map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={editForm.description}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => updateMutation.mutate(editForm)}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button className="btn btn-outline-secondary" onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="row">
                  <div className="col-12 col-md-8">
                    <h6 style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Description</h6>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>
                      {c.description || 'No description provided.'}
                    </p>

                    {c.tags.length > 0 && (
                      <div style={{ marginTop: 20 }}>
                        <h6 style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Tags</h6>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {c.tags.map((tag) => (
                            <span key={tag} style={{ background: 'var(--teal-muted)', color: 'var(--teal)', padding: '4px 10px', borderRadius: 20, fontSize: 12, border: '1px solid rgba(0,212,255,0.2)' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="col-12 col-md-4">
                    <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '16px 20px', border: '1px solid var(--border-subtle)' }}>
                      <h6 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                        Case Details
                      </h6>
                      {[
                        { label: 'Case Number', value: c.case_number, mono: true },
                        { label: 'Status', value: <StatusBadge status={c.status} /> },
                        { label: 'Priority', value: <PriorityBadge priority={c.priority} /> },
                        { label: 'Category', value: c.category?.replace('_', ' ') ?? '—' },
                        { label: 'Jurisdiction', value: c.jurisdiction ?? '—' },
                        { label: 'Assigned To', value: c.assignee?.full_name ?? c.assignee?.email ?? '—' },
                        { label: 'Incident Date', value: c.incident_date ? format(new Date(c.incident_date), 'MMM d, yyyy HH:mm') : '—' },
                        { label: 'Opened', value: format(new Date(c.created_at), 'MMM d, yyyy') },
                      ].map(({ label, value, mono }) => (
                        <div key={label} style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                            {label}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono)' : undefined }}>
                            {value as React.ReactNode}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Evidence Tab */}
          {activeTab === 'evidence' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Link to={`/evidence/upload?case=${id}`} className="btn btn-primary btn-sm">
                  + Upload Evidence
                </Link>
              </div>
              {!evidence || evidence.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🔬</div>
                  <div className="empty-state-title">No Evidence Yet</div>
                  <div className="empty-state-text">Upload digital evidence files to this case.</div>
                  <Link to={`/evidence/upload?case=${id}`} className="btn btn-primary">Upload Evidence</Link>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table mb-0">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Filename</th>
                        <th>Type</th>
                        <th>Size</th>
                        <th>SHA256</th>
                        <th>Uploaded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evidence.map((ev) => (
                        <tr key={ev.id}>
                          <td><span className="font-mono" style={{ color: 'var(--teal)', fontSize: 12 }}>{ev.evidence_number}</span></td>
                          <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{ev.original_file_name}</td>
                          <td style={{ fontSize: 12, textTransform: 'capitalize' }}>{ev.evidence_type}</td>
                          <td style={{ fontSize: 12 }}>{(ev.file_size / 1024 / 1024).toFixed(2)} MB</td>
                          <td>
                            {ev.hash_sha256 && (
                              <span className="hash-display">
                                {ev.hash_sha256.substring(0, 12)}...
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {format(new Date(ev.uploaded_at), 'MMM d, HH:mm')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Coming Soon tabs */}
          {['findings', 'timeline', 'risk', 'reports'].includes(activeTab) && (
            <div className="empty-state">
              <div className="empty-state-icon">🔜</div>
              <div className="empty-state-title">
                {activeTab === 'findings' && 'Findings Management'}
                {activeTab === 'timeline' && 'Investigation Timeline'}
                {activeTab === 'risk' && 'Risk Assessment'}
                {activeTab === 'reports' && 'PDF Reports'}
              </div>
              <div className="empty-state-text">
                This module is ready for Phase 4 implementation. The backend API is fully functional.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
