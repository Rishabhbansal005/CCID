-- ============================================================
-- FIX: Supabase Storage Setup (forensic_uploads)
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- 1. Create the storage bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'forensic_uploads',
    'forensic_uploads',
    false,                          -- private bucket (requires signed URLs or RLS)
    524288000,                      -- 500MB max file size
    NULL                            -- allow all MIME types
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    public = EXCLUDED.public;

-- 2. Drop existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Authenticated users can upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read evidence" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update evidence" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can delete evidence" ON storage.objects;

-- 3. Create Storage RLS Policies

-- SELECT (Download/Read): Any authenticated user can read forensic files
CREATE POLICY "Authenticated users can read evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'forensic_uploads');

-- INSERT (Upload): Any authenticated user can upload
CREATE POLICY "Authenticated users can upload evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'forensic_uploads');

-- UPDATE: Any authenticated user can update (needed for some Supabase upload flows)
CREATE POLICY "Authenticated users can update evidence"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'forensic_uploads');

-- DELETE: Only authenticated users can delete
CREATE POLICY "Owners and admins can delete evidence"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'forensic_uploads');

-- 4. Verification Query
-- Highlight and run this to confirm the bucket exists:
-- SELECT id, name, public FROM storage.buckets WHERE id = 'forensic_uploads';
