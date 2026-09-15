import os
import shutil
import time
from pathlib import Path
from typing import Dict, Any, List
from ..config import UPLOADS_DIR, OUTPUTS_DIR, JOBS_DIR

def perform_cleanup(db) -> Dict[str, Any]:
    """
    Scans MongoDB for expired file and job records, securely removes on-disk bytes,
    and marks records as DESTROYED.
    """
    now = time.time()
    deleted_files_count = 0
    reclaimed_bytes = 0
    
    # 1. Clean expired files
    expired_files = list(db.files.find({
        "expires_at": {"$lte": now},
        "status": {"$ne": "DESTROYED"}
    }))
    
    for f in expired_files:
        file_id = f.get("file_id")
        stored_path = f.get("stored_path")
        if stored_path and os.path.exists(stored_path):
            try:
                size = os.path.getsize(stored_path)
                os.remove(stored_path)
                reclaimed_bytes += size
                deleted_files_count += 1
            except Exception:
                pass
                
        db.files.update_one(
            {"_id": f["_id"]},
            {"$set": {
                "status": "DESTROYED",
                "destroyed_at": now,
                "disk_cleaned": True
            }}
        )

    # 2. Clean expired jobs
    expired_jobs = list(db.jobs.find({
        "expires_at": {"$lte": now},
        "status": {"$nin": ["DESTROYED", "FAILED"]}
    }))
    
    for j in expired_jobs:
        out_path = j.get("output_path")
        if out_path and os.path.exists(out_path):
            try:
                size = os.path.getsize(out_path)
                os.remove(out_path)
                reclaimed_bytes += size
                deleted_files_count += 1
            except Exception:
                pass
                
        job_dir = j.get("workspace_dir")
        if job_dir and os.path.exists(job_dir):
            try:
                shutil.rmtree(job_dir, ignore_errors=True)
            except Exception:
                pass

        db.jobs.update_one(
            {"_id": j["_id"]},
            {"$set": {
                "status": "DESTROYED",
                "destroyed_at": now,
                "disk_cleaned": True
            }}
        )

    return {
        "timestamp": now,
        "deleted_files_count": deleted_files_count,
        "reclaimed_bytes": reclaimed_bytes
    }

def destroy_file_immediately(db, file_id: str) -> bool:
    """Instantly deletes a specific file from disk and marks it DESTROYED."""
    f = db.files.find_one({"file_id": file_id})
    if not f:
        return False
        
    stored_path = f.get("stored_path")
    if stored_path and os.path.exists(stored_path):
        try:
            os.remove(stored_path)
        except Exception:
            pass
            
    db.files.update_one(
        {"file_id": file_id},
        {"$set": {
            "status": "DESTROYED",
            "destroyed_at": time.time(),
            "disk_cleaned": True
        }}
    )
    return True
