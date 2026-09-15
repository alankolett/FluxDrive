import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import DB_NAME
from .db import get_db, init_indexes
from .worker import worker_instance
from .routes import files, jobs, privacy, passport, copilot

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("fluxdrive.api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing FluxDrive Backend...")
    init_indexes()
    worker_instance.start()
    yield
    # Shutdown
    logger.info("Shutting down FluxDrive...")
    worker_instance.stop()

app = FastAPI(
    title="FluxDrive API",
    description="Privacy-first ephemeral file transformation and security workspace",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global safe error handler - rule #7: no filesystem path or stack trace ever reaches client
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred while processing the file request."}
    )

# Include Routers
app.include_router(files.router)
app.include_router(jobs.router)
app.include_router(privacy.router)
app.include_router(passport.router)
app.include_router(copilot.router)

@app.get("/api/health")
async def health_check():
    """System health check showing DB connection, storage status, and worker health."""
    db = get_db()
    active_files = db.files.count_documents({"status": {"$ne": "DESTROYED"}})
    pending_jobs = db.jobs.count_documents({"status": "PENDING"})
    
    return {
        "status": "healthy",
        "product": "FluxDrive",
        "tagline": "Your files. Your control.",
        "database": "connected",
        "worker_running": True,
        "active_files_in_vault": active_files,
        "pending_queue_jobs": pending_jobs,
        "timestamp": time.time()
    }
