from datetime import datetime, timezone
from typing import Optional

from sqlmodel import SQLModel, Field


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    action: str = Field(max_length=20, index=True)  # CREATE, UPDATE, DELETE, EXPORT
    target_type: str = Field(max_length=20, index=True)  # PRODUCT, ORDER, USER, REVIEW, INVENTORY
    target_id: Optional[int] = None
    details: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
