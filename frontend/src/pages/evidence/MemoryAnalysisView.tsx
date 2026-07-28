import React, { useEffect, useState } from 'react';
import { MemoryAnalysisResult } from '@/types';
import { memoryApi } from '@/api/memory';

interface Props {
  evidenceId: string;
}

const MemoryAnalysisView: React.FC<Props> = ({ evidenceId }) => {
  const [results, setResults] = useState<MemoryAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'pslist' | 'pstree' | 'malfind'>('overview');

  const fetchResults = async () => {
    try {
      const data = await memoryApi.getResults(evidenceId);
      setResults(data);
      if (data.analysis_status === 'pending' || data.analysis_status === 'processing') {
        setTimeout(fetchResults, 5000); // Poll every 5 seconds
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        // No results yet
        setResults(null);
      } else {
        setError('Failed to load memory analysis results');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [evidenceId]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: 'var(--text-muted)' }}>Loading Memory Analysis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>
        {error}
      </div>
    );
  }

  if (!results) {
    return null; // Not analyzed yet
  }

  return (
    <div style={{ marginTop: 24, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Memory Analysis Results</h3>
          {results.memory_profile && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Profile: {results.memory_profile}
            </div>
          )}
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 600,
          background: results.analysis_status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
          color: results.analysis_status === 'completed' ? '#4ade80' : '#facc15',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          {results.analysis_status}
        </div>
      </div>

      {results.analysis_status === 'failed' && (
        <div style={{ padding: 24 }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: 16 }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--danger)', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-icons" style={{ fontSize: 20 }}>error_outline</span>
              Analysis Failed
            </h4>
            <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: 14 }}>
              Volatility encountered an error while analyzing this memory dump.
            </p>
            {results.error_message && (
              <pre style={{ marginTop: 16, background: '#0f172a', padding: 12, borderRadius: 6, fontSize: 12, color: '#fca5a5', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                {results.error_message}
              </pre>
            )}
          </div>
        </div>
      )}

      {results.analysis_status === 'completed' && (
        <>
          {/* Internal Tabs */}
          <div style={{ padding: '0 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-input)' }}>
            <div style={{ display: 'flex', gap: 20 }}>
              {(['overview', 'pslist', 'pstree', 'malfind'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '12px 0',
                    color: activeTab === tab ? 'var(--teal)' : 'var(--text-muted)',
                    fontWeight: activeTab === tab ? 600 : 400,
                    borderBottom: activeTab === tab ? '2px solid var(--teal)' : '2px solid transparent',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: 24 }}>
            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                <div style={{ background: 'var(--bg-input)', padding: 20, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Total Processes</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{results.analysis_summary.total_processes}</div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: 20, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Suspicious Processes</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: results.analysis_summary.suspicious_processes_count > 0 ? 'var(--orange)' : 'var(--text-primary)' }}>
                    {results.analysis_summary.suspicious_processes_count}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: 20, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Malfind Hits</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: results.analysis_summary.malfind_hits > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {results.analysis_summary.malfind_hits}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pslist' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: 12 }}>
                      <th style={{ padding: '12px 8px' }}>PID</th>
                      <th style={{ padding: '12px 8px' }}>PPID</th>
                      <th style={{ padding: '12px 8px' }}>Image Name</th>
                      <th style={{ padding: '12px 8px' }}>Threads</th>
                      <th style={{ padding: '12px 8px' }}>Handles</th>
                      <th style={{ padding: '12px 8px' }}>Create Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.process_list.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
                        <td style={{ padding: '12px 8px', color: 'var(--teal)', fontFamily: 'var(--font-mono)' }}>{p.PID}</td>
                        <td style={{ padding: '12px 8px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.PPID}</td>
                        <td style={{ padding: '12px 8px', color: 'var(--text-primary)' }}>{p.ImageFileName}</td>
                        <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{p.Threads}</td>
                        <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{p.Handles}</td>
                        <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{p.CreateTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'pstree' && (
              <div style={{ background: '#0f172a', padding: 20, borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: '#94a3b8', whiteSpace: 'pre-wrap', maxHeight: 500, overflowY: 'auto' }}>
                {results.process_tree.map((pt, idx) => (
                  <div key={idx} style={{ marginBottom: 4 }}>
                    {pt.ImageFileName} (PID: <span style={{ color: 'var(--teal)' }}>{pt.PID}</span>)
                  </div>
                ))}
                {results.process_tree.length === 0 && <div>Process tree not available in this view. Check pslist.</div>}
              </div>
            )}

            {activeTab === 'malfind' && (
              <div>
                {results.suspicious_processes.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)' }}>No injected memory segments found by malfind.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {results.suspicious_processes.map((hit, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-input)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger)' }}>PID: {hit.PID}</span>
                            <span style={{ marginLeft: 12, color: 'var(--text-primary)' }}>{hit.Process}</span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Protection: {hit.Protection}</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Hexdump</div>
                            <pre style={{ background: '#0f172a', padding: 12, borderRadius: 6, fontSize: 11, color: '#e2e8f0', margin: 0, overflowX: 'auto' }}>
                              {hit.Hexdump || 'N/A'}
                            </pre>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Disassembly</div>
                            <pre style={{ background: '#0f172a', padding: 12, borderRadius: 6, fontSize: 11, color: '#e2e8f0', margin: 0, overflowX: 'auto' }}>
                              {hit.Disassembly || 'N/A'}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MemoryAnalysisView;
