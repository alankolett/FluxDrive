export type PrivacyPreset = 'standard' | 'private' | 'maximum';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'DESTROYED';

export type LifecycleState = 
  | 'UPLOADED' 
  | 'ANALYZED' 
  | 'PROCESSED' 
  | 'VERIFIED' 
  | 'DOWNLOADED' 
  | 'EXPIRED' 
  | 'DESTROYED';

export interface FileItem {
  file_id: string;
  filename: string;
  size_bytes: number;
  sha256: string;
  sha256_short?: string;
  mime_type: string;
  detected_ext: string;
  allowed_operations: string[];
  created_at: number;
  expires_at: number;
  ttl_seconds_remaining: number;
  privacy_preset: PrivacyPreset;
  has_exif?: boolean;
  pii_count?: number;
  pii_risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
  lifecycle_state?: LifecycleState;
  is_output?: boolean;
  source_operation?: string;
  download_url?: string;
}

export interface JobMetrics {
  before_size: number;
  after_size: number;
  savings_pct: number;
}

export interface JobItem {
  job_id: string;
  status: JobStatus;
  operation: string;
  input_file_ids: string[];
  output_filename?: string;
  source_filename?: string;
  output_size_bytes?: number;
  output_sha256?: string;
  download_url?: string;
  created_at: number;
  updated_at: number;
  expires_at: number;
  ttl_seconds_remaining: number;
  lifecycle_state: LifecycleState;
  error?: string;
  warnings: string[];
  metrics?: JobMetrics;
  privacy_preset: PrivacyPreset;
  passport_available: boolean;
  pii_findings_count?: number;
  pii_risk_level?: string;
}

export interface SecurityPassportData {
  filename: string;
  file_id: string;
  sha256: string;
  sha256_short: string;
  sha256_verified: boolean;
  extension_allowed: boolean;
  mime_verified: boolean;
  detected_mime: string;
  parser_validation_passed: boolean;
  executable_format_applicable: boolean;
  executable_status: string;
  pii_findings_count: number;
  pii_risk_level: string;
  metadata_sanitized: boolean;
  exif_fields_removed: number;
  ai_status: string;
  expires_in_formatted: string;
  expires_at: number;
  status_label: 'PRIVATE-SAFE' | 'CAUTION' | 'VERIFIED-SAFE';
}

export interface PiiFinding {
  type: string;
  label: string;
  masked: string;
  severity: 'low' | 'medium' | 'high';
  weight: number;
  verification: string;
}

export interface PrivacyScanData {
  count: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  risk_score: number;
  findings: PiiFinding[];
  disclaimer: string;
  text_sample_length: number;
}

export interface ExifData {
  has_exif: boolean;
  device_make?: string | null;
  device_model?: string | null;
  date_time?: string | null;
  software?: string | null;
  gps?: Record<string, string> | null;
  raw_fields: Record<string, string>;
}

export interface ExifStripResult {
  success: boolean;
  sanitized_file_id: string;
  filename: string;
  size_bytes: number;
  sha256: string;
  download_url: string;
  diff: {
    fields_removed_count: number;
    removed_fields: string[];
    had_gps_removed: boolean;
    had_device_removed: boolean;
    before_metadata: ExifData;
    after_metadata: ExifData;
  };
}

export interface SanitizedPreviewData {
  raw_file_excluded: boolean;
  exif_excluded: boolean;
  detected_pii_masked: boolean;
  internal_file_identifiers_excluded: boolean;
  masked_field_count: number;
  sanitized_payload_preview: string;
  total_characters: number;
  filename: string;
}

export interface CopilotResponseData {
  source: string;
  copilot_response: string;
  masked_fields_count: number;
}
