# DEPLOYMENT.md - Hướng dẫn Deploy TechSphere AI

## 1. Kiến trúc deploy

```
┌──────────────┐     HTTPS      ┌──────────────────┐     Internal     ┌──────────────────┐
│   Vercel     │ ──────────────> │  Render Backend  │ ──────────────> │ Render PostgreSQL│
│  (Frontend)  │   VITE_API_URL  │  (Web Service)   │   DATABASE_URL  │   (Database)     │
└──────────────┘                 └──────────────────┘                 └──────────────────┘
```

| Component | Platform | URL |
|-----------|----------|-----|
| Frontend | Vercel | `https://techsphere-ai.vercel.app` |
| Backend | Render Web Service | `https://techsphere-ai.onrender.com` |
| Database | Render PostgreSQL | Internal connection |

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
| `DATABASE_URL` | `postgresql://...` | Render tự inject khi link Internal Database |
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

### SPA Routing

File `frontend/vercel.json` đã cấu hình rewrite cho React Router:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 4. Database setup

### Bước 1: Tạo PostgreSQL trên Render

1. Render Dashboard > New > PostgreSQL
2. Chọn Free tier
3. Note **Internal Database URL**

### Bước 2: Link database vào Web Service

Khi tạo Web Service, chọn PostgreSQL database vừa tạo. Render tự inject `DATABASE_URL`.

### Bước 3: Chạy migration

Sau khi deploy backend thành công, vào Render Shell:

```bash
alembic upgrade head
```

### Bước 4: Seed data (manual)

```bash
python -m app.seed
```

> **Lưu ý:** Không chạy seed trong start command. Seed chỉ chạy 1 lần khi setup database lần đầu.

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

## 8. Resend setup (Optional)

Resend gửi email: forgot password, order confirmation.

### Tạo Resend account

1. Đăng ký tại [resend.com](https://resend.com)
2. Get API key

### Environment variables

```
EMAIL_ENABLED=true
RESEND_API_KEY=re_xxx
EMAIL_FROM=TechSphere AI <noreply@yourdomain.com>
```

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

### DATABASE_URL credential cũ

**Triệu chứng:** Login admin bị fail dù đã seed.

**Nguyên nhân:** Render rotate credential khi reconnect database.

**Cách sửa:** Vào Render Shell chạy lại seed:
```bash
python -m app.seed
```

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
