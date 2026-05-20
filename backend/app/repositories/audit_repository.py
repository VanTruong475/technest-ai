from typing import Optional

from sqlmodel import Session, select, func, col

from app.models.audit_log import AuditLog


class AuditRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, log: AuditLog) -> AuditLog:
        self.session.add(log)
        self.session.commit()
        self.session.refresh(log)
        return log

    def find_all(
        self,
        page: int = 1,
        limit: int = 20,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        target_type: Optional[str] = None,
    ) -> tuple[list[AuditLog], int]:
        offset = (page - 1) * limit
        conditions = []

        if user_id is not None:
            conditions.append(AuditLog.user_id == user_id)
        if action is not None:
            conditions.append(AuditLog.action == action)
        if target_type is not None:
            conditions.append(AuditLog.target_type == target_type)

        if conditions:
            count_stmt = select(func.count()).select_from(AuditLog).where(*conditions)
            total = self.session.exec(count_stmt).one()
            stmt = (
                select(AuditLog)
                .where(*conditions)
                .order_by(col(AuditLog.created_at).desc())
                .offset(offset)
                .limit(limit)
            )
        else:
            count_stmt = select(func.count()).select_from(AuditLog)
            total = self.session.exec(count_stmt).one()
            stmt = (
                select(AuditLog)
                .order_by(col(AuditLog.created_at).desc())
                .offset(offset)
                .limit(limit)
            )

        items = list(self.session.exec(stmt).all())
        return items, total
