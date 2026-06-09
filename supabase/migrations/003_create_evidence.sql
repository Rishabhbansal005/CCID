-- Migration 003: Create evidence table

CREATE TABLE IF NOT EXISTS public.evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    evidence_number TEXT NOT NULL,
    file_name TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT NOT NULL DEFAULT 0,
    storage_path TEXT NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'forensic_uploads',
    public_url TEXT,
    -- Hash verification
    hash_md5 TEXT,
    hash_sha256 TEXT,
    hash_sha512 TEXT,
    -- Evidence metadata
    evidence_type TEXT DEFAULT 'digital' CHECK (evidence_type IN (
        'digital', 'network_capture', 'memory_dump', 'disk_image',
        'log_file', 'document', 'screenshot', 'email', 'other'
    )),
    source_device TEXT,
    source_location TEXT,
    acquisition_method TEXT,
    -- Chain of custody (JSONB array of custody events)
    chain_of_custody JSONB NOT NULL DEFAULT '[]',
    -- Processing status for forensic tool integration
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN (
        'pending', 'processing', 'analyzed', 'error', 'skipped'
    )),
    forensic_tool TEXT, -- Which tool processed this (volatility, wireshark, etc.)
    analysis_notes TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON public.evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_uploaded_by ON public.evidence(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON public.evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_evidence_processing_status ON public.evidence(processing_status);
CREATE INDEX IF NOT EXISTS idx_evidence_created_at ON public.evidence(created_at DESC);

-- Auto-generate evidence number
CREATE OR REPLACE FUNCTION public.generate_evidence_number()
RETURNS TRIGGER AS $$
DECLARE
    ev_count INT;
BEGIN
    SELECT COUNT(*) + 1 INTO ev_count
    FROM public.evidence
    WHERE case_id = NEW.case_id;
    
    NEW.evidence_number := 'EV-' || LPAD(ev_count::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evidence_generate_number
    BEFORE INSERT ON public.evidence
    FOR EACH ROW EXECUTE FUNCTION public.generate_evidence_number();

CREATE TRIGGER evidence_updated_at
    BEFORE UPDATE ON public.evidence
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.evidence IS 'Digital evidence files uploaded to Supabase Storage';
COMMENT ON COLUMN public.evidence.chain_of_custody IS 'JSON array of {action, user_id, timestamp, notes} objects';
