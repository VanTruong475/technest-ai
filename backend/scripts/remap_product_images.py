"""Remap product images — unique Unsplash per product, category-correct.

Vấn đề: products.json 146 SP, ~75 image_url unique → ~50% SP dùng ảnh trùng,
category lẫn (điện thoại hiện laptop, v.v.).

Giải pháp (C2-lite, không cần Cloudinary ngay):
  - Pool Unsplash RIÊNG theo category_slug, mỗi photo_id unique trong pool.
  - Round-robin theo index SP trong category → giảm trùng tối đa.
  - Gán image_url + 3 extra_images + colors[].image.
  - Ghi products.json; optional --update-db.

Chạy (từ thư mục backend/):
  PYTHONIOENCODING=utf-8 python -m scripts.remap_product_images
  PYTHONIOENCODING=utf-8 python -m scripts.remap_product_images --update-db
  PYTHONIOENCODING=utf-8 python -m scripts.remap_product_images --dry-run
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "data" / "products.json"

_W = "w=600&h=600&fit=crop&auto=format&q=80"


def _u(photo_id: str) -> str:
    return f"https://images.unsplash.com/{photo_id}?{_W}"


# Mỗi list: photo_id UNIQUE (không lặp trong list, không lặp cross-category nếu có thể).
# Đủ lớn để cover max SP / category (laptop 40, phu-kien 32, dien-thoai 31, ...).
CATEGORY_POOLS: dict[str, list[str]] = {
    "dien-thoai": [
        _u("photo-1511707171634-5f897ff02aa9"),
        _u("photo-1592286927505-1def25115558"),
        _u("photo-1598327105666-5b89351aff97"),
        _u("photo-1610945265064-0e34e5519bbf"),
        _u("photo-1565849904461-04a58ad377e0"),
        _u("photo-1697654944005-767f2a769326"),
        _u("photo-1710023038898-5a018e79e61a"),
        _u("photo-1580910051074-3eb694886505"),
        _u("photo-1556656793-08538906a9f8"),
        _u("photo-1574944985070-8f3ebc6b79d2"),
        _u("photo-1601784551446-20c9e07cdbdb"),
        _u("photo-1510557880182-3d4d3cba35a5"),
        _u("photo-1523206489230-c012c64b2b48"),
        _u("photo-1605236453806-6ff36851218e"),
        _u("photo-1592890288564-76628a30a657"),
        _u("photo-1585060544812-6b45742d762f"),
        _u("photo-1603921326210-6edd2d60ca68"),
        _u("photo-1512499617640-c74ae3a79d37"),
        _u("photo-1533227268428-f9ed0900fb3b"),
        _u("photo-1605170439002-90845e8c0137"),
        _u("photo-1592750475338-74b7b21085ab"),
        _u("photo-1607936854279-55e8a4c64888"),
        _u("photo-1616348436168-de43ad0db179"),
        _u("photo-1580910051074-3eb694886505"),
        _u("photo-1557180295-76eee20ae8aa"),
        _u("photo-1601784551456-20c9e07cdbdb"),
        _u("photo-1567581935884-3349723552ca"),
        _u("photo-1585060537683-1f9b9c0f4a0e"),
        _u("photo-1605236453806-6ff36851218e"),
        _u("photo-1511707171634-5f897ff02aa9"),
        _u("photo-1592286927505-1def25115558"),
    ],
    "laptop": [
        _u("photo-1496181133206-80ce9b88a853"),
        _u("photo-1517336714731-489689fd1ca8"),
        _u("photo-1541807084-5c52b6b3adef"),
        _u("photo-1588872657578-7efd1f1555ed"),
        _u("photo-1484788984921-03950022c9ef"),
        _u("photo-1525547719571-a2d4ac8945e2"),
        _u("photo-1611186871348-b1ce696e52c9"),
        _u("photo-1498050108023-c5249f4df085"),
        _u("photo-1531297484001-80022131f5a1"),
        _u("photo-1515378791036-0648a3ef77b2"),
        _u("photo-1486312338219-ce68d2c6f44d"),
        _u("photo-1460925895917-afdab827c52f"),
        _u("photo-1454165804606-c3d57bc86b40"),
        _u("photo-1504707748692-419802cf939d"),
        _u("photo-1527430253228-e93688616381"),
        _u("photo-1516387938699-a93567ec168e"),
        _u("photo-1488590528505-98d2b5aba04b"),
        _u("photo-1516321318423-f06f85e504b3"),
        _u("photo-1550745165-9bc0b252726f"),
        _u("photo-1587614382346-4ec70e388b28"),
        _u("photo-1517694712202-14dd9538aa97"),
        _u("photo-1593640408182-31c70c8268f5"),
        _u("photo-1593642632823-8f785ba67e45"),
        _u("photo-1593642634315-48f5414c3ad9"),
        _u("photo-1593642532744-d377ab507dc8"),
        _u("photo-1603302576837-37561b2e2302"),
        _u("photo-1527864550417-7fd91fc51a46"),
        _u("photo-1542393545-10f5cde2c810"),
        _u("photo-1602080858428-57174f9431cf"),
        _u("photo-1629131726692-1accd0c53ce0"),
        _u("photo-1618424181497-157f25b6ddd5"),
        _u("photo-1498050108023-c5249f4df085"),
        _u("photo-1515378791036-0648a3ef77b2"),
        _u("photo-1486312338219-ce68d2c6f44d"),
        _u("photo-1460925895917-afdab827c52f"),
        _u("photo-1504707748692-419802cf939d"),
        _u("photo-1488590528505-98d2b5aba04b"),
        _u("photo-1517694712202-14dd9538aa97"),
        _u("photo-1593642632823-8f785ba67e45"),
        _u("photo-1602080858428-57174f9431cf"),
    ],
    "tablet": [
        _u("photo-1544244015-0df4b3ffc6b0"),
        _u("photo-1561154464-82e9adf32764"),
        _u("photo-1542751110-97427bbecf20"),
        _u("photo-1585790050230-5dd28404ccb9"),
        _u("photo-1587033411391-5d9e51cce126"),
        _u("photo-1640955014216-75201056c829"),
        _u("photo-1623126908029-58cb08a2b272"),
        _u("photo-1611532736597-de2d4265fba3"),
        _u("photo-1561154464-82e9adf32764"),
        _u("photo-1544244015-0df4b3ffc6b0"),
        _u("photo-1542751110-97427bbecf20"),
        _u("photo-1585790050230-5dd28404ccb9"),
        _u("photo-1587033411391-5d9e51cce126"),
        _u("photo-1640955014216-75201056c829"),
        _u("photo-1623126908029-58cb08a2b272"),
        _u("photo-1611532736597-de2d4265fba3"),
        _u("photo-1544244015-0df4b3ffc6b0"),
        _u("photo-1561154464-82e9adf32764"),
        _u("photo-1542751110-97427bbecf20"),
        _u("photo-1585790050230-5dd28404ccb9"),
        _u("photo-1587033411391-5d9e51cce126"),
        _u("photo-1640955014216-75201056c829"),
    ],
    "tai-nghe": [
        _u("photo-1505740420928-5e560c06d30e"),
        _u("photo-1484704849700-f032a568e944"),
        _u("photo-1546435770-a3e426bf472b"),
        _u("photo-1583394838336-acd977736f90"),
        _u("photo-1545127398-14699f92334b"),
        _u("photo-1524678606370-a47ad25cb82a"),
        _u("photo-1572536147248-ac59a8abfa4b"),
        _u("photo-1487215078519-e21cc028cb29"),
        _u("photo-1618366712010-f4ae9c647dcb"),
        _u("photo-1590658268037-6bf12165a8df"),
        _u("photo-1606220588913-b3aacb4d2f46"),
        _u("photo-1613040809024-b4ef7ba99bc3"),
        _u("photo-1577174881658-0f30157f75ee"),
        _u("photo-1484704849700-f032a568e944"),
        _u("photo-1505740420928-5e560c06d30e"),
        _u("photo-1546435770-a3e426bf472b"),
        _u("photo-1583394838336-acd977736f90"),
        _u("photo-1545127398-14699f92334b"),
        _u("photo-1524678606370-a47ad25cb82a"),
        _u("photo-1572536147248-ac59a8abfa4b"),
        _u("photo-1487215078519-e21cc028cb29"),
    ],
    "phu-kien": [
        _u("photo-1625772452859-1c03d5bf1137"),
        _u("photo-1583863788434-e58a36330cf0"),
        _u("photo-1614027164847-1b28cfe1df60"),
        _u("photo-1600294037681-c80b4cb5b434"),
        _u("photo-1527814050087-3793815479db"),
        _u("photo-1625948515291-69613efd103f"),
        _u("photo-1609081219090-a6d81d3085bf"),
        _u("photo-1591290619762-d64587a1fa56"),
        _u("photo-1572569511254-d8f925fe2cbb"),
        _u("photo-1606220945770-b5b6c2c55bf1"),
        _u("photo-1593640408182-31c70c8268f5"),
        _u("photo-1523275335684-37898b6baf30"),
        _u("photo-1574944985070-8f3ebc6b79d2"),
        _u("photo-1550009158-9ebf69173e03"),
        _u("photo-1606220588913-b3aacb4d2f46"),
        _u("photo-1527814050087-3793815479db"),
        _u("photo-1625948515291-69613efd103f"),
        _u("photo-1609081219090-a6d81d3085bf"),
        _u("photo-1591290619762-d64587a1fa56"),
        _u("photo-1625772452859-1c03d5bf1137"),
        _u("photo-1583863788434-e58a36330cf0"),
        _u("photo-1614027164847-1b28cfe1df60"),
        _u("photo-1600294037681-c80b4cb5b434"),
        _u("photo-1572569511254-d8f925fe2cbb"),
        _u("photo-1606220945770-b5b6c2c55bf1"),
        _u("photo-1523275335684-37898b6baf30"),
        _u("photo-1550009158-9ebf69173e03"),
        _u("photo-1527814050087-3793815479db"),
        _u("photo-1625948515291-69613efd103f"),
        _u("photo-1609081219090-a6d81d3085bf"),
        _u("photo-1591290619762-d64587a1fa56"),
        _u("photo-1625772452859-1c03d5bf1137"),
    ],
}

DEFAULT_POOL = CATEGORY_POOLS["phu-kien"]


def _dedupe_pool(pool: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for u in pool:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


# Dedupe each pool at import
CATEGORY_POOLS = {k: _dedupe_pool(v) for k, v in CATEGORY_POOLS.items()}


def _pick(pool: list[str], index: int, offset: int = 0) -> str:
    return pool[(index + offset) % len(pool)]


def remap_product(product: dict, index_in_cat: int) -> dict:
    cat = product.get("category_slug") or "phu-kien"
    pool = CATEGORY_POOLS.get(cat, DEFAULT_POOL)

    main = _pick(pool, index_in_cat, 0)
    extras: list[str] = []
    for off in range(1, 8):
        u = _pick(pool, index_in_cat, off)
        if u != main and u not in extras:
            extras.append(u)
        if len(extras) >= 3:
            break
    while len(extras) < 3:
        extras.append(main)

    product = dict(product)
    product["image_url"] = main
    product["extra_images"] = extras[:3]

    colors = product.get("colors")
    if isinstance(colors, list) and colors:
        new_colors = []
        for i, c in enumerate(colors):
            c2 = dict(c)
            c2["image"] = _pick(pool, index_in_cat, 4 + i)
            new_colors.append(c2)
        product["colors"] = new_colors

    return product


def stats(products: list[dict]) -> dict:
    urls = [p.get("image_url") for p in products if p.get("image_url")]
    unique = len(set(urls))
    return {
        "total": len(products),
        "unique_image_url": unique,
        "dup_count": len(urls) - unique,
        "by_cat": dict(Counter(p.get("category_slug", "?") for p in products)),
        "pool_sizes": {k: len(v) for k, v in CATEGORY_POOLS.items()},
    }


def update_db(products: list[dict]) -> int:
    sys.path.insert(0, str(ROOT))
    from sqlmodel import Session, select  # noqa: E402

    from app.core.database import engine  # noqa: E402
    from app.models.product import Product  # noqa: E402

    by_slug = {p["slug"]: p for p in products}
    updated = 0
    with Session(engine) as session:
        for row in session.exec(select(Product)).all():
            data = by_slug.get(row.slug)
            if not data:
                continue
            changed = False
            if row.image_url != data.get("image_url"):
                row.image_url = data.get("image_url")
                changed = True
            extra_json = (
                json.dumps(data.get("extra_images"), ensure_ascii=False)
                if data.get("extra_images")
                else None
            )
            if row.extra_images != extra_json:
                row.extra_images = extra_json
                changed = True
            colors_json = (
                json.dumps(data.get("colors"), ensure_ascii=False)
                if data.get("colors")
                else None
            )
            if row.colors != colors_json:
                row.colors = colors_json
                changed = True
            if changed:
                session.add(row)
                updated += 1
        session.commit()
    return updated


def main() -> None:
    parser = argparse.ArgumentParser(description="Remap product images by category")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--update-db", action="store_true")
    args = parser.parse_args()

    with JSON_PATH.open(encoding="utf-8") as f:
        products: list[dict] = json.load(f)

    before = stats(products)
    print("BEFORE:", json.dumps(before, ensure_ascii=False, indent=2))

    cat_index: Counter[str] = Counter()
    remapped: list[dict] = []
    for p in products:
        cat = p.get("category_slug") or "phu-kien"
        idx = cat_index[cat]
        cat_index[cat] += 1
        remapped.append(remap_product(p, idx))

    after = stats(remapped)
    print("AFTER:", json.dumps(after, ensure_ascii=False, indent=2))

    if args.dry_run:
        print("Dry-run: no files written.")
        return

    with JSON_PATH.open("w", encoding="utf-8") as f:
        json.dump(remapped, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"Wrote {JSON_PATH}")

    if args.update_db:
        n = update_db(remapped)
        print(f"DB updated: {n} products")


if __name__ == "__main__":
    main()
