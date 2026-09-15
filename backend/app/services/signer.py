import base64
import hashlib
import hmac
import json
import time
from typing import Optional, Dict, Any
from ..config import SECRET_KEY

def create_download_token(file_id: str, filename: str, expires_in_seconds: int = 900) -> str:
    """
    Generates a cryptographically signed HMAC-SHA256 expiring token.
    """
    exp = int(time.time()) + expires_in_seconds
    payload = {
        "file_id": file_id,
        "filename": filename,
        "exp": exp
    }
    payload_json = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode('utf-8').rstrip('=')
    
    signature = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode('utf-8').rstrip('=')
    
    return f"{payload_b64}.{sig_b64}"

def verify_download_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies the HMAC-SHA256 token signature and expiration timestamp.
    Returns payload dictionary or None if invalid/expired.
    """
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        payload_b64, sig_b64 = parts
        
        # Verify signature
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).digest()
        # Add padding back if necessary
        sig_b64_padded = sig_b64 + '=' * (-len(sig_b64) % 4)
        actual_sig = base64.urlsafe_b64decode(sig_b64_padded.encode('utf-8'))
        
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
            
        payload_b64_padded = payload_b64 + '=' * (-len(payload_b64) % 4)
        payload_json = base64.urlsafe_b64decode(payload_b64_padded.encode('utf-8'))
        payload = json.loads(payload_json.decode('utf-8'))
        
        if time.time() > payload.get("exp", 0):
            return None  # Expired
            
        return payload
    except Exception:
        return None
