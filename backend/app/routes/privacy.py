import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from ..db import get_db
from ..services.exif import extract_exif, strip_exif_to_file
from ..services.scanner import extract_text_from_file, scan_text_for_pii
from ..services.storage import compute_sha256
from ..services.signer import create_download_token
from ..config import OUTPUTS_DIR

router = APIRouter(prefix="/api/privacy", tags=["privacy"])

@router.get("/scan/{file_id}")
async def get_privacy_scan(file_id: str):
    """Returns local PII scanner results and risk score for a file."""
    db = get_db()
    f = db.files.find_one({"file_id": file_id})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")

    # If cached scan exists
    if "pii_scan" in f and f["pii_scan"]:
        return f["pii_scan"]

    stored_path = Path(f["stored_path"])
    if not stored_path.exists():
        raise HTTPException(status_code=410, detail="File bytes no longer available on disk")

    text = extract_text_from_file(stored_path, f.get("mime_type", ""))
    scan_res = scan_text_for_pii(text)
    
    # Cache to file record
    db.files.update_one(
        {"file_id": file_id},
        {"$set": {
            "pii_scan": scan_res,
            "pii_count": scan_res.get("count", 0),
            "pii_risk_level": scan_res.get("risk_level", "LOW")
        }}
    )
    return scan_res

@router.get("/exif/{file_id}")
async def get_exif_data(file_id: str):
    """Returns parsed EXIF metadata (GPS, camera make/model, timestamps)."""
    db = get_db()
    f = db.files.find_one({"file_id": file_id})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")

    stored_path = Path(f["stored_path"])
    if not stored_path.exists():
        raise HTTPException(status_code=410, detail="File has been destroyed")

    return extract_exif(stored_path)

@router.post("/strip-exif/{file_id}")
async def strip_file_exif(file_id: str):
    """Produces a genuinely sanitized output file and returns the diff of removed fields."""
    db = get_db()
    f = db.files.find_one({"file_id": file_id})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")

    in_path = Path(f["stored_path"])
    if not in_path.exists():
        raise HTTPException(status_code=410, detail="Original file has expired from disk")

    out_name = f"sanitized_{f['filename']}"
    out_path = OUTPUTS_DIR / f"sanitized_{file_id}_{f['filename']}"

    try:
        diff = strip_exif_to_file(in_path, out_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sanitize metadata: {str(e)}")

    out_size = out_path.stat().st_size
    out_sha256 = compute_sha256(out_path)
    download_token = create_download_token(file_id, out_name, int(f.get("expires_at", 0) - f.get("created_at", 900)))
    download_url = f"/api/files/download/{download_token}"

    # Record sanitized output in db.files
    sanitized_id = f"sanitized_{file_id}"
    db.files.insert_one({
        "file_id": sanitized_id,
        "filename": out_name,
        "stored_path": str(out_path),
        "size_bytes": out_size,
        "sha256": out_sha256,
        "mime_type": f.get("mime_type", "image/png"),
        "is_output": True,
        "source_operation": "strip_metadata",
        "download_url": download_url,
        "created_at": f.get("created_at"),
        "expires_at": f.get("expires_at"),
        "status": "READY",
        "lifecycle_state": "VERIFIED",
        "exif_fields_removed": diff.get("fields_removed_count", 0)
    })

    return {
        "success": True,
        "sanitized_file_id": sanitized_id,
        "filename": out_name,
        "size_bytes": out_size,
        "sha256": out_sha256,
        "download_url": download_url,
        "diff": diff
    }
