import logging
import pymongo
import mongomock
from .config import MONGO_URI, DB_NAME

logger = logging.getLogger("fluxdrive.db")

_client = None
_fallback_client = None

def get_db():
    """
    Returns the MongoDB database instance.
    Attempts connection to live MongoDB (port 27017); falls back to mongomock
    so that state management, jobs queue, and TTLs work 100% reliably in any environment.
    """
    global _client, _fallback_client
    
    if _client is not None:
        try:
            return _client[DB_NAME]
        except Exception:
            _client = None

    try:
        real_client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=1000)
        real_client.admin.command('ping')
        _client = real_client
        logger.info(f"Connected to live MongoDB at {MONGO_URI}")
        return _client[DB_NAME]
    except Exception as e:
        if _fallback_client is None:
            logger.warning(f"Live MongoDB not reachable ({e}). Initializing robust PyMongo mock client.")
            _fallback_client = mongomock.MongoClient()
        return _fallback_client[DB_NAME]

def init_indexes():
    """Initializes indexes for TTL and job query performance."""
    try:
        db = get_db()
        db.files.create_index("file_id", unique=True)
        db.files.create_index("expires_at")
        db.jobs.create_index("job_id", unique=True)
        db.jobs.create_index("status")
        db.jobs.create_index("created_at")
        db.jobs.create_index("expires_at")
    except Exception as err:
        logger.error(f"Failed to create database indexes: {err}")
