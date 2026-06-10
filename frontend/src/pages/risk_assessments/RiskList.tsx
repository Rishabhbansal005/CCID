import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { RiskAssessment } from '@/types';

export const RiskBadge = ({ level }: { level: string }) => {
  const config = {
    critical: { color: 'var(--danger)', bg: 'var(--danger-muted)' },
    high: { color: 'var(--orange)', bg: 'var(--orange-muted)' },
    medium: { color: 'var(--warning)', bg: 'var(--warning-muted)' },
    low: { color: 'var(--success)', bg: 'var(--success-muted)' },
  }[level] || { color: 'var(--text-muted)', bg: 'var(--bg-input)' };

  return (
    <span style={{
      background: config.bg,
      color: config.color,
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      border: `1px solid ${config.color}33`
    }}>
      {level}
    </span>
  );
};

export default function RiskList() {
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [sortByScore, setSortByScore] = useState<boolean>(true);

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['risk_assessments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_assessments')
        .select(`
          *,
          case:cases(id, case_number, title),
          assessor:users!risk_assessments_assessed_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = assessments
    .filter((a) => {
      if (filterLevel !== 'all' && a.risk_level !== filterLevel) return false;
      if (search) {
        const term = search.toLowerCase();
        const caseNumber = a.case?.case_number?.toLowerCase() || '';
        const caseTitle = a.case?.title?.toLowerCase() || '';
        if (!caseNumber.includes(term) && !caseTitle.includes(term)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortByScore) {
        return (b.overall_risk_score || 0) - (a.overall_risk_score || 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="page-content animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Risk Assessments</h1>
          <p className="page-header-subtitle">Manage and track case risk levels</p>
        </div>
        <Link to="/risk/new" className="btn btn-primary">
          + New Assessment
        </Link>
      </div>

      <div className="card">
        <div className="filter-bar" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="search-wrapper" style={{ flex: 1, maxWidth: 300 }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by case..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
          >
            <option value="all">All Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="sortScore"
              checked={sortByScore}
              onChange={(e) => setSortByScore(e.target.checked)}
            />
            <label htmlFor="sortScore" style={{ fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Sort by Highest Score
            </label>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 24 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60, marginBottom: 12, borderRadius: 8 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛡️</div>
            <div className="empty-state-title">No risk assessments found</div>
            <div className="empty-state-text">Create a new assessment to evaluate case risks.</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-clickable">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Risk Level</th>
                  <th>Score</th>
                  <th>Assessed By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} onClick={() => window.location.href = `/risk/${a.id}`}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.case?.case_number}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.case?.title}</div>
                    </td>
                    <td><RiskBadge level={a.risk_level} /></td>
                    <td>
                      <span className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>
                        {a.overall_risk_score}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/25</span>
                    </td>
                    <td>{a.assessor?.full_name || 'System'}</td>
                    <td>{format(new Date(a.created_at), 'MMM d, yyyy')}</td>
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
