# TechSphere AI

> Nền tảng thương mại điện tử thiết bị công nghệ tích hợp AI tư vấn sản phẩm.

![CI](https://github.com/VanTruong475/techsphere-ai/actions/workflows/ci.yml/badge.svg)
![Python](https://img.shields.io/badge/Python-3.11+-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)

---

## Live Demo

| Dịch vụ | URL |
|---------|-----|
| Frontend | https://techsphere-ai.vercel.app |
| Backend API | https://techsphere-ai.onrender.com |
| API Docs (Swagger) | https://techsphere-ai.onrender.com/docs |

> Thông tin tài khoản demo sẽ được cung cấp khi cần.

---

## Tính năng chính

### Người dùng
- Đăng ký / Đăng nhập (JWT authentication)
- Duyệt sản phẩm theo danh mục, thương hiệu
- Tìm kiếm sản phẩm thông minh (AI Search)
- Giỏ hàng + Checkout
- Lịch sử đơn hàng
- Hồ sơ cá nhân

### Tính năng AI
- **AI Search** — Tìm kiếm sản phẩm theo relevance score
- **AI Recommendation** — Gợi ý dựa trên giỏ hàng, lịch sử, mức độ phổ biến
- **AI Chatbot** — Tư vấn sản phẩm theo nhu cầu, ngân sách, thương hiệu

### Quản trị (Admin)
- Quản lý sản phẩm (CRUD)
- Quản lý đơn hàng (cập nhật trạng thái)
- Quản lý người dùng (phân quyền)

---

## Công nghệ sử dụng

| Lớp | Công nghệ |
|-----|-----------|
| **Backend** | FastAPI, SQLModel, PostgreSQL, Alembic |
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| **Quản lý state** | Zustand, React Query |
| **Xác thực** | JWT (python-jose), bcrypt |
| **Kiểm thử** | Pytest, httpx, GitHub Actions |
| **Triển khai** | Render (Backend + DB), Vercel (Frontend) |

---

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Vercel)                      │
│            React + Vite + TypeScript + Tailwind          │
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
│  │         │ │  Brand   │ │         │ │   Chatbot    │  │
│  └─────────┘ └──────────┘ └─────────┘ └──────────────┘  │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                PostgreSQL (Render)                        │
└─────────────────────────────────────────────────────────┘
```

---

## Ảnh chụp màn hình

Ảnh chụp màn hình sẽ được bổ sung sau. Các màn hình dự kiến:

- Trang chủ
- Danh sách sản phẩm
- Chi tiết sản phẩm
- Giỏ hàng / Thanh toán
- Quản trị (sản phẩm, đơn hàng, người dùng)
- AI Chatbot

---

## Cài đặt local

### Yêu cầu
- Python 3.11+
- Node.js 20+
- PostgreSQL

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # macOS/Linux
# .\venv\Scripts\Activate.ps1  # Windows
pip install -r requirements.txt
```

Tạo file `.env` từ mẫu:

```bash
cp .env.example .env
# Chỉnh sửa DATABASE_URL và các biến môi trường khác
```

Chạy migration và seed dữ liệu:

```bash
alembic upgrade head
python -m app.seed
```

Khởi động server:

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

Truy cập: http://localhost:5173

---

## Kiểm thử

### Backend

```bash
cd backend
pytest tests/ -v
```

60/60 tests bao gồm: Auth, Product, Cart, Order, AI features.

### Frontend

```bash
cd frontend
npm run build
```

### CI/CD

GitHub Actions tự động chạy khi push hoặc PR vào nhánh `main`:
- Backend: cài đặt dependencies + chạy pytest
- Frontend: cài đặt dependencies + build production

---

## Triển khai

Dự án sử dụng kiến trúc:
- **Frontend**: Vercel (auto-deploy từ GitHub)
- **Backend**: Render Web Service (auto-deploy từ GitHub)
- **Database**: Render PostgreSQL

Hướng dẫn deploy chi tiết: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## Trạng thái dự án

### Đã hoàn thành
- Đăng ký, đăng nhập, phân quyền (JWT)
- Quản lý danh mục, thương hiệu, sản phẩm (CRUD)
- Giỏ hàng, checkout, đơn hàng
- Bảng điều khiển Admin
- AI Search, Recommendation, Chatbot
- Rate limiting, logging middleware
- Seed dữ liệu (45 sản phẩm, 9 thương hiệu, 5 danh mục)
- Triển khai production (Render + Vercel)
- CI/CD (GitHub Actions)

### Hướng phát triển tiếp theo
- Theo dõi lỗi (Sentry)
- Đánh giá sản phẩm (Reviews & Ratings)
- Tích hợp thanh toán demo (VNPay/Momo)
- Upload hình ảnh sản phẩm (Cloudinary)
- Thông báo email

---

## Giấy phép

Dự án phục vụ mục đích học tập và portfolio.
