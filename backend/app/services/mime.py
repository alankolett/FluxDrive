import csv
import json
import zipfile
from pathlib import Path
from typing import Tuple, Dict, Any

def sniff_mime(file_path: Path) -> Tuple[str, str, bool, str]:
    """
    Sniffs MIME type using magic bytes and format-specific structural validation.
    Returns: (detected_mime, detected_ext, parser_passed, details)
    """
    if not file_path.exists() or file_path.stat().st_size == 0:
        return ("application/octet-stream", "", False, "File is empty or not found")
    
    with open(file_path, "rb") as f:
        header = f.read(1024)
        
    # 1. PNG
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return ("image/png", "png", True, "PNG magic bytes verified")

    # 2. JPEG
    if header.startswith(b"\xff\xd8\xff"):
        return ("image/jpeg", "jpg", True, "JPEG SOI marker verified")

    # 3. WEBP: RIFF....WEBP
    if len(header) >= 12 and header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return ("image/webp", "webp", True, "RIFF WEBP container verified")

    # 4. PDF: %PDF-
    if header.startswith(b"%PDF-"):
        return ("application/pdf", "pdf", True, "PDF header magic bytes verified")

    # 5. DOCX (ZIP container with word/document.xml)
    if header.startswith(b"PK\x03\x04"):
        try:
            if zipfile.is_zipfile(file_path):
                with zipfile.ZipFile(file_path, "r") as zf:
                    names = zf.namelist()
                    if "[Content_Types].xml" in names and any(n.startswith("word/") for n in names):
                        return (
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                            "docx",
                            True,
                            "Office Open XML DOCX package structure verified"
                        )
        except Exception:
            pass

    # 6. JSON: parse first chunk or entire file if reasonable size
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read(65536).strip()
            if (content.startswith("{") and content.endswith("}")) or (content.startswith("[") and content.endswith("]")):
                json.loads(content)
                return ("application/json", "json", True, "Valid JSON structure verified")
            elif content.startswith("{") or content.startswith("["):
                # Try parsing entire file if smaller than 10MB
                if file_path.stat().st_size < 10 * 1024 * 1024:
                    with open(file_path, "r", encoding="utf-8") as full_f:
                        json.load(full_f)
                        return ("application/json", "json", True, "Valid full JSON parsed")
    except Exception:
        pass

    # 7. CSV: text with delimiters
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            sample = f.read(4096)
            if sample.strip() and not any(ord(c) < 9 or (13 < ord(c) < 32) for c in sample[:512]):
                # Test CSV sniffer
                lines = sample.splitlines()
                if len(lines) >= 1:
                    dialect = csv.Sniffer().sniff(sample[:2048])
                    if dialect.delimiter in [",", ";", "\t", "|"]:
                        return ("text/csv", "csv", True, f"Delimited CSV verified (delimiter: '{dialect.delimiter}')")
    except Exception:
        pass

    return ("application/octet-stream", "bin", False, "Unknown format or failed parser validation")
