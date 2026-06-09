-- Migration 002: Create cases table

CREATE TABLE IF NOT EXISTS public.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    incident_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'active', 'pending_review', 'closed', 'archived')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    category TEXT CHECK (category IN (
        'cybercrime', 'data_breach', 'malware', 'ransomware', 'phishing',
        'insider_threat', 'fraud', 'ddos', 'espionage', 'other'
    )),
    jurisdiction TEXT,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_priority ON public.cases(priority);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_to ON public.cases(assigned_to);
CREATE INDEX IF NOT EXISTS idx_cases_created_by ON public.cases(created_by);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON public.cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON public.cases(case_number);

-- Auto-generate case number (e.g. CCID-2024-000001)
CREATE OR REPLACE FUNCTION public.generate_case_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part TEXT;
    seq_num INT;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    SELECT COUNT(*) + 1 INTO seq_num
    FROM public.cases
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    
    NEW.case_number := 'CCID-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cases_generate_number
    BEFORE INSERT ON public.cases
    FOR EACH ROW
    WHEN (NEW.case_number IS NULL OR NEW.case_number = '')
    EXECUTE FUNCTION public.generate_case_number();

CREATE TRIGGER cases_updated_at
    BEFORE UPDATE ON public.cases
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.cases IS 'Investigation cases managed by the platform';
COMMENT ON COLUMN public.cases.case_number IS 'Auto-generated unique case identifier (CCID-YYYY-NNNNNN)';
