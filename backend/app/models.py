from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class JobStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    DESTROYED = "DESTROYED"

class LifecycleState(str, Enum):
    UPLOADED = "UPLOADED"
    ANALYZED = "ANALYZED"
    PROCESSED = "PROCESSED"
    VERIFIED = "VERIFIED"
    DOWNLOADED = "DOWNLOADED"
    EXPIRED = "EXPIRED"
    DESTROYED = "DESTROYED"

class PrivacyPreset(str, Enum):
    STANDARD = "standard"
    PRIVATE = "private"
    MAXIMUM = "maximum"

class FileUploadResponse(BaseModel):
    file_id: str
    filename: str
    size_bytes: int
    sha256: str
    mime_type: str
    detected_ext: str
    allowed_operations: List[str]
    created_at: float
    expires_at: float
    ttl_seconds_remaining: int
    privacy_preset: PrivacyPreset
    has_exif: bool = False
    pii_count: int = 0
    pii_risk_level: str = "LOW"
    lifecycle_state: LifecycleState = LifecycleState.UPLOADED

class JobCreateRequest(BaseModel):
    file_ids: List[str]
    operation: str
    privacy_preset: Optional[PrivacyPreset] = PrivacyPreset.STANDARD
    options: Optional[Dict[str, Any]] = Field(default_factory=dict)

class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    operation: str
    input_file_ids: List[str]
    output_filename: Optional[str] = None
    output_size_bytes: Optional[int] = None
    output_sha256: Optional[str] = None
    download_url: Optional[str] = None
    created_at: float
    updated_at: float
    expires_at: float
    ttl_seconds_remaining: int
    lifecycle_state: LifecycleState
    error: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)
    metrics: Optional[Dict[str, Any]] = None
    privacy_preset: PrivacyPreset
    passport_available: bool = False

class SecurityPassportResponse(BaseModel):
    filename: str
    file_id: str
    sha256: str
    sha256_short: str
    sha256_verified: bool
    extension_allowed: bool
    mime_verified: bool
    detected_mime: str
    parser_validation_passed: bool
    executable_format_applicable: bool = False
    executable_status: str = "Executable format — not applicable"
    pii_findings_count: int
    pii_risk_level: str
    metadata_sanitized: bool
    exif_fields_removed: int = 0
    ai_status: str = "○ No external AI processing"
    expires_in_formatted: str
    expires_at: float
    status_label: str  # "PRIVATE-SAFE", "CAUTION", "SECURE"
