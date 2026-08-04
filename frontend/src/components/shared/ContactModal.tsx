import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormFields {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FieldErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  general?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(fields: FormFields): FieldErrors {
  const errors: FieldErrors = {};
  if (!fields.name.trim()) {
    errors.name = 'Name is required.';
  } else if (fields.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  } else if (fields.name.trim().length > 80) {
    errors.name = 'Name must be 80 characters or fewer.';
  }

  if (!fields.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_RE.test(fields.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!fields.subject.trim()) {
    errors.subject = 'Subject is required.';
  } else if (fields.subject.trim().length < 2) {
    errors.subject = 'Subject must be at least 2 characters.';
  } else if (fields.subject.trim().length > 120) {
    errors.subject = 'Subject must be 120 characters or fewer.';
  }

  if (!fields.message.trim()) {
    errors.message = 'Message is required.';
  } else if (fields.message.trim().length < 10) {
    errors.message = 'Message must be at least 10 characters.';
  } else if (fields.message.trim().length > 2000) {
    errors.message = 'Message must be 2000 characters or fewer.';
  }

  return errors;
}

const EMPTY_FIELDS: FormFields = { name: '', email: '', subject: '', message: '' };

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [fields, setFields] = useState<FormFields>(EMPTY_FIELDS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormFields, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setFields(EMPTY_FIELDS);
      setErrors({});
      setTouched({});
      setSubmitting(false);
      setSubmitted(false);
      setRateLimited(false);
      setTimeout(() => firstInputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Trap focus & Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
    if (touched[name as keyof FormFields]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [touched]);

  const handleBlur = useCallback((
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const fieldErrors = validate({ ...fields });
    setErrors(prev => ({ ...prev, [name]: fieldErrors[name as keyof FieldErrors] }));
  }, [fields]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched = { name: true, email: true, subject: true, message: true };
    setTouched(allTouched);
    const validationErrors = validate(fields);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fields.name.trim(),
          email: fields.email.trim(),
          subject: fields.subject.trim(),
          message: fields.message.trim(),
        }),
      });

      if (res.status === 429) {
        setRateLimited(true);
        setErrors({ general: 'Too many submissions. Please wait a minute before trying again.' });
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        const detail = data?.detail ?? 'Something went wrong. Please try again.';
        setErrors({ general: typeof detail === 'string' ? detail : JSON.stringify(detail) });
        return;
      }

      setSubmitted(true);
    } catch {
      setErrors({ general: 'Network error. Please check your connection and try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 1040,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        ref={modalRef}
        style={{
          position: 'fixed', inset: 0, zIndex: 1050,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: 'var(--surface-primary, #1a1d2e)',
            border: '1px solid var(--border-subtle, #2a2d3e)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.2)',
            pointerEvents: 'all',
            animation: 'slideUpFadeIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          {/* ── Header ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--border-subtle, #2a2d3e)',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, transparent 100%)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.6" width="18" height="18">
                  <path d="M2 6l8 5 8-5" strokeLinecap="round" />
                  <rect x="2" y="4" width="16" height="12" rx="2" />
                </svg>
              </div>
              <div>
                <h2 id="contact-modal-title" style={{
                  margin: 0, fontSize: '16px', fontWeight: 700,
                  color: 'var(--text-primary, #e2e8f0)',
                }}>
                  Contact &amp; Support
                </h2>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                  We'll get back to you as soon as possible
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close contact form"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted, #64748b)', padding: '6px', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-primary, #e2e8f0)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'none';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-muted, #64748b)';
              }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* ── Body ── */}
          <div style={{ overflowY: 'auto', flexGrow: 1, padding: '24px' }}>
            {/* SUCCESS STATE */}
            {submitted ? (
              <div style={{
                textAlign: 'center', padding: '24px 16px',
                animation: 'slideUpFadeIn 0.3s ease',
              }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                  boxShadow: '0 0 0 12px rgba(16,185,129,0.12)',
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="28" height="28">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 style={{
                  color: 'var(--text-primary, #e2e8f0)', fontSize: '18px',
                  fontWeight: 700, margin: '0 0 8px',
                }}>
                  Message Sent!
                </h3>
                <p style={{
                  color: 'var(--text-secondary, #94a3b8)', fontSize: '14px',
                  lineHeight: 1.6, margin: '0 0 24px',
                }}>
                  Thank you for reaching out. Your message has been received and we'll
                  get back to you as soon as possible.
                </p>
                <button
                  onClick={onClose}
                  style={{
                    padding: '10px 28px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none', color: '#fff', fontWeight: 600,
                    fontSize: '14px', cursor: 'pointer',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.85')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                >
                  Close
                </button>
              </div>
            ) : (
              /* FORM STATE */
              <form id="contact-form" onSubmit={handleSubmit} noValidate>
                {/* General error banner */}
                {errors.general && (
                  <div style={{
                    background: rateLimited
                      ? 'rgba(245,158,11,0.1)'
                      : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${rateLimited ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    animation: 'slideUpFadeIn 0.2s ease',
                  }}>
                    <svg viewBox="0 0 16 16" fill="none" stroke={rateLimited ? '#f59e0b' : '#ef4444'}
                      strokeWidth="1.6" width="16" height="16" style={{ flexShrink: 0, marginTop: '1px' }}>
                      <circle cx="8" cy="8" r="6.5" />
                      <path d="M8 5v3M8 10.5h.01" strokeLinecap="round" />
                    </svg>
                    <span style={{
                      fontSize: '13px', lineHeight: 1.5,
                      color: rateLimited ? '#f59e0b' : '#ef4444',
                    }}>
                      {errors.general}
                    </span>
                  </div>
                )}

                {/* Name */}
                <Field
                  id="contact-name"
                  label="Full Name"
                  required
                  error={touched.name ? errors.name : undefined}
                >
                  <input
                    ref={firstInputRef}
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Jane Smith"
                    value={fields.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength={80}
                    style={inputStyle(!!touched.name && !!errors.name)}
                  />
                </Field>

                {/* Email */}
                <Field
                  id="contact-email"
                  label="Email Address"
                  required
                  error={touched.email ? errors.email : undefined}
                >
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="jane@example.com"
                    value={fields.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    style={inputStyle(!!touched.email && !!errors.email)}
                  />
                </Field>

                {/* Subject */}
                <Field
                  id="contact-subject"
                  label="Subject"
                  required
                  error={touched.subject ? errors.subject : undefined}
                >
                  <input
                    id="contact-subject"
                    name="subject"
                    type="text"
                    placeholder="e.g. Bug report, Feature request, General enquiry"
                    value={fields.subject}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength={120}
                    style={inputStyle(!!touched.subject && !!errors.subject)}
                  />
                </Field>

                {/* Message */}
                <Field
                  id="contact-message"
                  label="Message"
                  required
                  error={touched.message ? errors.message : undefined}
                  hint={`${fields.message.length}/2000`}
                >
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={5}
                    placeholder="Describe your issue or question in detail..."
                    value={fields.message}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength={2000}
                    style={{
                      ...inputStyle(!!touched.message && !!errors.message),
                      resize: 'vertical',
                      minHeight: '110px',
                    }}
                  />
                </Field>
              </form>
            )}
          </div>

          {/* ── Footer ── */}
          {!submitted && (
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-subtle, #2a2d3e)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '12px', flexShrink: 0,
              background: 'rgba(0,0,0,0.15)',
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                  width="12" height="12" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                  <path d="M8 1L2 4v4c0 3 2.5 5.5 6 7 3.5-1.5 6-4 6-7V4L8 1z" />
                </svg>
                Your data is handled securely and never shared
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '9px 18px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-subtle, #2a2d3e)',
                    color: 'var(--text-secondary, #94a3b8)',
                    fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="contact-form"
                  disabled={submitting}
                  style={{
                    padding: '9px 22px', borderRadius: '10px',
                    background: submitting
                      ? 'rgba(99,102,241,0.5)'
                      : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none', color: '#fff',
                    fontSize: '13px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'opacity 0.15s',
                    boxShadow: submitting ? 'none' : '0 4px 16px rgba(99,102,241,0.35)',
                  }}
                  onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLElement).style.opacity = '0.88'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                >
                  {submitting ? (
                    <>
                      <span style={{
                        width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff', borderRadius: '50%',
                        display: 'inline-block', animation: 'spin 0.7s linear infinite',
                      }} />
                      Sending…
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"
                        width="14" height="14">
                        <path d="M2 8h10M8 4l6 4-6 4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUpFadeIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Field({
  id, label, required, error, hint, children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <label htmlFor={id} style={{
          fontSize: '12px', fontWeight: 600,
          color: 'var(--text-secondary, #94a3b8)',
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          {label}
          {required && (
            <span style={{ color: '#ef4444', marginLeft: '3px' }} aria-hidden="true">*</span>
          )}
        </label>
        {hint && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
            {hint}
          </span>
        )}
      </div>
      {children}
      {error && (
        <p role="alert" style={{
          margin: '5px 0 0', fontSize: '12px', color: '#ef4444',
          display: 'flex', alignItems: 'center', gap: '4px',
          animation: 'slideUpFadeIn 0.15s ease',
        }}>
          <svg viewBox="0 0 12 12" fill="currentColor" width="10" height="10">
            <path d="M6 0a6 6 0 100 12A6 6 0 006 0zm0 8.5a.75.75 0 110 1.5.75.75 0 010-1.5zm.75-5v4h-1.5V3.5h1.5z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${hasError ? '#ef4444' : 'var(--border-subtle, #2a2d3e)'}`,
    borderRadius: '10px',
    color: 'var(--text-primary, #e2e8f0)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };
}
