import time
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException

from ..db import get_db
from ..models import JobCreateRequest, JobResponse, JobStatus, LifecycleState, PrivacyPreset
from ..config import TTL_PRESETS
from ..services.matrix import get_operations_for_mime, get_batch_operations

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

@router.post("", response_model=JobResponse)
async def create_job(req: JobCreateRequest):
    db = get_db()
    
    if not req.file_ids:
        raise HTTPException(status_code=400, detail="At least one input file must be specified")
        
    files = list(db.files.find({"file_id": {"$in": req.file_ids}, "status": {"$ne": "DESTROYED"}}))
    if len(files) != len(req.file_ids):
        raise HTTPException(status_code=404, detail="One or more specified files were not found or have expired")

    # Validate operation against matrix
    op = req.operation
    if len(files) == 1:
        valid_ops = [item["id"] for item in get_operations_for_mime(files[0]["mime_type"])]
        if op not in valid_ops:
            raise HTTPException(
                status_code=400,
                detail=f"Operation '{op}' is not valid for format '{files[0]['mime_type']}'"
            )
    else:
        # Batch operation check
        mimes = [f["mime_type"] for f in files]
        valid_batch = [item["id"] for item in get_batch_operations(mimes)]
        if op not in valid_batch:
            raise HTTPException(
                status_code=400,
                detail=f"Batch operation '{op}' is not supported for the selected files"
            )

    job_id = f"job_{uuid.uuid4().hex[:12]}"
    now = time.time()
    preset = req.privacy_preset.value if req.privacy_preset else "standard"
    ttl_seconds = TTL_PRESETS.get(preset, TTL_PRESETS["standard"])
    expires_at = now + ttl_seconds

    job_doc = {
        "job_id": job_id,
        "status": JobStatus.PENDING.value,
        "operation": op,
        "input_file_ids": req.file_ids,
        "options": req.options or {},
        "privacy_preset": preset,
        "created_at": now,
        "updated_at": now,
        "expires_at": expires_at,
        "lifecycle_state": LifecycleState.UPLOADED.value,
        "output_filename": None,
        "output_size_bytes": None,
        "output_sha256": None,
        "download_url": None,
        "error": None,
        "warnings": [],
        "metrics": None,
        "passport_available": False
    }

    db.jobs.insert_one(job_doc)

    return JobResponse(
        job_id=job_id,
        status=JobStatus.PENDING,
        operation=op,
        input_file_ids=req.file_ids,
        created_at=now,
        updated_at=now,
        expires_at=expires_at,
        ttl_seconds_remaining=int(expires_at - now),
        lifecycle_state=LifecycleState.UPLOADED,
        privacy_preset=PrivacyPreset(preset)
    )

@router.get("/{job_id}", response_model=JobResponse)
async def get_job_status(job_id: str):
    db = get_db()
    job = db.jobs.find_one({"job_id": job_id}, {"_id": 0, "workspace_dir": 0, "output_path": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    now = time.time()
    ttl_rem = max(0, int(job.get("expires_at", 0) - now))

    # Check if expired
    if ttl_rem == 0 and job.get("status") in ["COMPLETED", "PENDING", "PROCESSING"]:
        job["status"] = JobStatus.DESTROYED.value
        job["lifecycle_state"] = LifecycleState.EXPIRED.value

    return JobResponse(
        job_id=job["job_id"],
        status=JobStatus(job["status"]),
        operation=job["operation"],
        input_file_ids=job["input_file_ids"],
        output_filename=job.get("output_filename"),
        output_size_bytes=job.get("output_size_bytes"),
        output_sha256=job.get("output_sha256"),
        download_url=job.get("download_url"),
        created_at=job["created_at"],
        updated_at=job["updated_at"],
        expires_at=job["expires_at"],
        ttl_seconds_remaining=ttl_rem,
        lifecycle_state=LifecycleState(job.get("lifecycle_state", "UPLOADED")),
        error=job.get("error"),
        warnings=job.get("warnings", []),
        metrics=job.get("metrics"),
        privacy_preset=PrivacyPreset(job.get("privacy_preset", "standard")),
        passport_available=job.get("passport_available", False)
    )

@router.get("", response_model=List[JobResponse])
async def list_recent_jobs():
    """Lists recent jobs for Activity feed."""
    db = get_db()
    now = time.time()
    jobs = list(db.jobs.find({}, {"_id": 0, "workspace_dir": 0, "output_path": 0}).sort("created_at", -1).limit(50))
    
    res = []
    for j in jobs:
        ttl_rem = max(0, int(j.get("expires_at", 0) - now))
        res.append(JobResponse(
            job_id=j["job_id"],
            status=JobStatus(j["status"]),
            operation=j["operation"],
            input_file_ids=j["input_file_ids"],
            output_filename=j.get("output_filename"),
            output_size_bytes=j.get("output_size_bytes"),
            output_sha256=j.get("output_sha256"),
            download_url=j.get("download_url"),
            created_at=j["created_at"],
            updated_at=j["updated_at"],
            expires_at=j["expires_at"],
            ttl_seconds_remaining=ttl_rem,
            lifecycle_state=LifecycleState(j.get("lifecycle_state", "UPLOADED")),
            error=j.get("error"),
            warnings=j.get("warnings", []),
            metrics=j.get("metrics"),
            privacy_preset=PrivacyPreset(j.get("privacy_preset", "standard")),
            passport_available=j.get("passport_available", False)
        ))
    return res
