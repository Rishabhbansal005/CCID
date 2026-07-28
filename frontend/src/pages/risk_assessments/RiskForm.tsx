import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { RiskAssessment, RiskLevel } from '@/types';

interface RiskFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<RiskAssessment>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const TagInput = ({ label, tags, setTags }: { label: string, tags: string[], setTags: (t: string[]) => void }) => {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      if (!tags.includes(input.trim())) {
        setTags([...tags, input.trim()]);
      }
      setInput('');
    }
  };

  const removeTag = (indexToRemove: number) => {
    setTags(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="mb-4">
      <label className="form-label">{label} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(Press Enter to add)</span></label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {tags.map((tag, idx) => (
          <span key={idx} style={{ background: 'var(--teal-muted)', color: 'var(--teal)', padding: '4px 10px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            {tag}
            <button type="button" onClick={() => removeTag(idx)} style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', padding: 0, fontSize: 14 }}>×</button>
          </span>
        ))}
      </div>
      <input
        type="text"
        className="form-control"
        placeholder={`Add ${label.toLowerCase()}...`}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

export default function RiskForm({ mode, initialData, onSuccess, onCancel }: RiskFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [caseId, setCaseId] = useState(initialData?.case_id || '');
  const [likelihood, setLikelihood] = useState<number>(initialData?.likelihood || 1);
  const [impact, setImpact] = useState<number>(initialData?.impact || 1);
  const [threatActors, setThreatActors] = useState<string[]>(initialData?.threat_actors || []);
  const [affectedAssets, setAffectedAssets] = useState<string[]>(initialData?.affected_assets || []);
  const [mitigationMeasures, setMitigationMeasures] = useState<string[]>(initialData?.mitigation_measures || []);
  const [analystNotes, setAnalystNotes] = useState(initialData?.analyst_notes || '');

  // Auto-calculated fields
  const score = likelihood * impact;
  let level: RiskLevel = 'low';
  if (score >= 15) level = 'critical';
  else if (score >= 10) level = 'high';
  else if (score >= 5) level = 'medium';

  const { data: availableCases = [], isLoading: loadingCases } = useQuery({
    queryKey: ['available_cases_for_risk'],
    queryFn: async () => {
      // Get all cases
      const { data: casesData, error: casesError } = await supabase.from('cases').select('id, case_number, title').order('created_at', { ascending: false });
      if (casesError) throw casesError;

      // Get all cases with existing risk assessments
      const { data: riskData, error: riskError } = await supabase.from('risk_assessments').select('case_id');
      if (riskError) throw riskError;

      const assessedCaseIds = new Set(riskData.map(r => r.case_id));
      
      // If we are in edit mode, the current case is allowed
      return casesData.filter(c => !assessedCaseIds.has(c.id) || c.id === initialData?.case_id);
    },
    enabled: mode === 'create',
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        case_id: caseId,
        likelihood,
        impact,
        overall_risk_score: score,
        risk_level: level,
        threat_actors: threatActors,
        affected_assets: affectedAssets,
        mitigation_measures: mitigationMeasures,
        analyst_notes: analystNotes,
        assessed_by: user?.id,
        assessed_at: new Date().toISOString(),
      };

      if (mode === 'create') {
        const { data, error } = await supabase.from('risk_assessments').insert(payload).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from('risk_assessments').update(payload).eq('id', initialData!.id!).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['risk_assessments'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate(`/risk/${data.id}`);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) return alert('Please select a case');
    saveMutation.mutate();
  };

  const levelColor = {
    critical: 'var(--danger)',
    high: 'var(--orange)',
    medium: 'var(--warning)',
    low: 'var(--success)'
  }[level];

  return (
    <div className={onSuccess ? '' : 'page-content animate-in'}>
      {!onSuccess && (
        <div className="page-header">
          <div>
            <h1 className="page-header-title">{mode === 'create' ? 'New Risk Assessment' : 'Edit Risk Assessment'}</h1>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body" style={{ padding: '32px' }}>
          <form onSubmit={handleSubmit}>
            <div className="row g-4">
              
              {/* Left Column */}
              <div className="col-12 col-xl-7">
                <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 24 }}>Assessment Details</h4>
                
                {mode === 'create' && (
                  <div className="mb-4">
                    <label className="form-label">Associated Case</label>
                    <select
                      className="form-select"
                      value={caseId}
                      onChange={(e) => setCaseId(e.target.value)}
                      required
                      disabled={loadingCases}
                    >
                      <option value="">Select a case...</option>
                      {availableCases.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.case_number} - {c.title}
                        </option>
                      ))}
                    </select>
                    {availableCases.length === 0 && !loadingCases && (
                      <div style={{ fontSize: 12, color: 'var(--orange)', marginTop: 8 }}>
                        All active cases currently have risk assessments.
                      </div>
                    )}
                  </div>
                )}

                <TagInput label="Threat Actors" tags={threatActors} setTags={setThreatActors} />
                <TagInput label="Affected Assets" tags={affectedAssets} setTags={setAffectedAssets} />
                <TagInput label="Mitigation Measures" tags={mitigationMeasures} setTags={setMitigationMeasures} />

                <div className="mb-4">
                  <label className="form-label">Analyst Notes</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Provide detailed justification or additional risk context..."
                    value={analystNotes}
                    onChange={(e) => setAnalystNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Right Column: Scoring */}
              <div className="col-12 col-xl-5">
                <div style={{ background: 'var(--bg-input)', padding: 24, borderRadius: 16, border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 24 }}>Risk Matrix Scoring</h4>
                  
                  <div className="mb-4">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      Likelihood
                      <span style={{ color: 'var(--teal)', fontWeight: 600 }}>{likelihood} / 5</span>
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="1"
                      max="5"
                      step="1"
                      value={likelihood}
                      onChange={(e) => setLikelihood(parseInt(e.target.value, 10))}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                      <span>Rare (1)</span>
                      <span>Almost Certain (5)</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      Impact
                      <span style={{ color: 'var(--orange)', fontWeight: 600 }}>{impact} / 5</span>
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="1"
                      max="5"
                      step="1"
                      value={impact}
                      onChange={(e) => setImpact(parseInt(e.target.value, 10))}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                      <span>Negligible (1)</span>
                      <span>Severe (5)</span>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '24px 0' }} />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', padding: '16px 20px', borderRadius: 12, border: `1px solid ${levelColor}44` }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Risk Level</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: levelColor, textTransform: 'capitalize' }}>
                        {level}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Score</div>
                      <div className="font-mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {score}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/25</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '32px 0 24px 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  if (onCancel) onCancel();
                  else navigate('/risk');
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending || !caseId}>
                {saveMutation.isPending ? 'Saving...' : mode === 'create' ? 'Create Assessment' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
