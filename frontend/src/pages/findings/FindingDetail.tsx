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
          evidence:evidence(id, evidence_number, file_name, storage_path)
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

  const handleDownloadEvidence = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('forensic_uploads')
        .createSignedUrl(storagePath, 3600); // 1 hour

      if (error) throw error;
      
      // Trigger download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download evidence:', err);
      alert('Failed to download evidence. Please try again.');
    }
  };

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
                style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textDecoration: 'none', background: 'var(--bg-input)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border-subtle)' }}
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

      <div className="row" style={{ gap: '24px', flexWrap: 'wrap', margin: 0 }}>
        {/* Main Content */}
        <div style={{ flex: '1 1 65%', minWidth: '320px', padding: 0 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 32 }}>
              
              {/* Description */}
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Description
                </h3>
                <p style={{ color: 'var(--text-primary)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', fontSize: 15 }}>
                  {finding.description}
                </p>
              </div>

              {/* MITRE ATT&CK */}
              {(finding.mitre_tactic || finding.mitre_technique) && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 32 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    MITRE ATT&CK
                  </h3>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {finding.mitre_tactic && (
                      <div style={{ background: 'var(--bg-input)', padding: '10px 16px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>TACTIC</span>
                        <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>{finding.mitre_tactic}</span>
                      </div>
                    )}
                    {finding.mitre_technique && (
                      <div style={{ background: 'var(--bg-input)', padding: '10px 16px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>TECHNIQUE</span>
                        <a
                          href={`https://attack.mitre.org/techniques/${finding.mitre_technique.split(' ')[0]}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono"
                          style={{ color: 'var(--teal)', fontSize: 14, textDecoration: 'none', fontWeight: 600 }}
                        >
                          {finding.mitre_technique} ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* IOC Indicators */}
              {finding.ioc_indicators && finding.ioc_indicators.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 32 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8 }}>
                    IOC Indicators
                    <span style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
                      {finding.ioc_indicators.length}
                    </span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {finding.ioc_indicators.map((ioc, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', width: 60, textTransform: 'uppercase' }}>
                          {ioc.type}
                        </span>
                        <span className="font-mono" style={{ fontSize: 14, color: 'var(--text-primary)', flex: 1, wordBreak: 'break-all' }}>
                          {ioc.value}
                        </span>
                        {ioc.description && (
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ioc.description}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {finding.recommendations && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 32 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Recommendations
                  </h3>
                  <div style={{ padding: '16px 20px', background: 'var(--bg-input)', borderRadius: 12, borderLeft: '3px solid var(--success)' }}>
                    <p style={{ color: 'var(--text-primary)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', fontSize: 15 }}>
                      {finding.recommendations}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ flex: '1 1 30%', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Details Panel */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)', margin: '0 0 20px 0' }}>Details</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Finding #', value: <span className="font-mono" style={{ color: 'var(--teal)' }}>{finding.finding_number}</span> },
                { label: 'Severity', value: <SeverityBadge severity={finding.severity} /> },
                { label: 'Status', value: <FindingStatusBadge status={finding.status} /> },
                { label: 'Category', value: <span style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>{finding.category ? finding.category.replace('_', ' ') : '—'}</span> },
                { label: 'Case', value: finding.case ? <Link to={`/cases/${finding.case_id}`} style={{ color: 'var(--teal)', fontFamily: 'var(--font-mono)', fontSize: 14, textDecoration: 'none' }} title={(finding.case as any).case_number}>{(finding.case as any).case_number}</Link> : '—' },
                { label: 'Evidence', value: finding.evidence ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', overflow: 'hidden' }}>
                    <span style={{ fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={(finding.evidence as any).file_name}>{(finding.evidence as any).file_name}</span>
                    {(finding.evidence as any).storage_path && (
                      <button
                        onClick={() => handleDownloadEvidence((finding.evidence as any).storage_path, (finding.evidence as any).file_name)}
                        style={{ background: 'var(--bg-input)', border: 'none', padding: '4px 8px', color: 'var(--teal)', cursor: 'pointer', fontSize: 12, borderRadius: 6, flexShrink: 0, fontWeight: 500 }}
                        title="Download Evidence"
                      >
                        Get
                      </button>
                    )}
                  </div>
                ) : '—' },
                { label: 'Created', value: <span style={{ color: 'var(--text-primary)' }}>{format(new Date(finding.created_at), 'PPP')}</span> },
                { label: 'Updated', value: <span style={{ color: 'var(--text-primary)' }}>{format(new Date(finding.updated_at), 'PPP')}</span> },
              ].map(({ label, value }, i) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i !== 7 ? 12 : 0, borderBottom: i !== 7 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'right', maxWidth: '65%', display: 'flex', justifyContent: 'flex-end', overflow: 'hidden' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Update Status Panel */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)', margin: '0 0 16px 0' }}>Update Status</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FINDING_STATUSES.map((s) => {
                const isActive = finding.status === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => updateStatusMutation.mutate(s.value as Finding['status'])}
                    disabled={isActive || updateStatusMutation.isPending}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 16px',
                      borderRadius: 10,
                      border: 'none',
                      background: isActive ? `${s.color}15` : 'var(--bg-input)',
                      color: isActive ? s.color : 'var(--text-primary)',
                      cursor: isActive ? 'default' : 'pointer',
                      fontSize: 14,
                      fontWeight: isActive ? 600 : 400,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {s.label}
                    {isActive && <span style={{ fontSize: 16 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags Panel */}
          {finding.tags.length > 0 && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)', margin: '0 0 16px 0' }}>Tags</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {finding.tags.map((tag) => (
                  <span key={tag} style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
