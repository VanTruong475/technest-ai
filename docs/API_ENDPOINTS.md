# API Endpoints - TechSphere AI E-commerce

Base URL: `http://localhost:8000`

## Auth

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/api/auth/register` | Public | Đăng ký tài khoản |
| POST | `/api/auth/login` | Public | Đăng nhập, trả access_token |
| GET | `/api/auth/me` | User | Lấy thông tin user hiện tại |

## Categories

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/api/categories` | Public | Danh sách danh mục (pagination) |
| GET | `/api/categories/{id}` | Public | Chi tiết danh mục |
| POST | `/api/categories` | Admin | Tạo danh mục mới |
| PUT | `/api/categories/{id}` | Admin | Cập nhật danh mục |
| DELETE | `/api/categories/{id}` | Admin | Xóa danh mục |

## Brands

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/api/brands` | Public | Danh sách thương hiệu (pagination) |
| GET | `/api/brands/{id}` | Public | Chi tiết thương hiệu |
| POST | `/api/brands` | Admin | Tạo thương hiệu mới |
| PUT | `/api/brands/{id}` | Admin | Cập nhật thương hiệu |
| DELETE | `/api/brands/{id}` | Admin | Xóa thương hiệu |

## Products

| Method | Endpoint | Auth | Query Params | Mô tả |
|--------|----------|------|--------------|-------|
| GET | `/api/products` | Public | page, limit, category_id, brand_id, status, min_price, max_price, search | Danh sách sản phẩm (pagination + filter) |
| GET | `/api/products/{id}` | Public | - | Chi tiết sản phẩm |
| POST | `/api/products` | Admin | - | Tạo sản phẩm mới |
| PUT | `/api/products/{id}` | Admin | - | Cập nhật sản phẩm |
| DELETE | `/api/products/{id}` | Admin | - | Soft delete (status → INACTIVE) |

## Cart

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/api/cart` | User | Xem giỏ hàng hiện tại |
| POST | `/api/cart/items` | User | Thêm sản phẩm vào giỏ |
| PUT | `/api/cart/items/{item_id}` | User | Cập nhật số lượng |
| DELETE | `/api/cart/items/{item_id}` | User | Xóa sản phẩm khỏi giỏ |

## Orders

| Method | Endpoint | Auth | Query Params | Mô tả |
|--------|----------|------|--------------|-------|
| POST | `/api/orders` | User | - | Tạo đơn hàng từ cart |
| GET | `/api/orders` | User | page, limit | Danh sách đơn hàng (user: của mình, admin: tất cả) |
| GET | `/api/orders/{id}` | User | - | Chi tiết đơn hàng |
| PUT | `/api/orders/{id}/status` | Admin | - | Cập nhật trạng thái đơn hàng |

## AI

| Method | Endpoint | Auth | Query Params | Mô tả |
|--------|----------|------|--------------|-------|
| POST | `/api/ai/search` | Public | - | Tìm kiếm sản phẩm thông minh (rule-based) |
| GET | `/api/ai/recommend` | Public/User | strategy, limit | Gợi ý sản phẩm |

### POST /api/ai/search

Tìm kiếm sản phẩm theo relevance score. Score cao hơn = kết quả phù hợp hơn.

**Request:**
```json
{
  "query": "iphone pro",
  "limit": 10
}
```

| Field | Type | Default | Mô tả |
|-------|------|---------|-------|
| query | string | - | Từ khóa tìm kiếm (bắt buộc) |
| limit | int | 10 | Số kết quả (1-50) |

**Response:**
```json
{
  "query": "iphone pro",
  "results": [
    {
      "product": { ... },
      "score": 1.0,
      "reason": "Tên khớp 2/2 từ khóa"
    }
  ],
  "total": 3
}
```

### GET /api/ai/recommend

Gợi ý sản phẩm dựa trên strategy.

**Query Params:**

| Param | Type | Default | Mô tả |
|-------|------|---------|-------|
| strategy | string | "cart" | `cart`, `history`, hoặc `popular` |
| limit | int | 10 | Số kết quả (1-20) |

**Strategy details:**

| Strategy | Auth | Logic |
|----------|------|-------|
| `cart` | JWT bắt buộc | Sản phẩm cùng category/brand với sản phẩm trong giỏ. Fallback → popular → latest |
| `history` | JWT bắt buộc | Sản phẩm cùng category/brand với sản phẩm đã mua. Fallback → popular → latest |
| `popular` | Public | Sản phẩm được đặt nhiều nhất (dựa trên order_items). Fallback → latest products |

**Response:**
```json
{
  "strategy": "cart",
  "results": [
    {
      "product": { ... },
      "score": 1.0,
      "reason": "cùng danh mục với sản phẩm trong giỏ + đang giảm giá"
    }
  ],
  "total": 5
}
```

**Fallback reasons:**
- `"Fallback popular vì không có đủ dữ liệu gợi ý (Được đặt X lần)"`
- `"Fallback sản phẩm mới vì chưa có dữ liệu popular"`

## Health

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/health` | Public | Kiểm tra server |
| GET | `/api/health/db` | Public | Kiểm tra kết nối database |

## Pagination Query Params

Áp dụng cho tất cả endpoints danh sách:

| Param | Type | Default | Min | Max | Mô tả |
|-------|------|---------|-----|-----|-------|
| `page` | int | 1 | 1 | - | Trang hiện tại |
| `limit` | int | 10 | 1 | 100 | Số items mỗi trang |

## Pagination Response Format

```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "total_pages": 10
}
```

## Order Status

```
PENDING → CONFIRMED → SHIPPING → COMPLETED
                ↘ CANCELLED
```

## Authentication

Sử dụng Bearer Token:

```
Authorization: Bearer <access_token>
```

Lấy token từ endpoint `POST /api/auth/login`.

## Swagger UI

Truy cập: http://localhost:8000/docs
