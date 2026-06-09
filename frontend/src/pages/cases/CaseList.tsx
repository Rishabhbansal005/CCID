import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { StatusBadge, PriorityBadge } from '@/components/shared/Badges';
import type { Case, CaseStatus, CasePriority } from '@/types';
import { formatDistanceToNow } from 'date-fns';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'active', label: 'Active' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export default function CaseList() {
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data: allCases = [], isLoading, error } = useQuery({
    queryKey: ['cases', 'list'],
    queryFn: async (): Promise<Case[]> => {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Case[];
    },
    staleTime: 30_000,
  });

  // Apply filters in-memory
  const cases = useMemo(() => {
    let result = allCases;
    if (filters.status) result = result.filter((c) => c.status === filters.status);
    if (filters.priority) result = result.filter((c) => c.priority === filters.priority);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) => c.title.toLowerCase().includes(q) || c.case_number?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allCases, filters]);

  const total = cases.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pagedCases = cases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilter = (key: string, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Case Management</h1>
          <p className="page-header-subtitle">
            {total} total case{total !== 1 ? 's' : ''} in the system
          </p>
        </div>
        <div className="page-header-actions">
          <Link to="/cases/new" className="btn btn-primary" id="btn-new-case">
            + New Case
          </Link>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card">
        {/* Filter Bar */}
        <div className="filter-bar">
          {/* Search */}
          <div className="search-wrapper" style={{ flex: 1, minWidth: 200 }}>
            <span className="search-icon">🔍</span>
            <input
              id="case-search"
              type="text"
              className="form-control"
              placeholder="Search cases..."
              value={filters.search}
              onChange={(e) => handleFilter('search', e.target.value)}
            />
          </div>

          {/* Status filter */}
          <select
            id="case-filter-status"
            className="form-select"
            style={{ width: 'auto' }}
            value={filters.status}
            onChange={(e) => handleFilter('status', e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            id="case-filter-priority"
            className="form-select"
            style={{ width: 'auto' }}
            value={filters.priority}
            onChange={(e) => handleFilter('priority', e.target.value)}
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Clear filters */}
          {(filters.status || filters.priority || filters.search) && (
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setFilters({ status: '', priority: '', search: '' })}
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="card-body" style={{ padding: 0 }}>
          {error ? (
            <div className="alert alert-danger m-4">
              Failed to load cases from Supabase. Check your connection.
            </div>
          ) : isLoading ? (
            <div style={{ padding: 24 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8, borderRadius: 8 }} />
              ))}
            </div>
          ) : cases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🗂️</div>
              <div className="empty-state-title">No cases found</div>
              <div className="empty-state-text">
                {filters.status || filters.priority || filters.search
                  ? 'No cases match your current filters. Try adjusting the search criteria.'
                  : 'No investigation cases have been created yet.'}
              </div>
              <Link to="/cases/new" className="btn btn-primary">
                Create First Case
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table table-clickable mb-0">
                <thead>
                  <tr>
                    <th>Case #</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCases.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link
                          to={`/cases/${c.id}`}
                          className="font-mono"
                          style={{ color: 'var(--teal)', fontSize: 12, textDecoration: 'none' }}
                        >
                          {c.case_number}
                        </Link>
                      </td>
                      <td>
                        <Link
                          to={`/cases/${c.id}`}
                          style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'none', fontSize: 13 }}
                        >
                          {c.title}
                        </Link>
                        {c.tags.length > 0 && (
                          <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {c.tags.slice(0, 2).map((tag) => (
                              <span key={tag} style={{ fontSize: 10, background: 'var(--teal-muted)', color: 'var(--teal)', padding: '1px 6px', borderRadius: 20 }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        {c.category ? (
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                            {c.category.replace('_', ' ')}
                          </span>
                        ) : '—'}
                      </td>
                      <td><PriorityBadge priority={c.priority} /></td>
                      <td><StatusBadge status={c.status} /></td>
                      <td style={{ fontSize: 12 }}>
                        {(c as any).assignee?.full_name ?? (c as any).assignee?.email ?? '—'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Link
                            to={`/cases/${c.id}`}
                            className="btn btn-sm btn-outline-primary"
                            id={`btn-view-case-${c.id}`}
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'var(--text-muted)',
          }}>
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
