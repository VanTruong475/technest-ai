from typing import Optional

from pydantic import BaseModel, field_validator


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and (not v.strip() or len(v) > 100):
            raise ValueError("Full name must be 1-100 characters")
        return v.strip() if v else v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 20:
            raise ValueError("Phone must be at most 20 characters")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("USER", "ADMIN"):
            raise ValueError("Role must be USER or ADMIN")
        return v
