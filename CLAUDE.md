# CLAUDE.md - Hướng dẫn làm việc cho Claude Code

## Project: TechSphere AI E-commerce

Nền tảng thương mại điện tử chuyên về thiết bị công nghệ, tích hợp tính năng AI (gợi ý sản phẩm, tìm kiếm thông minh, chatbot tư vấn).

---

## Tech Stack

### Backend (Ưu tiên)
- **Framework**: FastAPI 0.136.x
- **ORM**: SQLModel 0.0.38 (kết hợp SQLAlchemy + Pydantic)
- **Database**: PostgreSQL (psycopg2-binary)
- **Migration**: Alembic 1.18.x
- **Validation**: Pydantic 2.13.x
- **Server**: Uvicorn 0.47.x
- **Auth**: JWT (python-jose), bcrypt (passlib)

### Frontend
- Giữ nguyên công nghệ hiện tại. **Không tự ý xóa hoặc đổi công nghệ khi chưa được yêu cầu.**

---

## Kiến trúc Backend

```
backend/app/
├── api/            # API endpoints (router)
│   ├── health.py
│   └── auth.py, user.py, product.py, ...
├── core/           # Config, database
│   ├── config.py   # Settings (env vars)
│   └── database.py # Engine, session
├── models/         # SQLModel models
├── repositories/   # Data access layer
├── schemas/        # Pydantic schemas (request/response)
├── services/       # Business logic
└── main.py         # FastAPI app entry
```

### Pattern: Models → Repositories → Services → API

```
Request → API (router.py) → Service (service.py) → Repository (repository.py) → Database
                                   ↓
                              Schema validation (schemas.py)
```

**Mỗi module mới phải tuân theo cấu trúc:**
```
module/
├── __init__.py
├── router.py      # API endpoints
├── schemas.py     # Pydantic schemas
├── service.py     # Business logic
└── repository.py  # Database queries
```

---

## Thứ tự phát triển module

```
Auth → User → Category → Brand → Product → Cart → Order → AI Features
```

**Ưu tiên backend trước.** Không nhảy module khi module hiện tại chưa hoàn thành.

---

## Quy tắc bắt buộc

### Trước khi sửa code
1. Đọc `ROADMAP.md` để hiểu trạng thái hiện tại
2. **Nêu kế hoạch ngắn gọn** trước khi sửa bất kỳ file nào
3. **Chỉ sửa file khi được yêu cầu rõ ràng**

### Sau khi sửa code
1. **Báo danh sách file đã thay đổi**
2. **Cập nhật `ROADMAP.md`** sau task quan trọng (đánh dấu hoàn thành, cập nhật "Đang làm", "Việc cần làm tiếp theo")

### Quy tắc khác
- **Không tự ý xóa frontend** hoặc đổi công nghệ frontend
- **Không tự ý đổi kiến trúc lớn** nếu chưa hỏi
- Code **rõ ràng, dễ mở rộng, dễ test**
- Dùng **type hints** cho tất cả hàm và biến
- Naming: Models PascalCase, Tables snake_case, Endpoints kebab-case

---

## Lệnh chạy project (Windows PowerShell)

### Backend
```powershell
cd D:\E-com\techsphere-ai\backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### API Docs
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Database (Alembic)
```powershell
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1
```

---

## Trạng thái hiện tại (01/06/2026)

### Đã hoàn thành
- **370/370 backend tests pass**, 87% coverage
- Khởi tạo project structure, setup FastAPI + SQLModel + PostgreSQL
- Models: User, Category, Brand, Product, Cart, CartItem, Order, OrderItem, Review, WishlistItem, AuditLog
- Auth module (register, login, JWT, change password, forgot password)
- User module (list, get, update, phân quyền admin/user)
- Category module (CRUD, phân quyền admin, **FK-safe deletion**)
- Brand module (CRUD, phân quyền admin, **FK-safe deletion**)
- Product module (CRUD, filter, search, soft delete, bulk stock update)
- Cart module (add, update, delete items, stock validation atomic)
- Order module (create order, checkout, update status, atomic transaction)
- Review module (CRUD, rating stats, eligibility check)
- Wishlist module (add, remove, list)
- Payment module (VNPay sandbox, replay protection, amount verify)
- Admin module (dashboard stats, charts, CSV export, audit log)
- AI Search (SQL ILIKE pre-filter + Python scoring + synonym dictionary)
- AI Recommendation (cart, history, popular, co-occurrence)
- AI Chatbot (multi-provider LLM: Gemini + Groq + rule-based fallback)
- Redis caching (product, category, brand, LLM response, homepage batch)
- Rate limiting (slowapi)
- Logging middleware
- Sentry error tracking
- Cloudinary image upload
- Email service (Resend)
- Seed data script (idempotent, 75 products)
- Alembic migrations (10 versions)
- CI/CD (GitHub Actions)
- **Homepage batch endpoint** (4 API calls → 1)
- **Lifespan context manager** (FastAPI best practice)
- **Security review** (15 fixes: XSS, FK-safe, token verify, debounce, etc.)

### Đang làm
- Không có task đang làm

### Việc tiếp theo
Xem chi tiết trong `ROADMAP.md`
