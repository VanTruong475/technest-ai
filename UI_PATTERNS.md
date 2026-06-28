# UI Patterns — TechSphere AI

## Product Card (chuẩn)
- Ảnh: aspect-ratio 4/3, object-cover, lazy loading
- Badge vị trí: absolute top-2 left-2 (New/Sale)
- Badge tồn kho: absolute top-2 right-2 (Hết hàng)
- Hover: shadow-md + scale-[1.02] transition-all duration-200
- Giá: font-bold text-primary, giá gốc line-through text-muted-foreground

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