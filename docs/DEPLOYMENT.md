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
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

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
- [ ] Admin pages: Products, Orders, Users
- [ ] AI Chat hoạt động
- [ ] Refresh trang bất kỳ → không 404 (SPA routing)

---

## 7. Redeploy

### Backend (Render)

Push code lên GitHub, Render tự động redeploy branch `main`.

Hoặc: Render Dashboard > Manual Deploy > Deploy latest commit.

### Frontend (Vercel)

Push code lên GitHub, Vercel tự động redeploy branch `main`.

Nếu chỉ đổi env var: Vercel Dashboard > Settings > Environment Variables > Save > Redeploy.
