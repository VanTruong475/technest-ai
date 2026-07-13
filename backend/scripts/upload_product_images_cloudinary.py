"""Upload product images to Cloudinary and rewrite products.json URLs.

C2 full:
  1. Đọc products.json (sau remap category).
  2. Với mỗi product: download image_url + extra_images + colors[].image
     (skip nếu đã là res.cloudinary.com).
  3. Upload lên Cloudinary folder techsphere/products/{slug}/...
  4. Ghi lại products.json + optional --update-db.

Chạy (backend/ + venv):
  PYTHONIOENCODING=utf-8 ./venv/Scripts/python.exe -m scripts.upload_product_images_cloudinary
  PYTHONIOENCODING=utf-8 ./venv/Scripts/python.exe -m scripts.upload_product_images_cloudinary --limit 5
  PYTHONIOENCODING=utf-8 ./venv/Scripts/python.exe -m scripts.upload_product_images_cloudinary --update-db
  PYTHONIOENCODING=utf-8 ./venv/Scripts/python.exe -m scripts.upload_product_images_cloudinary --dry-run
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from pathlib import Path
from typing import Optional
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "data" / "products.json"
CACHE_PATH = ROOT / "data" / "cloudinary_url_cache.json"

sys.path.insert(0, str(ROOT))


def _load_settings():
    from app.core.config import settings

    return settings


def _configure_cloudinary() -> None:
    import cloudinary

    settings = _load_settings()
    if not all(
        [
            settings.CLOUDINARY_CLOUD_NAME,
            settings.CLOUDINARY_API_KEY,
            settings.CLOUDINARY_API_SECRET,
        ]
    ):
        raise SystemExit(
            "Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, "
            "CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in backend/.env"
        )
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def _is_cloudinary(url: Optional[str]) -> bool:
    return bool(url and "res.cloudinary.com" in url)


def _cache_key(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()


def _download(url: str, timeout: float = 25.0) -> bytes:
    req = Request(
        url,
        headers={
            "User-Agent": "TechSphereSeedBot/1.0 (+https://techsphere.local)",
            "Accept": "image/*,*/*;q=0.8",
        },
    )
    with urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _upload_bytes(data: bytes, public_id: str) -> str:
    import cloudinary.uploader

    result = cloudinary.uploader.upload(
        data,
        public_id=public_id,
        folder=None,  # public_id already includes folder path
        overwrite=True,
        resource_type="image",
        unique_filename=False,
    )
    return result["secure_url"]


def upload_url(
    url: str,
    public_id: str,
    cache: dict[str, str],
    dry_run: bool,
) -> str:
    if not url:
        return url
    if _is_cloudinary(url):
        return url

    key = _cache_key(url)
    if key in cache:
        return cache[key]

    if dry_run:
        fake = f"https://res.cloudinary.com/dry-run/image/upload/{public_id}.jpg"
        cache[key] = fake
        return fake

    data = _download(url)
    if len(data) < 500:
        raise RuntimeError(f"Downloaded too small ({len(data)} bytes): {url[:80]}")

    secure = _upload_bytes(data, public_id)
    cache[key] = secure
    return secure


def process_product(
    product: dict,
    cache: dict[str, str],
    dry_run: bool,
    sleep_s: float,
) -> tuple[dict, int]:
    """Returns (new_product, uploads_count)."""
    slug = product.get("slug") or f"product-{product.get('name', 'x')}"
    slug = slug[:80]
    uploads = 0
    p = dict(product)

    def one(url: Optional[str], suffix: str) -> Optional[str]:
        nonlocal uploads
        if not url:
            return url
        if _is_cloudinary(url):
            return url
        public_id = f"techsphere/products/{slug}/{suffix}"
        try:
            out = upload_url(url, public_id, cache, dry_run)
            if out != url:
                uploads += 1
            if sleep_s > 0 and not dry_run:
                time.sleep(sleep_s)
            return out
        except Exception as e:
            print(f"  WARN upload fail {slug}/{suffix}: {e}")
            return url  # keep original on failure

    p["image_url"] = one(p.get("image_url"), "main")

    extras = p.get("extra_images") or []
    if isinstance(extras, list):
        p["extra_images"] = [
            one(u, f"extra_{i}") for i, u in enumerate(extras) if u
        ]

    colors = p.get("colors")
    if isinstance(colors, list):
        new_colors = []
        for i, c in enumerate(colors):
            c2 = dict(c)
            c2["image"] = one(c.get("image"), f"color_{i}")
            new_colors.append(c2)
        p["colors"] = new_colors

    return p, uploads


def update_db(products: list[dict]) -> int:
    from sqlmodel import Session, select

    from app.core.database import engine
    from app.models.product import Product

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
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--update-db", action="store_true")
    parser.add_argument("--limit", type=int, default=0, help="Only first N products")
    parser.add_argument("--sleep", type=float, default=0.15, help="Sleep between uploads")
    args = parser.parse_args()

    if not args.dry_run:
        _configure_cloudinary()

    with JSON_PATH.open(encoding="utf-8") as f:
        products: list[dict] = json.load(f)

    cache: dict[str, str] = {}
    if CACHE_PATH.exists():
        with CACHE_PATH.open(encoding="utf-8") as f:
            cache = json.load(f)

    total = len(products)
    limit = args.limit if args.limit > 0 else total
    print(f"Products: {total}, processing: {limit}, dry_run={args.dry_run}")

    out: list[dict] = []
    total_uploads = 0
    for i, p in enumerate(products):
        if i >= limit:
            out.append(p)
            continue
        print(f"[{i+1}/{limit}] {p.get('slug')}")
        new_p, n = process_product(p, cache, args.dry_run, args.sleep)
        total_uploads += n
        out.append(new_p)

        # Persist cache every product (resume-safe)
        if not args.dry_run:
            CACHE_PATH.write_text(
                json.dumps(cache, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

    print(f"Uploads this run: {total_uploads}, cache size: {len(cache)}")

    if args.dry_run:
        print("Dry-run: products.json not written.")
        return

    with JSON_PATH.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"Wrote {JSON_PATH}")

    if args.update_db:
        n = update_db(out)
        print(f"DB updated: {n} products")


if __name__ == "__main__":
    main()
