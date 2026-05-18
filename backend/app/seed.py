"""
Seed script cho TechSphere AI E-commerce
Chạy: python -m app.seed

Lưu ý: Script idempotent - chạy nhiều lần không tạo trùng dữ liệu.
"""

import json
from pathlib import Path

from app.core.database import engine, get_session
from app.models.user import User
from app.models.category import Category
from app.models.brand import Brand
from app.models.product import Product
from app.services.auth_service import hash_password
from sqlmodel import Session, select

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


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
    """Tạo 9 thương hiệu mẫu."""
    brands_data = [
        {"name": "Apple", "slug": "apple", "logo_url": None},
        {"name": "Samsung", "slug": "samsung", "logo_url": None},
        {"name": "Sony", "slug": "sony", "logo_url": None},
        {"name": "Dell", "slug": "dell", "logo_url": None},
        {"name": "Xiaomi", "slug": "xiaomi", "logo_url": None},
        {"name": "Asus", "slug": "asus", "logo_url": None},
        {"name": "Lenovo", "slug": "lenovo", "logo_url": None},
        {"name": "HP", "slug": "hp", "logo_url": None},
        {"name": "Logitech", "slug": "logitech", "logo_url": None},
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
    """Đọc sản phẩm từ data/products.json và seed vào DB (idempotent)."""
    products_file = DATA_DIR / "products.json"
    if not products_file.exists():
        print(f"  [ERROR] Không tìm thấy file: {products_file}")
        return

    products_data = json.loads(products_file.read_text(encoding="utf-8"))
    print(f"  Đọc {len(products_data)} sản phẩm từ {products_file.name}")

    created, updated, skipped = 0, 0, 0

    for data in products_data:
        category = categories.get(data["category_slug"])
        brand = brands.get(data["brand_slug"])

        if not category or not brand:
            print(f"  [ERROR] Không tìm thấy category/brand cho: {data['name']}")
            continue

        existing = session.exec(select(Product).where(Product.slug == data["slug"])).first()
        if existing:
            changed = False
            for field in ("name", "description", "image_url", "price", "sale_price", "stock", "status"):
                new_val = data.get(field)
                if getattr(existing, field) != new_val:
                    setattr(existing, field, new_val)
                    changed = True
            if existing.category_id != category.id:
                existing.category_id = category.id
                changed = True
            if existing.brand_id != brand.id:
                existing.brand_id = brand.id
                changed = True
            if changed:
                session.add(existing)
                session.commit()
                print(f"  [UPDATE] Product: {data['name']}")
                updated += 1
            else:
                print(f"  [SKIP] Product không thay đổi: {data['name']}")
                skipped += 1
            continue

        product = Product(
            category_id=category.id,
            brand_id=brand.id,
            name=data["name"],
            slug=data["slug"],
            description=data["description"],
            image_url=data.get("image_url"),
            price=data["price"],
            sale_price=data.get("sale_price"),
            stock=data.get("stock", 0),
            status=data.get("status", "ACTIVE"),
        )
        session.add(product)
        session.commit()
        print(f"  [CREATE] Product: {data['name']} (${data['price']})")
        created += 1

    print(f"\n  Tổng kết: {created} tạo mới, {updated} cập nhật, {skipped} bỏ qua")


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
