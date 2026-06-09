import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { format, formatDistanceToNow, isAfter, isBefore, parseISO } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────
export interface TimelineEvent {
  id: string;
  case_id: string;
  evidence_id: string | null;
  finding_id: string | null;
  event_time: string;
  title: string;
  description: string | null;
  event_type: EventType;
  source: string | null;
  source_artifact: string | null;
  importance: Importance;
  is_confirmed: boolean;
  tags: string[];
  raw_data: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
  // joined
  case?: { case_number: string; title: string };
  evidence?: { original_file_name: string } | null;
  finding?: { finding_number: string; title: string } | null;
}

export type EventType = 'system' | 'network' | 'user_action' | 'file' | 'registry' | 'process' | 'authentication' | 'email' | 'web' | 'other';
export type Importance = 'low' | 'normal' | 'high' | 'critical';

export interface TimelineEventForm {
  case_id: string;
  evidence_id: string;
  finding_id: string;
  event_time: string;
  title: string;
  description: string;
  event_type: EventType;
  source: string;
  source_artifact: string;
  importance: Importance;
  is_confirmed: boolean;
  tags: string[];
}

// ─── Constants ───────────────────────────────────────────────
export const EVENT_TYPES: { value: EventType; label: string; icon: string; color: string }[] = [
  { value: 'system',         label: 'System',         icon: '🖥️',  color: '#3b82f6' },
  { value: 'network',        label: 'Network',        icon: '📡',  color: '#06b6d4' },
  { value: 'user_action',    label: 'User Action',    icon: '👤',  color: '#8b5cf6' },
  { value: 'file',           label: 'File',           icon: '📄',  color: '#f59e0b' },
  { value: 'registry',       label: 'Registry',       icon: '🔑',  color: '#ef4444' },
  { value: 'process',        label: 'Process',        icon: '⚙️',  color: '#ec4899' },
  { value: 'authentication', label: 'Authentication', icon: '🔐',  color: '#22c55e' },
  { value: 'email',          label: 'Email',          icon: '📧',  color: '#f97316' },
  { value: 'web',            label: 'Web',            icon: '🌐',  color: '#00d4ff' },
  { value: 'other',          label: 'Other',          icon: '📌',  color: '#94a3b8' },
];

export const IMPORTANCE_LEVELS: { value: Importance; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: '#ef4444' },
  { value: 'high',     label: 'High',     color: '#f97316' },
  { value: 'normal',   label: 'Normal',   color: '#3b82f6' },
  { value: 'low',      label: 'Low',      color: '#64748b' },
];

const EMPTY_FORM: TimelineEventForm = {
  case_id: '',
  evidence_id: '',
  finding_id: '',
  event_time: new Date().toISOString().slice(0, 16),
  title: '',
  description: '',
  event_type: 'other',
  source: '',
  source_artifact: '',
  importance: 'normal',
  is_confirmed: false,
  tags: [],
};

// ─── Helper ───────────────────────────────────────────────────
export function getEventTypeConfig(type: EventType) {
  return EVENT_TYPES.find((t) => t.value === type) ?? EVENT_TYPES[EVENT_TYPES.length - 1];
}

export function getImportanceConfig(importance: Importance) {
  return IMPORTANCE_LEVELS.find((l) => l.value === importance) ?? IMPORTANCE_LEVELS[2];
}

// ─── Slide-in Drawer: Create / Edit ─────────────────────────
function EventDrawer({
  open,
  onClose,
  editing,
  prefillCaseId,
}: {
  open: boolean;
  onClose: () => void;
  editing: TimelineEvent | null;
  prefillCaseId?: string;
}) {
  const queryClient = useQueryClient();
  const { supabaseUser } = useAuth();

  const [form, setForm] = useState<TimelineEventForm>(() => ({
    ...EMPTY_FORM,
    case_id: prefillCaseId ?? '',
    ...(editing ? {
      case_id: editing.case_id,
      evidence_id: editing.evidence_id ?? '',
      finding_id: editing.finding_id ?? '',
      event_time: editing.event_time.slice(0, 16),
      title: editing.title,
      description: editing.description ?? '',
      event_type: editing.event_type,
      source: editing.source ?? '',
      source_artifact: editing.source_artifact ?? '',
      importance: editing.importance,
      is_confirmed: editing.is_confirmed,
      tags: editing.tags,
    } : {}),
  }));
  const [tagInput, setTagInput] = useState('');

  React.useEffect(() => {
    if (open) {
      setForm({
        ...EMPTY_FORM,
        case_id: prefillCaseId ?? '',
        ...(editing ? {
          case_id: editing.case_id,
          evidence_id: editing.evidence_id ?? '',
          finding_id: editing.finding_id ?? '',
          event_time: editing.event_time.slice(0, 16),
          title: editing.title,
          description: editing.description ?? '',
          event_type: editing.event_type,
          source: editing.source ?? '',
          source_artifact: editing.source_artifact ?? '',
          importance: editing.importance,
          is_confirmed: editing.is_confirmed,
          tags: editing.tags,
        } : {}),
      });
      setTagInput('');
    }
  }, [open, editing, prefillCaseId]);

  // Load cases
  const { data: cases = [] } = useQuery({
    queryKey: ['cases', 'for-timeline'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cases').select('id, case_number, title').order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  // Load evidence for selected case
  const { data: evidenceList = [] } = useQuery({
    queryKey: ['evidence', 'for-timeline', form.case_id],
    queryFn: async () => {
      if (!form.case_id) return [];
      const { data } = await supabase
        .from('evidence').select('id, evidence_number, original_file_name')
        .eq('case_id', form.case_id).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!form.case_id,
  });

  // Load findings for selected case
  const { data: findingsList = [] } = useQuery({
    queryKey: ['findings', 'for-timeline', form.case_id],
    queryFn: async () => {
      if (!form.case_id) return [];
      const { data } = await supabase
        .from('findings').select('id, finding_number, title')
        .eq('case_id', form.case_id).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!form.case_id,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        case_id: form.case_id,
        evidence_id: form.evidence_id || null,
        finding_id: form.finding_id || null,
        event_time: new Date(form.event_time).toISOString(),
        title: form.title,
        description: form.description || null,
        event_type: form.event_type,
        source: form.source || null,
        source_artifact: form.source_artifact || null,
        importance: form.importance,
        is_confirmed: form.is_confirmed,
        tags: form.tags,
      };
      if (editing) {
        const { error } = await supabase.from('timeline_events').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('timeline_events')
          .insert({ ...payload, created_by: supabaseUser?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      onClose();
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
    if (name === 'case_id') setForm((f) => ({ ...f, case_id: value, evidence_id: '', finding_id: '' }));
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) setForm((f) => ({ ...f, tags: [...f.tags, tag] }));
    setTagInput('');
  };

  const removeTag = (t: string) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000 }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, width: 520, height: '100vh',
        background: 'var(--bg-card)', borderLeft: '1px solid var(--border-color)',
        zIndex: 1001, display: 'flex', flexDirection: 'column',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
        animation: 'slideInRight 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflowY: 'auto',
      }}>
        {/* Drawer Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-heading)' }}>
              {editing ? 'Edit Event' : '+ New Timeline Event'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {editing ? `Editing: ${editing.title}` : 'Add a chronological event to the investigation timeline'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}>✕</button>
        </div>

        {/* Drawer Body */}
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
          {mutation.error && (
            <div className="alert alert-danger mb-3">
              ⚠️ {mutation.error instanceof Error ? mutation.error.message : 'Save failed.'}
            </div>
          )}

          <form id="event-form" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} noValidate>
            {/* Case */}
            <div className="mb-3">
              <label className="form-label">Case <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select name="case_id" className="form-select" value={form.case_id}
                onChange={(e) => setForm((f) => ({ ...f, case_id: e.target.value, evidence_id: '', finding_id: '' }))} required>
                <option value="">Select a case...</option>
                {cases.map((c: any) => <option key={c.id} value={c.id}>{c.case_number} — {c.title}</option>)}
              </select>
            </div>

            {/* Event Date/Time */}
            <div className="mb-3">
              <label className="form-label">Event Date & Time <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="datetime-local" name="event_time" className="form-control" value={form.event_time} onChange={handleChange} required />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Set the exact time the event occurred (not when it was recorded).
              </div>
            </div>

            {/* Title */}
            <div className="mb-3">
              <label className="form-label">Title <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" name="title" className="form-control" value={form.title} onChange={handleChange}
                placeholder="e.g., Suspicious outbound connection to 185.x.x.x:4444" required />
            </div>

            {/* Description */}
            <div className="mb-3">
              <label className="form-label">Description</label>
              <textarea name="description" className="form-control" rows={3} value={form.description} onChange={handleChange}
                placeholder="Additional context, observations, or extracted details..." />
            </div>

            {/* Event Type */}
            <div className="mb-3">
              <label className="form-label">Event Type</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {EVENT_TYPES.map((t) => (
                  <button key={t.value} type="button"
                    onClick={() => setForm((f) => ({ ...f, event_type: t.value }))}
                    style={{
                      padding: '5px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)',
                      border: `1px solid ${form.event_type === t.value ? t.color : 'var(--border-color)'}`,
                      background: form.event_type === t.value ? `${t.color}22` : 'var(--bg-input)',
                      color: form.event_type === t.value ? t.color : 'var(--text-secondary)',
                    }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Importance */}
            <div className="mb-3">
              <label className="form-label">Importance</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {IMPORTANCE_LEVELS.map((lvl) => (
                  <button key={lvl.value} type="button"
                    onClick={() => setForm((f) => ({ ...f, importance: lvl.value }))}
                    style={{
                      flex: 1, padding: '7px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)',
                      border: `1px solid ${form.importance === lvl.value ? lvl.color : 'var(--border-color)'}`,
                      background: form.importance === lvl.value ? `${lvl.color}22` : 'var(--bg-input)',
                      color: form.importance === lvl.value ? lvl.color : 'var(--text-secondary)',
                    }}>
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Source */}
            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label">Source Tool / System</label>
                <input type="text" name="source" className="form-control" value={form.source} onChange={handleChange}
                  placeholder="e.g., Wireshark, Syslog" />
              </div>
              <div className="col-6">
                <label className="form-label">Source Artifact</label>
                <input type="text" name="source_artifact" className="form-control" value={form.source_artifact} onChange={handleChange}
                  placeholder="e.g., capture001.pcap" />
              </div>
            </div>

            {/* Evidence + Finding Links */}
            {form.case_id && (
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label">Link to Evidence</label>
                  <select name="evidence_id" className="form-select" value={form.evidence_id} onChange={handleChange}>
                    <option value="">None</option>
                    {evidenceList.map((ev: any) => <option key={ev.id} value={ev.id}>{ev.evidence_number} — {ev.original_file_name}</option>)}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label">Link to Finding</label>
                  <select name="finding_id" className="form-select" value={form.finding_id} onChange={handleChange}>
                    <option value="">None</option>
                    {findingsList.map((fn: any) => <option key={fn.id} value={fn.id}>{fn.finding_number} — {fn.title}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Confirmed toggle */}
            <div className="mb-3" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" id="is_confirmed" name="is_confirmed"
                checked={form.is_confirmed}
                onChange={(e) => setForm((f) => ({ ...f, is_confirmed: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--teal)' }} />
              <label htmlFor="is_confirmed" style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                Mark as confirmed (verified by analyst)
              </label>
            </div>

            {/* Tags */}
            <div className="mb-3">
              <label className="form-label">Tags</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" className="form-control" placeholder="Add tag..." value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
                <button type="button" className="btn btn-outline-secondary" onClick={addTag}>Add</button>
              </div>
              {form.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {form.tags.map((tag) => (
                    <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--teal-muted)', color: 'var(--teal)', padding: '3px 8px', borderRadius: 20, fontSize: 11, border: '1px solid rgba(0,212,255,0.2)' }}>
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--teal)', fontSize: 13, padding: 0 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Drawer Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button className="btn btn-outline-secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</button>
          <button
            className="btn btn-primary"
            form="event-form"
            type="submit"
            disabled={mutation.isPending || !form.case_id || !form.title}
          >
            {mutation.isPending
              ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</>
              : editing ? '💾 Save Changes' : '📅 Add Event'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Timeline Node ────────────────────────────────────────────
function TimelineNode({
  event,
  isFirst,
  isLast,
  onEdit,
  onDelete,
}: {
  event: TimelineEvent;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (e: TimelineEvent) => void;
  onDelete: (id: string) => void;
}) {
  const typeConfig = getEventTypeConfig(event.event_type);
  const impConfig = getImportanceConfig(event.importance);
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ display: 'flex', gap: 0, position: 'relative', paddingBottom: isLast ? 0 : 0 }}>
      {/* Timeline spine + dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
        {/* Dot */}
        <div style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: `${typeConfig.color}22`,
          border: `2px solid ${event.importance === 'critical' ? impConfig.color : typeConfig.color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          flexShrink: 0,
          boxShadow: event.importance === 'critical' ? `0 0 12px ${impConfig.color}44` : undefined,
          zIndex: 2,
          position: 'relative',
        }}>
          {typeConfig.icon}
        </div>
        {/* Line below */}
        {!isLast && (
          <div style={{ width: 2, flex: 1, background: 'var(--border-subtle)', minHeight: 24, marginTop: 4 }} />
        )}
      </div>

      {/* Event Card */}
      <div style={{ flex: 1, marginLeft: 16, paddingBottom: isLast ? 0 : 20 }}>
        <div
          className="card"
          style={{
            cursor: 'pointer',
            border: `1px solid ${expanded ? typeConfig.color + '44' : 'var(--border-subtle)'}`,
            transition: 'var(--transition)',
          }}
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="card-body" style={{ padding: '12px 16px' }}>
            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  {/* Importance indicator */}
                  {event.importance !== 'normal' && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: impConfig.color, display: 'inline-block', flexShrink: 0 }} />
                  )}
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-heading)' }}>{event.title}</span>
                  {!event.is_confirmed && (
                    <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--warning-muted)', color: 'var(--warning)', padding: '1px 6px', borderRadius: 20, border: '1px solid rgba(245,158,11,0.3)', textTransform: 'uppercase' }}>
                      Unconfirmed
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {format(parseISO(event.event_time), 'yyyy-MM-dd HH:mm:ss')}
                  </span>
                  <span style={{ fontSize: 10, background: `${typeConfig.color}18`, color: typeConfig.color, padding: '1px 8px', borderRadius: 20, border: `1px solid ${typeConfig.color}33`, fontWeight: 600, textTransform: 'uppercase' }}>
                    {typeConfig.label}
                  </span>
                  {event.source && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>via {event.source}</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => onEdit(event)}
                  id={`btn-edit-event-${event.id}`}
                >✏️</button>
                <button
                  className="btn btn-sm"
                  style={{ background: 'var(--danger-muted)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}
                  onClick={() => onDelete(event.id)}
                  id={`btn-delete-event-${event.id}`}
                >🗑️</button>
              </div>
            </div>

            {/* Expanded detail */}
            {expanded && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }} className="animate-in">
                {event.description && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 10, whiteSpace: 'pre-wrap' }}>
                    {event.description}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
                  {event.case && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>Case:</span>
                      <Link to={`/cases/${event.case_id}`} style={{ color: 'var(--teal)', fontFamily: 'var(--font-mono)' }} onClick={(e) => e.stopPropagation()}>
                        {(event.case as any).case_number}
                      </Link>
                    </div>
                  )}
                  {event.evidence && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>Evidence:</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{(event.evidence as any).original_file_name}</span>
                    </div>
                  )}
                  {event.finding && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>Finding:</span>
                      <Link to={`/findings/${event.finding_id}`} style={{ color: 'var(--purple)' }} onClick={(e) => e.stopPropagation()}>
                        {(event.finding as any).finding_number}
                      </Link>
                    </div>
                  )}
                  {event.source_artifact && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>Artifact:</span>
                      <span className="font-mono" style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{event.source_artifact}</span>
                    </div>
                  )}
                </div>
                {event.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                    {event.tags.map((tag) => (
                      <span key={tag} style={{ fontSize: 10, background: 'var(--teal-muted)', color: 'var(--teal)', padding: '1px 7px', borderRadius: 20 }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function Timeline() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    case_id: searchParams.get('case') ?? '',
    event_type: '',
    importance: '',
    confirmed: '',
    search: '',
  });
  const [view, setView] = useState<'timeline' | 'table'>('timeline');

  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['timeline', 'list'],
    queryFn: async (): Promise<TimelineEvent[]> => {
      const { data, error } = await supabase
        .from('timeline_events')
        .select(`
          *,
          case:cases(case_number, title),
          evidence:evidence(original_file_name),
          finding:findings(finding_number, title)
        `)
        .order('event_time', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TimelineEvent[];
    },
    staleTime: 30_000,
  });

  const { data: cases = [] } = useQuery({
    queryKey: ['cases', 'for-timeline-filter'],
    queryFn: async () => {
      const { data } = await supabase.from('cases').select('id, case_number, title').order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  // Client-side filtering
  const filtered = events.filter((ev) => {
    if (filters.case_id && ev.case_id !== filters.case_id) return false;
    if (filters.event_type && ev.event_type !== filters.event_type) return false;
    if (filters.importance && ev.importance !== filters.importance) return false;
    if (filters.confirmed === 'yes' && !ev.is_confirmed) return false;
    if (filters.confirmed === 'no' && ev.is_confirmed) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return ev.title.toLowerCase().includes(q) || ev.description?.toLowerCase().includes(q) || false;
    }
    return true;
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('timeline_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => { setEditingEvent(null); setDrawerOpen(true); };
  const openEdit = (ev: TimelineEvent) => { setEditingEvent(ev); setDrawerOpen(true); };

  // Stats
  const criticalCount = events.filter((e) => e.importance === 'critical').length;
  const confirmedCount = events.filter((e) => e.is_confirmed).length;
  const caseCount = new Set(events.map((e) => e.case_id)).size;

  return (
    <>
      {/* Slide-in Drawer */}
      <EventDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editing={editingEvent}
        prefillCaseId={filters.case_id}
      />

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-modal)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 32, maxWidth: 400, width: '90%', textAlign: 'center', boxShadow: 'var(--shadow-modal)' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ color: 'var(--text-heading)', marginBottom: 12 }}>Delete Event?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>This timeline event will be permanently removed.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-outline-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => deleteMutation.mutate(deleteTarget)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-header-title">Investigation Timeline</h1>
            <p className="page-header-subtitle">
              {events.length} event{events.length !== 1 ? 's' : ''} across {caseCount} case{caseCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="page-header-actions">
            {/* View toggle */}
            <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
              {(['timeline', 'table'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  style={{
                    padding: '7px 14px', background: view === v ? 'var(--teal-muted)' : 'transparent',
                    border: 'none', color: view === v ? 'var(--teal)' : 'var(--text-muted)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                  }}
                >
                  {v === 'timeline' ? '📅 Timeline' : '📋 Table'}
                </button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={openCreate} id="btn-new-event">
              + New Event
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="row g-3 mb-4">
          {[
            { label: 'Total Events', value: events.length, icon: '📅', color: 'var(--teal)', muted: 'var(--teal-muted)' },
            { label: 'Critical Events', value: criticalCount, icon: '🔴', color: 'var(--danger)', muted: 'var(--danger-muted)' },
            { label: 'Confirmed', value: confirmedCount, icon: '✅', color: 'var(--success)', muted: 'var(--success-muted)' },
            { label: 'Cases Covered', value: caseCount, icon: '🗂️', color: 'var(--orange)', muted: 'var(--orange-muted)' },
          ].map((s) => (
            <div key={s.label} className="col-6 col-xl-3">
              <div className="stat-card" style={{ ['--stat-color' as string]: s.color, ['--stat-color-muted' as string]: s.muted }}>
                <div className="stat-card-icon">{s.icon}</div>
                <div className="stat-card-value">{isLoading ? '—' : s.value}</div>
                <div className="stat-card-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="card mb-4">
          <div className="filter-bar" style={{ borderRadius: 10, borderBottom: 'none' }}>
            <div className="search-wrapper" style={{ flex: 1, minWidth: 180 }}>
              <span className="search-icon">🔍</span>
              <input
                id="timeline-search"
                type="text"
                className="form-control"
                placeholder="Search events..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
            </div>
            <select className="form-select" style={{ width: 'auto' }} value={filters.case_id}
              onChange={(e) => setFilters((f) => ({ ...f, case_id: e.target.value }))}>
              <option value="">All Cases</option>
              {cases.map((c: any) => <option key={c.id} value={c.id}>{c.case_number}</option>)}
            </select>
            <select className="form-select" style={{ width: 'auto' }} value={filters.event_type}
              onChange={(e) => setFilters((f) => ({ ...f, event_type: e.target.value }))}>
              <option value="">All Types</option>
              {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
            </select>
            <select className="form-select" style={{ width: 'auto' }} value={filters.importance}
              onChange={(e) => setFilters((f) => ({ ...f, importance: e.target.value }))}>
              <option value="">All Importance</option>
              {IMPORTANCE_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <select className="form-select" style={{ width: 'auto' }} value={filters.confirmed}
              onChange={(e) => setFilters((f) => ({ ...f, confirmed: e.target.value }))}>
              <option value="">Confirmed?</option>
              <option value="yes">✅ Confirmed</option>
              <option value="no">⚠️ Unconfirmed</option>
            </select>
            {(filters.search || filters.case_id || filters.event_type || filters.importance || filters.confirmed) && (
              <button className="btn btn-outline-secondary btn-sm"
                onClick={() => setFilters({ case_id: '', event_type: '', importance: '', confirmed: '', search: '' })}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className="alert alert-danger">
            ⚠️ Failed to load timeline events. Make sure migration 005 has been run.
          </div>
        ) : isLoading ? (
          <div>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div className="skeleton" style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0 }} />
                <div className="skeleton" style={{ height: 80, flex: 1, borderRadius: 10 }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-title">
              {filters.search || filters.case_id || filters.event_type
                ? 'No events match your filters'
                : 'No timeline events yet'}
            </div>
            <div className="empty-state-text">
              Add chronological events to build a timeline of what happened during the investigation.
            </div>
            {!filters.search && !filters.case_id && !filters.event_type && (
              <button className="btn btn-primary" onClick={openCreate}>Add First Event</button>
            )}
          </div>
        ) : view === 'timeline' ? (
          /* ─── Timeline View ─── */
          <div style={{ paddingLeft: 8 }}>
            {/* Date grouping */}
            {groupByDay(filtered).map(({ date, dayEvents }) => (
              <div key={date}>
                {/* Day separator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: 4 }}>
                  <div style={{ width: 40, flexShrink: 0 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    <div style={{ height: 1, background: 'var(--border-subtle)', width: 16 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
                      {date}
                    </span>
                    <div style={{ height: 1, background: 'var(--border-subtle)', flex: 1 }} />
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {dayEvents.map((ev, idx) => (
                  <TimelineNode
                    key={ev.id}
                    event={ev}
                    isFirst={idx === 0}
                    isLast={idx === dayEvents.length - 1}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          /* ─── Table View ─── */
          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              <table className="table table-clickable mb-0">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Importance</th>
                    <th>Case</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ev) => {
                    const tc = getEventTypeConfig(ev.event_type);
                    const ic = getImportanceConfig(ev.importance);
                    return (
                      <tr key={ev.id}>
                        <td>
                          <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {format(parseISO(ev.event_time), 'yyyy-MM-dd HH:mm')}
                          </span>
                        </td>
                        <td style={{ maxWidth: 260 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{ev.title}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: 10, fontWeight: 700, background: `${tc.color}18`, color: tc.color, padding: '2px 8px', borderRadius: 20, border: `1px solid ${tc.color}33` }}>
                            {tc.icon} {tc.label}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 11, color: ic.color, fontWeight: 600 }}>{ic.label}</span>
                        </td>
                        <td>
                          {ev.case ? (
                            <Link to={`/cases/${ev.case_id}`} className="font-mono" style={{ color: 'var(--teal)', fontSize: 12 }}>
                              {(ev.case as any).case_number}
                            </Link>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ev.source ?? '—'}</td>
                        <td>
                          {ev.is_confirmed
                            ? <span style={{ fontSize: 10, color: 'var(--success)', fontWeight: 700 }}>✓ Confirmed</span>
                            : <span style={{ fontSize: 10, color: 'var(--warning)', fontWeight: 700 }}>⚠ Unconfirmed</span>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(ev)}>✏️</button>
                            <button
                              className="btn btn-sm"
                              style={{ background: 'var(--danger-muted)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}
                              onClick={() => setDeleteTarget(ev.id)}
                            >🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ─── Date Grouping Helper ─────────────────────────────────────
function groupByDay(events: TimelineEvent[]): { date: string; dayEvents: TimelineEvent[] }[] {
  const map = new Map<string, TimelineEvent[]>();
  for (const ev of events) {
    const day = format(parseISO(ev.event_time), 'EEEE, MMMM d, yyyy');
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(ev);
  }
  return Array.from(map.entries()).map(([date, dayEvents]) => ({ date, dayEvents }));
}
