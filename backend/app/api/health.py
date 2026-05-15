from fastapi import APIRouter, Depends
from sqlmodel import Session, text

from app.core.database import get_session

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("/db")
def database_health_check(session: Session = Depends(get_session)):
    result = session.exec(text("SELECT current_database();")).one()
    database_name = result[0]

    return {
        "database": database_name,
        "status": "connected"
    }