import hashlib
import os
import re
import uuid
from pathlib import Path
from typing import Dict, Any, Tuple
from ..config import UPLOADS_DIR, OUTPUTS_DIR, MAX_UPLOAD_SIZE_BYTES

def compute_sha256(file_path: Path) -> str:
    """Computes SHA-256 hash of a file on disk."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def sanitize_filename(filename: str) -> str:
    """Sanitizes filename for Content-Disposition header and filesystem safety."""
    # Strip directory separators and dangerous characters
    base = os.path.basename(filename)
    clean = re.sub(r'[^a-zA-Z0-9_.-]', '_', base)
    if not clean or clean.startswith('.'):
        clean = f"fluxdrive_file_{clean}"
    return clean[:100]

def save_upload_stream(file_obj, original_filename: str) -> Tuple[Path, str, int, str]:
    """
    Saves an uploaded file to disk with a UUID4 name.
    Validates size limit during streaming.
    Returns: (file_path, file_id, file_size, sha256)
    """
    file_id = str(uuid.uuid4())
    ext = Path(original_filename).suffix.lower()
    stored_name = f"{file_id}{ext}"
    dest_path = UPLOADS_DIR / stored_name
    
    total_size = 0
    hasher = hashlib.sha256()
    
    with open(dest_path, "wb") as buffer:
        while chunk := file_obj.read(65536):
            total_size += len(chunk)
            if total_size > MAX_UPLOAD_SIZE_BYTES:
                buffer.close()
                if dest_path.exists():
                    dest_path.unlink()
                raise ValueError(f"File exceeds maximum allowed upload size of {MAX_UPLOAD_SIZE_BYTES / (1024*1024):.0f} MB")
            buffer.write(chunk)
            hasher.update(chunk)
            
    sha256 = hasher.hexdigest()
    return (dest_path, file_id, total_size, sha256)
