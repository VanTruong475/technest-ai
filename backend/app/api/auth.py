import logging

from fastapi import APIRouter, Depends, Request, Response
from sqlmodel import Session

from app.core.database import get_session
from app.core.rate_limit import limiter
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    ChangePassword,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    Token,
    TwoFADisableRequest,
    TwoFAEnableRequest,
    TwoFASetupResponse,
    TwoFAVerifyLoginRequest,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.services.auth_service import (
    authenticate_user,
    change_password,
    clear_auth_cookie,
    create_access_token,
    create_temp_2fa_token,
    disable_2fa,
    enable_2fa,
    get_current_user,
    register_user,
    request_password_reset,
    reset_password,
    set_auth_cookie,
    setup_2fa,
    verify_2fa_login,
)
from app.services.email_service import send_password_reset_email

logger = logging.getLogger("techsphere")

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
@limiter.limit("5/minute")
def register(request: Request, user_data: UserCreate, session: Session = Depends(get_session)):
    user = register_user(user_data, session)
    return user


@router.post("/login", response_model=Token)
@limiter.limit("20/minute")
def login(
    request: Request,
    response: Response,
    login_data: UserLogin,
    session: Session = Depends(get_session),
):
    user = authenticate_user(login_data.email, login_data.password, session)

    # Admin with 2FA enabled → challenge step (no session cookie yet)
    if user.role == "ADMIN" and user.is_2fa_enabled:
        temp = create_temp_2fa_token(user.id)
        return Token(access_token="", requires_2fa=True, temp_token=temp)

    access_token = create_access_token(data={"sub": str(user.id)})
    set_auth_cookie(response, access_token)
    return Token(access_token=access_token)


@router.post("/2fa/verify-login", response_model=Token)
@limiter.limit("10/minute")
def verify_login_2fa(
    request: Request,
    response: Response,
    data: TwoFAVerifyLoginRequest,
    session: Session = Depends(get_session),
):
    user = verify_2fa_login(data.temp_token, data.code, session)
    access_token = create_access_token(data={"sub": str(user.id)})
    set_auth_cookie(response, access_token)
    return Token(access_token=access_token)


@router.post("/2fa/setup", response_model=TwoFASetupResponse)
@limiter.limit("5/minute")
def twofa_setup(
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    secret, uri = setup_2fa(current_user, session)
    return TwoFASetupResponse(secret=secret, otpauth_uri=uri)


@router.post("/2fa/enable")
@limiter.limit("10/minute")
def twofa_enable(
    request: Request,
    data: TwoFAEnableRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    enable_2fa(current_user, data.code, session)
    return {"message": "2FA enabled successfully"}


@router.post("/2fa/disable")
@limiter.limit("5/minute")
def twofa_disable(
    request: Request,
    data: TwoFADisableRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    disable_2fa(current_user, data.password, data.code, session)
    return {"message": "2FA disabled successfully"}


@router.post("/logout")
def logout(response: Response):
    """Clear HttpOnly auth cookie. Idempotent — always 200."""
    clear_auth_cookie(response)
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/change-password")
@limiter.limit("10/minute")
def update_password(
    request: Request,
    data: ChangePassword,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    change_password(current_user, data, session)
    return {"message": "Password changed successfully"}


@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, data: ForgotPasswordRequest, session: Session = Depends(get_session)):
    token = request_password_reset(data.email, session)

    if token:
        user = UserRepository(session).find_by_email(data.email)
        if user:
            try:
                send_password_reset_email(user, token)
            except Exception as e:
                logger.error(f"Failed to send reset email to {data.email}: {e}")

    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
@limiter.limit("10/minute")
def reset_password_endpoint(request: Request, data: ResetPasswordRequest, session: Session = Depends(get_session)):
    reset_password(data.token, data.new_password, session)
    return {"message": "Password reset successfully"}
