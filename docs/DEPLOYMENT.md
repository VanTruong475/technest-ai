# DEPLOYMENT.md - Hướng dẫn Deploy TechSphere AI

## 1. Kiến trúc deploy

```
┌──────────────┐     HTTPS      ┌──────────────────┐    SSL/pooler    ┌──────────────────┐
│   Vercel     │ ──────────────> │  Render Backend  │ ──────────────> │     Supabase     │
│  (Frontend)  │   VITE_API_URL  │  (Web Service)   │   DATABASE_URL  │   (PostgreSQL)   │
└──────────────┘                 └──────────────────┘                 └──────────────────┘
```

| Component | Platform | URL |
|-----------|----------|-----|
| Frontend | Vercel | `https://techsphere-ai.vercel.app` |
| Backend | Render Web Service | `https://techsphere-ai.onrender.com` |
| Database | Supabase PostgreSQL | Connection Pooler (port 6543) |

---

## 2. Backend Render config

### Web Service settings

| Setting | Value |
|---------|-------|
| **Name** | `techsphere-ai` |
| **Root Directory** | `backend` |
| **Runtime** | Python |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command (free tier)** | `alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

> **Free tier:** Render **không hỗ trợ Pre-Deploy Command** → chạy migrate + seed ngay trong Start Command. `app.seed` idempotent (check tồn tại theo slug/email) nên restart nhiều lần không tạo dữ liệu trùng. Đánh đổi: cold-start chậm thêm vài giây và nếu seed lỗi thì app không boot.
>
> **Plan trả phí:** chuyển `alembic upgrade head` (và `python -m app.seed` nếu muốn) sang **Pre-Deploy Command**, để Start Command chỉ còn `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Migrate chạy 1 lần/deploy, cold-start nhanh hơn và tránh race khi scale nhiều instance.

### Environment variables

| Variable | Value | Ghi chú |
|----------|-------|---------|
| `DATABASE_URL` | `postgresql://postgres.<ref>:<pwd>@aws-1-<region>.pooler.supabase.com:6543/postgres?options=-csearch_path%3Dpublic` | **Supabase** — copy từ Dashboard → Connect → Transaction pooler. Phải **sửa thủ công** (render.yaml không khai báo DB) |
| `SECRET_KEY` | `<random 64 chars>` | `openssl rand -hex 32` |
| `ALGORITHM` | `HS256` | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | |
| `CORS_ORIGINS` | `https://techsphere-ai.vercel.app` | URL frontend Vercel |
| `ENVIRONMENT` | `production` | Tắt SQL echo |
| `PYTHON_VERSION` | `3.12` | Render cần biết version |
| `REDIS_URL` | `redis://...` | Optional — app vẫn chạy nếu không có Redis |
| `CLOUDINARY_CLOUD_NAME` | `<cloud-name>` | Optional — upload ảnh disabled nếu thiếu |
| `CLOUDINARY_API_KEY` | `<api-key>` | Optional |
| `CLOUDINARY_API_SECRET` | `<api-secret>` | Optional |
| `SENTRY_DSN` | `https://xxx@sentry.io/xxx` | Optional — error tracking disabled nếu thiếu |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.1` | Optional |
| `EMAIL_ENABLED` | `true` | Optional — email disabled nếu false |
| `RESEND_API_KEY` | `re_xxx` | Optional |
| `EMAIL_FROM` | `TechSphere AI <noreply@domain.com>` | Optional |
| `FRONTEND_URL` | `https://techsphere-ai.vercel.app` | Dùng cho email links, payment redirect |
| `ADMIN_EMAIL` | `admin@techsphere.com` | Seed admin account |
| `ADMIN_PASSWORD` | `<strong-password>` | Seed admin account |
| `ADMIN_FULL_NAME` | `Admin` | Seed admin account |
| `VNPAY_TMN_CODE` | `<tmn-code>` | Optional — VNPay sandbox |
| `VNPAY_HASH_SECRET` | `<hash-secret>` | Optional |
| `VNPAY_PAYMENT_URL` | `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` | Default |
| `VNPAY_RETURN_URL` | `https://techsphere-ai.onrender.com/api/payments/vnpay-return` | Callback URL |

### Start command chi tiết

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

> Render tự set `$PORT`, không hardcode `8000`.

---

## 3. Frontend Vercel config

### Project settings

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### Environment variables

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://techsphere-ai.onrender.com` |

### SPA Routing + Security Headers

File `frontend/vercel.json` cấu hình rewrite cho React Router **và** response headers cứng:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" }
      ]
    }
  ]
}
```

> **Backend** cũng gắn cùng bộ header (kèm CSP API `default-src 'none'`) qua `SecurityHeadersMiddleware`. HSTS backend chỉ bật khi `ENVIRONMENT=production`.
>
> CSP frontend **chưa** hard-enforce (tránh vỡ Vite/Tailwind inline). Hard headers (XFO/XCTO/HSTS) đủ cho phase 1.

---

## 4. Database setup (Supabase)

### Bước 1: Tạo project Supabase

1. [supabase.com](https://supabase.com) > New project (chọn region gần, vd `ap-northeast-2`)
2. Đặt **Database Password** mạnh và lưu lại

### Bước 2: Lấy connection string

Dashboard > **Connect** > chọn tab phù hợp:
- **Transaction pooler (port 6543)** — dùng cho `DATABASE_URL` runtime của app. OK với `psycopg2`.
- **Session pooler (port 5432)** — dùng khi cần chạy migration/DDL nếu pooler 6543 báo lỗi.

Gắn thêm `?options=-csearch_path%3Dpublic` vào cuối URL để cố định schema.

### Bước 3: Set `DATABASE_URL` trên Render

Render Dashboard > service `techsphere-ai` > **Environment** > sửa `DATABASE_URL` thành chuỗi Supabase ở Bước 2. (render.yaml **không** khai báo DB nên bắt buộc set thủ công.)

### Bước 4: Migration + seed

Đã nằm trong Start Command (`alembic upgrade head && python -m app.seed`), tự chạy mỗi lần deploy. Seed idempotent nên an toàn.

> **Lưu ý:** Khi đổi từ DB cũ sang Supabase, nếu Supabase đã có sẵn data thì `alembic upgrade head` là no-op. Muốn migrate thủ công từ máy local: `cd backend && DATABASE_URL=<supabase-url> alembic upgrade head` (Windows: set `PYTHONIOENCODING=utf-8`).

---

## 5. Redis setup (Optional)

Redis dùng để cache sản phẩm, danh mục, thương hiệu. App vẫn chạy bình thường nếu không có Redis (graceful degradation).

### Tạo Redis trên Render

1. Render Dashboard > New > Redis
2. Plan: Free
3. Copy Internal Redis URL

### Environment variable

```
REDIS_URL=redis://default:<password>@<host>:<port>
```

### Cache strategy

| Data | TTL | Ghi chú |
|------|-----|---------|
| Product detail | 5 phút | Invalidate khi update product |
| Product list | 5 phút | Invalidate khi create/update/delete |
| Categories | 30 phút | Invalidate khi CRUD category |
| Brands | 30 phút | Invalidate khi CRUD brand |

---

## 6. Cloudinary setup (Optional)

Cloudinary dùng để upload và optimize hình ảnh sản phẩm. Tự động serve WebP/AVIF, resize on-the-fly.

### Tạo Cloudinary account

1. Đăng ký tại [cloudinary.com](https://cloudinary.com)
2. Dashboard > Account Details
3. Copy: Cloud Name, API Key, API Secret

### Environment variables

```
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

### Image transforms

Frontend sử dụng URL transforms để optimize:
- `f_auto` — Tự động serve WebP/AVIF
- `q_auto` — Auto quality
- `w_{width}` — Resize theo width cần thiết

---

## 7. Sentry setup (Optional)

Sentry theo dõi lỗi và performance.

### Tạo Sentry project

1. Đăng ký tại [sentry.io](https://sentry.io)
2. Create project > Python/FastAPI
3. Copy DSN

### Environment variable

```
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_TRACES_SAMPLE_RATE=0.1
```

---

## 8. Resend setup (Production email)

Resend gửi: **forgot password**, **order confirmation**, **order status update**.

> ⚠️ `onboarding@resend.dev` (default) chỉ gửi được tới email đã **verify** trên Resend dashboard (test mode). User thật **không** nhận mail cho đến khi bạn verify domain riêng.

### Checklist production

1. Đăng ký [resend.com](https://resend.com) → tạo API key (`re_...`)
2. Resend Dashboard → **Domains** → Add domain (vd `yourdomain.com`)
3. Thêm DNS records Resend cung cấp:
   - **DKIM** (TXT)
   - **SPF** (TXT, thường `v=spf1 include:amazonses.com ...`)
   - Optional **DMARC** (`_dmarc` TXT)
4. Đợi status domain = **Verified** (có thể vài phút–vài giờ)
5. Set env trên Render:

```
EMAIL_ENABLED=true
RESEND_API_KEY=re_xxx
EMAIL_FROM=TechSphere AI <noreply@yourdomain.com>
FRONTEND_URL=https://techsphere-ai.vercel.app
```

6. Smoke test:
   - Forgot password với email thật → inbox có link reset (15 phút)
   - Đặt đơn hàng → mail xác nhận
   - Admin đổi status đơn → mail cập nhật trạng thái

### Local / test mode

```
EMAIL_ENABLED=true
RESEND_API_KEY=re_xxx
EMAIL_FROM=TechSphere AI <onboarding@resend.dev>
```

Chỉ gửi được tới email đã Add trong Resend → **Audience / Emails** (verified recipients).

### Hành vi khi email fail

Order/status API **không** fail nếu Resend lỗi — email fire-and-forget sau commit (`order_service` bọc try/except). Check log `Email sent to a***@domain` / `Failed to send email`.

---

## 9. VNPay setup (Sandbox)

### Đăng ký sandbox

1. Đăng ký tại [sandbox.vnpayment.vn](https://sandbox.vnpayment.vn)
2. Lấy TMN Code và Hash Secret

### Environment variables

```
VNPAY_TMN_CODE=<your-tmn-code>
VNPAY_HASH_SECRET=<your-hash-secret>
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://techsphere-ai.onrender.com/api/payments/vnpay-return
```

### Test card

| Field | Value |
|-------|-------|
| Card Number | `9704198526191432198` |
| Card Holder | `NGUYEN VAN A` |
| Expiry | `07/15` |
| OTP | `123456` |

---

## 5. Lỗi đã gặp và cách xử lý

### requirements.txt bị UTF-16/null bytes

**Triệu chứng:**
```
ERROR: Invalid requirement: '\x00f\x00a\x00s\x00t\x00a\x00p\x00i...'
```

**Nguyên nhân:** File bị encode UTF-16 (có BOM `ff fe` và null bytes giữa các ký tự).

**Cách sửa:** Dùng Python rewrite file:
```python
from pathlib import Path
Path("requirements.txt").write_text(content, encoding="utf-8")
```

**Cách kiểm tra:**
```bash
# Kiểm tra null bytes
python -c "print(b'\x00' in open('requirements.txt','rb').read())"
```

---

### Alembic duplicate column

**Triệu chứng:**
```
sqlalchemy.exc.OperationalError: column "xxx" already exists
```

**Nguyên nhân:** `create_db_and_tables()` trong `on_startup` tạo bảng trước, sau đó `alembic upgrade head` cố gắng tạo lại.

**Cách sửa:**
```bash
# Stamp current state trước khi migrate
alembic stamp head
# Sau đó mới chạy migration mới
alembic revision --autogenerate -m "description"
alembic upgrade head
```

---

### CORS blocked

**Triệu chứng:** Frontend gọi API bị lỗi CORS trong browser console.

**Cách sửa:** Kiểm tra `CORS_ORIGINS` trên Render phải đúng URL Vercel:
```
CORS_ORIGINS=https://techsphere-ai.vercel.app
```

Không có trailing slash, không có `http://` (phải là `https://`).

---

### VITE_API_URL sai

**Triệu chứng:** Frontend load được nhưng API call fail 404 hoặc CORS error.

**Cách sửa:** Đảm bảo `VITE_API_URL` trên Vercel là:
```
https://techsphere-ai.onrender.com
```

Sau khi đổi env var, phải **redeploy** frontend.

---

### Rate limit login quá thấp

**Triệu chứng:** Login/logout nhanh bị lỗi `429 Rate limit exceeded: 5 per 1 minute`.

**Cách sửa:** Tăng rate limit trong `backend/app/api/auth.py`:
```python
@limiter.limit("20/minute")  # Login
@limiter.limit("5/minute")   # Register
```

---

### DATABASE_URL sai / data trống sau khi đổi DB

**Triệu chứng:** Login admin fail, hoặc trang chủ không có sản phẩm sau khi chuyển sang Supabase.

**Nguyên nhân:** `DATABASE_URL` trên Render vẫn trỏ DB cũ, hoặc Supabase chưa được seed.

**Cách sửa:**
1. Kiểm tra Render > Environment > `DATABASE_URL` đúng chuỗi Supabase (pooler 6543).
2. Trigger redeploy (Start Command tự chạy `alembic upgrade head && python -m app.seed`), hoặc seed thủ công từ local:
   ```bash
   cd backend && DATABASE_URL=<supabase-url> python -m app.seed   # Windows: set PYTHONIOENCODING=utf-8
   ```

### Lỗi prepared statement (nếu đổi sang psycopg3/asyncpg)

**Triệu chứng:** `prepared statement "__asyncpg_..." already exists` trên pooler 6543.

**Cách sửa:** Transaction pooler không hỗ trợ prepared statements. Thêm `?prepared_statement_cache_size=0` (asyncpg) hoặc dùng Session pooler port `5432`. Với `psycopg2` hiện tại thì không gặp lỗi này.

---

## 6. Checklist test sau deploy

### Backend (`https://techsphere-ai.onrender.com`)

- [ ] `GET /health` → 200 OK
- [ ] `GET /docs` → Swagger UI load được
- [ ] `GET /api/products?limit=5` → trả về danh sách sản phẩm
- [ ] `POST /api/auth/login` → login admin thành công
- [ ] `GET /api/auth/me` → trả về thông tin user

### Frontend (`https://techsphere-ai.vercel.app`)

- [ ] Homepage load được, sản phẩm hiển thị
- [ ] Click sản phẩm → trang chi tiết
- [ ] Login hoạt động (admin@techsphere.com / admin123)
- [ ] Thêm sản phẩm vào giỏ hàng
- [ ] Checkout flow hoạt động
- [ ] VNPay payment redirect hoạt động (sandbox)
- [ ] Admin pages: Products, Orders, Users, Dashboard
- [ ] Admin Dashboard hiển thị stats và charts
- [ ] Image upload hoạt động (nếu có Cloudinary)
- [ ] AI Chat hoạt động
- [ ] Review / Wishlist hoạt động
- [ ] Refresh trang bất kỳ → không 404 (SPA routing)
- [ ] Mobile responsive trên 375px

---

## 7. Redeploy

### Backend (Render)

Push code lên GitHub, Render tự động redeploy branch `main`.

Hoặc: Render Dashboard > Manual Deploy > Deploy latest commit.

### Frontend (Vercel)

Push code lên GitHub, Vercel tự động redeploy branch `main`.

Nếu chỉ đổi env var: Vercel Dashboard > Settings > Environment Variables > Save > Redeploy.
