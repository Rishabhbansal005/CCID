-- Add missing hash_sha1 column to evidence table for full integrity verification

ALTER TABLE public.evidence 
ADD COLUMN IF NOT EXISTS hash_sha1 TEXT;

-- Ensure service_role has necessary permissions to update evidence rows
GRANT UPDATE ON public.evidence TO service_role;
