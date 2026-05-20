# TechSphere AI

> Nền tảng thương mại điện tử thiết bị công nghệ tích hợp AI tư vấn sản phẩm.

![CI](https://github.com/VanTruong475/techsphere-ai/actions/workflows/ci.yml/badge.svg)
![Tests](https://img.shields.io/badge/Tests-263/263-brightgreen)
![Coverage](https://img.shields.io/badge/Coverage-87%25-green)
![Python](https://img.shields.io/badge/Python-3.11+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688)
![React](https://img.shields.io/badge/React-19-61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1)

---

## Live Demo

| Dich vu | URL |
|---------|-----|
| Frontend | https://techsphere-ai.vercel.app |
| Backend API | https://techsphere-ai.onrender.com |
| API Docs (Swagger) | https://techsphere-ai.onrender.com/docs |

> Thong tin tai khoan demo se duoc cung cap khi can.

---

## Tinh nang chinh

### Nguoi dung
- Dang ky / Dang nhap (JWT authentication)
- Doi mat khau, quen mat khau (gui email qua Resend)
- Duyet san pham theo danh muc, thuong hieu
- Tim kiem san pham thong minh (AI Search)
- Gio hang + Checkout
- Thanh toan online (VNPay sandbox)
- Lich su don hang, chi tiet don hang
- Danh gia san pham (Reviews & Ratings)
- Yeu thich (Wishlist)
- Ho so ca nhan
- San pham da xem gan day (Recently Viewed)

### Tinh nang AI
- **AI Search** — Tim kiem san pham theo relevance score, fuzzy matching
- **AI Recommendation** — Goi y dua tren gio hang, lich su, muc do pho bien
- **AI Chatbot** — Tu van san pham theo nhu cau, ngan sach, thuong hieu

### Quan tri (Admin)
- Dashboard thong ke (doanh thu, don hang, san pham, nguoi dung, bieu do)
- Quan ly san pham (CRUD, upload hinh anh Cloudinary)
- Quan ly don hang (cap nhat trang thai, xuat CSV)
- Quan ly nguoi dung (phan quyen, kich hoat/vo hieu hoa)
- Quan ly danh gia (xem, xoa danh gia vi pham)
- Quan ly kho hang (bulk update ton kho)
- Nhat ky he thong (Audit Log)
- Quan ly danh muc, thuong hieu (CRUD)

---

## Cong nghe su dung

| Lop | Cong nghe |
|-----|-----------|
| **Backend** | FastAPI 0.136, SQLModel, PostgreSQL 16, Alembic |
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| **Quan ly state** | Zustand, TanStack Query |
| **Xac thuc** | JWT (python-jose), bcrypt (passlib) |
| **Cache** | Redis (graceful degradation — app van chay neu khong co Redis) |
| **Upload hinh anh** | Cloudinary (auto WebP/AVIF, resize, CDN) |
| **Bao loi** | Sentry (error tracking + performance monitoring) |
| **Email** | Resend (transactional email) |
| **Bieu do** | Recharts (admin dashboard) |
| **Thanh toan** | VNPay (sandbox) |
| **Nen truyen** | GZip middleware (Starlette) |
| **Kiem thu** | Pytest, httpx, pytest-cov, GitHub Actions |
| **Trien khai** | Render (Backend + DB + Redis), Vercel (Frontend) |

---

## Kien truc he thong

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Vercel)                      │
│            React + Vite + TypeScript + Tailwind          │
│         OptimizedImage (Cloudinary transforms)           │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend (Render)                        │
│              FastAPI + SQLModel + Alembic                 │
│                                                           │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────┐  │
│  │  Auth   │ │ Product  │ │  Cart   │ │  AI Engine   │  │
│  │  User   │ │ Category │ │  Order  │ │ Search/Rec/  │  │
│  │ Review  │ │  Brand   │ │ VNPay   │ │   Chatbot    │  │
│  └─────────┘ └──────────┘ └─────────┘ └──────────────┘  │
│                                                           │
│  ┌───────────────────┐  ┌─────────────────────────────┐  │
│  │   Redis Cache     │  │      Sentry Monitoring      │  │
│  │ (product 5min,    │  │   (error tracking, perf)    │  │
│  │  category 30min)  │  │                             │  │
│  └───────────────────┘  └─────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│            PostgreSQL (Render) + Redis (Render)           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   Cloudinary CDN                          │
│         Image storage + auto format (WebP/AVIF)          │
│         Resize on-the-fly via URL transforms             │
└─────────────────────────────────────────────────────────┘
```

### Backend Architecture (4-Layer Pattern)

```
Request → API (router.py) → Service (service.py) → Repository (repository.py) → Database
                                   ↓
                              Schema validation (schemas.py)
```

```
backend/app/
├── api/            # API endpoints (router)
├── core/           # Config, database, security, cache
├── models/         # SQLModel models
├── repositories/   # Data access layer
├── schemas/        # Pydantic schemas (request/response)
├── services/       # Business logic
└── main.py         # FastAPI app entry (CORS, GZip, routers)
```

---

## Anh chup man hinh

> Se duoc bo sung sau. Cac man hinh du kien:

- Trang chu (hero banner, san pham noi bat, danh muc)
- Danh sach san pham (filter, search, pagination)
- Chi tiet san pham (hinh anh optimize, danh gia, san pham lien quan)
- Gio hang / Thanh toan (VNPay)
- Lich su don hang / Chi tiet don hang
- Wishlist / Recently Viewed
- AI Chatbot
- Admin Dashboard (stats, bieu do)
- Admin Product Management (bulk edit, image upload)
- Admin Order Export / Audit Log

---

## Cai dat local

### Yeu cau
- Python 3.11+
- Node.js 20+
- PostgreSQL 16+
- Redis (tuy chon — app van chay binh thuong neu khong co Redis)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # macOS/Linux
# .\venv\Scripts\Activate.ps1  # Windows
pip install -r requirements.txt
```

Tao file `.env` tu mau:

```bash
cp .env.example .env
# Chinh sua DATABASE_URL va cac bien moi truong khac
```

Chuyen migration va seed du lieu:

```bash
alembic upgrade head
python -m app.seed
```

Khoi dong server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Truy cap: http://localhost:5173

---

## Kiem thu

### Backend

```bash
cd backend
pytest tests/ -v                    # Chay tat ca tests
pytest tests/ -v --cov=app          # Chay voi coverage report
```

**263/263 tests** — 87% coverage bao gom:

| Module | So luong | Noi dung |
|--------|----------|----------|
| test_auth | 14 | Register, login, JWT, change password, forgot password |
| test_category | 13 | CRUD, phan quyen, pagination, duplicate slug |
| test_brand | 13 | CRUD, phan quyen, pagination, duplicate slug |
| test_user_management | 13 | List, get, update, phan quyen, role escalation |
| test_product_crud | 10 | CRUD, filter, search, soft delete, pagination |
| test_cart | 14 | Add, update, delete, stock validation, checkout |
| test_order | 15 | Create, status update, user orders, admin orders |
| test_review | 10 | Create, list, delete, rating stats |
| test_wishlist | 8 | Add, remove, list, duplicate handling |
| test_cache | 13 | Cache key, get/set, invalidate, no-Redis graceful degradation |
| test_order_export | 10 | CSV export, date filter, status filter, UTF-8 BOM |
| test_audit_log | 10 | Log creation, list, action types, export |
| test_admin_bulk | 9 | Bulk inventory update, inline stock editing |
| test_admin_dashboard | 8 | Stats API, charts data, recent orders |
| test_admin_reviews | 8 | List reviews, delete review, filter by product |
| test_edge_cases | 8 | Inactive user, SQL injection, XSS, invalid params |
| test_gzip | 2 | GZip compression, response body readable |
| test_image_optimization | 2 | Cloudinary URL transform, non-Cloudinary passthrough |

### Frontend

```bash
cd frontend
npm run build
```

### CI/CD

GitHub Actions tu dong chay khi push hoac PR vao nhanh `main`:
- Backend: cai dat dependencies + chay pytest
- Frontend: cai dat dependencies + build production

---

## Trien khai

Du an su dung kien truc:
- **Frontend**: Vercel (auto-deploy tu GitHub)
- **Backend**: Render Web Service (auto-deploy tu GitHub)
- **Database**: Render PostgreSQL
- **Cache**: Render Redis (tuy chon)
- **Image CDN**: Cloudinary
- **Error Tracking**: Sentry
- **Email**: Resend

Huong dan deploy chi tiet: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
API Endpoints: [docs/API_ENDPOINTS.md](docs/API_ENDPOINTS.md)

---

## Trang thai du an

### Da hoan thanh (Month 1 + 2 + 3)

**Core Features:**
- Dang ky, dang nhap, phan quyen (JWT)
- Doi mat khau, quen mat khau (Resend email)
- Quan ly danh muc, thuong hieu, san pham (CRUD)
- Gio hang, checkout, don hang
- Thanh toan VNPay (sandbox)
- Danh gia san pham (Reviews & Ratings)
- Yeu thich (Wishlist)
- San pham da xem (Recently Viewed)

**AI Features:**
- AI Search (relevance score, fuzzy matching)
- AI Recommendation (cart, history, popular)
- AI Chatbot (category, brand, budget, needs)

**Admin Features:**
- Dashboard thong ke (stats, charts, recent orders)
- Quan ly san pham (CRUD, hinh anh Cloudinary)
- Quan ly don hang (cap nhat trang thai, xuat CSV)
- Quan ly nguoi dung (phan quyen, kich hoat)
- Quan ly danh gia (xem, xoa)
- Bulk update ton kho
- Nhat ky he thong (Audit Log)

**Technical:**
- Redis caching (product 5min, category/brand 30min, graceful degradation)
- Image optimization (Cloudinary transforms, lazy loading, WebP/AVIF)
- GZip compression
- N+1 query optimization (batch find_by_ids)
- Rate limiting (slowapi)
- Logging middleware
- Sentry error tracking
- Seed du lieu (45 san pham, 9 thuong hieu, 5 danh muc)
- 263/263 tests, 87% coverage
- CI/CD (GitHub Actions)
- Trien khai production (Render + Vercel)

---

## Giay phep

Du an phuc vu muc dich hoc tap va portfolio.
