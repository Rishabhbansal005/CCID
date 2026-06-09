// ============================================================
// Core TypeScript Interfaces for CCID Platform
// ============================================================

export type UserRole = 'admin' | 'investigator' | 'viewer';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  badge_number?: string;
  department?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Case Types
// ============================================================

export type CaseStatus = 'open' | 'active' | 'pending_review' | 'closed' | 'archived';
export type CasePriority = 'low' | 'medium' | 'high' | 'critical';
export type CaseCategory =
  | 'cybercrime'
  | 'data_breach'
  | 'malware'
  | 'ransomware'
  | 'phishing'
  | 'insider_threat'
  | 'fraud'
  | 'ddos'
  | 'espionage'
  | 'other';

export interface Case {
  id: string;
  case_number: string;
  title: string;
  description?: string;
  incident_date?: string;
  status: CaseStatus;
  priority: CasePriority;
  category?: CaseCategory;
  jurisdiction?: string;
  assigned_to?: string;
  assignee?: Pick<User, 'id' | 'full_name' | 'email' | 'role'>;
  created_by: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CaseCreate {
  title: string;
  description?: string;
  incident_date?: string;
  status?: CaseStatus;
  priority?: CasePriority;
  category?: CaseCategory;
  jurisdiction?: string;
  assigned_to?: string;
  tags?: string[];
}

export interface CaseUpdate extends Partial<CaseCreate> {}

export interface CaseListResponse {
  items: Case[];
  total: number;
  page: number;
  page_size: number;
}

export interface CaseStats {
  evidence_count: number;
  findings_count: number;
  timeline_events: number;
  critical_findings: number;
}

// ============================================================
// Evidence Types
// ============================================================

export type EvidenceType =
  | 'digital'
  | 'network_capture'
  | 'memory_dump'
  | 'disk_image'
  | 'log_file'
  | 'document'
  | 'screenshot'
  | 'email'
  | 'other';

export type ProcessingStatus = 'pending' | 'processing' | 'analyzed' | 'error' | 'skipped';

export interface ChainOfCustodyEvent {
  action: string;
  user_id: string;
  user_name?: string;
  timestamp: string;
  notes?: string;
  location?: string;
}

export interface Evidence {
  id: string;
  case_id: string;
  evidence_number: string;
  file_name: string;
  original_file_name: string;
  file_type: string;
  mime_type?: string;
  file_size: number;
  storage_path: string;
  storage_bucket: string;
  public_url?: string;
  hash_md5?: string;
  hash_sha256?: string;
  hash_sha512?: string;
  evidence_type: EvidenceType;
  source_device?: string;
  source_location?: string;
  acquisition_method?: string;
  chain_of_custody: ChainOfCustodyEvent[];
  processing_status: ProcessingStatus;
  forensic_tool?: string;
  analysis_notes?: string;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  tags: string[];
  uploaded_by: string;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Finding Types
// ============================================================

export type FindingSeverity = 'informational' | 'low' | 'medium' | 'high' | 'critical';
export type FindingStatus = 'open' | 'investigating' | 'confirmed' | 'false_positive' | 'resolved';

export interface IOCIndicator {
  type: 'ip' | 'domain' | 'hash' | 'email' | 'url' | 'filename' | 'registry' | 'other';
  value: string;
  context?: string;
  confidence: number; // 0–100
}

export interface Finding {
  id: string;
  case_id: string;
  evidence_id?: string;
  finding_number: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  category?: string;
  mitre_tactic?: string;
  mitre_technique?: string;
  status: FindingStatus;
  tags: string[];
  ioc_indicators: IOCIndicator[];
  recommendations?: string;
  created_by: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Timeline Types
// ============================================================

export type EventType =
  | 'system'
  | 'network'
  | 'user_action'
  | 'file'
  | 'registry'
  | 'process'
  | 'authentication'
  | 'email'
  | 'web'
  | 'other';

export type EventImportance = 'low' | 'normal' | 'high' | 'critical';

export interface TimelineEvent {
  id: string;
  case_id: string;
  evidence_id?: string;
  finding_id?: string;
  event_time: string;
  title: string;
  description?: string;
  event_type: EventType;
  source?: string;
  source_artifact?: string;
  importance: EventImportance;
  is_confirmed: boolean;
  tags: string[];
  raw_data: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Risk Assessment Types
// ============================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ThreatActor {
  name: string;
  type: 'nation-state' | 'criminal' | 'insider' | 'hacktivist' | 'unknown';
  motivation?: string;
  sophistication?: string;
}

export interface AffectedAsset {
  name: string;
  type: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
}

export interface RiskAssessment {
  id: string;
  case_id: string;
  overall_risk_score: number; // 1–25
  likelihood: number; // 1–5
  impact: number; // 1–5
  risk_level: RiskLevel;
  threat_actors: ThreatActor[];
  affected_assets: AffectedAsset[];
  vulnerabilities: Record<string, unknown>[];
  mitigation_measures: Record<string, unknown>[];
  residual_risk?: string;
  analyst_notes?: string;
  assessed_by?: string;
  assessed_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Report Types
// ============================================================

export type ReportStatus = 'draft' | 'generating' | 'ready' | 'failed';
export type ReportType = 'investigation' | 'executive_summary' | 'technical' | 'chain_of_custody' | 'custom';

export interface Report {
  id: string;
  case_id: string;
  title: string;
  report_type: ReportType;
  status: ReportStatus;
  storage_path?: string;
  file_size?: number;
  include_executive_summary: boolean;
  include_timeline: boolean;
  include_findings: boolean;
  include_evidence_list: boolean;
  include_risk_assessment: boolean;
  generated_by: string;
  generated_at?: string;
  error_message?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Dashboard Types
// ============================================================

export interface DashboardStats {
  total_cases: number;
  open_cases: number;
  active_cases: number;
  closed_cases: number;
  total_evidence: number;
  total_findings: number;
  critical_findings: number;
  reports_generated: number;
  recent_activity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'case' | 'evidence' | 'finding' | 'report';
  action: string;
  description: string;
  user_id: string;
  user_name?: string;
  timestamp: string;
  case_id?: string;
  case_number?: string;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiError {
  error: string;
  detail?: unknown;
}

export interface MessageResponse {
  message: string;
  detail?: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ============================================================
// UI Helper Types
// ============================================================

export interface SelectOption {
  value: string;
  label: string;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}
