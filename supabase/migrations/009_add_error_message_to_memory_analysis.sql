-- Migration 006: Add error_message to memory_analysis_results

ALTER TABLE public.memory_analysis_results ADD COLUMN IF NOT EXISTS error_message TEXT;
