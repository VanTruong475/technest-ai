"""One-off script: fix 7 Unsplash URLs 404 trong products.json + DB.

Tại sao cần: một số ảnh Unsplash bị creator xóa sau khi seed → frontend hiển
thị 📦 fallback. Đây không phải lỗi code, là external resource rot.

Bonus: sửa slug DB id=1 từ `macbook-air-m2` → `macbook-air-m2-2022` cho khớp
seed (sai từ session seed cũ).

Chạy: PYTHONIOENCODING=utf-8 python -m scripts.fix_broken_product_images
"""
import json
import sys
from pathlib import Path

# Make sure we can import from app/
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select  # noqa: E402

from app.core.database import engine  # noqa: E402
from app.models.product import Product  # noqa: E402


# Map: tên sản phẩm broken → URL Unsplash mới (reuse từ similar products
# đã verify work). Chấp nhận visual gần đúng thay vì pixel-perfect product
# match — ưu tiên có ảnh thay vì 📦 fallback.
_W = "?w=600&h=600&fit=crop&auto=format"

REPLACEMENTS: dict[str, str] = {
    # Samsung phone — reuse S24 Ultra (cùng dòng)
    "Samsung Galaxy S24": f"https://images.unsplash.com/photo-1610945265064-0e34e5519bbf{_W}",
    # Tablets — reuse iPad Pro M2 URL (tablet visual gần như nhau)
    "Samsung Galaxy Tab S9": f"https://images.unsplash.com/photo-1561154464-82e9adf32764{_W}",
    "Xiaomi Pad 6 Pro": f"https://images.unsplash.com/photo-1542751110-97427bbecf20{_W}",
    # Gaming headset Logitech — reuse Sony WH series alternative
    "Logitech G Pro X Wireless": f"https://images.unsplash.com/photo-1583394838336-acd977736f90{_W}",
    # Charger Apple — reuse 20W USB-C Adapter URL (cùng category)
    "Apple MagSafe Charger": f"https://images.unsplash.com/photo-1583863788434-e58a36330cf0{_W}",
    # Tracker — reuse Samsung SmartTag 2 URL (cùng loại tracker tag)
    "Apple AirTag 4-pack": f"https://images.unsplash.com/photo-1614027164847-1b28cfe1df60{_W}",
    # Stylus — reuse iPad Pro URL (Pencil thường đi cùng iPad)
    "Apple Pencil Pro": f"https://images.unsplash.com/photo-1561154464-82e9adf32764{_W}",
}

# NOTE: Không rename slug — DB có thể đã có sản phẩm khác cùng slug đích
# (duplicate từ seed cũ). Cách an toàn: chỉ set image_url cho rows thiếu
# image, để admin tự dọn duplicate qua UI sau.
SLUG_FIXES: dict[str, str] = {}


def update_products_json(json_path: Path) -> int:
    with json_path.open(encoding="utf-8") as f:
        data = json.load(f)

    updated = 0
    for product in data:
        if product["name"] in REPLACEMENTS:
            product["image_url"] = REPLACEMENTS[product["name"]]
            updated += 1

    if updated > 0:
        with json_path.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    return updated


def update_db() -> tuple[int, int, int]:
    """Returns (urls_updated, slugs_updated, missing_image_filled)."""
    urls = 0
    slugs = 0
    missing_filled = 0

    with Session(engine) as session:
        # 1. Fix slug DB id=1 trước để seed sau này match được
        for old_slug, new_slug in SLUG_FIXES.items():
            stmt = select(Product).where(Product.slug == old_slug)
            for p in session.exec(stmt).all():
                p.slug = new_slug
                session.add(p)
                slugs += 1
                print(f"  [SLUG] {p.name}: {old_slug} → {new_slug}")

        session.commit()

        # 2. Update broken URLs by name
        for name, new_url in REPLACEMENTS.items():
            stmt = select(Product).where(Product.name == name)
            for p in session.exec(stmt).all():
                p.image_url = new_url
                session.add(p)
                urls += 1
                print(f"  [URL] {name}: image_url updated")

        # 3. Fill missing image cho id=1 (sau khi đã fix slug, nó sẽ match
        # seed sau này — nhưng phải set image_url ngay để FE không thấy 📦)
        stmt = select(Product).where(
            (Product.image_url == "") | (Product.image_url.is_(None))
        )
        for p in session.exec(stmt).all():
            # MacBook Air M2 2022 → URL từ seed file
            if "macbook" in p.name.lower() and "air" in p.name.lower():
                p.image_url = "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600&h=600&fit=crop&auto=format"
                session.add(p)
                missing_filled += 1
                print(f"  [IMG] {p.name}: filled missing image_url")

        session.commit()

    return urls, slugs, missing_filled


def main() -> None:
    json_path = Path(__file__).parent.parent / "data" / "products.json"
    if not json_path.exists():
        print(f"ERROR: {json_path} not found")
        sys.exit(1)

    print(f"=== Updating {json_path.name} ===")
    json_updated = update_products_json(json_path)
    print(f"  → {json_updated} entries updated\n")

    print("=== Updating DB ===")
    urls, slugs, filled = update_db()
    print(f"\n  URLs replaced: {urls}")
    print(f"  Slugs fixed: {slugs}")
    print(f"  Missing images filled: {filled}")
    print("\nDone.")


if __name__ == "__main__":
    main()
