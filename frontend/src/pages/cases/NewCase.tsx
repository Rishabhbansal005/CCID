import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CasePriority, CaseCategory } from '@/types';

const PRIORITIES: { value: CasePriority; label: string; color: string }[] = [
  { value: 'low', label: '🟢 Low', color: 'var(--success)' },
  { value: 'medium', label: '🟡 Medium', color: 'var(--warning)' },
  { value: 'high', label: '🟠 High', color: 'var(--orange)' },
  { value: 'critical', label: '🔴 Critical', color: 'var(--danger)' },
];

const CATEGORIES: { value: CaseCategory; label: string }[] = [
  { value: 'cybercrime', label: 'Cybercrime (General)' },
  { value: 'data_breach', label: 'Data Breach' },
  { value: 'malware', label: 'Malware Infection' },
  { value: 'ransomware', label: 'Ransomware' },
  { value: 'phishing', label: 'Phishing' },
  { value: 'insider_threat', label: 'Insider Threat' },
  { value: 'fraud', label: 'Online Fraud' },
  { value: 'ddos', label: 'DDoS Attack' },
  { value: 'espionage', label: 'Cyber Espionage' },
  { value: 'other', label: 'Other' },
];

export default function NewCase() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { supabaseUser } = useAuth();

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as CasePriority,
    status: 'open' as const,
    category: '' as CaseCategory | '',
    jurisdiction: '',
    incident_date: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async (formData: typeof form) => {
      const { data, error } = await supabase
        .from('cases')
        .insert({
          title: formData.title,
          description: formData.description || null,
          priority: formData.priority,
          status: formData.status,
          category: formData.category || null,
          jurisdiction: formData.jurisdiction || null,
          incident_date: formData.incident_date
            ? new Date(formData.incident_date).toISOString()
            : null,
          tags: formData.tags,
          created_by: supabaseUser?.id,
          assigned_to: supabaseUser?.id,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (newCase) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      navigate(`/cases/${newCase.id}`);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to create case.');
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags?.includes(tag)) {
      setForm((f) => ({ ...f, tags: [...(f.tags ?? []), tag] }));
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags?.filter((t) => t !== tag) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) {
      setError('Case title is required.');
      return;
    }
    mutation.mutate(form);
  };

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">New Investigation Case</h1>
          <p className="page-header-subtitle">
            Open a new case to begin tracking an investigation
          </p>
        </div>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/cases')}>
          Cancel
        </button>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">⚠️ {error}</div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="card">
          <div className="card-header">
            <h6 style={{ fontWeight: 700, margin: 0, fontSize: 14 }}>Case Information</h6>
          </div>
          <div className="card-body">
            {/* Title */}
            <div className="mb-4">
              <label htmlFor="case-title" className="form-label">
                Case Title <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="case-title"
                name="title"
                type="text"
                className="form-control"
                placeholder="e.g., Corporate Network Intrusion – Acme Corp"
                value={form.title}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label htmlFor="case-description" className="form-label">Description</label>
              <textarea
                id="case-description"
                name="description"
                className="form-control"
                placeholder="Brief description of the incident, initial findings, and scope..."
                rows={4}
                value={form.description}
                onChange={handleChange}
              />
            </div>

            {/* Priority & Category */}
            <div className="row g-3 mb-4">
              <div className="col-6">
                <label htmlFor="case-priority" className="form-label">Priority</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      id={`priority-${p.value}`}
                      onClick={() => setForm((f) => ({ ...f, priority: p.value }))}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 8,
                        border: `1px solid ${form.priority === p.value ? p.color : 'var(--border-color)'}`,
                        background: form.priority === p.value ? `${p.color}22` : 'var(--bg-input)',
                        color: form.priority === p.value ? p.color : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        transition: 'var(--transition)',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-6">
                <label htmlFor="case-category" className="form-label">Category</label>
                <select
                  id="case-category"
                  name="category"
                  className="form-select"
                  value={form.category ?? ''}
                  onChange={handleChange}
                >
                  <option value="">Select category...</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Incident Date & Jurisdiction */}
            <div className="row g-3 mb-4">
              <div className="col-6">
                <label htmlFor="case-incident-date" className="form-label">Incident Date</label>
                <input
                  id="case-incident-date"
                  name="incident_date"
                  type="datetime-local"
                  className="form-control"
                  value={form.incident_date as string}
                  onChange={handleChange}
                />
              </div>
              <div className="col-6">
                <label htmlFor="case-jurisdiction" className="form-label">Jurisdiction</label>
                <input
                  id="case-jurisdiction"
                  name="jurisdiction"
                  type="text"
                  className="form-control"
                  placeholder="e.g., Federal, State, International"
                  value={form.jurisdiction}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="mb-2">
              <label className="form-label">Tags</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Add tag and press Enter..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                />
                <button type="button" className="btn btn-outline-secondary" onClick={addTag}>
                  Add
                </button>
              </div>
              {(form.tags?.length ?? 0) > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {form.tags?.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'var(--teal-muted)',
                        color: 'var(--teal)',
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        border: '1px solid rgba(0,212,255,0.2)',
                      }}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--teal)', fontSize: 14, padding: 0, lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate('/cases')}
          >
            Cancel
          </button>
          <button
            id="btn-create-case"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Creating...
              </>
            ) : (
              '🗂️ Create Case'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
