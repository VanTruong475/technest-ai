# UI Patterns — TechSphere AI

## Product Card (chuẩn)
- Ảnh: aspect-ratio **4/3**, object-cover, lazy loading
- Badge vị trí: absolute top-2 left-2 (New/Sale)
- Badge tồn kho: absolute top-2 right-2 (Hết hàng)
- Hover: shadow-md + scale-[1.02] transition-all duration-200
- Giá: font-bold text-primary, giá gốc line-through text-muted-foreground
- **HomePage (mọi product grid):** Recs / Featured / card trong Flash Sale nội dung product — **luôn `aspect-[4/3]`**, không `aspect-square` (tránh 2 ratio trên cùng page)

## Hero Section (chuẩn — HomePage)
- Khung: `min-h-[calc(100dvh-128px)]` (dvh tránh nhảy iOS), `overflow-hidden flex items-center`
- Padding nội dung: `px-4 md:px-6 lg:px-8` (theo Spacing chuẩn), text trong `max-w-2xl`
- Nền: OptimizedImage `priority` + overlay legibility (`bg-gradient-to-r from-background…`) + 1 lớp ambient glow radial (`bg-primary/15 blur-[140px]`) để phá gradient tuyến tính đều
- Ảnh nền: **product-forward** (thiết bị / lifestyle tech rõ), không desk stock mơ hồ; alt mô tả cụ thể (không `alt="Công nghệ"`)
- Nhãn AI: KHÔNG pill + Sparkles; dùng flag bar (`h-4 w-1 rounded-full bg-primary`) + label sentence-case (không uppercase)
- CTA: luôn `<Button asChild>` bọc `<Link>` (KHÔNG `<button>` thô) → có focus-ring + `duration-200`
- Copy:
  - Cụ thể, thuần Việt; số liệu **bind động** (vd tổng sản phẩm từ API), KHÔNG hardcode
  - `text-balance` / `text-pretty` chống orphan
  - **Cấm em-dash (`—`) và en-dash (`–`)** trên copy visible; dùng `.` `,` hoặc gạch ngang thường `-`
  - Subtext hero: **≤ ~20 từ** (không kể số bind động nếu cần), max ~3–4 dòng
- Type scale gợi ý: `text-4xl md:text-5xl lg:text-6xl` khi headline ≤ ~2 dòng desktop; không để H1 3+ dòng
- Product showcase **desktop `xl:block`**: đặt `absolute` (KHÔNG đẩy layout text → zero shift); skeleton cùng khung khi loading; ẩn hẳn (`null`) khi rỗng/lỗi; `-rotate-1` + badge nổi lệch góc tạo depth
- Product showcase **mobile / tablet (`< xl`)**: mini product card **dưới CTA** (trong flow, không absolute che chữ); skeleton/empty cùng quy tắc an toàn; không để hero chỉ còn stock background

## Section header (chuẩn — HomePage)
- Pattern mặc định: flag bar `h-4 w-1 rounded-full bg-primary` + `h2 font-semibold text-xl md:text-2xl`, left-align
- Flash Sale được **ngoại lệ** identity riêng (Zap + italic uppercase trên `bg-sale`) — không ép flag bar trắng trên nền sale
- Không dùng Sparkles to (h-6) làm icon section header; Sparkles chỉ context AI nhỏ (badge / reason chip)

## “Xem tất cả” / browse CTA (HomePage)
- Tối đa **1–2** link “Xem tất cả” (hoặc tương đương) trỏ `/products` trên cùng page
- Ưu tiên giữ **1 primary** ở Featured (hoặc Flash Sale nếu sale là focus campaign)
- Recs / section khác: bỏ link lặp hoặc đổi wording phụ (vd. không identical “Xem tất cả + ArrowRight” 3 lần)

## Categories (chuẩn — HomePage)
- **Không** equal grid 5 cột đều tay (`lg:grid-cols-5` tile giống hệt)
- Desktop: **bento** — 1 ô large + N small **hoặc** split 2+3; **N items → N cells**, không ô trống giữa/cuối
- Mobile (`< md`): 2 cột đều, rõ ràng
- Ảnh + hover scale nhẹ; semantic tokens (`bg-card`, `border-border`, …)
- Header: flag bar + left-align (không `text-center`)

## Trust strip (chuẩn — HomePage)
- **1 accent family** cho icon (vd. `text-primary bg-primary/10`) — KHÔNG rainbow 4 màu (emerald/sky/amber/violet) trên cùng strip
- Ưu tiên layout **divider / inline row** hơn 4 equal feature-cards (tránh lặp layout family với product grid)
- Copy cụ thể tiếng Việt (BH chính hãng, giao hàng, đổi trả, VNPay/COD)

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

## Màu success (tồn kho / trạng thái tích cực)
- Token: `text-success`, `bg-success`, `text-success-foreground` (index.css light + dark).
- Dùng cho: còn hàng, hoàn thành tích cực.
- KHÔNG hardcode `text-emerald-*` cho semantic state (decorative identity riêng — vd. 1 icon — cân nhắc; prefer token).

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
- Motion Home: intensity thấp (stagger Recs OK); **bắt buộc** tôn trọng `prefers-reduced-motion` / `useReducedMotion` khi có animation vào view
- KHÔNG: GSAP sticky-stack, marquee, scroll-hijack, liquid glass trên Home (e-com trust + perf)

## Redesign HomePage — tiến độ (cập nhật 2026-07-13)

Task control chi tiết: `docs/HOME_REDESIGN_TASKS.md`.

**Dials (preserve):** VARIANCE 5 · MOTION 4 · DENSITY 5.

### Đã xong (code + docs)
- Hero base: min-h-dvh, padding token, Button shadcn + focus-ring, flag bar (không pill+Sparkles uppercase), copy thuần Việt, ambient glow, product showcase absolute `xl` zero-shift + skeleton/empty
- Token `sale` + `success` (index.css light/dark)
- Flash Sale: token hoá, bỏ fake urgency, badge stock thật ≤ 5
- Unify sale color: SaleBadge, ProductCard, Wishlist, CustomersAlsoBought
- Xoá AI Assistant section (form giả; giữ Hero CTA + FAB)
- Button shadcn: quick-buy, wishlist shell, FAB (`MessageCircle`), hero CTA
- Giảm Sparkles (chỉ badge AI + reason chip)
- Flag bar thống nhất Recs / Categories / Featured; Categories left-align
- Hero alt text cụ thể hơn

### Phase 0 docs (chốt pattern — 2026-07-13)
- Hero: no em-dash; sub ≤ ~20 từ; product-forward bg; mobile mini product dưới CTA; type scale gợi ý
- Product card Home: luôn `aspect-[4/3]`
- Categories: bento, không equal 5-col
- Trust: 1 accent; ưu tiên non-card layout
- “Xem tất cả”: max 1–2 / page
- Section header + motion/reduced-motion + cấm Awwards motion trên Home

### Chờ implement (theo HOME_REDESIGN_TASKS)
- Phase 1: Hero polish (copy, scale, asset, mobile card)
- Phase 2: Categories bento
- Phase 3: Recs ratio 4/3, wishlist wire|remove, icon semantics, bớt “Xem tất cả”
- Phase 4: Flash Sale polish identity
- Phase 5: Featured + Trust 1 accent
- Phase 6: glue + a11y + reduced-motion
- Phase 7: freeze docs + portfolio shots

### Cân nhắc sau (không block Home)
- Giá sale toàn app: `text-primary` vs `text-sale` — chưa thống nhất 100%
- Wishlist button trên Recs: dead control → wire hoặc xoá (Phase 3)
