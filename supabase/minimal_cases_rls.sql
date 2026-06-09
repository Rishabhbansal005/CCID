-- ============================================================
-- Minimal RLS Policies for public.cases
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Enable RLS (just in case)
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing test or partial policies
DROP POLICY IF EXISTS "test_insert" ON public.cases;
DROP POLICY IF EXISTS "cases_select" ON public.cases;
DROP POLICY IF EXISTS "cases_insert" ON public.cases;
DROP POLICY IF EXISTS "cases_update" ON public.cases;
DROP POLICY IF EXISTS "cases_delete" ON public.cases;

-- 3. Create clean policies using auth.uid()

-- SELECT: Users can see cases they created or are assigned to
CREATE POLICY "cases_select" ON public.cases
    FOR SELECT TO authenticated
    USING (
        created_by = auth.uid()
        OR assigned_to = auth.uid()
    );

-- INSERT: Users can create a case, but created_by must be their own UID
CREATE POLICY "cases_insert" ON public.cases
    FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

-- UPDATE: Case owner or assignee can update
CREATE POLICY "cases_update" ON public.cases
    FOR UPDATE TO authenticated
    USING (
        created_by = auth.uid()
        OR assigned_to = auth.uid()
    )
    WITH CHECK (
        created_by = auth.uid()
        OR assigned_to = auth.uid()
    );

-- DELETE: Only the case owner can delete
CREATE POLICY "cases_delete" ON public.cases
    FOR DELETE TO authenticated
    USING (created_by = auth.uid());

-- 4. Ensure authenticated role has permissions to execute DML
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases TO authenticated;
