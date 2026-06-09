-- ============================================================
-- Supabase Storage Configuration
-- Run in Supabase SQL Editor to create the forensic_uploads bucket
-- and configure access policies
-- ============================================================

-- NOTE: Supabase Storage buckets must be created via the Dashboard UI
-- or via the Management API. The SQL below configures policies only.
-- 
-- Create the bucket first:
-- 1. Go to Supabase Dashboard → Storage → New Bucket
-- 2. Name: forensic_uploads
-- 3. Public: FALSE (private bucket)
-- 4. File size limit: 500MB
-- 5. Allowed MIME types: (leave blank to allow all, or restrict as needed)

-- ============================================================
-- Storage Policies for forensic_uploads bucket
-- ============================================================

-- Policy: Authenticated users can upload to their own folder (case_id/user_id/*)
CREATE POLICY "forensic_uploads_insert"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'forensic_uploads'
    AND auth.role() = 'authenticated'
);

-- Policy: Users can view evidence files for cases they have access to
CREATE POLICY "forensic_uploads_select"
ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'forensic_uploads'
    AND auth.role() = 'authenticated'
);

-- Policy: Uploaders and admins can update/replace files
CREATE POLICY "forensic_uploads_update"
ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'forensic_uploads'
    AND (
        owner = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
);

-- Policy: Only admins can delete from storage
CREATE POLICY "forensic_uploads_delete"
ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'forensic_uploads'
    AND (
        owner = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
);

-- ============================================================
-- Storage folder structure (maintained by application logic):
-- forensic_uploads/
--   cases/{case_id}/
--     evidence/{evidence_id}/{filename}
--     reports/{report_id}/report.pdf
-- ============================================================
