import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import apiClient from '@/api/client';

export default function ReportWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  
  const [title, setTitle] = useState('');
  const [sections, setSections] = useState({
    include_executive_summary: true,
    include_evidence_list: true,
    include_findings: true,
    include_timeline: true,
    include_risk_assessment: true,
  });

  const { data: cases = [], isLoading: loadingCases } = useQuery({
    queryKey: ['available_cases_for_report'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cases').select('id, case_number, title, status').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        case_id: selectedCase.id,
        title: title || `Investigation Report - ${selectedCase.case_number}`,
        report_type: 'investigation',
        ...sections
      };
      const res = await apiClient.post('/reports', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports_list'] });
      navigate('/reports');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || err.message || 'Failed to generate report');
    }
  });

  const handleNext = () => {
    if (step === 1 && selectedCase) {
      if (!title) setTitle(`Investigation Report - ${selectedCase.case_number}`);
      setStep(2);
    }
  };

  return (
    <div className="page-content animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Generate Report</h1>
          <p className="page-header-subtitle">Step {step} of 2</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="card-body" style={{ padding: '32px' }}>
          
          {/* Progress Bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--teal)' }} />
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: step === 2 ? 'var(--teal)' : 'var(--bg-input)' }} />
          </div>

          {step === 1 && (
            <div className="animate-in">
              <h3 style={{ color: 'var(--text-heading)', marginBottom: 24 }}>Select a Case</h3>
              
              {loadingCases ? (
                <div>Loading cases...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
                  {cases.map((c: any) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCase(c)}
                      style={{
                        padding: '16px 20px',
                        border: `1px solid ${selectedCase?.id === c.id ? 'var(--teal)' : 'var(--border-subtle)'}`,
                        borderRadius: 12,
                        background: selectedCase?.id === c.id ? 'var(--teal-muted)' : 'var(--bg-input)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: selectedCase?.id === c.id ? 'var(--teal)' : 'var(--text-primary)' }}>
                        {c.case_number}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {c.title}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '32px 0 24px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button className="btn btn-outline-secondary" onClick={() => navigate('/reports')}>Cancel</button>
                <button className="btn btn-primary" onClick={handleNext} disabled={!selectedCase}>Next Step →</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in">
              <h3 style={{ color: 'var(--text-heading)', marginBottom: 24 }}>Report Configuration</h3>
              
              <div className="mb-4">
                <label className="form-label">Report Title</label>
                <input
                  type="text"
                  className="form-control"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q3 Incident Report"
                />
              </div>

              <div className="mb-4">
                <label className="form-label" style={{ marginBottom: 16 }}>Included Sections</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { key: 'include_executive_summary', label: 'Executive Summary', desc: 'High-level overview of the case and outcome' },
                    { key: 'include_evidence_list', label: 'Evidence List', desc: 'Detailed log of all acquired evidence and chain of custody' },
                    { key: 'include_findings', label: 'Findings', desc: 'Identified artifacts, IOCs, and MITRE ATT&CK mapping' },
                    { key: 'include_timeline', label: 'Timeline', desc: 'Chronological sequence of events' },
                    { key: 'include_risk_assessment', label: 'Risk Assessment', desc: 'Risk matrix scoring, assets, and mitigation' },
                  ].map(({ key, label, desc }) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '16px', background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                      <input
                        type="checkbox"
                        checked={(sections as any)[key]}
                        onChange={(e) => setSections({ ...sections, [key]: e.target.checked })}
                        style={{ marginTop: 4, width: 18, height: 18, accentColor: 'var(--teal)' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '32px 0 24px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-outline-secondary" onClick={() => setStep(1)}>← Back</button>
                <button className="btn btn-primary" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                  {generateMutation.isPending ? 'Initiating Generation...' : 'Generate Report'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
