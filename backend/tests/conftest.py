import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.core.database import get_session
from app.models.user import User
from app.services.auth_service import hash_password, create_access_token


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="test_user")
def test_user_fixture(session: Session):
    user = User(
        full_name="Test User",
        email="test@example.com",
        password_hash=hash_password("test123"),
        phone="0900000000",
        role="USER",
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="admin_user")
def admin_user_fixture(session: Session):
    user = User(
        full_name="Admin User",
        email="admin@example.com",
        password_hash=hash_password("admin123"),
        phone="0901234567",
        role="ADMIN",
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="user_token")
def user_token_fixture(test_user: User):
    return create_access_token(data={"sub": str(test_user.id)})


@pytest.fixture(name="admin_token")
def admin_token_fixture(admin_user: User):
    return create_access_token(data={"sub": str(admin_user.id)})
