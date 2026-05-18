from fastapi import APIRouter, Depends, Request
from sqlmodel import Session

from app.core.database import get_session
from app.core.rate_limit import limiter
from app.models.user import User
from app.schemas.auth import Token, UserCreate, UserLogin, UserResponse
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    get_current_user,
    register_user,
)

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
@limiter.limit("5/minute")
def register(request: Request, user_data: UserCreate, session: Session = Depends(get_session)):
    user = register_user(user_data, session)
    return user


@router.post("/login", response_model=Token)
@limiter.limit("20/minute")
def login(request: Request, login_data: UserLogin, session: Session = Depends(get_session)):
    user = authenticate_user(login_data.email, login_data.password, session)
    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
