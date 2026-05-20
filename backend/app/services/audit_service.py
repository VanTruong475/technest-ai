import json
import math
from typing import Optional

from sqlmodel import Session

from app.models.audit_log import AuditLog
from app.repositories.audit_repository import AuditRepository
from app.repositories.user_repository import UserRepository
from app.schemas.audit import AuditLogResponse, AuditLogsResponse


def log_action(
    session: Session,
    user_id: int,
    action: str,
    target_type: str,
    target_id: Optional[int] = None,
    details: Optional[str] = None,
) -> AuditLog:
    repo = AuditRepository(session)
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
    )
    return repo.create(audit_log)


def get_audit_logs(
    session: Session,
    page: int = 1,
    limit: int = 20,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    target_type: Optional[str] = None,
) -> AuditLogsResponse:
    repo = AuditRepository(session)
    user_repo = UserRepository(session)

    items, total = repo.find_all(
        page=page,
        limit=limit,
        user_id=user_id,
        action=action,
        target_type=target_type,
    )

    user_cache: dict[int, str] = {}
    responses = []
    for log in items:
        if log.user_id not in user_cache:
            user = user_repo.find_by_id(log.user_id)
            user_cache[log.user_id] = user.full_name if user else "Unknown"
        responses.append(
            AuditLogResponse(
                id=log.id,
                user_id=log.user_id,
                user_name=user_cache[log.user_id],
                action=log.action,
                target_type=log.target_type,
                target_id=log.target_id,
                details=log.details,
                created_at=log.created_at,
            )
        )

    total_pages = math.ceil(total / limit) if total > 0 else 0
    return AuditLogsResponse(
        items=responses,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )
