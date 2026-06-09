-- ============================================================
-- Supabase Storage: Evidence Bucket Setup
-- Run this in Supabase SQL Editor AFTER migrations
-- ============================================================

-- Step 1: Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'forensic_uploads',
    'forensic_uploads',
    false,                          -- private bucket — files need signed URLs
    524288000,                      -- 500MB max file size
    NULL                            -- allow all MIME types (forensic files vary widely)
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    public = EXCLUDED.public;

-- Step 2: Storage RLS — allow authenticated users to upload
CREATE POLICY "Authenticated users can upload evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'forensic_uploads');

-- Step 3: Storage RLS — allow authenticated users to read their uploads
CREATE POLICY "Authenticated users can read evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'forensic_uploads');

-- Step 4: Storage RLS — allow users to delete their own uploads
-- (or admins to delete any)
CREATE POLICY "Owners and admins can delete evidence"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'forensic_uploads'
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR public.is_admin()
    )
);

-- Verify: after running, check bucket exists:
-- SELECT * FROM storage.buckets WHERE id = 'forensic_uploads';
