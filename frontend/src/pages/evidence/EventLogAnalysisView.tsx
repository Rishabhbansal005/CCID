import React from 'react';
import { useQuery } from '@tanstack/react-query';
import eventLogsApi from '@/api/eventLogs';

export default function EventLogAnalysisView({ evidenceId }: { evidenceId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['event-log-analysis', evidenceId],
    queryFn: () => eventLogsApi.getAnalysis(evidenceId),
    retry: 1,
  });

  if (isLoading) return <div style={{ padding: 20 }}>Loading analysis results...</div>;
  if (error || !data) return null;

  return (
    <div className="card">
      <div className="card-body">
        <h6 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 16 }}>
          Event Log Analysis Results
        </h6>
        
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div style={{ background: 'var(--bg-input)', padding: '12px 16px', borderRadius: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Records</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--teal)' }}>{data.analysis_summary?.total_records_parsed || 0}</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div style={{ background: 'var(--bg-input)', padding: '12px 16px', borderRadius: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Suspicious</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--danger)' }}>{data.suspicious_events?.length || 0}</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div style={{ background: 'var(--bg-input)', padding: '12px 16px', borderRadius: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Failed Logins</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--orange)' }}>{data.analysis_summary?.logins_failed || 0}</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div style={{ background: 'var(--bg-input)', padding: '12px 16px', borderRadius: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>PS Executions</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--purple)' }}>{data.analysis_summary?.powershell_events || 0}</div>
            </div>
          </div>
        </div>

        {data.suspicious_events && data.suspicious_events.length > 0 && (
          <div>
            <h6 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 12 }}>Suspicious Events</h6>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {data.suspicious_events.map((ev: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ev.timestamp}</td>
                      <td style={{ fontSize: 12 }}>{ev.type}</td>
                      <td style={{ fontSize: 12, color: ev.severity === 'critical' ? 'var(--danger)' : 'var(--orange)' }}>{ev.severity}</td>
                      <td style={{ fontSize: 12 }}>{ev.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
