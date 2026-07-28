import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import apiClient from '@/api/client';
import { format } from 'date-fns';
import { RiskBadge } from '../../risk_assessments/RiskList';

const MatrixCell = ({ l, i, currentL, currentI }: { l: number, i: number, currentL: number, currentI: number }) => {
  const score = l * i;
  let bg = 'var(--bg-input)';
  let color = 'var(--text-muted)';
  
  if (score >= 15) { bg = 'var(--danger-muted)'; color = 'var(--danger)'; }
  else if (score >= 10) { bg = 'var(--orange-muted)'; color = 'var(--orange)'; }
  else if (score >= 5) { bg = 'var(--warning-muted)'; color = 'var(--warning)'; }
  else { bg = 'var(--success-muted)'; color = 'var(--success)'; }

  const isActive = l === currentL && i === currentI;

  return (
    <div style={{
      aspectRatio: '1',
      background: bg,
      color: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 16,
      fontWeight: 700,
      borderRadius: 8,
      border: isActive ? `3px solid ${color}` : `1px solid ${color}33`,
      boxShadow: isActive ? `0 0 15px ${color}66` : 'none',
      opacity: isActive ? 1 : 0.6,
      transform: isActive ? 'scale(1.1)' : 'scale(1)',
      zIndex: isActive ? 10 : 1,
      transition: 'all 0.2s ease',
    }}>
      {score}
    </div>
  );
};

export default function CaseRiskTab({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();

  const { data: assessment, isLoading, error } = useQuery({
    queryKey: ['risk_assessments_case', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_assessments')
        .select(`*, assessor:users!risk_assessments_assessed_by_fkey(full_name)`)
        .eq('case_id', caseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!caseId,
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/risk/case/${caseId}/auto-update`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk_assessments_case', caseId] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || err.message || 'Failed to recalculate risk');
    }
  });

  if (isLoading) {
    return <div style={{ padding: 32 }}><div className="skeleton" style={{ height: 200, borderRadius: 16 }} /></div>;
  }

  if (error || !assessment) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🛡️</div>
        <div className="empty-state-title">No Risk Assessment</div>
        <div className="empty-state-text">A risk assessment has not been generated for this case yet.</div>
        <button 
          className="btn btn-primary" 
          onClick={() => recalculateMutation.mutate()} 
          disabled={recalculateMutation.isPending}
        >
          {recalculateMutation.isPending ? 'Generating...' : 'Generate Auto-Assessment'}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-heading)', margin: 0 }}>Case Risk Profile</h3>
        <button 
          className="btn btn-outline-secondary" 
          onClick={() => recalculateMutation.mutate()} 
          disabled={recalculateMutation.isPending}
        >
          {recalculateMutation.isPending ? 'Recalculating...' : '🔄 Force Recalculate'}
        </button>
      </div>

      <div className="row" style={{ gap: '24px', flexWrap: 'wrap', margin: 0 }}>
        {/* Left Content */}
        <div style={{ flex: '1 1 60%', minWidth: '320px', padding: 0 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-subtle)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 32 }}>
              
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Threat Actors</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {assessment.threat_actors?.length > 0 ? assessment.threat_actors.map((ta: any, idx: number) => (
                    <span key={idx} style={{ background: 'var(--danger-muted)', color: 'var(--danger)', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
                      {ta.name}
                    </span>
                  )) : <span style={{ color: 'var(--text-muted)' }}>None identified</span>}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 32 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Affected Assets</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {assessment.affected_assets?.length > 0 ? assessment.affected_assets.map((aa: any, idx: number) => (
                    <span key={idx} style={{ background: 'var(--teal-muted)', color: 'var(--teal)', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
                      {aa.name}
                    </span>
                  )) : <span style={{ color: 'var(--text-muted)' }}>None identified</span>}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 32 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Vulnerabilities / Indicators</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {assessment.vulnerabilities?.length > 0 ? assessment.vulnerabilities.map((v: any, idx: number) => (
                    <span key={idx} style={{ background: 'var(--purple-muted)', color: 'var(--purple)', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
                      {v.name}
                    </span>
                  )) : <span style={{ color: 'var(--text-muted)' }}>None identified</span>}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 32 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mitigation Measures</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {assessment.mitigation_measures?.length > 0 ? assessment.mitigation_measures.map((mm: any, idx: number) => (
                    <span key={idx} style={{ background: 'var(--success-muted)', color: 'var(--success)', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
                      {mm.name}
                    </span>
                  )) : <span style={{ color: 'var(--text-muted)' }}>None identified</span>}
                </div>
              </div>

              {assessment.analyst_notes && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 32 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Analyst Notes</h3>
                  <div style={{ padding: '16px 20px', background: 'var(--bg-input)', borderRadius: 12, borderLeft: '3px solid var(--teal)' }}>
                    <p style={{ color: 'var(--text-primary)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', fontSize: 14 }}>
                      {assessment.analyst_notes}
                    </p>
                  </div>
                </div>
              )}
              
            </div>
          </div>
        </div>

        {/* Right Sidebar: Matrix & Meta */}
        <div style={{ flex: '1 1 35%', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Risk Matrix */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)', margin: '0 0 20px 0' }}>Risk Matrix (5x5)</h4>
            
            <div style={{ display: 'flex', gap: 16 }}>
              {/* Y-axis label */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Likelihood
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  {[5, 4, 3, 2, 1].map((l) => (
                    <React.Fragment key={`row-${l}`}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <MatrixCell key={`${l}-${i}`} l={l} i={i} currentL={assessment.likelihood} currentI={assessment.impact} />
                      ))}
                    </React.Fragment>
                  ))}
                </div>
                {/* X-axis label */}
                <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 8 }}>
                  Impact
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '20px 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Score Calculation</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>
                  L({assessment.likelihood}) × I({assessment.impact}) = {assessment.overall_risk_score}
                </div>
              </div>
              <RiskBadge level={assessment.risk_level} />
            </div>
          </div>

          {/* Details Meta */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)', margin: '0 0 20px 0' }}>Metadata</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Assessed By', value: assessment.assessor?.full_name || 'System' },
                { label: 'Updated', value: format(new Date(assessment.created_at), 'PPP') },
              ].map(({ label, value }, i) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i !== 1 ? 12 : 0, borderBottom: i !== 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'right', overflow: 'hidden' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
