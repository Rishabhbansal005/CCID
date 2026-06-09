-- ============================================================
-- CCID: Complete RLS Policy Reset & Fix
-- Run this ONCE in Supabase SQL Editor.
-- Safe to re-run: all CREATE POLICY calls are idempotent via
-- DROP IF EXISTS guards.
-- ============================================================

-- ============================================================
-- SECTION 0: Helper Functions (idempotent)
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
-- SECTION 1: Enable RLS (safe to run even if already enabled)
-- ============================================================

ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 2: Drop ALL existing policies (clean slate)
-- This guarantees no stale partial state from previous runs.
-- ============================================================

-- users
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;

-- cases
DROP POLICY IF EXISTS "cases_select" ON public.cases;
DROP POLICY IF EXISTS "cases_insert" ON public.cases;
DROP POLICY IF EXISTS "cases_update" ON public.cases;
DROP POLICY IF EXISTS "cases_delete" ON public.cases;

-- evidence
DROP POLICY IF EXISTS "evidence_select" ON public.evidence;
DROP POLICY IF EXISTS "evidence_insert" ON public.evidence;
DROP POLICY IF EXISTS "evidence_update" ON public.evidence;
DROP POLICY IF EXISTS "evidence_delete" ON public.evidence;

-- findings
DROP POLICY IF EXISTS "findings_select" ON public.findings;
DROP POLICY IF EXISTS "findings_insert" ON public.findings;
DROP POLICY IF EXISTS "findings_update" ON public.findings;
DROP POLICY IF EXISTS "findings_delete" ON public.findings;

-- timeline_events
DROP POLICY IF EXISTS "timeline_select" ON public.timeline_events;
DROP POLICY IF EXISTS "timeline_insert" ON public.timeline_events;
DROP POLICY IF EXISTS "timeline_update" ON public.timeline_events;
DROP POLICY IF EXISTS "timeline_delete" ON public.timeline_events;

-- reports
DROP POLICY IF EXISTS "reports_select" ON public.reports;
DROP POLICY IF EXISTS "reports_insert" ON public.reports;
DROP POLICY IF EXISTS "reports_update" ON public.reports;
DROP POLICY IF EXISTS "reports_delete" ON public.reports;

-- risk_assessments
DROP POLICY IF EXISTS "risk_select" ON public.risk_assessments;
DROP POLICY IF EXISTS "risk_insert" ON public.risk_assessments;
DROP POLICY IF EXISTS "risk_update" ON public.risk_assessments;
DROP POLICY IF EXISTS "risk_delete" ON public.risk_assessments;

-- ============================================================
-- SECTION 3: USERS table policies
-- ============================================================

-- SELECT: own profile always visible; admins see everyone
CREATE POLICY "users_select" ON public.users
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.is_admin());

-- INSERT: CRITICAL — allows the handle_new_user() trigger to
-- insert the profile row AND allows service_role to backfill.
-- Also allows a user to insert their own row directly (idempotent).
CREATE POLICY "users_insert" ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- UPDATE: own profile; admins update any
CREATE POLICY "users_update" ON public.users
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_admin())
    WITH CHECK (id = auth.uid() OR public.is_admin());

-- DELETE: admins only
CREATE POLICY "users_delete" ON public.users
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- ============================================================
-- SECTION 4: CASES table policies
-- ============================================================

-- SELECT: own cases + assigned cases + admins
CREATE POLICY "cases_select" ON public.cases
    FOR SELECT TO authenticated
    USING (
        created_by = auth.uid()
        OR assigned_to = auth.uid()
        OR public.is_admin()
    );

-- INSERT: any authenticated investigator/admin can create a case
-- Uses auth.uid() directly — avoids the get_user_role() chicken-and-egg
-- problem where the profile row might not exist yet.
-- created_by MUST equal the current user's auth UID.
CREATE POLICY "cases_insert" ON public.cases
    FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

-- UPDATE: case owner, assignee, or admin
CREATE POLICY "cases_update" ON public.cases
    FOR UPDATE TO authenticated
    USING (
        created_by = auth.uid()
        OR assigned_to = auth.uid()
        OR public.is_admin()
    )
    WITH CHECK (
        created_by = auth.uid()
        OR assigned_to = auth.uid()
        OR public.is_admin()
    );

-- DELETE: case owner or admin
CREATE POLICY "cases_delete" ON public.cases
    FOR DELETE TO authenticated
    USING (created_by = auth.uid() OR public.is_admin());

-- ============================================================
-- SECTION 5: EVIDENCE table policies
-- ============================================================

-- SELECT: visible if user can see the parent case
CREATE POLICY "evidence_select" ON public.evidence
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id = evidence.case_id
            AND (
                c.created_by = auth.uid()
                OR c.assigned_to = auth.uid()
                OR public.is_admin()
            )
        )
    );

-- INSERT: authenticated user uploading to an accessible case
-- uploaded_by must be the current user
CREATE POLICY "evidence_insert" ON public.evidence
    FOR INSERT TO authenticated
    WITH CHECK (
        uploaded_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id = evidence.case_id
            AND (
                c.created_by = auth.uid()
                OR c.assigned_to = auth.uid()
                OR public.is_admin()
            )
        )
    );

-- UPDATE: uploader or admin
CREATE POLICY "evidence_update" ON public.evidence
    FOR UPDATE TO authenticated
    USING (uploaded_by = auth.uid() OR public.is_admin())
    WITH CHECK (uploaded_by = auth.uid() OR public.is_admin());

-- DELETE: uploader or admin
CREATE POLICY "evidence_delete" ON public.evidence
    FOR DELETE TO authenticated
    USING (uploaded_by = auth.uid() OR public.is_admin());

-- ============================================================
-- SECTION 6: FINDINGS table policies
-- ============================================================

-- SELECT: visible if user can see the parent case
CREATE POLICY "findings_select" ON public.findings
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id = findings.case_id
            AND (
                c.created_by = auth.uid()
                OR c.assigned_to = auth.uid()
                OR public.is_admin()
            )
        )
    );

-- INSERT: authenticated user, must own the creation
CREATE POLICY "findings_insert" ON public.findings
    FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

-- UPDATE: finding creator or admin
CREATE POLICY "findings_update" ON public.findings
    FOR UPDATE TO authenticated
    USING (created_by = auth.uid() OR public.is_admin())
    WITH CHECK (created_by = auth.uid() OR public.is_admin());

-- DELETE: finding creator or admin
CREATE POLICY "findings_delete" ON public.findings
    FOR DELETE TO authenticated
    USING (created_by = auth.uid() OR public.is_admin());

-- ============================================================
-- SECTION 7: TIMELINE EVENTS table policies
-- ============================================================

-- SELECT: visible if user can see the parent case
CREATE POLICY "timeline_select" ON public.timeline_events
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id = timeline_events.case_id
            AND (
                c.created_by = auth.uid()
                OR c.assigned_to = auth.uid()
                OR public.is_admin()
            )
        )
    );

-- INSERT: authenticated user, must own the event
CREATE POLICY "timeline_insert" ON public.timeline_events
    FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

-- UPDATE: event creator or admin
CREATE POLICY "timeline_update" ON public.timeline_events
    FOR UPDATE TO authenticated
    USING (created_by = auth.uid() OR public.is_admin())
    WITH CHECK (created_by = auth.uid() OR public.is_admin());

-- DELETE: event creator or admin
CREATE POLICY "timeline_delete" ON public.timeline_events
    FOR DELETE TO authenticated
    USING (created_by = auth.uid() OR public.is_admin());

-- ============================================================
-- SECTION 8: REPORTS table policies
-- ============================================================

-- SELECT: visible if user can see the parent case
CREATE POLICY "reports_select" ON public.reports
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id = reports.case_id
            AND (
                c.created_by = auth.uid()
                OR c.assigned_to = auth.uid()
                OR public.is_admin()
            )
        )
    );

-- INSERT: authenticated user generating a report
CREATE POLICY "reports_insert" ON public.reports
    FOR INSERT TO authenticated
    WITH CHECK (generated_by = auth.uid());

-- UPDATE: report generator or admin
CREATE POLICY "reports_update" ON public.reports
    FOR UPDATE TO authenticated
    USING (generated_by = auth.uid() OR public.is_admin())
    WITH CHECK (generated_by = auth.uid() OR public.is_admin());

-- DELETE: admin only (reports are legal artifacts)
CREATE POLICY "reports_delete" ON public.reports
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- ============================================================
-- SECTION 9: RISK ASSESSMENTS table policies
-- ============================================================

-- SELECT: visible if user can see the parent case
CREATE POLICY "risk_select" ON public.risk_assessments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id = risk_assessments.case_id
            AND (
                c.created_by = auth.uid()
                OR c.assigned_to = auth.uid()
                OR public.is_admin()
            )
        )
    );

-- INSERT: authenticated user
CREATE POLICY "risk_insert" ON public.risk_assessments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id = risk_assessments.case_id
            AND (
                c.created_by = auth.uid()
                OR c.assigned_to = auth.uid()
                OR public.is_admin()
            )
        )
    );

-- UPDATE: assessor or admin
CREATE POLICY "risk_update" ON public.risk_assessments
    FOR UPDATE TO authenticated
    USING (assessed_by = auth.uid() OR public.is_admin())
    WITH CHECK (assessed_by = auth.uid() OR public.is_admin());

-- DELETE: admin only
CREATE POLICY "risk_delete" ON public.risk_assessments
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- ============================================================
-- SECTION 10: Role grants (Supabase Data API)
-- Ensures the PostgREST Data API roles can execute.
-- service_role bypasses RLS by default — no grants needed.
-- anon role must be explicitly blocked from all tables.
-- ============================================================

-- Grant authenticated role access to all tables
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.findings         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timeline_events  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_assessments TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin()       TO authenticated;

-- Explicitly REVOKE anon access to all app tables (defence in depth)
REVOKE ALL ON public.users            FROM anon;
REVOKE ALL ON public.cases            FROM anon;
REVOKE ALL ON public.evidence         FROM anon;
REVOKE ALL ON public.findings         FROM anon;
REVOKE ALL ON public.timeline_events  FROM anon;
REVOKE ALL ON public.reports          FROM anon;
REVOKE ALL ON public.risk_assessments FROM anon;

-- ============================================================
-- SECTION 11: Verification Queries
-- Run these AFTER applying the script to confirm everything works.
-- ============================================================

-- 1. Confirm your user profile row exists:
--    SELECT id, email, full_name, role FROM public.users;

-- 2. Confirm all policies are created (should show ~28 rows):
--    SELECT schemaname, tablename, policyname, cmd
--    FROM pg_policies
--    WHERE schemaname = 'public'
--    ORDER BY tablename, cmd;

-- 3. Confirm grants exist:
--    SELECT grantee, table_name, privilege_type
--    FROM information_schema.role_table_grants
--    WHERE table_schema = 'public'
--    AND grantee = 'authenticated'
--    ORDER BY table_name;

-- 4. Quick smoke test (run while logged in as your user):
--    SELECT public.get_user_role();   -- should return 'investigator' or 'admin'
--    SELECT public.is_admin();        -- should return true/false
