import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SeverityBadge } from '@/components/shared/Badges';
import { FindingStatusBadge, SEVERITIES, FINDING_STATUSES, type Finding } from './FindingsList';
import FindingForm, { type FindingFormData } from './FindingForm';
import { format } from 'date-fns';

export default function FindingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: finding, isLoading, error } = useQuery({
    queryKey: ['findings', id],
    queryFn: async (): Promise<Finding> => {
      const { data, error } = await supabase
        .from('findings')
        .select(`
          *,
          case:cases(id, case_number, title),
          evidence:evidence(id, evidence_number, original_file_name)
        `)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as Finding;
    },
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('findings').delete().eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      navigate('/findings');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: Finding['status']) => {
      const { error } = await supabase
        .from('findings')
        .update({ status: newStatus })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings', id] });
      queryClient.invalidateQueries({ queryKey: ['findings', 'list'] });
    },
  });

  if (isLoading) {
    return (
      <div style={{ padding: 32 }}>
        {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 80, marginBottom: 16, borderRadius: 10 }} />)}
      </div>
    );
  }

  if (error || !finding) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❌</div>
        <div className="empty-state-title">Finding not found</div>
        <Link to="/findings" className="btn btn-primary">Back to Findings</Link>
      </div>
    );
  }

  // ── Edit Mode ─────────────────────────────────────────────
  if (isEditing) {
    const initialData: Partial<FindingFormData> = {
      case_id: finding.case_id,
      evidence_id: finding.evidence_id ?? '',
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      category: finding.category ?? '',
      mitre_tactic: finding.mitre_tactic ?? '',
      mitre_technique: finding.mitre_technique ?? '',
      status: finding.status,
      tags: finding.tags,
      ioc_indicators: finding.ioc_indicators ?? [],
      recommendations: finding.recommendations ?? '',
    };
    return (
      <FindingForm
        mode="edit"
        findingId={id}
        initialData={initialData}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['findings', id] });
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  const severityConfig = SEVERITIES.find((s) => s.value === finding.severity);

  // ── View Mode ─────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Link to="/findings" style={{ color: 'var(--text-muted)', fontSize: 13 }}>← Findings</Link>
            <span style={{ color: 'var(--border-color)' }}>›</span>
            <span className="font-mono" style={{ color: 'var(--teal)', fontSize: 13 }}>{finding.finding_number}</span>
          </div>
          <h1 className="page-header-title" style={{ marginBottom: 8 }}>{finding.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <SeverityBadge severity={finding.severity} />
            <FindingStatusBadge status={finding.status} />
            {finding.case && (
              <Link
                to={`/cases/${finding.case_id}`}
                style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
              >
                📁 {(finding.case as any).case_number}
              </Link>
            )}
          </div>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-outline-secondary"
            onClick={() => setIsEditing(true)}
            id="btn-edit-finding"
          >
            ✏️ Edit
          </button>
          <button
            className="btn btn-danger"
            onClick={() => setShowDeleteConfirm(true)}
            id="btn-delete-finding"
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{ background: 'var(--bg-modal)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 32, maxWidth: 420, width: '90%', textAlign: 'center', boxShadow: 'var(--shadow-modal)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ color: 'var(--text-heading)', marginBottom: 12 }}>Delete Finding?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
              <strong>{finding.finding_number}</strong> will be permanently deleted.
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-outline-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="row g-3">
        {/* Main Content */}
        <div className="col-12 col-xl-8">
          {/* Description */}
          <div className="card mb-3">
            <div className="card-header">
              <h6 style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>📋 Description</h6>
            </div>
            <div className="card-body">
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>
                {finding.description}
              </p>
            </div>
          </div>

          {/* MITRE ATT&CK */}
          {(finding.mitre_tactic || finding.mitre_technique) && (
            <div className="card mb-3">
              <div className="card-header">
                <h6 style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>🛡️ MITRE ATT&CK</h6>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {finding.mitre_tactic && (
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Tactic</div>
                      <span style={{ background: 'var(--purple-muted)', color: 'var(--purple)', padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1px solid rgba(139,92,246,0.3)' }}>
                        {finding.mitre_tactic}
                      </span>
                    </div>
                  )}
                  {finding.mitre_technique && (
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Technique</div>
                      <a
                        href={`https://attack.mitre.org/techniques/${finding.mitre_technique.split(' ')[0]}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono"
                        style={{ color: 'var(--teal)', fontSize: 13 }}
                      >
                        {finding.mitre_technique} ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* IOC Indicators */}
          {finding.ioc_indicators && finding.ioc_indicators.length > 0 && (
            <div className="card mb-3">
              <div className="card-header">
                <h6 style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>
                  🔍 IOC Indicators
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                    ({finding.ioc_indicators.length})
                  </span>
                </h6>
              </div>
              <div className="card-body" style={{ padding: '12px 20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {finding.ioc_indicators.map((ioc, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--teal-muted)', color: 'var(--teal)', padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', flexShrink: 0 }}>
                        {ioc.type}
                      </span>
                      <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1, wordBreak: 'break-all' }}>
                        {ioc.value}
                      </span>
                      {ioc.description && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                          {ioc.description}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {finding.recommendations && (
            <div className="card mb-3">
              <div className="card-header">
                <h6 style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>📝 Recommendations</h6>
              </div>
              <div className="card-body">
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {finding.recommendations}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-12 col-xl-4">
          {/* Meta */}
          <div className="card mb-3">
            <div className="card-header">
              <h6 style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Details</h6>
            </div>
            <div className="card-body" style={{ padding: '16px 20px' }}>
              {[
                { label: 'Finding #', value: <span className="font-mono" style={{ color: 'var(--teal)' }}>{finding.finding_number}</span> },
                { label: 'Severity', value: <SeverityBadge severity={finding.severity} /> },
                { label: 'Status', value: <FindingStatusBadge status={finding.status} /> },
                { label: 'Category', value: finding.category ? finding.category.replace('_', ' ') : '—' },
                { label: 'Case', value: finding.case ? <Link to={`/cases/${finding.case_id}`} style={{ color: 'var(--teal)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{(finding.case as any).case_number}</Link> : '—' },
                { label: 'Evidence', value: finding.evidence ? <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{(finding.evidence as any).original_file_name}</span> : '—' },
                { label: 'Created', value: format(new Date(finding.created_at), 'PPP') },
                { label: 'Updated', value: format(new Date(finding.updated_at), 'PPP') },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Status Change */}
          <div className="card mb-3">
            <div className="card-header">
              <h6 style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Update Status</h6>
            </div>
            <div className="card-body" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {FINDING_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => updateStatusMutation.mutate(s.value as Finding['status'])}
                    disabled={finding.status === s.value || updateStatusMutation.isPending}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: `1px solid ${finding.status === s.value ? s.color + '44' : 'var(--border-subtle)'}`,
                      background: finding.status === s.value ? `${s.color}18` : 'transparent',
                      color: finding.status === s.value ? s.color : 'var(--text-secondary)',
                      cursor: finding.status === s.value ? 'default' : 'pointer',
                      fontSize: 12,
                      fontWeight: finding.status === s.value ? 700 : 400,
                      transition: 'var(--transition)',
                    }}
                  >
                    {finding.status === s.value && <span>✓</span>}
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tags */}
          {finding.tags.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h6 style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Tags</h6>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {finding.tags.map((tag) => (
                    <span key={tag} style={{ background: 'var(--purple-muted)', color: 'var(--purple)', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: '1px solid rgba(139,92,246,0.2)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
