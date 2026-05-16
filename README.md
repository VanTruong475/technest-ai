# TechSphere AI E-commerce

E-commerce thiết bị công nghệ tích hợp AI (tìm kiếm thông minh, gợi ý sản phẩm).

## Tech Stack

- **Backend**: FastAPI, SQLModel, PostgreSQL, Alembic
- **Frontend**: React (giữ nguyên)

## Cấu trúc Project

```
techsphere-ai/
├── backend/
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Config, database
│   │   ├── models/         # SQLModel models
│   │   ├── repositories/   # Data access layer
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   ├── main.py         # FastAPI app entry
│   │   └── seed.py         # Seed data script
│   └── requirements.txt
├── frontend/
├── docs/
├── CLAUDE.md
├── ROADMAP.md
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
- 5 danh mục (Laptop, Điện thoại, Tablet, Tai nghe, Phụ kiện)
- 5 thương hiệu (Apple, Samsung, Sony, Dell, Logitech)
- 12 sản phẩm (iPhone, MacBook, Galaxy, AirPods, ...)

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

| Module | Mô tả |
|--------|-------|
| **Auth** | Đăng ký, đăng nhập, JWT, lấy user hiện tại (GET /api/auth/me) |
| **Category** | CRUD danh mục, phân quyền admin |
| **Brand** | CRUD thương hiệu, phân quyền admin |
| **Product** | CRUD sản phẩm, filter, search, soft delete |
| **Cart** | Thêm/sửa/xóa sản phẩm trong giỏ, kiểm tra tồn kho |
| **Order** | Tạo đơn hàng từ cart, cập nhật trạng thái, phân quyền admin |
| **Pagination** | Tất cả list endpoints đều hỗ trợ pagination |
| **Seed data** | Script idempotent tạo dữ liệu mẫu |
| **AI Search** | Tìm kiếm sản phẩm thông minh (rule-based) |
| **AI Recommendation** | Gợi ý sản phẩm dựa trên cart, lịch sử, popularity |

## AI Features

### AI Search - Tìm kiếm thông minh

```
POST /api/ai/search
```

Tìm kiếm sản phẩm theo relevance score (name match, description match).

```json
{
  "query": "iphone pro",
  "limit": 5
}
```

### AI Recommendation - Gợi ý sản phẩm

```
GET /api/ai/recommend?strategy={cart|history|popular}&limit={1-20}
```

| Strategy | Auth | Mô tả |
|----------|------|-------|
| `cart` | JWT | Gợiý dựa trên sản phẩm trong giỏ hàng |
| `history` | JWT | Gợi ý dựa trên lịch sử mua hàng |
| `popular` | Public | Sản phẩm phổ biến nhất |

Fallback: Nếu cart/history rỗng hoặc không đủ dữ liệu, trả về popular hoặc sản phẩm mới nhất.

## Demo Flow

Sau khi seed data, test theo thứ tự:

### 1. Xem sản phẩm (public)

```
GET /api/products?limit=5
GET /api/products?category_id=1&limit=3
```

### 2. Đăng nhập

```
POST /api/auth/login
Body: { "email": "admin@techsphere.com", "password": "admin123" }
→ Lấy access_token
```

### 3. Thêm sản phẩm vào giỏ

```
POST /api/cart/items
Header: Authorization: Bearer <token>
Body: { "product_id": 1, "quantity": 2 }
```

### 4. Xem giỏ hàng

```
GET /api/cart
Header: Authorization: Bearer <token>
```

### 5. Tạo đơn hàng

```
POST /api/orders
Header: Authorization: Bearer <token>
Body: { "shipping_address": "123 ABC", "phone": "0901234567" }
```

### 6. AI Search

```
POST /api/ai/search
Body: { "query": "laptop dell", "limit": 5 }
```

### 7. AI Recommendation

```
GET /api/ai/recommend?strategy=popular&limit=5
GET /api/ai/recommend?strategy=cart&limit=5   (cần JWT)
GET /api/ai/recommend?strategy=history&limit=5 (cần JWT)
```

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
