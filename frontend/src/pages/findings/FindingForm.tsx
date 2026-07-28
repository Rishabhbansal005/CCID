import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { FindingSeverity } from '@/types';
import { SEVERITIES, FINDING_STATUSES, MITRE_TACTICS, CATEGORIES, type IocIndicator } from './FindingsList';

interface FindingFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<FindingFormData>;
  findingId?: string;
  onSuccess?: (id: string) => void;
  onCancel?: () => void;
}

export interface FindingFormData {
  case_id: string;
  evidence_id: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  category: string;
  mitre_tactic: string;
  mitre_technique: string;
  status: string;
  tags: string[];
  ioc_indicators: IocIndicator[];
  recommendations: string;
}

const IOC_TYPES = [
  { value: 'ip',       label: 'IP Address' },
  { value: 'domain',   label: 'Domain' },
  { value: 'hash',     label: 'File Hash' },
  { value: 'url',      label: 'URL' },
  { value: 'email',    label: 'Email' },
  { value: 'filename', label: 'Filename' },
  { value: 'registry', label: 'Registry Key' },
  { value: 'other',    label: 'Other' },
];

const EMPTY_FORM: FindingFormData = {
  case_id: '',
  evidence_id: '',
  title: '',
  description: '',
  severity: 'medium',
  category: '',
  mitre_tactic: '',
  mitre_technique: '',
  status: 'open',
  tags: [],
  ioc_indicators: [],
  recommendations: '',
};

export default function FindingForm({ mode, initialData, findingId, onSuccess, onCancel }: FindingFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { supabaseUser } = useAuth();

  const [form, setForm] = useState<FindingFormData>({ ...EMPTY_FORM, ...initialData });
  const [tagInput, setTagInput] = useState('');
  const [newIoc, setNewIoc] = useState<IocIndicator>({ type: 'ip', value: '', description: '' });
  const [activeSection, setActiveSection] = useState<'basic' | 'mitre' | 'ioc' | 'notes'>('basic');

  // Load cases for selector
  const { data: cases = [] } = useQuery({
    queryKey: ['cases', 'for-finding'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cases')
        .select('id, case_number, title')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Load evidence for selected case
  const { data: evidenceList = [] } = useQuery({
    queryKey: ['evidence', 'for-finding', form.case_id],
    queryFn: async () => {
      if (!form.case_id) return [];
      const { data } = await supabase
        .from('evidence')
        .select('id, evidence_number, file_name')
        .eq('case_id', form.case_id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!form.case_id,
  });

  const mutation = useMutation({
    mutationFn: async (data: FindingFormData) => {
      const payload = {
        case_id: data.case_id,
        evidence_id: data.evidence_id || null,
        title: data.title,
        description: data.description,
        severity: data.severity,
        category: data.category || null,
        mitre_tactic: data.mitre_tactic || null,
        mitre_technique: data.mitre_technique || null,
        status: data.status,
        tags: data.tags,
        ioc_indicators: data.ioc_indicators,
        recommendations: data.recommendations || null,
        ...(mode === 'create' ? { created_by: supabaseUser?.id } : {}),
      };

      if (mode === 'create') {
        const { data: row, error } = await supabase
          .from('findings')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw new Error(error.message);
        return row.id as string;
      } else {
        const { error } = await supabase
          .from('findings')
          .update(payload)
          .eq('id', findingId!);
        if (error) throw new Error(error.message);
        return findingId!;
      }
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      if (onSuccess) {
        onSuccess(id);
      } else {
        navigate(`/findings/${id}`);
      }
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    // Reset evidence when case changes
    if (name === 'case_id') setForm((f) => ({ ...f, case_id: value, evidence_id: '' }));
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm((f) => ({ ...f, tags: [...f.tags, tag] }));
    }
    setTagInput('');
  };

  const removeTag = (tag: string) =>
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));

  const addIoc = () => {
    if (!newIoc.value.trim()) return;
    setForm((f) => ({ ...f, ioc_indicators: [...f.ioc_indicators, { ...newIoc, value: newIoc.value.trim() }] }));
    setNewIoc({ type: 'ip', value: '', description: '' });
  };

  const removeIoc = (idx: number) =>
    setForm((f) => ({ ...f, ioc_indicators: f.ioc_indicators.filter((_, i) => i !== idx) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.case_id || !form.title || !form.description) return;
    mutation.mutate(form);
  };

  const sections = [
    { key: 'basic',  label: '📋 Basic Info' },
    { key: 'mitre',  label: '🛡️ MITRE ATT&CK' },
    { key: 'ioc',    label: '🔍 IOC Indicators' },
    { key: 'notes',  label: '📝 Recommendations' },
  ] as const;

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="page-header">
        <div>
          <h1 className="page-header-title">
            {mode === 'create' ? 'New Finding' : 'Edit Finding'}
          </h1>
          <p className="page-header-subtitle">
            {mode === 'create'
              ? 'Document a new investigation finding with MITRE ATT&CK mapping'
              : 'Update the finding details and indicators'}
          </p>
        </div>
        {onCancel && (
          <button className="btn btn-outline-secondary" onClick={onCancel}>Cancel</button>
        )}
        {!onCancel && (
          <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Cancel</button>
        )}
      </div>

      {mutation.error && (
        <div className="alert alert-danger mb-4">
          ⚠️ {mutation.error instanceof Error ? mutation.error.message : 'Save failed.'}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Section Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 0 }}>
          {sections.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActiveSection(s.key)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeSection === s.key ? '2px solid var(--teal)' : '2px solid transparent',
                color: activeSection === s.key ? 'var(--teal)' : 'var(--text-muted)',
                padding: '10px 16px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activeSection === s.key ? 600 : 400,
                transition: 'var(--transition)',
                marginBottom: -1,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Section 1: Basic Info ─────────────────────────── */}
        {activeSection === 'basic' && (
          <div className="card animate-in">
            <div className="card-header">
              <h6 style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Basic Information</h6>
            </div>
            <div className="card-body">
              {/* Case Selector */}
              <div className="mb-3">
                <label htmlFor="fn-case" className="form-label">
                  Investigation Case <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  id="fn-case"
                  name="case_id"
                  className="form-select"
                  value={form.case_id}
                  onChange={(e) => setForm((f) => ({ ...f, case_id: e.target.value, evidence_id: '' }))}
                  required
                >
                  <option value="">Select a case...</option>
                  {cases.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.case_number} — {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Evidence Selector (optional) */}
              <div className="mb-3">
                <label htmlFor="fn-evidence" className="form-label">
                  Linked Evidence <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                </label>
                <select
                  id="fn-evidence"
                  name="evidence_id"
                  className="form-select"
                  value={form.evidence_id}
                  onChange={handleChange}
                  disabled={!form.case_id}
                >
                  <option value="">No evidence linked</option>
                  {evidenceList.map((ev: any) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.evidence_number} — {ev.file_name}
                    </option>
                  ))}
                </select>
                {!form.case_id && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Select a case first to link evidence.
                  </div>
                )}
              </div>

              {/* Title */}
              <div className="mb-3">
                <label htmlFor="fn-title" className="form-label">
                  Finding Title <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  id="fn-title"
                  name="title"
                  type="text"
                  className="form-control"
                  placeholder="e.g., Credential Dumping via LSASS Memory Access"
                  value={form.title}
                  onChange={handleChange}
                  required
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="mb-3">
                <label htmlFor="fn-description" className="form-label">
                  Description <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <textarea
                  id="fn-description"
                  name="description"
                  className="form-control"
                  placeholder="Detailed description of what was found, how it was discovered, and its significance..."
                  rows={5}
                  value={form.description}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Severity + Status + Category */}
              <div className="row g-3 mb-3">
                <div className="col-12">
                  <label className="form-label">Severity</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {SEVERITIES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, severity: s.value }))}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 8,
                          border: `1px solid ${form.severity === s.value ? s.color : 'var(--border-color)'}`,
                          background: form.severity === s.value ? `${s.color}22` : 'var(--bg-input)',
                          color: form.severity === s.value ? s.color : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                          transition: 'var(--transition)',
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-6">
                  <label htmlFor="fn-status" className="form-label">Status</label>
                  <select id="fn-status" name="status" className="form-select" value={form.status} onChange={handleChange}>
                    {FINDING_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-6">
                  <label htmlFor="fn-category" className="form-label">Category</label>
                  <select id="fn-category" name="category" className="form-select" value={form.category} onChange={handleChange}>
                    <option value="">Select category...</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
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
                  <button type="button" className="btn btn-outline-secondary" onClick={addTag}>Add</button>
                </div>
                {form.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {form.tags.map((tag) => (
                      <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--purple-muted)', color: 'var(--purple)', padding: '4px 10px', borderRadius: 20, fontSize: 12, border: '1px solid rgba(139,92,246,0.2)' }}>
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--purple)', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Section 2: MITRE ATT&CK ──────────────────────── */}
        {activeSection === 'mitre' && (
          <div className="card animate-in">
            <div className="card-header">
              <h6 style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>🛡️ MITRE ATT&CK Mapping</h6>
            </div>
            <div className="card-body">
              <div style={{ padding: '12px 16px', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 24 }}>
                Map this finding to the <strong style={{ color: 'var(--purple)' }}>MITRE ATT&CK</strong> framework to classify the adversary tactic and technique observed. This enables threat intelligence correlation across cases.
              </div>

              <div className="row g-3">
                <div className="col-12">
                  <label htmlFor="fn-tactic" className="form-label">Tactic</label>
                  <select
                    id="fn-tactic"
                    name="mitre_tactic"
                    className="form-select"
                    value={form.mitre_tactic}
                    onChange={handleChange}
                  >
                    <option value="">Select tactic...</option>
                    {MITRE_TACTICS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="col-12">
                  <label htmlFor="fn-technique" className="form-label">Technique / Sub-technique ID</label>
                  <input
                    id="fn-technique"
                    name="mitre_technique"
                    type="text"
                    className="form-control"
                    placeholder="e.g., T1003.001 — OS Credential Dumping: LSASS Memory"
                    value={form.mitre_technique}
                    onChange={handleChange}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    Use the full technique ID and name. Reference:{' '}
                    <a href="https://attack.mitre.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)' }}>
                      attack.mitre.org ↗
                    </a>
                  </div>
                </div>
              </div>

              {/* MITRE reference card */}
              {form.mitre_tactic && (
                <div style={{ marginTop: 24, padding: '16px', background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    MITRE Mapping Preview
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>TACTIC</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple)' }}>{form.mitre_tactic}</div>
                    </div>
                    {form.mitre_technique && (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>TECHNIQUE</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{form.mitre_technique}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Section 3: IOC Indicators ────────────────────── */}
        {activeSection === 'ioc' && (
          <div className="card animate-in">
            <div className="card-header">
              <h6 style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>🔍 Indicators of Compromise (IOCs)</h6>
            </div>
            <div className="card-body">
              {/* Add new IOC */}
              <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Add Indicator
                </div>
                <div className="row g-2">
                  <div className="col-12 col-md-3">
                    <select
                      className="form-select"
                      value={newIoc.type}
                      onChange={(e) => setNewIoc((n) => ({ ...n, type: e.target.value as IocIndicator['type'] }))}
                    >
                      {IOC_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-5">
                    <input
                      type="text"
                      className="form-control"
                      placeholder={
                        newIoc.type === 'ip' ? '192.168.1.100' :
                        newIoc.type === 'domain' ? 'malicious.example.com' :
                        newIoc.type === 'hash' ? 'SHA256 or MD5 hash...' :
                        newIoc.type === 'url' ? 'https://...' :
                        newIoc.type === 'email' ? 'attacker@example.com' :
                        'Indicator value...'
                      }
                      value={newIoc.value}
                      onChange={(e) => setNewIoc((n) => ({ ...n, value: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIoc(); } }}
                    />
                  </div>
                  <div className="col-12 col-md-3">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Description (optional)"
                      value={newIoc.description || ''}
                      onChange={(e) => setNewIoc((n) => ({ ...n, description: e.target.value }))}
                    />
                  </div>
                  <div className="col-12 col-md-1">
                    <button
                      type="button"
                      className="btn btn-primary w-100"
                      onClick={addIoc}
                      disabled={!newIoc.value.trim()}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* IOC List */}
              {form.ioc_indicators.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>
                  No IOCs added yet. Add indicators above.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.ioc_indicators.map((ioc, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--teal-muted)', color: 'var(--teal)', padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', flexShrink: 0 }}>
                        {ioc.type}
                      </span>
                      <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1, wordBreak: 'break-all' }}>
                        {ioc.value}
                      </span>
                      {ioc.description && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                          {ioc.description}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeIoc(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16, padding: '0 4px', flexShrink: 0 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Section 4: Recommendations ───────────────────── */}
        {activeSection === 'notes' && (
          <div className="card animate-in">
            <div className="card-header">
              <h6 style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>📝 Recommendations & Notes</h6>
            </div>
            <div className="card-body">
              <label htmlFor="fn-recommendations" className="form-label">Recommendations</label>
              <textarea
                id="fn-recommendations"
                name="recommendations"
                className="form-control"
                placeholder="Provide remediation steps, recommended actions, or analyst notes related to this finding..."
                rows={10}
                value={form.recommendations}
                onChange={handleChange}
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                Include specific remediation steps, containment actions, or evidence-based recommendations for the case investigator.
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
          {onCancel ? (
            <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>Cancel</button>
          ) : (
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Cancel</button>
          )}
          <button
            id="btn-save-finding"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={mutation.isPending || !form.case_id || !form.title || !form.description}
          >
            {mutation.isPending ? (
              <><span className="spinner-border spinner-border-sm me-2" />Saving...</>
            ) : (
              mode === 'create' ? '🎯 Create Finding' : '💾 Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
