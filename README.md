# TechSphere AI E-commerce

E-commerce thiết bị công nghệ tích hợp AI

## Tech Stack

- **Backend**: FastAPI, SQLModel, PostgreSQL, Alembic
- **Frontend**: React (giữ nguyên)

## Cấu trúc Project

```
techsphere-ai/
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── api/      # API endpoints
│   │   ├── core/     # Config, database
│   │   ├── models/   # SQLModel models
│   │   ├── repositories/  # Data access layer
│   │   ├── schemas/  # Pydantic schemas
│   │   ├── services/ # Business logic
│   │   ├── main.py   # FastAPI app entry
│   │   └── seed.py   # Seed data script
│   └── requirements.txt
├── frontend/         # React frontend
├── docs/             # Documentation
├── CLAUDE.md         # Working rules for Claude Code
├── ROADMAP.md        # Project roadmap
└── README.md
```

## Hướng dẫn Setup Backend

### 1. Clone project

```powershell
git clone <repository-url>
cd techsphere-ai
```

### 2. Setup Python environment

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Cấu hình environment

Tạo file `.env` trong thư mục `backend`:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/techsphere_db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### 4. Chạy server

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Server chạy tại: http://localhost:8000

### 5. Seed dữ liệu mẫu

```powershell
python -m app.seed
```

Script seed sẽ tạo:
- 1 tài khoản admin demo
- 5 danh mục (Categories)
- 5 thương hiệu (Brands)
- 12 sản phẩm (Products)

**Lưu ý:** Script idempotent - chạy nhiều lần không tạo trùng dữ liệu.

### 6. Tài khoản Admin Demo

| Field | Value |
|-------|-------|
| Email | admin@techsphere.com |
| Password | admin123 |
| Role | ADMIN |

**CẢNH BÁO:** Đây là tài khoản dev/demo, chỉ dùng cho mục đích thử nghiệm.

## API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **API Endpoints**: Xem `docs/API_ENDPOINTS.md`

## Các module đã hoàn thành

- Auth (register, login, JWT)
- Category (CRUD, phân quyền admin)
- Brand (CRUD, phân quyền admin)
- Product (CRUD, filter, search, soft delete)
- Cart (add, update, delete items)
- Order (create order, checkout, update status)
- Pagination cho tất cả list endpoints

## Lệnh chạy/test

```powershell
# Kích hoạt virtual environment
cd D:\E-com\techsphere-ai\backend
.\venv\Scripts\Activate.ps1

# Chạy server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Seed data
python -m app.seed

# Tạo migration
alembic revision --autogenerate -m "description"

# Chạy migration
alembic upgrade head
```
