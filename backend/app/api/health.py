import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlmodel import Session, text

from app.core.cache import get_redis
from app.core.config import settings
from app.core.database import get_session
from app.core.dependencies import require_admin
from app.models.user import User

router = APIRouter(tags=["Health"])

START_TIME = time.monotonic()


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "TechSphere AI Backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": settings.ENVIRONMENT,
    }


@router.get("/health/detailed")
def detailed_health(
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    uptime = time.monotonic() - START_TIME

    db_status = "connected"
    db_name = None
    try:
        session.exec(text("SELECT 1")).one()
        try:
            result = session.exec(text("SELECT current_database()")).one()
            db_name = result[0]
        except Exception:
            pass
    except Exception:
        db_status = "error"

    redis_status = "not_configured"
    if settings.REDIS_URL:
        r = get_redis()
        if r:
            try:
                r.ping()
                redis_status = "connected"
            except Exception:
                redis_status = "error"
        else:
            redis_status = "error"

    overall = "healthy" if db_status == "connected" else "degraded"

    return {
        "status": overall,
        "service": "TechSphere AI Backend",
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(uptime, 2),
        "database": {
            "status": db_status,
            "name": db_name,
        },
        "redis": {
            "status": redis_status,
        },
        "cloudinary_configured": all([
            settings.CLOUDINARY_CLOUD_NAME,
            settings.CLOUDINARY_API_KEY,
            settings.CLOUDINARY_API_SECRET,
        ]),
        "sentry_configured": bool(settings.SENTRY_DSN),
    }
