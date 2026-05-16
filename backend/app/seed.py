"""
Seed script cho TechSphere AI E-commerce
Chạy: python -m app.seed

Lưu ý: Script idempotent - chạy nhiều lần không tạo trùng dữ liệu.
"""

from app.core.database import engine, get_session
from app.models.user import User
from app.models.category import Category
from app.models.brand import Brand
from app.models.product import Product
from app.services.auth_service import hash_password
from sqlmodel import Session, select


def seed_admin(session: Session) -> None:
    """Tạo tài khoản admin demo (chỉ dùng cho dev/demo)."""
    email = "admin@techsphere.com"
    existing = session.exec(select(User).where(User.email == email)).first()
    if existing:
        print(f"  [SKIP] Admin đã tồn tại: {email}")
        return

    admin = User(
        full_name="Admin Demo",
        email=email,
        password_hash=hash_password("admin123"),
        phone="0901234567",
        role="ADMIN",
        is_active=True,
    )
    session.add(admin)
    session.commit()
    print(f"  [CREATE] Admin: {email} / admin123 (CHỈ DÙNG CHO DEV/DEMO)")


def seed_categories(session: Session) -> dict[str, Category]:
    """Tạo 5 danh mục mẫu."""
    categories_data = [
        {"name": "Điện thoại di động", "slug": "dien-thoai", "description": "Các loại điện thoại thông minh"},
        {"name": "Laptop", "slug": "laptop", "description": "Máy tính xách tay"},
        {"name": "Tablet", "slug": "tablet", "description": "Máy tính bảng"},
        {"name": "Tai nghe", "slug": "tai-nghe", "description": "Tai nghe và headphone"},
        {"name": "Phụ kiện", "slug": "phu-kien", "description": "Phụ kiện công nghệ"},
    ]

    result = {}
    for data in categories_data:
        existing = session.exec(select(Category).where(Category.slug == data["slug"])).first()
        if existing:
            print(f"  [SKIP] Category đã tồn tại: {data['name']}")
            result[data["slug"]] = existing
        else:
            category = Category(**data)
            session.add(category)
            session.commit()
            session.refresh(category)
            print(f"  [CREATE] Category: {data['name']}")
            result[data["slug"]] = category

    return result


def seed_brands(session: Session) -> dict[str, Brand]:
    """Tạo 5 thương hiệu mẫu."""
    brands_data = [
        {"name": "Apple", "slug": "apple", "logo_url": None},
        {"name": "Samsung", "slug": "samsung", "logo_url": None},
        {"name": "Sony", "slug": "sony", "logo_url": None},
        {"name": "Dell", "slug": "dell", "logo_url": None},
        {"name": "Xiaomi", "slug": "xiaomi", "logo_url": None},
    ]

    result = {}
    for data in brands_data:
        existing = session.exec(select(Brand).where(Brand.slug == data["slug"])).first()
        if existing:
            print(f"  [SKIP] Brand đã tồn tại: {data['name']}")
            result[data["slug"]] = existing
        else:
            brand = Brand(**data)
            session.add(brand)
            session.commit()
            session.refresh(brand)
            print(f"  [CREATE] Brand: {data['name']}")
            result[data["slug"]] = brand

    return result


def seed_products(session: Session, categories: dict, brands: dict) -> None:
    """Tạo 12 sản phẩm mẫu."""
    products_data = [
        {
            "category_slug": "dien-thoai",
            "brand_slug": "apple",
            "name": "iPhone 15 Pro Max",
            "slug": "iphone-15-pro-max",
            "description": "Điện thoại cao cấp nhất của Apple với chip A17 Pro",
            "price": 1199.0,
            "sale_price": 1099.0,
            "stock": 50,
        },
        {
            "category_slug": "dien-thoai",
            "brand_slug": "samsung",
            "name": "Samsung Galaxy S24 Ultra",
            "slug": "samsung-galaxy-s24-ultra",
            "description": "Flagship Samsung với S Pen và AI",
            "price": 1299.0,
            "sale_price": 1199.0,
            "stock": 40,
        },
        {
            "category_slug": "dien-thoai",
            "brand_slug": "xiaomi",
            "name": "Xiaomi 14",
            "slug": "xiaomi-14",
            "description": "Điện thoại flagship giá tốt từ Xiaomi",
            "price": 699.0,
            "sale_price": 649.0,
            "stock": 100,
        },
        {
            "category_slug": "laptop",
            "brand_slug": "apple",
            "name": "MacBook Pro 14 inch M3",
            "slug": "macbook-pro-14-m3",
            "description": "Laptop chuyên nghiệp với chip M3",
            "price": 1999.0,
            "sale_price": None,
            "stock": 30,
        },
        {
            "category_slug": "laptop",
            "brand_slug": "dell",
            "name": "Dell XPS 15",
            "slug": "dell-xps-15",
            "description": "Laptop cao cấp màn hình InfinityEdge",
            "price": 1799.0,
            "sale_price": 1699.0,
            "stock": 25,
        },
        {
            "category_slug": "tablet",
            "brand_slug": "apple",
            "name": "iPad Pro M2 11 inch",
            "slug": "ipad-pro-m2-11",
            "description": "Máy tính bảng mạnh mẽ với chip M2",
            "price": 799.0,
            "sale_price": 749.0,
            "stock": 60,
        },
        {
            "category_slug": "tablet",
            "brand_slug": "samsung",
            "name": "Samsung Galaxy Tab S9",
            "slug": "samsung-galaxy-tab-s9",
            "description": "Tablet Android cao cấp với S Pen",
            "price": 849.0,
            "sale_price": None,
            "stock": 45,
        },
        {
            "category_slug": "tai-nghe",
            "brand_slug": "apple",
            "name": "AirPods Pro 2",
            "slug": "airpods-pro-2",
            "description": "Tai nghe không dây với chống ồn chủ động",
            "price": 249.0,
            "sale_price": 229.0,
            "stock": 200,
        },
        {
            "category_slug": "tai-nghe",
            "brand_slug": "sony",
            "name": "Sony WH-1000XM5",
            "slug": "sony-wh-1000xm5",
            "description": "Tai nghe chống ồn tốt nhất",
            "price": 399.0,
            "sale_price": 349.0,
            "stock": 80,
        },
        {
            "category_slug": "phu-kien",
            "brand_slug": "samsung",
            "name": "Samsung 65W Charger",
            "slug": "samsung-65w-charger",
            "description": "Sạc nhanh 65W cho Samsung",
            "price": 49.0,
            "sale_price": 39.0,
            "stock": 500,
        },
        {
            "category_slug": "phu-kien",
            "brand_slug": "apple",
            "name": "Apple MagSafe Charger",
            "slug": "apple-magsafe-charger",
            "description": "Sạc không dây MagSafe cho iPhone",
            "price": 39.0,
            "sale_price": None,
            "stock": 300,
        },
        {
            "category_slug": "laptop",
            "brand_slug": "dell",
            "name": "Dell Inspiron 15",
            "slug": "dell-inspiron-15",
            "description": "Laptop phổ thông giá tốt",
            "price": 699.0,
            "sale_price": 649.0,
            "stock": 150,
        },
    ]

    for data in products_data:
        existing = session.exec(select(Product).where(Product.slug == data["slug"])).first()
        if existing:
            print(f"  [SKIP] Product đã tồn tại: {data['name']}")
            continue

        category = categories.get(data["category_slug"])
        brand = brands.get(data["brand_slug"])

        if not category or not brand:
            print(f"  [ERROR] Không tìm thấy category/brand cho: {data['name']}")
            continue

        product = Product(
            category_id=category.id,
            brand_id=brand.id,
            name=data["name"],
            slug=data["slug"],
            description=data["description"],
            price=data["price"],
            sale_price=data["sale_price"],
            stock=data["stock"],
            status="ACTIVE",
        )
        session.add(product)
        session.commit()
        print(f"  [CREATE] Product: {data['name']} (${data['price']})")


def main() -> None:
    print("=" * 50)
    print("TechSphere AI - Seed Data")
    print("=" * 50)

    from app.core.database import create_db_and_tables
    create_db_and_tables()

    with next(get_session()) as session:
        print("\n[1/4] Seeding Admin...")
        seed_admin(session)

        print("\n[2/4] Seeding Categories...")
        categories = seed_categories(session)

        print("\n[3/4] Seeding Brands...")
        brands = seed_brands(session)

        print("\n[4/4] Seeding Products...")
        seed_products(session, categories, brands)

    print("\n" + "=" * 50)
    print("Seed data hoàn thành!")
    print("=" * 50)
    print("\nTài khoản admin demo:")
    print("  Email: admin@techsphere.com")
    print("  Password: admin123")
    print("  (CHỈ DÙNG CHO DEV/DEMO)")
    print("=" * 50)


if __name__ == "__main__":
    main()
