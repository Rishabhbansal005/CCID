-- Migration 015: Create suspects table and link to evidence

CREATE TABLE IF NOT EXISTS public.suspects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    aliases TEXT[] DEFAULT '{}',
    mobile_numbers TEXT[] DEFAULT '{}',
    email_ids TEXT[] DEFAULT '{}',
    ip_addresses TEXT[] DEFAULT '{}',
    criminal_history TEXT,
    social_media_accounts JSONB DEFAULT '[]',
    notes TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suspects_case_id ON public.suspects(case_id);
CREATE INDEX IF NOT EXISTS idx_suspects_created_at ON public.suspects(created_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS suspects_updated_at ON public.suspects;
CREATE TRIGGER suspects_updated_at
    BEFORE UPDATE ON public.suspects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add suspect_id to evidence
ALTER TABLE public.evidence 
ADD COLUMN IF NOT EXISTS suspect_id UUID REFERENCES public.suspects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_evidence_suspect_id ON public.evidence(suspect_id);

-- RLS Policies
ALTER TABLE public.suspects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.suspects;
CREATE POLICY "Enable read access for all authenticated users" 
ON public.suspects FOR SELECT 
TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.suspects;
CREATE POLICY "Enable insert for authenticated users" 
ON public.suspects FOR INSERT 
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.suspects;
CREATE POLICY "Enable update for authenticated users" 
ON public.suspects FOR UPDATE
TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.suspects;
CREATE POLICY "Enable delete for authenticated users" 
ON public.suspects FOR DELETE
TO authenticated USING (true);
