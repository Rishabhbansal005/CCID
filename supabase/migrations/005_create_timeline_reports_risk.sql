-- Migration 005: Create timeline_events table

CREATE TABLE IF NOT EXISTS public.timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    evidence_id UUID REFERENCES public.evidence(id) ON DELETE SET NULL,
    finding_id UUID REFERENCES public.findings(id) ON DELETE SET NULL,
    event_time TIMESTAMPTZ NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL DEFAULT 'other' CHECK (event_type IN (
        'system', 'network', 'user_action', 'file', 'registry',
        'process', 'authentication', 'email', 'web', 'other'
    )),
    source TEXT, -- e.g. 'Wireshark', 'Volatility', 'Manual', 'Syslog'
    source_artifact TEXT, -- Reference to specific artifact/log
    importance TEXT DEFAULT 'normal' CHECK (importance IN ('low', 'normal', 'high', 'critical')),
    is_confirmed BOOLEAN DEFAULT FALSE,
    tags TEXT[] DEFAULT '{}',
    raw_data JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_case_id ON public.timeline_events(case_id);
CREATE INDEX IF NOT EXISTS idx_timeline_event_time ON public.timeline_events(event_time);
CREATE INDEX IF NOT EXISTS idx_timeline_event_type ON public.timeline_events(event_type);
CREATE INDEX IF NOT EXISTS idx_timeline_importance ON public.timeline_events(importance);

CREATE TRIGGER timeline_events_updated_at
    BEFORE UPDATE ON public.timeline_events
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Migration 006: Create reports table

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    report_type TEXT NOT NULL DEFAULT 'investigation' CHECK (report_type IN (
        'investigation', 'executive_summary', 'technical', 'chain_of_custody', 'custom'
    )),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'generating', 'ready', 'failed'
    )),
    storage_path TEXT,
    storage_bucket TEXT DEFAULT 'forensic_uploads',
    file_size BIGINT,
    -- Report configuration
    include_executive_summary BOOLEAN DEFAULT TRUE,
    include_timeline BOOLEAN DEFAULT TRUE,
    include_findings BOOLEAN DEFAULT TRUE,
    include_evidence_list BOOLEAN DEFAULT TRUE,
    include_risk_assessment BOOLEAN DEFAULT TRUE,
    custom_sections JSONB DEFAULT '[]',
    -- Audit
    generated_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    generated_at TIMESTAMPTZ,
    error_message TEXT,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_case_id ON public.reports(case_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON public.reports(generated_by);

CREATE TRIGGER reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Risk Assessment table (one per case)
CREATE TABLE IF NOT EXISTS public.risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID UNIQUE NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    overall_risk_score INT CHECK (overall_risk_score BETWEEN 1 AND 25),
    likelihood INT CHECK (likelihood BETWEEN 1 AND 5),
    impact INT CHECK (impact BETWEEN 1 AND 5),
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    threat_actors JSONB DEFAULT '[]',
    affected_assets JSONB DEFAULT '[]',
    vulnerabilities JSONB DEFAULT '[]',
    mitigation_measures JSONB DEFAULT '[]',
    residual_risk TEXT,
    analyst_notes TEXT,
    assessed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_case_id ON public.risk_assessments(case_id);

CREATE TRIGGER risk_assessments_updated_at
    BEFORE UPDATE ON public.risk_assessments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.timeline_events IS 'Chronological events for case timeline visualization';
COMMENT ON TABLE public.reports IS 'Generated PDF investigation reports';
COMMENT ON TABLE public.risk_assessments IS 'Per-case risk assessment with 5x5 matrix scoring';
