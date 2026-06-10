import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/api/client';

export const ReportStatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { color: string, bg: string, icon: string }> = {
    draft: { color: 'var(--text-secondary)', bg: 'var(--bg-input)', icon: '📝' },
    generating: { color: 'var(--orange)', bg: 'var(--orange-muted)', icon: '⏳' },
    ready: { color: 'var(--success)', bg: 'var(--success-muted)', icon: '✅' },
    failed: { color: 'var(--danger)', bg: 'var(--danger-muted)', icon: '❌' },
  };

  const c = config[status] || config.draft;

  return (
    <span style={{
      background: c.bg,
      color: c.color,
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      border: `1px solid ${c.color}33`
    }}>
      {c.icon} {status}
    </span>
  );
};

export default function ReportList() {
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Polling interval: if any report is "generating", poll every 5s
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          case:cases(id, case_number, title),
          generator:users!reports_generated_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    refetchInterval: (query) => {
      const data = query.state.data as any[] | undefined;
      return data?.some(r => r.status === 'generating') ? 5000 : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports_list'] });
      queryClient.invalidateQueries({ queryKey: ['reports', 'dashboard'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || err.message || 'Failed to delete report');
    }
  });

  const handleDownload = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    try {
      const res = await apiClient.get(`/reports/${reportId}/download`);
      window.open(res.data.download_url, '_blank');
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || 'Failed to download report');
    }
  };

  const handleDelete = (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this report?')) {
      deleteMutation.mutate(reportId);
    }
  };

  const filtered = reports.filter((r) => {
    if (search) {
      const term = search.toLowerCase();
      const caseNumber = r.case?.case_number?.toLowerCase() || '';
      const title = r.title?.toLowerCase() || '';
      return caseNumber.includes(term) || title.includes(term);
    }
    return true;
  });

  return (
    <div className="page-content animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Reports</h1>
          <p className="page-header-subtitle">Manage generated PDF investigation reports</p>
        </div>
        <Link to="/reports/new" className="btn btn-primary">
          + Generate Report
        </Link>
      </div>

      <div className="card">
        <div className="filter-bar" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="search-wrapper" style={{ flex: 1, maxWidth: 300 }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by case or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 24 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60, marginBottom: 12, borderRadius: 8 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <div className="empty-state-title">No reports found</div>
            <div className="empty-state-text">Generate your first investigation report to see it here.</div>
            {search && <button className="btn btn-outline-secondary mt-3" onClick={() => setSearch('')}>Clear Search</button>}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-clickable">
              <thead>
                <tr>
                  <th>Report Info</th>
                  <th>Status</th>
                  <th>Generated By</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} onClick={() => window.location.href = `/reports/${r.id}`}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--teal)' }}>{r.case?.case_number}</div>
                    </td>
                    <td><ReportStatusBadge status={r.status} /></td>
                    <td>{r.generator?.full_name || 'Unknown'}</td>
                    <td>{format(new Date(r.created_at), 'MMM d, yyyy')}</td>
                    <td style={{ textAlign: 'right' }}>
                      {r.status === 'ready' && (
                        <button
                          className="btn btn-sm"
                          style={{ color: 'var(--teal)', border: '1px solid var(--teal)', background: 'transparent', marginRight: 8 }}
                          onClick={(e) => handleDownload(e, r.id)}
                        >
                          ↓ Download
                        </button>
                      )}
                      {user?.role === 'admin' && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={(e) => handleDelete(e, r.id)}
                          disabled={deleteMutation.isPending}
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
