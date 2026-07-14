import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import pyotp
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select

from app.core.config import settings
from app.core.database import get_session
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserCreate, ChangePassword

logger = logging.getLogger("techsphere")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# auto_error=False → hybrid: cookie OR Bearer; we raise ourselves if neither present
security = HTTPBearer(auto_error=False)

AUTH_COOKIE_NAME = "access_token"
TOTP_ISSUER = "TechSphere AI"
TEMP_TOKEN_PURPOSE = "2fa_pending"
TEMP_TOKEN_TTL_MINUTES = 5


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def register_user(user_data: UserCreate, session: Session) -> User:
    repo = UserRepository(session)

    if repo.find_by_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        phone=user_data.phone,
    )
    return repo.create(user)


def authenticate_user(email: str, password: str, session: Session) -> User:
    repo = UserRepository(session)
    user = repo.find_by_email(email)

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )

    return user


def set_auth_cookie(response: Response, token: str) -> None:
    """Attach JWT as HttpOnly cookie. Production: SameSite=None; Secure. Dev: Lax."""
    max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=max_age,
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    """Clear auth cookie (logout). Must match path/samesite/secure of set_auth_cookie."""
    response.delete_cookie(
        key=AUTH_COOKIE_NAME,
        path="/",
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        httponly=True,
    )


def _extract_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials],
) -> Optional[str]:
    """Hybrid: cookie first, then Authorization Bearer. Returns None if neither."""
    cookie_token = request.cookies.get(AUTH_COOKIE_NAME)
    if cookie_token:
        return cookie_token
    if credentials is not None:
        return credentials.credentials
    return None


def _decode_user_id(token: str) -> int:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
        try:
            return int(user_id_str)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: Session = Depends(get_session),
) -> User:
    token = _extract_token(request, credentials)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    user_id = _decode_user_id(token)

    repo = UserRepository(session)
    user = repo.find_by_id(user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    return user


def change_password(current_user: User, data: ChangePassword, session: Session) -> None:
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    current_user.password_hash = hash_password(data.new_password)
    repo = UserRepository(session)
    repo.update(current_user)


# ─── 2FA (TOTP) ───────────────────────────────────────────────────────────────


def create_temp_2fa_token(user_id: int) -> str:
    """Short-lived JWT used between password OK and TOTP verify."""
    return create_access_token(
        data={"sub": str(user_id), "purpose": TEMP_TOKEN_PURPOSE},
        expires_delta=timedelta(minutes=TEMP_TOKEN_TTL_MINUTES),
    )


def decode_temp_2fa_token(temp_token: str) -> int:
    try:
        payload = jwt.decode(
            temp_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        if payload.get("purpose") != TEMP_TOKEN_PURPOSE:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid 2FA token",
            )
        return int(payload["sub"])
    except (JWTError, ValueError, TypeError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired 2FA token",
        )


def setup_2fa(user: User, session: Session) -> tuple[str, str]:
    """Generate TOTP secret (not yet enabled). Returns (secret, otpauth_uri)."""
    if user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="2FA is only available for admin accounts",
        )
    if user.is_2fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled",
        )

    secret = pyotp.random_base32()
    user.totp_secret = secret
    # Keep is_2fa_enabled=False until confirm with a valid code
    UserRepository(session).update(user)

    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=user.email, issuer_name=TOTP_ISSUER)
    return secret, uri


def enable_2fa(user: User, code: str, session: Session) -> None:
    if user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="2FA is only available for admin accounts",
        )
    if not user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Call /2fa/setup first",
        )
    if user.is_2fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled",
        )
    if not pyotp.TOTP(user.totp_secret).verify(code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )
    user.is_2fa_enabled = True
    UserRepository(session).update(user)


def disable_2fa(user: User, password: str, code: str, session: Session) -> None:
    if not user.is_2fa_enabled or not user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled",
        )
    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    if not pyotp.TOTP(user.totp_secret).verify(code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )
    user.is_2fa_enabled = False
    user.totp_secret = None
    UserRepository(session).update(user)


def verify_2fa_login(temp_token: str, code: str, session: Session) -> User:
    user_id = decode_temp_2fa_token(temp_token)
    user = UserRepository(session).find_by_id(user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired 2FA token",
        )
    if not user.is_2fa_enabled or not user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled for this account",
        )
    if not pyotp.TOTP(user.totp_secret).verify(code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid verification code",
        )
    return user


RESET_TOKEN_EXPIRE_MINUTES = 15


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def request_password_reset(email: str, session: Session) -> Optional[str]:
    """Request password reset. Returns plain token if user found, None otherwise."""
    repo = UserRepository(session)
    user = repo.find_by_email(email)

    if not user or not user.is_active:
        return None

    token = secrets.token_urlsafe(32)
    token_hash = _hash_token(token)

    user.reset_token_hash = token_hash
    user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    repo.update(user)

    return token


def reset_password(token: str, new_password: str, session: Session) -> None:
    """Reset password using valid token."""
    token_hash = _hash_token(token)

    statement = select(User).where(User.reset_token_hash == token_hash)
    user = session.exec(statement).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    expires_at = user.reset_token_expires_at
    if not expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        user.reset_token_hash = None
        user.reset_token_expires_at = None
        session.add(user)
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    user.password_hash = hash_password(new_password)
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    session.add(user)
    session.commit()
