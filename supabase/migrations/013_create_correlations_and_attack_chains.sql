-- 013_create_correlations_and_attack_chains.sql
-- Safe version: uses IF NOT EXISTS and ALTER TABLE to patch missing columns

-- Function (safe to re-run)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create correlations table if it doesn't exist
CREATE TABLE IF NOT EXISTS correlations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    correlation_type VARCHAR NOT NULL,
    ioc VARCHAR NOT NULL,
    ioc_type VARCHAR NOT NULL,
    confidence_score INTEGER DEFAULT 50,
    correlation_severity VARCHAR DEFAULT 'medium',
    related_sources JSONB DEFAULT '[]',
    related_evidence JSONB DEFAULT '[]',
    related_findings JSONB DEFAULT '[]',
    enrichment_data JSONB DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patch: add missing columns if they don't exist
ALTER TABLE correlations ADD COLUMN IF NOT EXISTS correlation_severity VARCHAR DEFAULT 'medium';
ALTER TABLE correlations ADD COLUMN IF NOT EXISTS enrichment_data JSONB DEFAULT '{}';
ALTER TABLE correlations ADD COLUMN IF NOT EXISTS related_sources JSONB DEFAULT '[]';
ALTER TABLE correlations ADD COLUMN IF NOT EXISTS related_evidence JSONB DEFAULT '[]';
ALTER TABLE correlations ADD COLUMN IF NOT EXISTS related_findings JSONB DEFAULT '[]';
ALTER TABLE correlations ADD COLUMN IF NOT EXISTS description TEXT;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_correlations_case_id ON correlations(case_id);
CREATE INDEX IF NOT EXISTS idx_correlations_ioc ON correlations(ioc);

-- Create attack_chains table if it doesn't exist
CREATE TABLE IF NOT EXISTS attack_chains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    description TEXT,
    severity VARCHAR DEFAULT 'high',
    nodes JSONB DEFAULT '[]',
    edges JSONB DEFAULT '[]',
    correlations JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_attack_chains_case_id ON attack_chains(case_id);

-- Add triggers (drop first to avoid duplicate trigger errors)
DROP TRIGGER IF EXISTS set_updated_at_correlations ON correlations;
CREATE TRIGGER set_updated_at_correlations
    BEFORE UPDATE ON correlations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_attack_chains ON attack_chains;
CREATE TRIGGER set_updated_at_attack_chains
    BEFORE UPDATE ON attack_chains
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
