import json
import logging
import os
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Optional, Dict, Any

from .config import BASE_DIR, JOBS_DIR, OUTPUTS_DIR, TTL_PRESETS
from .db import get_db
from .services.signer import create_download_token
from .services.cleanup import perform_cleanup
from .services.exif import extract_exif, strip_exif_to_file
from .services.scanner import extract_text_from_file, scan_text_for_pii

logger = logging.getLogger("fluxdrive.worker")
EXECUTOR_PATH = BASE_DIR / "executor.py"

class FluxWorker:
    def __init__(self, poll_interval: float = 0.5):
        self.poll_interval = poll_interval
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._last_cleanup = 0.0

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True, name="FluxWorkerThread")
        self._thread.start()
        logger.info("FluxDrive Python Worker started. Polling MongoDB queue...")

    def stop(self):
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=3)
        logger.info("FluxDrive Python Worker stopped.")

    def _run_loop(self):
        db = get_db()
        while self._running:
            try:
                # 1. Periodic cleanup of expired files (every 30s)
                now = time.time()
                if now - self._last_cleanup > 30:
                    perform_cleanup(db)
                    self._last_cleanup = now

                # 2. Claim next pending job atomically
                job = db.jobs.find_one_and_update(
                    {"status": "PENDING"},
                    {"$set": {
                        "status": "PROCESSING",
                        "lifecycle_state": "PROCESSED",
                        "started_at": now,
                        "updated_at": now
                    }},
                    return_document=True
                )

                if job:
                    self._process_job(db, job)
                else:
                    time.sleep(self.poll_interval)
            except Exception as e:
                logger.error(f"Worker loop error: {e}", exc_info=True)
                time.sleep(1.0)

    def _process_job(self, db, job: Dict[str, Any]):
        job_id = job["job_id"]
        operation = job["operation"]
        file_ids = job.get("input_file_ids", [])
        options = job.get("options", {})
        privacy_preset = job.get("privacy_preset", "standard")
        ttl_seconds = TTL_PRESETS.get(privacy_preset, TTL_PRESETS["standard"])
        expires_at = time.time() + ttl_seconds

        logger.info(f"Processing job {job_id} | Operation: {operation} | Preset: {privacy_preset}")

        # Retrieve file records
        input_files = list(db.files.find({"file_id": {"$in": file_ids}}))
        if not input_files:
            db.jobs.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "FAILED",
                    "error": "Source file(s) not found or expired",
                    "updated_at": time.time()
                }}
            )
            return

        input_paths = [f["stored_path"] for f in input_files if "stored_path" in f]
        workspace_dir = JOBS_DIR / job_id
        workspace_dir.mkdir(parents=True, exist_ok=True)

        job_spec = {
            "job_id": job_id,
            "operation": operation,
            "input_paths": input_paths,
            "output_dir": str(workspace_dir),
            "options": options
        }

        # Invoke isolated conversion executor subprocess
        cmd = [sys.executable, str(EXECUTOR_PATH), "--job", json.dumps(job_spec)]
        
        try:
            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60,
                check=False
            )
            
            stdout_clean = res.stdout.strip()
            if not stdout_clean:
                raise ValueError(res.stderr.strip() or "Executor subprocess exited without output")
                
            # Parse json from last non-empty line of stdout
            out_json = None
            for line in reversed(stdout_clean.splitlines()):
                if line.strip().startswith("{") and line.strip().endswith("}"):
                    out_json = json.loads(line)
                    break
                    
            if not out_json:
                raise ValueError(f"Invalid executor response: {stdout_clean}")

            if not out_json.get("success"):
                raise ValueError(out_json.get("error", "Conversion failed during processing"))

            out_path = Path(out_json["output_path"])
            input_orig_name = input_files[0].get("filename", "document")
            clean_stem = Path(input_orig_name).stem
            # Strip storage UUID if present
            if "_" in clean_stem and len(clean_stem.split("_")[0]) == 36:
                clean_stem = "_".join(clean_stem.split("_")[1:])
            out_ext = out_path.suffix.lstrip(".").lower() or "output"
            out_filename = f"{clean_stem}.{out_ext}" if operation != "batch_to_pdf" else "combined_document.pdf"

            out_size = out_json["output_size"]
            out_sha256 = out_json["sha256"]
            metrics = out_json.get("metrics", {})

            # Generate signed download token
            download_token = create_download_token(job_id, out_filename, ttl_seconds)
            download_url = f"/api/files/download/{download_token}"

            # If Privacy preset is Private or Maximum, perform automatic privacy scan & sanitization checks
            pii_findings_count = 0
            pii_risk_level = "LOW"
            if privacy_preset in ["private", "maximum"]:
                extracted = extract_text_from_file(out_path, out_json.get("output_mime", ""))
                scan_res = scan_text_for_pii(extracted)
                pii_findings_count = scan_res.get("count", 0)
                pii_risk_level = scan_res.get("risk_level", "LOW")

            # Update job state in DB
            db.jobs.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "COMPLETED",
                    "lifecycle_state": "VERIFIED",
                    "output_path": str(out_path),
                    "output_filename": out_filename,
                    "source_filename": input_orig_name,
                    "output_size_bytes": out_size,
                    "output_sha256": out_sha256,
                    "download_url": download_url,
                    "download_token": download_token,
                    "metrics": metrics,
                    "warnings": out_json.get("warnings", []),
                    "workspace_dir": str(workspace_dir),
                    "expires_at": expires_at,
                    "updated_at": time.time(),
                    "pii_findings_count": pii_findings_count,
                    "pii_risk_level": pii_risk_level,
                    "passport_available": True
                }}
            )

            # Also register output in files collection so it appears in the Vault with live countdown
            db.files.insert_one({
                "file_id": f"out_{job_id}",
                "job_id": job_id,
                "filename": out_filename,
                "source_filename": input_orig_name,
                "stored_path": str(out_path),
                "size_bytes": out_size,
                "sha256": out_sha256,
                "mime_type": out_json.get("output_mime", "application/octet-stream"),
                "is_output": True,
                "source_operation": operation,
                "detected_ext": out_ext,
                "download_url": download_url,
                "created_at": time.time(),
                "expires_at": expires_at,
                "status": "READY",
                "lifecycle_state": "VERIFIED"
            })
            
            logger.info(f"Job {job_id} COMPLETED successfully. Output: {out_filename} ({out_size} bytes)")

        except subprocess.TimeoutExpired:
            logger.error(f"Job {job_id} timed out after 60 seconds")
            db.jobs.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "FAILED",
                    "lifecycle_state": "PROCESSED",
                    "error": "Operation timed out — processing exceeded 60s limit",
                    "updated_at": time.time()
                }}
            )
        except Exception as err:
            logger.error(f"Job {job_id} failed: {err}")
            db.jobs.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "FAILED",
                    "lifecycle_state": "PROCESSED",
                    "error": str(err),
                    "updated_at": time.time()
                }}
            )

# Global worker instance
worker_instance = FluxWorker()
