# Software Requirements Specification (SRS)

## TechSphere AI — E-commerce Platform

**Phiên bản:** 1.0  
**Ngày:** 02/06/2026  
**Tác giả:** Truong  
**Trạng thái:** Draft

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Mô tả hệ thống](#2-mô-tả-hệ-thống)
3. [Y cầu chức năng](#3-yêu-cầu-chức-năng)
4. [Y cầu phi chức năng](#4-yêu-cầu-phi-chức-năng)
5. [Giao diện người dùng](#5-giao-diện-người-dùng)
6. [API Endpoints](#6-api-endpoints)
7. [Mô hình dữ liệu](#7-mô-hình-dữ-liệu)
8. [Kiến trúc hệ thống](#8-kiến-trúc-hệ-thống)
9. [Bảo mật](#9-bảo-mật)
10. [Hiệu năng](#10-hiệu-năng)
11. [Kiểm thử](#11-kiểm-thử)
12. [Triển khai](#12-triển-khai)
13. [Phụ lục](#13-phụ-lục)

---

## 1. Tổng quan

### 1.1 Mục đích tài liệu

Tài liệu này mô tả chi tiết các yêu cầu phần mềm (Software Requirements Specification) cho hệ thống **TechSphere AI** — nền tảng thương mại điện tử thiết bị công nghệ tích hợp trí tuệ nhân tạo.

### 1.2 Phạm vi dự án

TechSphere AI là nền tảng e-commerce cho phép người dùng:
- Duyệt, tìm kiếm, lọc sản phẩm công nghệ (laptop, điện thoại, tablet, tai nghe, phụ kiện)
- Sử dụng AI để tư vấn mua sắm, tìm kiếm thông minh, gợi ý sản phẩm
- Quản lý giỏ hàng, đặt hàng, thanh toán online (VNPay)
- Đánh giá sản phẩm, quản lý wishlist
- Quản trị hệ thống (admin dashboard, quản lý sản phẩm, đơn hàng, người dùng)

### 1.3 Định nghĩa và thuật ngữ

| Thuật ngữ | Định nghĩa |
|-----------|------------|
| SPA | Single Page Application |
| JWT | JSON Web Token |
| ORM | Object-Relational Mapping |
| LLM | Large Language Model |
| RBAC | Role-Based Access Control |
| CRUD | Create, Read, Update, Delete |
| SSR | Server-Side Rendering |
| CDN | Content Delivery Network |

### 1.4 Tham chiếu

| Tài liệu | Mô tả |
|----------|-------|
| ROADMAP.md | Kế hoạch phát triển dự án |
| API_ENDPOINTS.md | Danh sách API endpoints chi tiết |
| DEPLOYMENT.md | Hướng dẫn triển khai |
| CLAUDE.md | Quy tắc phát triển |

---

## 2. Mô tả hệ thống

### 2.1 Tổng quan hệ thống

Hệ thống gồm 2 phần chính:
- **Backend**: RESTful API xây dựng bằng FastAPI (Python)
- **Frontend**: Single Page Application xây dựng bằng React + TypeScript + Vite

### 2.2 Người dùng hệ thống

| Vai trò | Mô tả | Quyền hạn |
|---------|-------|----------|
| **Guest** | Khách truy cập | Xem sản phẩm, tìm kiếm, đăng ký/đăng nhập |
| **User** | Người dùng đã đăng nhập | Mua hàng, đánh giá, quản lý đơn hàng, wishlist |
| **Admin** | Quản trị viên | Quản lý sản phẩm, đơn hàng, người dùng, xem dashboard, audit log |

### 2.3 Tính năng AI

| Tính năng | Mô tả | Công nghệ |
|-----------|-------|-----------|
| AI Search | Tìm kiếm sản phẩm bằng ngôn ngữ tự nhiên | SQL ILIKE + Python scoring + synonym dictionary |
| AI Recommendation | Gợi ý sản phẩm theo cart, history, co-occurrence | Co-occurrence algorithm + category fallback |
| AI Chatbot | Tư vấn mua sắm qua chat | Multi-provider LLM (Gemini + Groq) + rule-based fallback |

### 2.4 Môi trường hoạt động

| Thành phần | Yêu cầu |
|------------|---------|
| Backend | Python 3.12+, FastAPI 0.136.x, PostgreSQL 14+ |
| Frontend | Node.js 18+, React 19, TypeScript 5.x, Vite 6.x |
| Cache | Redis 7.x (optional) |
| Browser | Chrome 90+, Firefox 90+, Safari 14+, Edge 90+ |
| Mobile | Responsive, hỗ trợ viewport 375px - 2560px |

---

## 3. Yêu cầu chức năng

### 3.1 Module Xác thực (Auth)

| ID | Chức năng | Mô tả | Ưu tiên |
|----|-----------|-------|---------|
| F-AUTH-01 | Đăng ký | Người dùng tạo tài khoản mới (email, password, họ tên). Email format validation. | Cao |
| F-AUTH-02 | Đăng nhập | Xác thực email + password, trả JWT token (60 phút). | Cao |
| F-AUTH-03 | Lấy thông tin user | GET /me — trả thông tin user hiện tại từ JWT. | Cao |
| F-AUTH-04 | Đổi password | Verify old password → set new password. Rate limit 10/min. | Cao |
| F-AUTH-05 | Quên password | Gửi email reset token (SHA-256, 15 phút hết hạn). Không lộ email enumeration. | Cao |
| F-AUTH-06 | Reset password | Reset bằng token từ email. Rate limit 10/min. | Cao |

### 3.2 Module Sản phẩm (Product)

| ID | Chức năng | Mô tả | Ưu tiên |
|----|-----------|-------|---------|
| F-PROD-01 | Danh sách sản phẩm | Phân trang, filter (category, brand, price, rating), sort (newest, price, rating), search. | Cao |
| F-PROD-02 | Chi tiết sản phẩm | Hiển thị đầy đủ thông tin, ảnh gallery, màu sắc, rating, mô tả. | Cao |
| F-PROD-03 | Tạo sản phẩm (Admin) | CRUD sản phẩm với validation đầy đủ. | Cao |
| F-PROD-04 | Cập nhật sản phẩm (Admin) | Cập nhật từng trường, slug unique check. | Cao |
| F-PROD-05 | Xóa mềm sản phẩm (Admin) | Chuyển status sang INACTIVE, không xóa cứng. | Cao |
| F-PROD-06 | Cập nhật stock hàng loạt | Bulk update stock cho nhiều sản phẩm cùng lúc. | Trung bình |
| F-PROD-07 | Upload ảnh sản phẩm | Upload lên Cloudinary, trả URL. Validate type + size. | Cao |
| F-PROD-08 | Ảnh gallery + màu sắc | Mỗi sản phẩm có nhiều ảnh (extra_images) + nhiều màu (colors) với ảnh riêng. | Cao |

### 3.3 Module Giỏ hàng (Cart)

| ID | Chức năng | Mô tả | Ưu tiên |
|----|-----------|-------|---------|
| F-CART-01 | Xem giỏ hàng | Hiển thị danh sách sản phẩm, tổng tiền, số lượng. | Cao |
| F-CART-02 | Thêm vào giỏ | Thêm sản phẩm với số lượng. Validate stock atomic. | Cao |
| F-CART-03 | Cập nhật số lượng | Thay đổi số lượng sản phẩm trong giỏ. | Cao |
| F-CART-04 | Xóa khỏi giỏ | Xóa sản phẩm khỏi giỏ hàng. | Cao |

### 3.4 Module Đơn hàng (Order)

| ID | Chức năng | Mô tả | Ưu tiên |
|----|-----------|-------|---------|
| F-ORD-01 | Tạo đơn hàng | Từ giỏ hàng, atomic transaction. Cleanup stale cart items. | Cao |
| F-ORD-02 | Danh sách đơn hàng | Phân trang, filter theo status. | Cao |
| F-ORD-03 | Chi tiết đơn hàng | Hiển thị sản phẩm, tổng tiền, trạng thái. | Cao |
| F-ORD-04 | Cập nhật trạng thái (Admin) | PENDING → CONFIRMED → SHIPPING → COMPLETED / CANCELLED. | Cao |
| F-ORD-05 | Export CSV (Admin) | Export đơn hàng ra CSV với filter ngày, status. UTF-8 BOM cho Excel. | Trung bình |

### 3.5 Module Thanh toán (Payment)

| ID | Chức năng | Mô tả | Ưu tiên |
|----|-----------|-------|---------|
| F-PAY-01 | Tạo thanh toán VNPay | Tạo payment URL, redirect đến VNPay sandbox. | Cao |
| F-PAY-02 | Xử lý return VNPay | Verify HMAC-SHA512, amount, replay protection. Cập nhật order status. | Cao |
| F-PAY-03 | COD | Thanh toán khi nhận hàng (không cần integration). | Cao |

### 3.6 Module Đánh giá (Review)

| ID | Chức năng | Mô tả | Ưu tiên |
|----|-----------|-------|---------|
| F-REV-01 | Xem đánh giá | Danh sách đánh giá theo sản phẩm, rating trung bình, phân bố sao. | Cao |
| F-REV-02 | Tạo đánh giá | User đã mua sản phẩm mới được đánh giá. Rating 1-5 + comment. | Cao |
| F-REV-03 | Sửa/xóa đánh giá | User chỉ sửa/xóa đánh giá của mình. | Cao |
| F-REV-04 | Admin xóa đánh giá | Admin có thể xóa bất kỳ đánh giá nào. | Trung bình |

### 3.7 Module Wishlist

| ID | Chức năng | Mô tả | Ưu tiên |
|----|-----------|-------|---------|
| F-WISH-01 |Thêm vào yêu thích | Toggle yêu thích cho sản phẩm. | Cao |
| F-WISH-02 | Xem danh sách | Danh sách sản phẩm yêu thích. | Cao |
| F-WISH-03 | Xóa khỏi yêu thích | Xóa sản phẩm khỏi danh sách. | Cao |

### 3.8 Module AI

| ID | Chức năng | Mô tả | Ưu tiên |
|----|-----------|-------|---------|
| F-AI-01 | Tìm kiếm thông minh | Tìm kiếm bằng ngôn ngữ tự nhiên. Synonym expansion, relevance scoring. | Cao |
| F-AI-02 | Gợi ý sản phẩm | Theo cart, history, popular, co-occurrence. Fallback chain. | Cao |
| F-AI-03 | Chatbot tư vấn | Multi-provider LLM (Gemini + Groq). Rule-based fallback khi LLM unavailable. | Cao |
| F-AI-04 | LLM response cache | Cache kết quả LLM trong Redis (TTL 1 giờ). | Trung bình |

### 3.9 Module Admin

| ID | Chức năng | Mô tả | Ưu tiên |
|----|-----------|-------|---------|
| F-ADM-01 | Dashboard | Stats tổng quan: revenue, orders, users, products. Charts 7 ngày. Top sản phẩm. | Cao |
| F-ADM-02 | Quản lý sản phẩm | CRUD, bulk stock update, search, filter. | Cao |
| F-ADM-03 | Quản lý đơn hàng | Xem, cập nhật trạng thái, export CSV. | Cao |
| F-ADM-04 | Quản lý người dùng | Xem danh sách, phân quyền, disable user. | Cao |
| F-ADM-05 | Quản lý đánh giá | Xem, xóa đánh giá. | Trung bình |
| F-ADM-06 | Audit log | Ghi lại mọi hành động quan trọng. Filter theo action, target, user. | Cao |

### 3.10 Module Homepage

| ID | Chức năng | Mô tả | Ưu tiên |
|----|-----------|-------|---------|
| F-HOME-01 | Batch endpoint | GET /api/homepage trả brands + categories + products trong 1 request. Cached 60s. | Cao |
| F-HOME-02 | Flash sale | Hiển thị sản phẩm có sale_price. Countdown timer đến cuối ngày. | Cao |
| F-HOME-03 | Danh mục | Grid danh mục với hình ảnh thật. | Cao |
| F-HOME-04 | Sản phẩm nổi bật | Grid sản phẩm mới nhất. | Cao |

---

## 4. Yêu cầu phi chức năng

### 4.1 Hiệu năng

| ID | Yêu cầu | Giá trị mục tiêu |
|----|---------|-----------------|
| NF-PERF-01 | Thời gian phản hồi API (p95) | < 200ms |
| NF-PERF-02 | Frontend initial bundle | < 500KB (gzip < 150KB) |
| NF-PERF-03 | Code-splitting | Route-level lazy loading |
| NF-PERF-04 | Redis cache | Product list 5min, categories/brands 30min |
| NF-PERF-05 | GZip compression | Response > 500 bytes |
| NF-PERF-06 | N+1 query optimization | Batch queries cho cart, wishlist, orders |
| NF-PERF-07 | Database indexes | 18 indexes trên 6 tables (orders, products, cart, reviews, audit_logs) |

### 4.2 Bảo mật

| ID | Yêu cầu | Mô tả |
|----|---------|-------|
| NF-SEC-01 | Xác thực JWT | HS256, 60 phút hết hạn, secret key ≥ 32 ký tự |
| NF-SEC-02 | Phân quyền RBAC | User / Admin role-based access control |
| NF-SEC-03 | Password hashing | bcrypt với salt |
| NF-SEC-04 | CORS | Chỉ cho phép origins được cấu hình |
| NF-SEC-05 | Rate limiting | slowapi, giới hạn request per minute |
| NF-SEC-06 | Input validation | Pydantic validation cho mọi input |
| NF-SEC-07 | SQL injection prevention | ORM (SQLAlchemy) parameterized queries |
| NF-SEC-08 | XSS prevention | Frontend sanitize image URLs (isSafeUrl) |
| NF-SEC-09 | CSRF protection | SameSite cookies, CORS credentials |
| NF-SEC-10 | VNPay security | HMAC-SHA512 verification, replay protection, amount verify |
| NF-SEC-11 | Production config guard | Validate SECRET_KEY, ADMIN_PASSWORD, CORS_ORIGINS trong production |

### 4.3 Khả năng mở rộng

| ID | Yêu cầu | Mô tả |
|----|---------|-------|
| NF-SCALE-01 | Architecture pattern | Models → Repositories → Services → API |
| NF-SCALE-02 | Database migration | Alembic versioned migrations |
| NF-SCALE-03 | Cache layer | Redis với graceful degradation (chạy bình thường khi không có Redis) |
| NF-SCALE-04 | AI fallback chain | Gemini → Groq → Rule-based khi providers unavailable |

### 4.4 Khả bảo trì

| ID | Yêu cầu | Mô tả |
|----|---------|-------|
| NF-MAINT-01 | Code coverage | ≥ 80% backend tests |
| NF-MAINT-02 | Type hints | 100% Python type hints, TypeScript strict mode |
| NF-MAINT-03 | Linting | ESLint (frontend), no unused variables |
| NF-MAINT-04 | Documentation | README, DEPLOYMENT, API_ENDPOINTS, SRS |

### 4.5 Tương thích

| ID | Yêu cầu | Mô tả |
|----|---------|-------|
| NF-COMP-01 | Responsive | Mobile-first, 375px - 2560px |
| NF-COMP-02 | Dark mode | Theme toggle (light/dark/system) |
| NF-COMP-03 | Accessibility | ARIA labels, keyboard navigation, semantic HTML |
| NF-COMP-04 | Browser | Chrome, Firefox, Safari, Edge (2 latest versions) |

---

## 5. Giao diện người dùng

### 5.1 Sitemap

```
/ (HomePage)
├── /products (ProductListPage)
│   └── /products/:id (ProductDetailPage)
├── /login (LoginPage)
├── /register (RegisterPage)
├── /forgot-password (ForgotPasswordPage)
├── /reset-password (ResetPasswordPage)
├── /chat (ChatPage)
├── /cart (CartPage) [Auth required]
├── /checkout (CheckoutPage) [Auth required]
├── /orders (OrderListPage) [Auth required]
│   └── /orders/:id (OrderDetailPage)
├── /profile (ProfilePage) [Auth required]
├── /wishlist (WishlistPage) [Auth required]
├── /payment/result (PaymentResultPage) [Auth required]
├── /admin/dashboard (AdminDashboardPage) [Admin only]
├── /admin/products (AdminProductPage) [Admin only]
├── /admin/orders (AdminOrderPage) [Admin only]
├── /admin/users (AdminUserPage) [Admin only]
├── /admin/reviews (AdminReviewsPage) [Admin only]
├── /admin/audit-logs (AdminAuditPage) [Admin only]
└── * (NotFoundPage)
```

### 5.2 Mô tả từng trang

#### 5.2.1 HomePage (`/`)

| Section | Mô tả |
|---------|-------|
| Hero | Full-width background image, gradient overlay. AI badge. Headline "Công nghệ tối tân. Trải nghiệm thông minh." Search bar + 2 CTAs. |
| Flash Sale | Red container `rounded-[2rem]`. Countdown timer đến cuối ngày. 4 product cards với progress bar "Đã bán X/Y". |
| AI Shop Assistant | Gradient section. Input "Gõ nhu cầu...". Suggested questions. |
| Danh mục hàng đầu | 6 cards `aspect-[3/4]` với hình Unsplash thật. Grid 3/5/6 columns responsive. |
| Sản phẩm gợi ý | 4-column grid. Mỗi card: ảnh, tên, giá, nút "Mua ngay" + cart icon. |
| Sản phẩm nổi bật | 4-column grid. Sale badges, stock status. |
| Trust Strip | 4 commitment cards (Bảo hành, Giao hàng, Đổi trả, Thanh toán). |
| AI FAB | Fixed bottom-right "Trợ lý AI" button → /chat. |

#### 5.2.2 ProductDetailPage (`/products/:id`)

| Element | Mô tả |
|---------|-------|
| Breadcrumb | Trang chủ > Sản phẩm > Tên SP. Uppercase tracking-widest. |
| Image Gallery | Main image `aspect-[4/3]` + 4 thumbnails. Click thumbnail → đổi hình. |
| Color Selector | Chips màu với dot hex. Click → đổi ảnh chính. |
| Product Info (sticky) | Tên, mô tả ngắn, rating, giá (28px bold primary), stock. |
| Actions | "Mua Ngay" w-full primary, "Thêm vào giỏ" w-full outline. Quantity selector. |
| AI Box | Glass-panel. Suggested questions theo category. Input → /chat. |
| Tabs | "Thông số kỹ thuật" / "Đánh giá khách hàng" / "Tính năng chi tiết". |
| Reviews | Rating summary + review list + create form (nếu đã mua). |
| Recommendations | "Có thể bạn cũng thích" (co-occurrence). "Sản phẩm đã xem gần đây". |

#### 5.2.3 ProductListPage (`/products`)

| Element | Mô tả |
|---------|-------|
| Breadcrumb | Trang chủ > Sản phẩm |
| Search | SearchAutocomplete với debounce 300ms |
| Filters (desktop) | Sidebar trái: Categories, Brands, Rating filter |
| Filters (mobile) | Sticky bottom bar: "Lọc" + "Sắp xếp" tách biệt |
| Price Presets | Buttons: Tất cả, Dưới 5M, 5-10M, 10-20M, Trên 20M |
| Sort | Mới nhất, Giá thấp→cao, Giá cao→thấp, Đánh giá cao |
| Product Grid | 1/2/3 columns responsive. Card: ảnh, brand, tên, giá, rating, stock, wishlist |
| Pagination | Previous, page numbers, Next |

#### 5.2.4 Admin Dashboard (`/admin/dashboard`)

| Element | Mô tả |
|---------|-------|
| Stats Cards | 8 cards: Revenue, Orders, Users, Products, Pending, Low stock, Out of stock, Rating |
| Revenue Chart | Bar chart 7 ngày gần nhất (Recharts) |
| Order Chart | Pie chart theo status |
| Top Products | Table 5 sản phẩm bán chạy |
| Recent Orders | Table 5 đơn hàng gần đây |

---

## 6. API Endpoints

### 6.1 Tổng quan

- **Base URL**: `http://localhost:8000` (dev) / `https://api.techsphere.vn` (prod)
- **Authentication**: Bearer JWT token trong header `Authorization`
- **Content-Type**: `application/json`
- **Pagination**: `?page=1&limit=10`
- **Tổng**: 65 endpoints

### 6.2 Auth (6 endpoints)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/api/auth/register` | Đăng ký tài khoản | No |
| POST | `/api/auth/login` | Đăng nhập, trả JWT | No |
| GET | `/api/auth/me` | Lấy thông tin user hiện tại | Yes |
| PUT | `/api/auth/change-password` | Đổi password | Yes |
| POST | `/api/auth/forgot-password` | Gửi email reset | No |
| POST | `/api/auth/reset-password` | Reset bằng token | No |

### 6.3 Product (6 endpoints)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/products` | Danh sách (filter, sort, search, pagination) | No |
| GET | `/api/products/{id}` | Chi tiết sản phẩm | No |
| POST | `/api/products` | Tạo sản phẩm | Admin |
| PUT | `/api/products/{id}` | Cập nhật sản phẩm | Admin |
| DELETE | `/api/products/{id}` | Xóa mềm | Admin |
| PUT | `/api/products/bulk-update` | Cập nhật stock hàng loạt | Admin |

### 6.4 Cart (4 endpoints)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/cart` | Xem giỏ hàng | Yes |
| POST | `/api/cart/items` | Thêm sản phẩm | Yes |
| PUT | `/api/cart/items/{id}` | Cập nhật số lượng | Yes |
| DELETE | `/api/cart/items/{id}` | Xóa sản phẩm | Yes |

### 6.5 Order (4 endpoints)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/api/orders` | Tạo đơn hàng | Yes |
| GET | `/api/orders` | Danh sách đơn hàng | Yes |
| GET | `/api/orders/{id}` | Chi tiết đơn hàng | Yes |
| PUT | `/api/orders/{id}/status` | Cập nhật trạng thái | Admin |

### 6.6 AI (4 endpoints)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/api/ai/search` | Tìm kiếm thông minh | No |
| GET | `/api/ai/recommend` | Gợi ý sản phẩm | No |
| POST | `/api/ai/chat` | Chatbot tư vấn | No |
| GET | `/api/ai/stats` | AI usage stats | Admin |

### 6.7 Review (6 endpoints)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/reviews/product/{id}` | Đánh giá theo sản phẩm | No |
| GET | `/api/reviews/can-review/{id}` | Kiểm tra quyền đánh giá | Yes |
| POST | `/api/reviews/can-review-bulk` | Kiểm tra hàng loạt | Yes |
| POST | `/api/reviews` | Tạo đánh giá | Yes |
| PUT | `/api/reviews/{id}` | Sửa đánh giá | Yes |
| DELETE | `/api/reviews/{id}` | Xóa đánh giá | Yes |

### 6.8 Admin (5 endpoints)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/admin/stats` | Dashboard statistics | Admin |
| GET | `/api/admin/reviews` | Tất cả đánh giá | Admin |
| DELETE | `/api/admin/reviews/{id}` | Xóa đánh giá | Admin |
| GET | `/api/admin/orders/export` | Export CSV | Admin |
| GET | `/api/admin/audit-logs` | Nhật ký hệ thống | Admin |

### 6.9 Other (25 endpoints)

| Module | Count | Endpoints |
|--------|-------|-----------|
| User | 3 | GET /, GET /{id}, PUT /{id} |
| Category | 5 | CRUD + list |
| Brand | 5 | CRUD + list |
| Wishlist | 4 | List, add, remove, check |
| Payment | 2 | Create VNPay, VNPay return |
| Upload | 1 | POST /image |
| Homepage | 1 | GET /api/homepage |
| Health | 2 | GET /health, GET /health/detailed |
| Root | 1 | GET / |
| Order export | 1 | GET /api/admin/orders/export |

---

## 7. Mô hình dữ liệu

### 7.1 Entity Relationship Diagram

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  Users   │────<│   Orders     │────<│OrderItems│
│          │     │              │     │          │
│ id       │     │ id           │     │ id       │
│ email    │     │ user_id (FK) │     │ order_id │
│ password │     │ total_amount │     │ product_id│
│ full_name│     │ status       │     │ quantity │
│ role     │     │ payment_method│    │ price    │
│ is_active│     │ payment_status│    │ sale_price│
└──────────┘     │ payment_txn_ref│   └──────────┘
     │           └──────────────┘          │
     │                                     │
     │           ┌──────────────┐          │
     │           │  Products    │──────────┘
     │           │              │
     │           │ id           │
     ├──────────<│ category_id  │
     │           │ brand_id     │
     │           │ name         │
     │           │ slug         │
     │           │ description  │
     │           │ image_url    │
     │           │ extra_images │ (JSON)
     │           │ colors       │ (JSON)
     │           │ price        │
     │           │ sale_price   │
     │           │ stock        │
     │           │ status       │
     │           └──────────────┘
     │                │    │
     │                │    │
┌────┴─────┐    ┌─────┴┐  ┌┴──────────┐
│Wishlist  │    │Reviews│  │ CartItems │
│Items     │    │       │  │           │
│id        │    │id     │  │id         │
│user_id   │    │user_id│  │cart_id    │
│product_id│    │product│  │product_id │
└──────────┘    │rating │  │quantity   │
                │comment│  └───────────┘
                └───────┘

┌──────────┐  ┌──────────┐  ┌──────────┐
│Categories│  │  Brands  │  │AuditLogs │
│          │  │          │  │          │
│id        │  │id        │  │id        │
│name      │  │name      │  │user_id   │
│slug      │  │slug      │  │action    │
│description│ │logo_url  │  │target_type│
│is_active │  │is_active │  │target_id │
└──────────┘  └──────────┘  │details   │
                            │created_at│
                            └──────────┘
```

### 7.2 Chi tiết Models

#### User
| Field | Type | Constraints |
|-------|------|-------------|
| id | Integer | PK, auto-increment |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| full_name | VARCHAR(255) | NOT NULL |
| role | VARCHAR(20) | DEFAULT 'user', INDEX |
| is_active | Boolean | DEFAULT True |
| reset_token | VARCHAR(255) | NULLABLE |
| reset_token_expires | DateTime | NULLABLE |
| created_at | DateTime | DEFAULT now() |
| updated_at | DateTime | DEFAULT now() |

#### Product
| Field | Type | Constraints |
|-------|------|-------------|
| id | Integer | PK, auto-increment |
| category_id | Integer | FK → categories.id, INDEX |
| brand_id | Integer | FK → brands.id, INDEX |
| name | VARCHAR(255) | NOT NULL |
| slug | VARCHAR(255) | UNIQUE, INDEX |
| description | TEXT | NULLABLE |
| image_url | TEXT | NULLABLE |
| extra_images | TEXT | NULLABLE (JSON array) |
| colors | TEXT | NULLABLE (JSON array) |
| price | NUMERIC(10,2) | NOT NULL, CHECK > 0 |
| sale_price | NUMERIC(10,2) | NULLABLE, CHECK < price |
| stock | Integer | DEFAULT 0, CHECK >= 0 |
| status | VARCHAR(20) | DEFAULT 'ACTIVE', INDEX |
| created_at | DateTime | DEFAULT now() |
| updated_at | DateTime | DEFAULT now() |

#### Order
| Field | Type | Constraints |
|-------|------|-------------|
| id | Integer | PK, auto-increment |
| user_id | Integer | FK → users.id, INDEX |
| total_amount | NUMERIC(12,2) | NOT NULL |
| status | VARCHAR(20) | DEFAULT 'PENDING', INDEX |
| shipping_name | VARCHAR(255) | NOT NULL |
| shipping_phone | VARCHAR(20) | NOT NULL |
| shipping_address | TEXT | NOT NULL |
| note | TEXT | NULLABLE |
| payment_method | VARCHAR(20) | NOT NULL |
| payment_status | VARCHAR(20) | DEFAULT 'UNPAID' |
| payment_txn_ref | VARCHAR(100) | UNIQUE, NULLABLE |
| created_at | DateTime | DEFAULT now(), INDEX |
| updated_at | DateTime | DEFAULT now() |

---

## 8. Kiến trúc hệ thống

### 8.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  React + TypeScript + Vite + Tailwind CSS                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ HomePage │ │ Products │ │  Cart    │ │  Admin   │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
│       └─────────────┴────────────┴─────────────┘            │
│                        │ HTTP/REST                          │
└────────────────────────┼────────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────────┐
│                     BACKEND                                  │
│  FastAPI + SQLModel + Pydantic                               │
│  ┌─────────────────────────────────────────────┐            │
│  │           Middleware Stack                    │            │
│  │  Logging → Rate Limit → CORS → GZip         │            │
│  └──────────────────┬──────────────────────────┘            │
│                     │                                        │
│  ┌──────────────────┼──────────────────────────┐            │
│  │           API Layer (Routers)                │            │
│  │  auth, product, cart, order, ai, admin, ...  │            │
│  └──────────────────┬──────────────────────────┘            │
│                     │                                        │
│  ┌──────────────────┼──────────────────────────┐            │
│  │         Service Layer (Business Logic)       │            │
│  └──────────────────┬──────────────────────────┘            │
│                     │                                        │
│  ┌──────────────────┼──────────────────────────┐            │
│  │       Repository Layer (Data Access)         │            │
│  └──────┬───────────┬───────────┬──────────────┘            │
│         │           │           │                            │
│    ┌────┴────┐ ┌────┴────┐ ┌───┴─────┐                     │
│    │PostgreSQL│ │  Redis  │ │External │                      │
│    │ (SQLModel│ │ (Cache) │ │Services │                      │
│    │/SQLAlch.)│ │         │ │         │                      │
│    └─────────┘ └─────────┘ └─────────┘                      │
│                               │                              │
│                    ┌──────────┼──────────┐                   │
│                    │          │          │                    │
│               ┌────┴───┐ ┌───┴────┐ ┌──┴─────┐             │
│               │Cloudinary│ │ VNPay  │ │LLM API │             │
│               │(Images) │ │(Pay)   │ │(AI)    │             │
│               └────────┘ └────────┘ └────────┘             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Backend Architecture Pattern

```
Request → API (router.py) → Service (service.py) → Repository (repository.py) → Database
                                   ↓
                              Schema validation (schemas.py)
```

Mỗi module tuân theo cấu trúc:
```
module/
├── __init__.py
├── router.py      # API endpoints
├── schemas.py     # Pydantic request/response schemas
├── service.py     # Business logic
└── repository.py  # Database queries
```

### 8.3 Frontend Architecture

```
frontend/src/
├── api/            # Axios client
├── components/
│   ├── common/     # Reusable components (ProductCard, ImageGallery, etc.)
│   └── ui/         # shadcn/ui primitives
├── hooks/          # Custom React hooks
├── layouts/        # MainLayout, AdminLayout
├── pages/          # Route pages (lazy-loaded)
├── routes/         # AppRoutes
├── store/          # Zustand stores (auth)
├── types/          # TypeScript interfaces
└── utils/          # Utility functions
```

### 8.4 Công nghệ sử dụng

| Layer | Công nghệ | Phiên bản |
|-------|-----------|-----------|
| Backend Framework | FastAPI | 0.136.x |
| ORM | SQLModel (SQLAlchemy + Pydantic) | 0.0.38 |
| Database | PostgreSQL | 14+ |
| Migration | Alembic | 1.18.x |
| Validation | Pydantic | 2.13.x |
| Server | Uvicorn | 0.47.x |
| Auth | python-jose (JWT), passlib (bcrypt) | - |
| Cache | Redis | 7.x |
| Rate Limiting | slowapi | - |
| Monitoring | Sentry | - |
| File Upload | Cloudinary | - |
| Email | Resend | - |
| Payment | VNPay (sandbox) | - |
| Frontend Framework | React | 19.x |
| Language | TypeScript | 5.x |
| Build Tool | Vite | 6.x |
| Styling | Tailwind CSS | 4.x |
| UI Components | shadcn/ui (Radix) | - |
| State Management | Zustand | - |
| Data Fetching | TanStack Query | 5.x |
| Charts | Recharts | - |
| Routing | React Router | 7.x |

---

## 9. Bảo mật

### 9.1 Authentication Flow

```
┌─────────┐     POST /auth/login      ┌─────────┐
│  Client  │ ──────────────────────>  │ Backend  │
│          │  {email, password}        │          │
│          │                           │ 1. Find  │
│          │                           │    user  │
│          │                           │ 2. Verify│
│          │                           │    bcrypt│
│          │  <──────────────────────  │ 3. Sign  │
│          │  {access_token, user}     │    JWT   │
└─────────┘                           └─────────┘

┌─────────┐  GET /api/protected       ┌─────────┐
│  Client  │ ──────────────────────>  │ Backend  │
│          │  Authorization:           │          │
│          │  Bearer <jwt_token>       │ 1. Decode│
│          │                           │    JWT   │
│          │  <──────────────────────  │ 2. Verify│
│          │  {data}                   │    exp   │
│          │                           │ 3. Check │
└─────────┘                           │    role  │
                                      └─────────┘
```

### 9.2 Role-Based Access Control

| Resource | Guest | User | Admin |
|----------|-------|------|-------|
| Xem sản phẩm | ✅ | ✅ | ✅ |
| Tìm kiếm AI | ✅ | ✅ | ✅ |
| Đăng ký/đăng nhập | ✅ | ✅ | ✅ |
| Mua hàng | ❌ | ✅ | ✅ |
| Đánh giá | ❌ | ✅ | ✅ |
| Wishlist | ❌ | ✅ | ✅ |
| Quản lý SP | ❌ | ❌ | ✅ |
| Quản lý đơn | ❌ | ❌ | ✅ |
| Dashboard | ❌ | ❌ | ✅ |
| Audit log | ❌ | ❌ | ✅ |

### 9.3 Security Measures

| Layer | Measure |
|-------|---------|
| Transport | HTTPS (production), CORS whitelist |
| Authentication | JWT HS256, 60min expiry, bcrypt password hashing |
| Authorization | Role-based (user/admin), endpoint-level guards |
| Input | Pydantic validation, max length, type checking |
| Database | Parameterized queries (SQLAlchemy ORM), CHECK constraints |
| Rate Limiting | slowapi per-endpoint limits |
| Payment | HMAC-SHA512 signature verification, replay protection |
| Config | Production validation (SECRET_KEY, ADMIN_PASSWORD, CORS) |
| Frontend | XSS-safe image URLs, 401 interceptor, token verification on mount |

---

## 10. Hiệu năng

### 10.1 Performance Optimizations

| Optimization | Mô tả |
|-------------|-------|
| Code Splitting | 22 routes lazy-loaded, initial bundle 405KB → 128KB gzip |
| Recharts Chunk | 381KB tách riêng, chỉ load khi vào admin |
| Redis Cache | Product list 5min, categories/brands 30min, LLM 1h |
| GZip Middleware | Compress response > 500 bytes |
| N+1 Optimization | Batch queries: `find_by_ids` cho cart, wishlist, orders |
| Database Indexes | 18 indexes trên 6 tables |
| Homepage Batch | 4 API calls → 1 batch endpoint |
| Image Optimization | Cloudinary f_auto/q_auto/w, lazy loading |
| SCAN thay KEYS | Redis cache invalidation non-blocking |

### 10.2 Lighthouse Scores

| Metric | Score |
|--------|-------|
| Performance | 71/100 |
| Accessibility | 96/100 |
| Best Practices | 100/100 |
| SEO | 92/100 |

---

## 11. Kiểm thử

### 11.1 Test Strategy

| Layer | Tool | Coverage |
|-------|------|----------|
| Backend Unit | pytest | 87% (370 tests) |
| Backend Integration | pytest + TestClient | API endpoint testing |
| Frontend Unit | Vitest + React Testing Library | 55 tests |
| Frontend Build | TypeScript + Vite | 0 errors |
| CI/CD | GitHub Actions | Auto-run on push/PR |

### 11.2 Test Distribution

| Module | Tests | Files |
|--------|-------|-------|
| AI (search, recommend, chat, LLM) | 91 | 4 |
| Order (create, status, atomic) | 27 | 1 |
| Review (CRUD, eligibility) | 20 | 1 |
| User Management | 17 | 1 |
| Category/Brand CRUD | 26 | 2 |
| Cart (add, update, stock) | 12 | 1 |
| Auth (register, login, password) | 27 | 3 |
| Payment (VNPay) | 12 | 1 |
| Admin (stats, reviews, export, audit) | 39 | 4 |
| Cache | 13 | 1 |
| Other (upload, health, config, edge) | 30 | 6 |
| **Frontend** | **55** | **8** |
| **Total** | **425** | **38** |

---

## 12. Triển khai

### 12.1 Deployment Architecture

```
┌─────────────────────────────────────────┐
│              Production                  │
│                                          │
│  ┌──────────┐     ┌──────────────────┐  │
│  │  Vercel   │     │     Render       │  │
│  │(Frontend) │     │   (Backend)      │  │
│  │           │     │                  │  │
│  │ React SPA │────>│ FastAPI + Redis  │  │
│  │ 405KB     │ API │ PostgreSQL       │  │
│  └──────────┘     └──────────────────┘  │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │        External Services         │   │
│  │  Cloudinary · VNPay · Sentry     │   │
│  │  Resend · Gemini · Groq         │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### 12.2 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DATABASE_URL | ✅ | - | PostgreSQL connection string |
| SECRET_KEY | ✅ | change_me | JWT signing key (≥ 32 chars in prod) |
| ENVIRONMENT | ❌ | development | development / production |
| CORS_ORIGINS | ❌ | localhost | Comma-separated allowed origins |
| REDIS_URL | ❌ | - | Redis connection string |
| SENTRY_DSN | ❌ | - | Sentry error tracking |
| CLOUDINARY_* | ❌ | - | Cloudinary credentials (3 vars) |
| VNPAY_* | ❌ | - | VNPay credentials (4 vars) |
| RESEND_API_KEY | ❌ | - | Email service |
| GEMINI_API_KEY | ❌ | - | Google Gemini LLM |
| GROQ_API_KEY | ❌ | - | Groq LLM |

### 12.3 CI/CD Pipeline

```
Push/PR to main
    │
    ▼
┌─────────────────────────┐
│   GitHub Actions         │
│                          │
│  ┌───────────────────┐  │
│  │ Backend Tests      │  │
│  │ pytest 370 tests   │  │
│  │ PostgreSQL service │  │
│  └─────────┬─────────┘  │
│            │             │
│  ┌─────────▼─────────┐  │
│  │ Frontend Build     │  │
│  │ tsc + vite build   │  │
│  │ 55 tests           │  │
│  └─────────┬─────────┘  │
│            │             │
│  ┌─────────▼─────────┐  │
│  │ Deploy             │  │
│  │ Vercel (frontend)  │  │
│  │ Render (backend)   │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

---

## 13. Phụ lục

### 13.1 Tech Stack Summary

```
Backend:   FastAPI + SQLModel + PostgreSQL + Redis + Alembic
Frontend:  React + TypeScript + Vite + Tailwind CSS + shadcn/ui
AI:        Gemini + Groq + Rule-based fallback
Storage:   Cloudinary (images)
Payment:   VNPay (sandbox)
Email:     Resend
Monitoring: Sentry
CI/CD:     GitHub Actions
Deploy:    Vercel (FE) + Render (BE)
```

### 13.2 Key Metrics

| Metric | Value |
|--------|-------|
| Backend Tests | 370/370 pass, 87% coverage |
| Frontend Tests | 55/55 pass |
| Total Products | 148 (seed data) |
| API Endpoints | 65 |
| Frontend Routes | 22 |
| Data Models | 12 entities |
| Initial Bundle | 405 KB (gzip 128 KB) |
| Code-split Chunks | 40+ |
| Security Fixes | 15 applied |
| Lighthouse Accessibility | 96/100 |
| Lighthouse Best Practices | 100/100 |

### 13.3 Glossary

| Term | Definition |
|------|-----------|
| Atomic Transaction | Database operation where all steps succeed or all fail together |
| Co-occurrence | Algorithm suggesting products frequently bought together |
| Graceful Degradation | System continues working when optional service (Redis) is unavailable |
| Idempotent | Operation that produces same result when called multiple times |
| JWT | Compact, URL-safe token for transmitting claims between parties |
| Lazy Loading | Loading code/components only when needed |
| N+1 Query | Anti-pattern where N additional queries are made for N items |
| RBAC | Access control based on user roles |
| SPA | Web application that loads single HTML page and dynamically updates |
| Synonym Dictionary | Mapping of equivalent search terms for AI search |

---

**Tài liệu này được tạo tự động dựa trên codebase thực tế của dự án TechSphere AI.**  
**Cập nhật lần cuối: 02/06/2026**
