import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { Correlation, GraphData } from '@/types';
import InvestigationGraph from '@/components/InvestigationGraph';

interface CaseCorrelationsTabProps {
  caseId: string;
}

const defaultGraphData: GraphData = { nodes: [], edges: [] };

const severityConfig: Record<string, { bg: string; color: string; label: string }> = {
  critical: { bg: 'var(--danger-muted)', color: 'var(--danger)', label: 'Critical' },
  high: { bg: 'var(--orange-muted)', color: 'var(--orange)', label: 'High' },
  medium: { bg: 'var(--warning-muted)', color: 'var(--warning)', label: 'Medium' },
  low: { bg: 'var(--success-muted)', color: 'var(--success)', label: 'Low' },
};

const SeverityBadge = ({ severity }: { severity: string }) => {
  const cfg = severityConfig[severity] || { bg: 'var(--bg-input)', color: 'var(--text-muted)', label: severity };
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      padding: '3px 10px', borderRadius: '999px',
      fontSize: '11px', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.06em'
    }}>
      {cfg.label}
    </span>
  );
};

const ConfidenceBar = ({ score }: { score: number }) => {
  const color = score >= 85 ? 'var(--danger)' : score >= 65 ? 'var(--orange)' : 'var(--warning)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 700, color, minWidth: '34px', textAlign: 'right' }}>{score}%</span>
    </div>
  );
};

const CaseCorrelationsTab: React.FC<CaseCorrelationsTabProps> = ({ caseId }) => {
  const [activeView, setActiveView] = useState<'graph' | 'list'>('graph');
  const [runSuccess, setRunSuccess] = useState(false);
  const queryClient = useQueryClient();

  const { data: correlations = [], isLoading: isLoadingCorrelations, refetch: refetchCorrelations } = useQuery<Correlation[]>({
    queryKey: ['correlations', caseId],
    queryFn: async () => {
      const res = await apiClient.get(`/correlations/case/${caseId}`);
      return (res.data || []) as Correlation[];
    },
    staleTime: 0,
    refetchInterval: (query) => {
      const d = (query as unknown as { state: { data: Correlation[] | undefined } }).state?.data;
      return !d || d.length === 0 ? 5000 : false;
    },
  });

  const { data: graphData, isLoading: isLoadingGraph, refetch: refetchGraph } = useQuery<GraphData>({
    queryKey: ['correlation_graph', caseId],
    queryFn: async () => {
      const res = await apiClient.get(`/correlations/case/${caseId}/graph`);
      return (res.data || { nodes: [], edges: [] }) as GraphData;
    },
    staleTime: 0,
    refetchInterval: (query) => {
      const gd = (query as unknown as { state: { data: GraphData | undefined } }).state?.data;
      return (!gd || (gd.nodes || []).length === 0) ? 5000 : false;
    },
  });

  const runEngineMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/correlations/case/${caseId}/run`);
      return res.data;
    },
    onSuccess: () => {
      setRunSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['correlations', caseId] });
      queryClient.invalidateQueries({ queryKey: ['correlation_graph', caseId] });
      refetchCorrelations();
      refetchGraph();
      setTimeout(() => setRunSuccess(false), 6000);
    }
  });

  // Compute summary stats
  const criticalCount = correlations.filter(c => c.correlation_severity === 'critical').length;
  const highCount = correlations.filter(c => c.correlation_severity === 'high').length;
  const avgConfidence = correlations.length
    ? Math.round(correlations.reduce((acc, c) => acc + c.confidence_score, 0) / correlations.length)
    : 0;

  if (isLoadingCorrelations || isLoadingGraph) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--teal)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading investigation intelligence...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Header ── */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius-lg)',
        padding: '20px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '20px' }}>🕸️</span>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
              Investigation Intelligence
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Automated multi-source IOC correlation &amp; attack chain visualisation
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '8px', padding: '3px', gap: '3px' }}>
            {(['graph', 'list'] as const).map(v => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                style={{
                  padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s',
                  background: activeView === v ? 'var(--teal)' : 'transparent',
                  color: activeView === v ? '#000' : 'var(--text-muted)',
                }}
              >
                {v === 'graph' ? '🗺️ Attack Chain Graph' : `📋 IOC List${correlations.length > 0 ? ` (${correlations.length})` : ''}`}
              </button>
            ))}
          </div>

          {/* Run Engine button */}
          <button
            onClick={() => runEngineMutation.mutate()}
            disabled={runEngineMutation.isPending}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: runEngineMutation.isPending ? 'not-allowed' : 'pointer',
              background: runEngineMutation.isPending ? 'var(--bg-input)' : 'linear-gradient(135deg, var(--teal), var(--teal-dark))',
              color: runEngineMutation.isPending ? 'var(--text-muted)' : '#000',
              fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s',
              boxShadow: runEngineMutation.isPending ? 'none' : 'var(--teal-glow)',
            }}
          >
            {runEngineMutation.isPending ? (
              <><span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid var(--text-muted)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Running...</>
            ) : '▶ Run Engine'}
          </button>
        </div>
      </div>

      {/* ── Status banners ── */}
      {runSuccess && (
        <div style={{ background: 'var(--success-muted)', border: '1px solid var(--success)', borderRadius: 'var(--border-radius)', padding: '12px 16px', color: 'var(--success)', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ✅ Engine completed — <strong>{correlations.length}</strong> correlation(s) found and saved.
        </div>
      )}
      {runEngineMutation.isError && (
        <div style={{ background: 'var(--danger-muted)', border: '1px solid var(--danger)', borderRadius: 'var(--border-radius)', padding: '12px 16px', color: 'var(--danger)', fontWeight: 600, fontSize: '14px' }}>
          ❌ Engine failed. Ensure the Supabase SQL migration has been applied.
        </div>
      )}

      {/* ── Stats row (only show when data exists) ── */}
      {correlations.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'Total Correlations', value: correlations.length, color: 'var(--teal)', icon: '🔗' },
            { label: 'Critical IOCs', value: criticalCount, color: 'var(--danger)', icon: '🚨' },
            { label: 'High Severity', value: highCount, color: 'var(--orange)', icon: '⚠️' },
            { label: 'Avg Confidence', value: `${avgConfidence}%`, color: 'var(--purple)', icon: '📊' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>{stat.icon}</span>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Main content ── */}
      {activeView === 'graph' ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
          {/* Legend */}
          {graphData && graphData.nodes && graphData.nodes.length > 0 && (
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend:</span>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {[
                  { color: 'var(--teal)', label: 'Evidence Source' },
                  { color: 'var(--orange)', label: 'IOC (Medium/High)' },
                  { color: 'var(--danger)', label: 'IOC (Critical)' },
                  { color: 'var(--success)', label: 'Generated Finding' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: l.color, border: `2px solid ${l.color}`, opacity: 0.8 }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ padding: '0' }}>
            <InvestigationGraph data={graphData || defaultGraphData} />
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
              Multi-Source Indicators of Compromise
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {correlations.length} indicator{correlations.length !== 1 ? 's' : ''} found
            </span>
          </div>

          {correlations.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-input)' }}>
                    {['Indicator', 'Type', 'Sources', 'Confidence', 'Severity', 'Threat Category'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {correlations.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--teal)', fontWeight: 600, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.ioc}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 8px', background: 'var(--bg-input)', color: 'var(--text-secondary)', borderRadius: '4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {c.ioc_type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(c.related_sources || []).map(s => (
                            <span key={s} style={{ padding: '2px 8px', background: 'var(--teal-muted)', color: 'var(--teal)', borderRadius: '4px', fontSize: '11px', fontWeight: 600, textTransform: 'capitalize' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', minWidth: '140px' }}>
                        <ConfidenceBar score={c.confidence_score} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <SeverityBadge severity={c.correlation_severity} />
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {c.enrichment_data?.threat_category || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.4 }}>🕸️</div>
              <p style={{ color: 'var(--text-heading)', fontWeight: 600, fontSize: '15px', margin: '0 0 6px' }}>No correlations found yet</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                Click <strong style={{ color: 'var(--teal)' }}>▶ Run Engine</strong> to scan this case for multi-source IOC matches.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CaseCorrelationsTab;
