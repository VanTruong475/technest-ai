import pytest
from pydantic import ValidationError

from app.core.config import Settings


_VALID_SECRET = "x" * 32
_VALID_DB_URL = "postgresql://user:pass@localhost:5432/db"


def test_dev_default_secret_allowed(monkeypatch):
    monkeypatch.delenv("SECRET_KEY", raising=False)
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)

    s = Settings(
        DATABASE_URL=_VALID_DB_URL,
        ENVIRONMENT="development",
    )

    assert s.SECRET_KEY == "change_me"
    assert s.ADMIN_PASSWORD == "admin123"


def test_prod_default_secret_rejected():
    with pytest.raises(ValidationError) as exc:
        Settings(
            DATABASE_URL=_VALID_DB_URL,
            ENVIRONMENT="production",
            SECRET_KEY="change_me",
            ADMIN_PASSWORD="strong_password_xyz",
        )
    assert "SECRET_KEY" in str(exc.value)


def test_prod_short_secret_rejected():
    with pytest.raises(ValidationError) as exc:
        Settings(
            DATABASE_URL=_VALID_DB_URL,
            ENVIRONMENT="production",
            SECRET_KEY="tooshort",
            ADMIN_PASSWORD="strong_password_xyz",
        )
    assert "32 characters" in str(exc.value)


def test_prod_default_admin_password_rejected():
    with pytest.raises(ValidationError) as exc:
        Settings(
            DATABASE_URL=_VALID_DB_URL,
            ENVIRONMENT="production",
            SECRET_KEY=_VALID_SECRET,
            ADMIN_PASSWORD="admin123",
        )
    assert "ADMIN_PASSWORD" in str(exc.value)


def test_prod_wildcard_cors_rejected():
    with pytest.raises(ValidationError) as exc:
        Settings(
            DATABASE_URL=_VALID_DB_URL,
            ENVIRONMENT="production",
            SECRET_KEY=_VALID_SECRET,
            ADMIN_PASSWORD="strong_password_xyz",
            CORS_ORIGINS="*",
        )
    assert "CORS_ORIGINS" in str(exc.value)


def test_prod_valid_config_passes():
    s = Settings(
        DATABASE_URL=_VALID_DB_URL,
        ENVIRONMENT="production",
        SECRET_KEY=_VALID_SECRET,
        ADMIN_PASSWORD="strong_password_xyz",
        CORS_ORIGINS="https://app.example.com,https://www.example.com",
    )
    assert s.ENVIRONMENT == "production"
    assert s.SECRET_KEY == _VALID_SECRET
