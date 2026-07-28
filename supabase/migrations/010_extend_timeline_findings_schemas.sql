-- Migration 010: Extend Timeline and Findings schemas non-destructively

-- 1. Extend timeline_events.event_type constraint
ALTER TABLE public.timeline_events DROP CONSTRAINT IF EXISTS timeline_events_event_type_check;
ALTER TABLE public.timeline_events ADD CONSTRAINT timeline_events_event_type_check 
    CHECK (event_type IN (
        -- Old values
        'system', 'network', 'user_action', 'file', 'registry',
        'process', 'authentication', 'email', 'web', 'other',
        -- New values
        'evidence', 'integrity', 'memory_analysis', 'network_analysis', 
        'finding', 'risk_assessment'
    ));

-- 2. Extend timeline_events.importance constraint
ALTER TABLE public.timeline_events DROP CONSTRAINT IF EXISTS timeline_events_importance_check;
ALTER TABLE public.timeline_events ADD CONSTRAINT timeline_events_importance_check 
    CHECK (importance IN (
        -- Old values
        'low', 'normal', 'high', 'critical',
        -- New values
        'informational', 'medium'
    ));

-- 3. Extend findings.category constraint
ALTER TABLE public.findings DROP CONSTRAINT IF EXISTS findings_category_check;
ALTER TABLE public.findings ADD CONSTRAINT findings_category_check 
    CHECK (category IN (
        -- Old values
        'malware', 'intrusion', 'data_exfiltration', 'privilege_escalation',
        'lateral_movement', 'persistence', 'defense_evasion', 'credential_access',
        'discovery', 'collection', 'command_control', 'exfiltration', 'impact',
        'fraud', 'policy_violation', 'other',
        -- New values
        'network', 'memory', 'browser', 'usb', 'suspicious_activity'
    ));

-- Note: findings.severity already perfectly encompasses ('informational', 'low', 'medium', 'high', 'critical').
-- No need to alter it to preserve existing data securely.

-- 4. Add analysis_source to findings table
ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS analysis_source TEXT;
