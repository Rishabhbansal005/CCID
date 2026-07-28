-- Create memory_analysis_results table
CREATE TABLE IF NOT EXISTS public.memory_analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id UUID NOT NULL REFERENCES public.evidence(id) ON DELETE CASCADE,
    analysis_status TEXT NOT NULL DEFAULT 'pending', 
    memory_profile TEXT,
    process_list JSONB NOT NULL DEFAULT '[]'::jsonb,
    process_tree JSONB NOT NULL DEFAULT '[]'::jsonb,
    suspicious_processes JSONB NOT NULL DEFAULT '[]'::jsonb,
    analysis_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.memory_analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to memory_analysis_results"
    ON public.memory_analysis_results
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.memory_analysis_results
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
