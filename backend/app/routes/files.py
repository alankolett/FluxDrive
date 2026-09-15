import os
import time
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header, Response
from fastapi.responses import FileResponse

from ..config import (
    ALLOWED_EXTENSIONS,
    MAX_UPLOAD_SIZE_BYTES,
    TTL_PRESETS,
    UPLOADS_DIR,
    OUTPUTS_DIR
)
from ..db import get_db
from ..models import FileUploadResponse, PrivacyPreset, LifecycleState
from ..services.storage import save_upload_stream, compute_sha256, sanitize_filename
from ..services.mime import sniff_mime
from ..services.signer import verify_download_token
from ..services.exif import extract_exif
from ..services.scanner import extract_text_from_file, scan_text_for_pii
from ..services.matrix import get_operations_for_mime
from ..services.cleanup import destroy_file_immediately

router = APIRouter(prefix="/api/files", tags=["files"])

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    privacy_preset: Optional[str] = Form("standard")
):
    original_filename = sanitize_filename(file.filename or "uploaded_file")
    ext = Path(original_filename).suffix.lstrip(".").lower()
    
    # 1. Independent extension allow-list check
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Extension '.{ext}' is not permitted. Supported extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # 2. Stream to disk and enforce max size limit
    try:
        dest_path, file_id, total_size, sha256 = save_upload_stream(file.file, original_filename)
    except ValueError as val_err:
        raise HTTPException(status_code=413, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to safely store uploaded file")

    # 3. Strict magic-byte MIME sniffing
    detected_mime, detected_ext, parser_passed, mime_details = sniff_mime(dest_path)
    if not parser_passed:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail=f"File validation failed: Magic bytes do not correspond to a valid supported document ({mime_details})"
        )

    # 4. Check EXIF metadata if image
    exif_meta = {"has_exif": False}
    if detected_mime.startswith("image/"):
        exif_meta = extract_exif(dest_path)

    # 5. Extract text and run local privacy scan
    extracted_text = extract_text_from_file(dest_path, detected_mime)
    pii_scan = scan_text_for_pii(extracted_text)

    # Calculate TTL
    preset_key = privacy_preset.lower() if privacy_preset in TTL_PRESETS else "standard"
    ttl_seconds = TTL_PRESETS[preset_key]
    created_at = time.time()
    expires_at = created_at + ttl_seconds

    # Allowed operations from matrix
    allowed_ops = [op["id"] for op in get_operations_for_mime(detected_mime)]

    file_doc = {
        "file_id": file_id,
        "filename": original_filename,
        "stored_path": str(dest_path),
        "size_bytes": total_size,
        "sha256": sha256,
        "mime_type": detected_mime,
        "detected_ext": detected_ext,
        "allowed_operations": allowed_ops,
        "privacy_preset": preset_key,
        "created_at": created_at,
        "expires_at": expires_at,
        "has_exif": exif_meta.get("has_exif", False),
        "exif_metadata": exif_meta,
        "pii_count": pii_scan.get("count", 0),
        "pii_risk_level": pii_scan.get("risk_level", "LOW"),
        "pii_scan": pii_scan,
        "extracted_text": extracted_text[:10000],  # Keep sample for scanner UI
        "status": "READY",
        "lifecycle_state": "ANALYZED",
        "is_output": False
    }

    db = get_db()
    db.files.insert_one(file_doc)

    return FileUploadResponse(
        file_id=file_id,
        filename=original_filename,
        size_bytes=total_size,
        sha256=sha256,
        mime_type=detected_mime,
        detected_ext=detected_ext,
        allowed_operations=allowed_ops,
        created_at=created_at,
        expires_at=expires_at,
        ttl_seconds_remaining=int(expires_at - created_at),
        privacy_preset=PrivacyPreset(preset_key),
        has_exif=exif_meta.get("has_exif", False),
        pii_count=pii_scan.get("count", 0),
        pii_risk_level=pii_scan.get("risk_level", "LOW"),
        lifecycle_state=LifecycleState.ANALYZED
    )

@router.get("")
async def list_vault_files():
    """Lists active files in the ephemeral Vault with live expiry countdowns."""
    db = get_db()
    now = time.time()
    files = list(db.files.find(
        {"status": {"$ne": "DESTROYED"}},
        {"_id": 0, "stored_path": 0, "extracted_text": 0}
    ).sort("created_at", -1))
    
    for f in files:
        f["ttl_seconds_remaining"] = max(0, int(f.get("expires_at", 0) - now))
        f["is_expired"] = f["ttl_seconds_remaining"] == 0
        if f.get("sha256"):
            f["sha256_short"] = f["sha256"][:8] + "..." + f["sha256"][-6:]
        if not f.get("detected_ext"):
            f["detected_ext"] = Path(f.get("filename", "")).suffix.lower().lstrip(".") or "bin"
        if not f.get("allowed_operations"):
            ops = get_operations_for_mime(f.get("mime_type", ""))
            f["allowed_operations"] = [op["id"] for op in ops]
        if not f.get("privacy_preset"):
            f["privacy_preset"] = "standard"
            
    return files

@router.get("/{file_id}")
async def get_file_detail(file_id: str):
    db = get_db()
    f = db.files.find_one({"file_id": file_id}, {"_id": 0, "stored_path": 0})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
        
    now = time.time()
    f["ttl_seconds_remaining"] = max(0, int(f.get("expires_at", 0) - now))
    if not f.get("detected_ext"):
        f["detected_ext"] = Path(f.get("filename", "")).suffix.lower().lstrip(".") or "bin"
    if not f.get("allowed_operations"):
        ops = get_operations_for_mime(f.get("mime_type", ""))
        f["allowed_operations"] = [op["id"] for op in ops]
    if not f.get("privacy_preset"):
        f["privacy_preset"] = "standard"
    return f

@router.get("/download/{token}")
async def download_signed_file(token: str):
    """
    Downloads file using cryptographically signed HMAC-SHA256 token.
    Enforces expiration, verifies signature, sanitizes Content-Disposition header.
    """
    payload = verify_download_token(token)
    if not payload:
        raise HTTPException(status_code=403, detail="Download link has expired or signature is invalid")

    file_id = payload.get("file_id")
    safe_filename = sanitize_filename(payload.get("filename", "download"))

    db = get_db()
    
    # 1. Search in files
    file_doc = db.files.find_one({"$or": [{"file_id": file_id}, {"job_id": file_id}]})
    
    # 2. Or search in jobs
    if not file_doc:
        file_doc = db.jobs.find_one({"job_id": file_id})
        
    if not file_doc or file_doc.get("status") == "DESTROYED":
        raise HTTPException(status_code=410, detail="This file has expired and been destroyed from disk")

    stored_path = file_doc.get("stored_path") or file_doc.get("output_path")
    if not stored_path or not os.path.exists(stored_path):
        raise HTTPException(status_code=410, detail="File bytes have been deleted from disk")

    # Update lifecycle state to DOWNLOADED
    if "file_id" in file_doc:
        db.files.update_one({"file_id": file_doc["file_id"]}, {"$set": {"lifecycle_state": "DOWNLOADED"}})
    if "job_id" in file_doc:
        db.jobs.update_one({"job_id": file_doc["job_id"]}, {"$set": {"lifecycle_state": "DOWNLOADED"}})

    media_type = file_doc.get("mime_type") or "application/octet-stream"
    
    return FileResponse(
        path=stored_path,
        media_type=media_type,
        filename=safe_filename,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"',
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
        }
    )

@router.delete("/{file_id}")
async def destroy_file(file_id: str):
    """Instant Destroy button action in Vault."""
    db = get_db()
    success = destroy_file_immediately(db, file_id)
    if not success:
        raise HTTPException(status_code=404, detail="File not found")
    return {"message": "File and all on-disk bytes destroyed immediately", "file_id": file_id}
