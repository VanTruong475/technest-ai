# UI/UX Review - TechSphere AI Frontend

**Ngày review**: 2026-05-22
**Scope**: Toàn bộ frontend source code (components, pages, layout, CSS/Tailwind)
**Framework**: React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4 + shadcn/ui

---

## 1. Tổng quan kiến trúc frontend

```
frontend/src/
├── api/          - axiosClient.ts (HTTP client)
├── assets/       - hero.png, react.svg, vite.svg
├── components/
│   ├── common/   - 13 reusable components
│   └── ui/       - 6 shadcn UI primitives
├── constants/    - orderStatus.ts
├── hooks/        - useCategories, useUpload, useRecentlyViewed
├── layouts/      - MainLayout.tsx
├── lib/          - utils.ts (cn helper)
├── pages/        - 22 page components
├── routes/       - AppRoutes.tsx
├── store/        - authStore.ts (Zustand)
├── types/        - EMPTY (chưa có shared types)
└── utils/        - format.ts, cloudinary.ts
```

**Tech stack**: shadcn/ui (Radix primitives), Lucide icons, TanStack Query, Zustand, next-themes (dark mode), Geist Variable font.

---

## 2. Phân tích vấn đề UI/UX

### 2.1 Accessibility (A11y) - Mức độ: CAO

| # | Vấn đề | File | Mô tả |
|---|--------|------|-------|
| A1 | Thiếu `aria-label` trên icon-only buttons | `MainLayout.tsx`, toàn bộ admin pages | Các nút chỉ có icon (Cart, Logout, Menu, Trash, Edit, X) không có `aria-label`. Screen reader không thể đọc được chức năng. |
| A2 | Mobile menu không dùng `<nav>` | `MainLayout.tsx:223-289` | Mobile menu là `<div>` thuần, thiếu `role="navigation"` và `aria-label`. |
| A3 | Admin dropdown thiếu ARIA attributes | `MainLayout.tsx:131-187` | Nút trigger thiếu `aria-expanded`, `aria-haspopup`, `aria-controls`. Dropdown panel thiếu `role="menu"`. |
| A4 | Không có focus trap trong mobile menu | `MainLayout.tsx` | Khi mở mobile menu, keyboard user có thể tab ra ngoài vào nội dung bị ẩn phía sau. |
| A5 | Form inputs thiếu `id` và `htmlFor` | `CheckoutPage.tsx:204-243` | Các ô nhập shipping info có `<label>` nhưng input không có `id`, label không có `htmlFor`. |
| A6 | Fallback image thiếu screen reader text | `OptimizedImage.tsx` | Khi không có ảnh, hiển thị emoji `📦` nhưng không có văn bản cho screen reader. |

### 2.2 Inconsistent Styling - Mức độ: CAO

| # | Vấn đề | File | Mô tả |
|---|--------|------|-------|
| S1 | Hardcoded `bg-white` phá dark mode | `ProductListPage`, `CartPage`, `CheckoutPage`, `SearchAutocomplete`, `Skeleton` | Nhiều component dùng `bg-white` thay vì `bg-card` hoặc `bg-background`. **Dark mode bị vỡ** - các element này vẫn trắng trên nền tối. |
| S2 | Hardcoded `bg-[#f8fafc]` | `CartPage.tsx:91,120,145,166` | Màu hex cứng, không thuộc design token system, không thích ứng dark mode. |
| S3 | Hardcoded status colors trong `orderStatus.ts` | `constants/orderStatus.ts` | Dùng `bg-yellow-50`, `bg-blue-50`... - các màu nền nhạt này trông sai trong dark mode. |
| S4 | Card styling không一致 | Nhiều files | Customer pages dùng `border-border/60 shadow-sm rounded-2xl`, admin pages dùng default Card styling. |
| S5 | Input heights không一致 | `LoginPage`, `RegisterPage`, `CheckoutPage` vs shadcn default | Có chỗ dùng `h-11 rounded-xl`, chỗ dùng `h-8 rounded-lg` (default). |
| S6 | Admin pages thiếu `max-width` constraint | `AdminDashboardPage`, `AdminProductPage`, etc. | Trên màn hình rất rộng, admin tables/cards kéo dài full width. Customer pages có `max-w-4xl`/`max-w-6xl` nhưng admin không có. |

### 2.3 Missing States & Edge Cases - Mức độ: TRUNG BÌNH

| # | Vấn đề | File | Mô tả |
|---|--------|------|-------|
| M1 | HeartButton thiếu loading spinner | `HeartButton.tsx` | Chỉ hiện `opacity-50` khi loading, không có spinner. |
| M2 | Cart badge có thể stale trên mobile | `MainLayout.tsx:245-249` | `staleTime: 30_000ms` - nếu add item rồi mở mobile menu ngay, count có thể chưa cập nhật. |
| M3 | Clear chat không có confirmation | `ChatPage.tsx:71-74` | Xóa toàn bộ tin nhắn ngay khi click, không có dialog xác nhận. |
| M4 | Dùng native `confirm()` cho delete | `AdminProductPage:255`, `AdminReviewsPage:60` | Native confirm dialog không consistent với design system. Phần còn lại dùng `toast`. |
| M5 | Admin pages không scroll-to-top khi đổi trang | `AdminProductPage`, `AdminOrderPage`, etc. | `ProductListPage` có `scrollTo(0)` nhưng admin pages không có. |

### 2.4 Functional/Code Issues - Mức độ: TRUNG BÌNH

| # | Vấn đề | File | Mô tả |
|---|--------|------|-------|
| F1 | `index.html` title là "frontend" | `index.html:6` | Hiển thị trên browser tab và search results, cần đổi thành "TechSphere AI". |
| F2 | Thiếu `<meta description>` | `index.html` | Ảnh hưởng SEO. |
| F3 | API base URL mismatch | `.env` vs `axiosClient.ts` | `.env` đặt `VITE_API_BASE_URL` nhưng code đọc `VITE_API_URL`. Env var không bao giờ được dùng. |
| F4 | `App.css` là dead code | `src/App.css` | Chứa Vite boilerplate, không được import ở đâu. |
| F5 | Empty `types/` directory | `src/types/` | Interfaces định nghĩa inline, bị duplicate. `Product` interface xuất hiện riêng biệt ở 6 files với các fields khác nhau. |
| F6 | Chat localStorage không có size limit | `ChatPage.tsx` | Lưu toàn bộ messages vào `localStorage` không giới hạn, có thể gây chậm app theo thời gian. |
| F7 | Broken directory names | `frontend/` | Có thư mục tên `D:E-comtechsphere-ai.githubworkflows` - artifact từ lỗi Windows path. |

---

## 3. Đánh giá tổng thể

### Điểm mạnh
- **Responsive design tốt**: Grid breakpoints nhất quán (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4`), mobile-first approach
- **Skeleton loading states đầy đủ**: Có presets cho mọi loại content (ProductCard, Table, Cart, Dashboard, etc.)
- **Component architecture gọn**: shadcn/ui primitives + common components hợp lý
- **Dark mode support (partial)**: next-themes đã wired up, CSS custom properties có sẵn light/dark variants
- **Sticky header + backdrop blur**: UX tốt cho navigation
- **Search autocomplete với debounce**: Trải nghiệm tìm kiếm mượt

### Điểm yếu chính
1. **Dark mode bị vỡ** ở nhiều chỗ do hardcoded `bg-white`
2. **Accessibility yếu** - thiếu aria-labels, focus management, form associations
3. **Type system thiếu** - interfaces duplicate khắp nơi, không có shared types
4. **Một số inconsistency** về styling giữa customer và admin pages
5. **SEO cơ bản thiếu** - title sai, không có meta description

---

## 4. Kế hoạch cải thiện

### Phase 1: Critical fixes (ưu tiên cao)

| Task | Mô tả | Effort |
|------|-------|--------|
| 1.1 | Sửa `index.html`: title, meta description, favicon | 15 min |
| 1.2 | Fix API env var mismatch (`VITE_API_BASE_URL` → `VITE_API_URL`) | 5 min |
| 1.3 | Xóa `App.css` dead code | 5 min |
| 1.4 | Thay `bg-white` → `bg-card`/`bg-background` để fix dark mode | 1-2h |
| 1.5 | Thay `bg-[#f8fafc]` → semantic token | 15 min |
| 1.6 | Fix status colors cho dark mode (`orderStatus.ts`) | 30 min |

### Phase 2: Accessibility improvements

| Task | Mô tả | Effort |
|------|-------|--------|
| 2.1 | Thêm `aria-label` cho tất cả icon-only buttons | 1h |
| 2.2 | Mobile menu: dùng `<nav>`, thêm focus trap | 1-2h |
| 2.3 | Admin dropdown: thêm ARIA attributes | 30 min |
| 2.4 | CheckoutPage: thêm `id`/`htmlFor` cho form inputs | 30 min |
| 2.5 | OptimizedImage: thêm sr-only text cho fallback | 15 min |

### Phase 3: Code quality & consistency

| Task | Mô tả | Effort |
|------|-------|--------|
| 3.1 | Tạo shared types (`types/product.ts`, `types/cart.ts`, etc.) | 2-3h |
| 3.2 | Thống nhất card styling (tạo Card variant hoặc utility class) | 1h |
| 3.3 | Thống nhất input heights (override shadcn default hoặc dùng一致 class) | 30 min |
| 3.4 | Admin pages: thêm `max-w-7xl mx-auto` constraint | 30 min |
| 3.5 | Admin pages: thêm scroll-to-top khi đổi trang | 30 min |

### Phase 4: UX polish

| Task | Mô tả | Effort |
|------|-------|--------|
| 4.1 | Thay native `confirm()` bằng custom dialog component | 1h |
| 4.2 | Thêm confirmation dialog cho clear chat | 30 min |
| 4.3 | HeartButton: thêm loading spinner | 15 min |
| 4.4 | Chat: giới hạn localStorage size (giữ 100 messages gần nhất) | 30 min |
| 4.5 | Cleanup broken directory names trong frontend/ | 15 min |

---

## 5. Ưu tiên đề xuất

```
Phase 1 (Critical)  ████████████████████  ~3h   → Dark mode + SEO + env fix
Phase 2 (A11y)      ████████████████████  ~5h   → Accessibility compliance
Phase 3 (Code)      ████████████████████  ~5h   → Type system + consistency
Phase 4 (UX)        ████████████████████  ~3h   → Polish & edge cases
                                       Tổng: ~16h
```

**Khuyến nghị**: Bắt đầu với Phase 1 vì dark mode bị vỡ là vấn đề visible nhất và SEO ảnh hưởng trực tiếp đến discoverability.
