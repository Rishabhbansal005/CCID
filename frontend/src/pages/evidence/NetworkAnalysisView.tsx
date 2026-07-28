import React, { useEffect, useState } from 'react';
import { NetworkAnalysisResult } from '@/types';
import { networkApi } from '@/api/network';

interface Props {
  evidenceId: string;
}

const NetworkAnalysisView: React.FC<Props> = ({ evidenceId }) => {
  const [result, setResult] = useState<NetworkAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = async () => {
    try {
      const data = await networkApi.getResults(evidenceId);
      setResult(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setResult(null); // No analysis has been done yet
      } else {
        setError('Failed to load network analysis results');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
    const interval = setInterval(() => {
      if (result?.analysis_status === 'analyzing' || result?.analysis_status === 'pending') {
        fetchResults();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [evidenceId, result?.analysis_status]);

  if (loading) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Loading network analysis...</div>;
  if (error) return <div style={{ padding: 20, color: '#ef4444' }}>{error}</div>;

  if (!result) return null;

  return (
    <div className="detail-card" style={{ marginTop: '24px' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Network Analysis Results</h2>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: result.analysis_status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            color: result.analysis_status === 'completed' ? '#10b981' : '#f59e0b',
          }}
        >
          {result.analysis_status.toUpperCase()}
        </span>
      </div>

      <div style={{ padding: '20px' }}>
        {result.analysis_status === 'completed' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            
            {/* Protocol Stats */}
            <div className="detail-card">
              <div className="card-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>Protocol Distribution</h3>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Object.entries(result.protocol_stats).map(([proto, count]) => (
                  <div key={proto} style={{ padding: '4px 8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '12px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--teal)' }}>{proto}:</span> {count as number} pkts
                  </div>
                ))}
              </div>
            </div>

            {/* Suspicious Indicators */}
            <div className="detail-card" style={{ border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div className="card-header" style={{ padding: '12px 16px', borderBottom: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                <h3 style={{ margin: 0, fontSize: '14px', color: '#fca5a5' }}>Suspicious Indicators Detected</h3>
              </div>
              <div style={{ padding: '16px', maxHeight: '250px', overflowY: 'auto' }}>
                {result.suspicious_indicators.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {result.suspicious_indicators.map((ind, i) => (
                      <li key={i} style={{ paddingLeft: '12px', borderLeft: '3px solid #ef4444' }}>
                        <div style={{ fontWeight: 'bold', color: '#fca5a5', fontSize: '14px' }}>{ind.value}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>{ind.reason}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>No highly suspicious indicators automatically detected.</p>
                )}
              </div>
            </div>

            {/* Top Talkers */}
            <div className="detail-card" style={{ gridColumn: '1 / -1' }}>
              <div className="card-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>Top IP Conversations (Top Talkers)</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>Source IP</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>Destination IP</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>Packets</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>Bytes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.conversations.slice(0, 10).map((conv, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{conv.ip_a}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{conv.ip_b}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{conv.packets}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{(conv.bytes / 1024).toFixed(2)} KB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DNS Queries */}
            <div className="detail-card" style={{ gridColumn: '1 / -1' }}>
              <div className="card-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>Extracted DNS Queries</h3>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>Query Name</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.dns_queries.slice(0, 50).map((dns, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--teal)' }}>{dns.query}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{dns.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            {result.analysis_status === 'analyzing'
              ? 'Analysis is currently running in the background. Please wait...'
              : 'Analysis pending.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkAnalysisView;
