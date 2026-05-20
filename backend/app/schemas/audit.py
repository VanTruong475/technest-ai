from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    user_name: str
    action: str
    target_type: str
    target_id: Optional[int] = None
    details: Optional[str] = None
    created_at: datetime


class AuditLogsResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int
    page: int
    limit: int
    total_pages: int
