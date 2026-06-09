-- ============================================================
-- FIX: User Profile Auto-Creation Trigger
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Drop existing trigger/function if it exists (clean reinstall)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Recreate the function with SECURITY DEFINER so it can
-- write to public.users even with RLS enabled.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'investigator')
    )
    ON CONFLICT (id) DO NOTHING;  -- idempotent: skip if row already exists
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Re-attach trigger to auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Backfill any existing auth users that don't have a public.users row
-- (covers accounts created before this trigger was properly installed)
INSERT INTO public.users (id, email, full_name, role)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'role', 'investigator')
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL  -- only insert rows that don't already exist
ON CONFLICT (id) DO NOTHING;

-- Verify: after running this you should see your users here:
-- SELECT id, email, full_name, role FROM public.users;
