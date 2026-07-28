-- Create event_log_analysis_results table
CREATE TABLE IF NOT EXISTS public.event_log_analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    evidence_id UUID NOT NULL REFERENCES public.evidence(id) ON DELETE CASCADE,
    analysis_status TEXT NOT NULL DEFAULT 'pending',
    suspicious_events JSONB NOT NULL DEFAULT '[]'::jsonb,
    timeline_events JSONB NOT NULL DEFAULT '[]'::jsonb,
    analysis_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.event_log_analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to event_log_analysis_results"
    ON public.event_log_analysis_results
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.event_log_analysis_results
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_log_analysis_case_id ON public.event_log_analysis_results(case_id);
CREATE INDEX IF NOT EXISTS idx_event_log_analysis_evidence_id ON public.event_log_analysis_results(evidence_id);
