# UI Patterns — TechSphere AI

## Product Card (chuẩn)
- Ảnh: aspect-ratio 4/3, object-cover, lazy loading
- Badge vị trí: absolute top-2 left-2 (New/Sale)
- Badge tồn kho: absolute top-2 right-2 (Hết hàng)
- Hover: shadow-md + scale-[1.02] transition-all duration-200
- Giá: font-bold text-primary, giá gốc line-through text-muted-foreground

## Hero Section (chuẩn — HomePage)
- Khung: `min-h-[calc(100dvh-128px)]` (dvh tránh nhảy iOS), `overflow-hidden flex items-center`
- Padding nội dung: `px-4 md:px-6 lg:px-8` (theo Spacing chuẩn), text trong `max-w-2xl`
- Nền: OptimizedImage `priority` + overlay legibility (`bg-gradient-to-r from-background…`) + 1 lớp ambient glow radial (`bg-primary/15 blur-[140px]`) để phá gradient tuyến tính đều
- Nhãn AI: KHÔNG pill + Sparkles; dùng flag bar (`h-4 w-1 bg-primary`) + label sentence-case (không uppercase)
- CTA: luôn `<Button asChild>` bọc `<Link>` (KHÔNG `<button>` thô) → có focus-ring + `duration-200`
- Copy: cụ thể, thuần Việt, số liệu **bind động** (vd tổng sản phẩm từ API), KHÔNG hardcode; dùng `text-balance`/`text-pretty` chống orphan
- Product showcase (desktop `xl:block`): đặt `absolute` (KHÔNG đẩy layout text → zero shift); skeleton cùng khung khi loading; ẩn hẳn (`null`) khi rỗng/lỗi; `-rotate-1` + badge nổi lệch góc tạo depth

## Loading States
- Danh sách sản phẩm: ProductGridSkeleton (đã có)
- Chi tiết sản phẩm: ProductDetailSkeleton (đã có)
- Table admin: dùng Skeleton width ngẫu nhiên để tự nhiên hơn
- Inline action (nút): spinner nhỏ 16px bên trái text, disable button

## Empty States
Cấu trúc chuẩn:
  <div class="flex flex-col items-center py-16 text-muted-foreground">
    [Icon 48px]
    <p class="mt-4 text-lg font-medium">[Tiêu đề]</p>
    <p class="mt-1 text-sm">[Mô tả ngắn]</p>
    [Button CTA nếu có]
  </div>

## Status Badge màu sắc
- pending/chờ xử lý: bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200
- processing/đang xử lý: bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200
- completed/hoàn thành: bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200
- cancelled/đã hủy: bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200

## Màu khuyến mãi (sale token)
- Token: `bg-sale`, `text-sale`, `text-sale-foreground`, `border-sale` (định nghĩa trong index.css, light + dark).
- Dùng cho: Flash Sale, badge giảm giá, giá sale — mọi ngữ cảnh khuyến mãi.
- KHÔNG dùng `destructive` cho khuyến mãi (destructive chỉ dành cho nguy hiểm/xoá).
- KHÔNG hardcode `bg-red-*`, `#ba1a1a`, gradient red→orange → luôn qua token `sale`.

## Spacing chuẩn
- Page padding: px-4 md:px-6 lg:px-8
- Section gap: space-y-8 md:space-y-12
- Card padding: p-4 md:p-6
- Grid sản phẩm: grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4

## Animation
- Hover card: transition-all duration-200
- Modal/Sheet: đã handle bởi shadcn/ui — không custom
- Skeleton pulse: đã có trong shadcn Skeleton
- Page transition: KHÔNG thêm (ảnh hưởng performance)

## Redesign HomePage — tiến độ (cập nhật 2026-07-13)
Thứ tự ưu tiên đã chốt: 1) token màu sale + Flash Sale → 2) button thô → Button → 3) nhất quán section-header/nhịp → 4) giảm lặp Sparkles/CTA → 5) phá đều Categories.

**Đã xong:**
- Hero: fix rule (bỏ text Anh, padding token, Button shadcn + focus-ring, min-h-dvh), bỏ AI-slop (flag bar thay pill+Sparkles, copy cụ thể, ambient glow), thêm product showcase B6-a (`xl:block`, absolute zero-shift, skeleton/empty an toàn).
- Token `sale` (index.css light+dark) + document ở mục "Màu khuyến mãi".
- Flash Sale: token hoá hết đỏ raw, **bỏ fake urgency** (thanh "đã bán X/20" giả), thay bằng badge "Chỉ còn {stock}" từ stock THẬT (chỉ khi stock ≤ 5). BE xác nhận không có field "đã bán" public.
- Unify sale color: SaleBadge, ProductCard badge %, badge "Sắp hết", giá sale ở WishlistTab/CustomersAlsoBought → đều dùng token `sale`.

**Chờ / follow-up:**
- Đổi `<button>` thô → `Button` shadcn (quick-buy ở Recommendations…) — BƯỚC KẾ TIẾP.
- Nhất quán section-header + nhịp (nền xen kẽ, whitespace); giảm lặp Sparkles / "Xem tất cả" / lối vào AI.
- Phá đều Categories (bento). Trust-strip: gom bớt accent màu icon.
- Cân nhắc: màu giá sale toàn app (hiện lẫn `text-primary` vs `text-sale`) — chưa thống nhất.
- Chưa làm B4 hero (ảnh nền stock Unsplash + alt="Công nghệ" yếu).