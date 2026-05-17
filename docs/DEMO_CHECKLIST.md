# Checklist Demo Backend - TechSphere AI E-commerce

Hướng dẫn demo luồng end-to-end cho toàn bộ backend.

---

## 1. Chuẩn bị

### Chạy backend

```powershell
cd D:\E-com\techsphere-ai\backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Mở Swagger UI: **http://localhost:8000/docs**

### Seed data

```powershell
cd D:\E-com\techsphere-ai\backend
python -m app.seed
```

Kết quả mong đợi:
- 1 admin account
- 5 categories (Điện thoại, Laptop, Tablet, Tai nghe, Phụ kiện)
- 5 brands (Apple, Samsung, Sony, Dell, Xiaomi)
- 12 products

### Tài khoản demo

| Email | Password | Role |
|-------|----------|------|
| admin@techsphere.com | admin123 | ADMIN |

---

## 2. Luồng demo trên Swagger

### Bước 1 - Login admin

```
POST /api/auth/login
Body: { "email": "admin@techsphere.com", "password": "admin123" }
```

**Kết quả**: Nhận `access_token`. Copy token, nhấn nuy **Authorize** ở đầu Swagger để nhập: `Bearer <token>`

### Bước 2 - Xem sản phẩm

```
GET /api/products?page=1&limit=10
```

Thử filter:

```
GET /api/products?category_id=1&min_price=500&max_price=1500
GET /api/products?search=iphone
```

### Bước 3 - AI Search

```
POST /api/ai/search
Body: { "query": "iphone pro", "limit": 5 }
```

Thử thêm:

```
{ "query": "tai nghe chống ồn" }
{ "query": "laptop dell" }
{ "query": "sạc nhanh samsung" }
```

**Kết quả**: Danh sách sản phẩm kèm `score` (relevance) và `reason` (lý do khớp)

### Bước 4 - AI Recommend (popular - không cần login)

```
GET /api/ai/recommend?strategy=popular&limit=5
```

**Kết quả**: Top sản phẩm phổ biến (dựa trên số lần đặt hàng). Nếu chưa có order -> fallback "sản phẩm mới nhất"

### Bước 5 - Thêm sản phẩm vào giỏ hàng

```
POST /api/cart/items
Body: { "product_id": 1, "quantity": 2 }
```

Thử thêm 1-2 sản phẩm nữa:

```
{ "product_id": 4, "quantity": 1 }
{ "product_id": 8, "quantity": 3 }
```

Xem giỏ hàng:

```
GET /api/cart
```

### Bước 6 - AI Recommend (cart - cần login)

```
GET /api/ai/recommend?strategy=cart&limit=5
```

**Kết quả**: Gợi ý sản phẩm cùng category/brand với sản phẩm trong giỏ

### Bước 7 - Tạo đơn hàng

```
POST /api/orders
Body: {
  "shipping_address": "123 Nguyen Hue, Q1, TP.HCM",
  "phone": "0901234567",
  "note": "Giao gio hanh chinh"
}
```

**Kết quả**: Order status = `PENDING`, cart bị xóa

### Bước 8 - Xem đơn hàng

```
GET /api/orders
GET /api/orders/1
```

### Bước 9 - Cập nhật trạng thái đơn hàng (admin)

```
PUT /api/orders/1/status
Body: { "status": "CONFIRMED" }
```

Thử tiếp:

```
{ "status": "SHIPPING" }
{ "status": "COMPLETED" }
```

**Flow hợp lệ**:

```
PENDING -> CONFIRMED -> SHIPPING -> COMPLETED
          |
          +-> CANCELLED
```

### Bước 10 - Quản lý users

```
GET /api/users?page=1&limit=10          -> Danh sách users
GET /api/users/1                         -> Chi tiết user
PUT /api/users/1                         -> Cập nhật user
Body: { "full_name": "Nguyen Van Truong Updated" }
```

### Bước 11 - AI Recommend (history - cần login + đã có order)

```
GET /api/ai/recommend?strategy=history&limit=5
```

**Kết quả**: Gợi ý dựa trên sản phẩm đã mua trong đơn hàng

---

## 3. Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|------|-------------|------------|
| **401 Unauthorized** | Token hết hạn hoặc chưa nhập | Login lại, copy token mới |
| **403 Forbidden** | User thường truy cập endpoint admin | Dùng tài khoản admin |
| **422 Validation Error** | Sai body/params | Kiểm tra schema trong Swagger |
| **404 Not Found** | Sai ID | Kiểm tra ID tồn tại qua GET list |
| **400 Bad Request** | Cart trống khi tạo order | Thêm sản phẩm vào cart trước |
| **400 "Email already registered"** | Đăng ký trùng email | Dùng email khác |
| **500 Internal Server Error** | Lỗi server | Kiểm tra terminal traceback |

---

## 4. Mẹo sử dụng Swagger

- Nhấn nuy **Authorize** (icon khóa) ở góc phải trên để nhập token 1 lần cho tất cả endpoint
- Format: `Bearer <access_token>` (không có dấu ngoặc kép)
- Token có thời hạn, hết hạn thì login lại
- Xem schema request/response ở mục **Schemas** cuối trang Swagger
