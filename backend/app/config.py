import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
WORKSPACE_DIR = BASE_DIR.parent
STORAGE_DIR = WORKSPACE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
OUTPUTS_DIR = STORAGE_DIR / "outputs"
JOBS_DIR = STORAGE_DIR / "jobs"

for p in [STORAGE_DIR, UPLOADS_DIR, OUTPUTS_DIR, JOBS_DIR]:
    p.mkdir(parents=True, exist_ok=True)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "fluxdrive")

SECRET_KEY = os.getenv("SECRET_KEY", "fluxdrive-sec-token-hmac-sha256-signature-key-2026")
DOWNLOAD_TOKEN_ALGORITHM = "HS256"

# Default TTL presets in seconds
TTL_PRESETS = {
    "standard": 15 * 60,  # 15 mins
    "private": 10 * 60,   # 10 mins
    "maximum": 5 * 60,    # 5 mins
}
DEFAULT_TTL = TTL_PRESETS["standard"]

MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024  # 25MB server-side limit

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "pdf", "csv", "json", "docx"}

ALLOWED_MIMES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "application/pdf": "pdf",
    "text/csv": "csv",
    "text/plain": "csv",  # CSV sniff fallback
    "application/json": "json",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}

# Load .env file if present
env_file = WORKSPACE_DIR / ".env"
if env_file.exists():
    try:
        with open(env_file, "r", encoding="utf-8") as ef:
            for line in ef:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    if k not in os.environ:
                        os.environ[k] = v
    except Exception:
        pass

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("GROK_API_KEY", "")
DEFAULT_GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
