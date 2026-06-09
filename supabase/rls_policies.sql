-- ============================================================
-- Supabase Row Level Security (RLS) Policies
-- Run this AFTER all migrations have been applied
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper function: Get current user's role
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- USERS table policies
-- ============================================================

-- Users can read their own profile; admins can read all
CREATE POLICY "users_select" ON public.users
    FOR SELECT USING (
        id = auth.uid() OR public.is_admin()
    );

-- Users can update their own profile; admins can update any
CREATE POLICY "users_update" ON public.users
    FOR UPDATE USING (
        id = auth.uid() OR public.is_admin()
    );

-- Only admins can delete users
CREATE POLICY "users_delete" ON public.users
    FOR DELETE USING (public.is_admin());

-- ============================================================
-- CASES table policies
-- ============================================================

-- Investigators/admins can see cases they created or are assigned to
-- Viewers can only see cases assigned to them
CREATE POLICY "cases_select" ON public.cases
    FOR SELECT USING (
        public.is_admin()
        OR created_by = auth.uid()
        OR assigned_to = auth.uid()
    );

-- Investigators and admins can create cases
CREATE POLICY "cases_insert" ON public.cases
    FOR INSERT WITH CHECK (
        public.get_user_role() IN ('admin', 'investigator')
        AND created_by = auth.uid()
    );

-- Case creator and admins can update
CREATE POLICY "cases_update" ON public.cases
    FOR UPDATE USING (
        public.is_admin()
        OR created_by = auth.uid()
        OR assigned_to = auth.uid()
    );

-- Only admins can delete cases
CREATE POLICY "cases_delete" ON public.cases
    FOR DELETE USING (public.is_admin());

-- ============================================================
-- EVIDENCE table policies
-- ============================================================

-- Evidence is visible to anyone who can see the parent case
CREATE POLICY "evidence_select" ON public.evidence
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id = evidence.case_id
            AND (
                public.is_admin()
                OR c.created_by = auth.uid()
                OR c.assigned_to = auth.uid()
            )
        )
    );

-- Investigators and admins can upload evidence to accessible cases
CREATE POLICY "evidence_insert" ON public.evidence
    FOR INSERT WITH CHECK (
        public.get_user_role() IN ('admin', 'investigator')
        AND uploaded_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id = evidence.case_id
            AND (c.created_by = auth.uid() OR c.assigned_to = auth.uid() OR public.is_admin())
        )
    );

-- Evidence uploader and admins can update
CREATE POLICY "evidence_update" ON public.evidence
    FOR UPDATE USING (
        public.is_admin() OR uploaded_by = auth.uid()
    );

-- Only admins can delete evidence
CREATE POLICY "evidence_delete" ON public.evidence
    FOR DELETE USING (public.is_admin());

-- ============================================================
-- FINDINGS table policies
-- ============================================================

CREATE POLICY "findings_select" ON public.findings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id = findings.case_id
            AND (
                public.is_admin()
                OR c.created_by = auth.uid()
                OR c.assigned_to = auth.uid()
            )
        )
    );

CREATE POLICY "findings_insert" ON public.findings
    FOR INSERT WITH CHECK (
        public.get_user_role() IN ('admin', 'investigator')
        AND created_by = auth.uid()
    );

CREATE POLICY "findings_update" ON public.findings
    FOR UPDATE USING (
        public.is_admin() OR created_by = auth.uid()
    );

CREATE POLICY "findings_delete" ON public.findings
    FOR DELETE USING (public.is_admin() OR created_by = auth.uid());

-- ============================================================
-- TIMELINE EVENTS table policies
-- ============================================================

CREATE POLICY "timeline_select" ON public.timeline_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id = timeline_events.case_id
            AND (
                public.is_admin()
                OR c.created_by = auth.uid()
                OR c.assigned_to = auth.uid()
            )
        )
    );

CREATE POLICY "timeline_insert" ON public.timeline_events
    FOR INSERT WITH CHECK (
        public.get_user_role() IN ('admin', 'investigator')
        AND created_by = auth.uid()
    );

CREATE POLICY "timeline_update" ON public.timeline_events
    FOR UPDATE USING (public.is_admin() OR created_by = auth.uid());

CREATE POLICY "timeline_delete" ON public.timeline_events
    FOR DELETE USING (public.is_admin() OR created_by = auth.uid());

-- ============================================================
-- REPORTS table policies
-- ============================================================

CREATE POLICY "reports_select" ON public.reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id = reports.case_id
            AND (
                public.is_admin()
                OR c.created_by = auth.uid()
                OR c.assigned_to = auth.uid()
            )
        )
    );

CREATE POLICY "reports_insert" ON public.reports
    FOR INSERT WITH CHECK (
        public.get_user_role() IN ('admin', 'investigator')
        AND generated_by = auth.uid()
    );

CREATE POLICY "reports_update" ON public.reports
    FOR UPDATE USING (public.is_admin() OR generated_by = auth.uid());

CREATE POLICY "reports_delete" ON public.reports
    FOR DELETE USING (public.is_admin());

-- ============================================================
-- RISK ASSESSMENTS table policies
-- ============================================================

CREATE POLICY "risk_select" ON public.risk_assessments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id = risk_assessments.case_id
            AND (
                public.is_admin()
                OR c.created_by = auth.uid()
                OR c.assigned_to = auth.uid()
            )
        )
    );

CREATE POLICY "risk_insert" ON public.risk_assessments
    FOR INSERT WITH CHECK (
        public.get_user_role() IN ('admin', 'investigator')
    );

CREATE POLICY "risk_update" ON public.risk_assessments
    FOR UPDATE USING (
        public.is_admin() OR assessed_by = auth.uid()
    );

CREATE POLICY "risk_delete" ON public.risk_assessments
    FOR DELETE USING (public.is_admin());
