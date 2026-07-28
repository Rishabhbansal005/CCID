-- Create network_analysis_results table

CREATE TABLE IF NOT EXISTS public.network_analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id UUID NOT NULL REFERENCES public.evidence(id) ON DELETE CASCADE,
    analysis_status TEXT NOT NULL DEFAULT 'pending', -- pending, analyzing, completed, failed
    protocol_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    conversations JSONB NOT NULL DEFAULT '[]'::jsonb,
    dns_queries JSONB NOT NULL DEFAULT '[]'::jsonb,
    suspicious_indicators JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.network_analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to network_analysis_results"
    ON public.network_analysis_results
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.network_analysis_results
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
