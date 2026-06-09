-- ============================================================
-- FIX: User Profile Auto-Creation & Backfill
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- 1. Safely drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Recreate the function with idempotent conflict handling
-- SECURITY DEFINER ensures it bypasses RLS and always succeeds
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
    ON CONFLICT (id) DO NOTHING; -- Prevents crashes if trigger fires twice
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-attach the trigger to auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. BACKFILL: Insert all existing auth.users that are missing from public.users
INSERT INTO public.users (id, email, full_name, role)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'role', 'investigator')
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL -- Only select users that are missing from public.users
ON CONFLICT (id) DO NOTHING;

-- 5. Verification Queries (Highlight and run these individually after executing the script)

-- Verify the function exists:
-- SELECT proname, prosecdef FROM pg_proc WHERE proname = 'handle_new_user';

-- Verify the trigger exists:
-- SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Verify your user was backfilled:
-- SELECT id, email, full_name FROM public.users;
