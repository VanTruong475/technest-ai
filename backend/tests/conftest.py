import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.core.database import get_session
from app.core.rate_limit import limiter
from app.models.user import User
from app.models.category import Category
from app.models.brand import Brand
from app.models.product import Product
from app.services.auth_service import hash_password, create_access_token


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """slowapi limiter là singleton module-level — share state giữa tests.
    Reset trước mỗi test để tránh 429 false-positive khi nhiều test hit cùng
    endpoint (vd: /api/ai/chat có limit 10/minute)."""
    try:
        limiter.reset()
    except Exception:
        pass
    yield


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


@pytest.fixture(name="category")
def category_fixture(session: Session):
    category = Category(
        name="Phones",
        slug="phones",
        description="Smartphones",
    )
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@pytest.fixture(name="brand")
def brand_fixture(session: Session):
    brand = Brand(name="Apple", slug="apple")
    session.add(brand)
    session.commit()
    session.refresh(brand)
    return brand


@pytest.fixture(name="product")
def product_fixture(session: Session, category: Category, brand: Brand):
    product = Product(
        name="iPhone 15 Pro",
        slug="iphone-15-pro",
        description="Latest iPhone",
        price=29990000,
        sale_price=27490000,
        stock=50,
        status="ACTIVE",
        category_id=category.id,
        brand_id=brand.id,
    )
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@pytest.fixture(name="product2")
def product2_fixture(session: Session, category: Category, brand: Brand):
    product = Product(
        name="AirPods Pro",
        slug="airpods-pro",
        description="Wireless earbuds",
        price=5990000,
        stock=30,
        status="ACTIVE",
        category_id=category.id,
        brand_id=brand.id,
    )
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@pytest.fixture(name="test_user2")
def test_user2_fixture(session: Session):
    user = User(
        full_name="Test User 2",
        email="test2@example.com",
        password_hash=hash_password("test123"),
        phone="0900000001",
        role="USER",
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="user2_token")
def user2_token_fixture(test_user2: User):
    return create_access_token(data={"sub": str(test_user2.id)})


@pytest.fixture(name="inactive_user")
def inactive_user_fixture(session: Session):
    user = User(
        full_name="Inactive User",
        email="inactive@example.com",
        password_hash=hash_password("inactive123"),
        phone="0900000002",
        role="USER",
        is_active=False,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="inactive_token")
def inactive_token_fixture(inactive_user: User):
    return create_access_token(data={"sub": str(inactive_user.id)})
