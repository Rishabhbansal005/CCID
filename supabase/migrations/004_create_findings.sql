-- Migration 004: Create findings table

CREATE TABLE IF NOT EXISTS public.findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    evidence_id UUID REFERENCES public.evidence(id) ON DELETE SET NULL,
    finding_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN (
        'informational', 'low', 'medium', 'high', 'critical'
    )),
    category TEXT CHECK (category IN (
        'malware', 'intrusion', 'data_exfiltration', 'privilege_escalation',
        'lateral_movement', 'persistence', 'defense_evasion', 'credential_access',
        'discovery', 'collection', 'command_control', 'exfiltration', 'impact',
        'fraud', 'policy_violation', 'other'
    )),
    -- MITRE ATT&CK mapping
    mitre_tactic TEXT,
    mitre_technique TEXT,
    -- Status
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
        'open', 'investigating', 'confirmed', 'false_positive', 'resolved'
    )),
    tags TEXT[] DEFAULT '{}',
    ioc_indicators JSONB DEFAULT '[]', -- Indicators of Compromise
    recommendations TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_findings_case_id ON public.findings(case_id);
CREATE INDEX IF NOT EXISTS idx_findings_evidence_id ON public.findings(evidence_id);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON public.findings(severity);
CREATE INDEX IF NOT EXISTS idx_findings_status ON public.findings(status);

-- Auto-generate finding number per case
CREATE OR REPLACE FUNCTION public.generate_finding_number()
RETURNS TRIGGER AS $$
DECLARE
    fn_count INT;
BEGIN
    SELECT COUNT(*) + 1 INTO fn_count
    FROM public.findings
    WHERE case_id = NEW.case_id;
    
    NEW.finding_number := 'FN-' || LPAD(fn_count::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER findings_generate_number
    BEFORE INSERT ON public.findings
    FOR EACH ROW EXECUTE FUNCTION public.generate_finding_number();

CREATE TRIGGER findings_updated_at
    BEFORE UPDATE ON public.findings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.findings IS 'Investigation findings with MITRE ATT&CK mapping and IOC tracking';
