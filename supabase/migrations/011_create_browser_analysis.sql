-- Create browser_analysis_results table

CREATE TABLE IF NOT EXISTS public.browser_analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id UUID NOT NULL REFERENCES public.evidence(id) ON DELETE CASCADE,
    analysis_status TEXT NOT NULL DEFAULT 'pending', -- pending, analyzing, completed, failed
    browser_type TEXT,
    history_entries JSONB NOT NULL DEFAULT '[]'::jsonb,
    downloads JSONB NOT NULL DEFAULT '[]'::jsonb,
    cookies JSONB NOT NULL DEFAULT '[]'::jsonb,
    bookmarks JSONB NOT NULL DEFAULT '[]'::jsonb,
    suspicious_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    search_terms JSONB NOT NULL DEFAULT '[]'::jsonb,
    analysis_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.browser_analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to browser_analysis_results"
    ON public.browser_analysis_results
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.browser_analysis_results
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
