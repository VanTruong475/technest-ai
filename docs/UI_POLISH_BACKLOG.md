# UI Polish Backlog — Post Home Freeze

> **Bối cảnh:** Home redesign Phase 0–7 **DONE + FREEZE** (2026-07-13).  
> File này = checklist việc còn lại (shared + funnel + AI + content + admin).  
> **Source of truth pattern:** `UI_PATTERNS.md` · `CLAUDE.md`.  
> **Home:** chỉ bugfix — không mở wave redesign mới trên Home.  
> **Cập nhật lần cuối:** 2026-07-13

---

## Quy tắc

1. **1 wave / 1 lượt** — không gộp shared + admin + blog trong 1 PR.
2. **Audit ngắn → confirm (nếu scope mơ) → code → `npm run build` → commit theo chức năng.**
3. Tick `[x]` + ghi commit hash + ngày khi xong.
4. **Không đụng:** VNPay flow, chat SSE stream logic, stock atomic BE, cài UI lib mới, đổi Geist/Lucide.
5. Admin **không** ép aesthetic landing (giữ color identity dashboard nếu user đã chốt).

**Status legend:** ⬜ todo · 🔄 in progress · ✅ done · ⏸ blocked · ❌ cancelled · ➖ skip

---

## Tiến độ tổng

| Wave | Tên | Ưu tiên | Status | Commit | Ngày |
|------|-----|---------|--------|--------|------|
| 0 | Home residual (optional) | P3 | ⬜ | — | — |
| 1 | Shared ProductCard tokens | P0 | ✅ | `a4a675f` | 2026-07-13 |
| 2 | Cart — sale token + Button | P0 | ✅ | `743750d` | 2026-07-13 |
| 3 | Checkout — empty Button asChild | P0 | ✅ | `63f2df1` | 2026-07-13 |
| 4 | Sale / success token sweep | P1 | ✅ | `12db750` | 2026-07-13 |
| 5 | Chat product cards + residual | P1 | ✅ | `12db750` | 2026-07-13 |
| 6 | ProductList / Search buttons | P1 | ✅ | `1fa80de` | 2026-07-13 |
| 7 | ProductDetail residual | P1 | ✅ | `1fa80de` | 2026-07-13 |
| 8 | Account / OrderDetail tokens | P2 | ✅ | (chưa commit) | 2026-07-13 |
| 9 | Blog list/detail buttons | P2 | ⬜ | — | — |
| 10 | Admin status badges | P3 | ⬜ | — | — |
| 11 | Shared micro-controls (optional) | P3 | ⬜ | — | — |

---

## Wave 0 — Home residual (optional · FREEZE)

**Mục tiêu:** không redesign; chỉ optional / bug.  
**Files:** `HomePage.tsx`, docs

- [ ] (Optional) Screenshot light/dark desktop + mobile cho portfolio
- [ ] Bug only: mini card vs FAB overlap trên máy nhỏ (verify tay)
- [ ] Bug only: Recs empty khi API fail + homepage products rỗng
- [ ] **Không làm:** phase UI mới, bento/hero/trust rewrite

**Done khi:** freeze giữ nguyên; optional shots nếu cần demo.

---

## Wave 1 — Shared ProductCard tokens (P0)

**Mục tiêu:** catalog card chuẩn token; lan ProductList / Detail / mọi chỗ dùng ProductCard.  
**Files:** `frontend/src/components/common/ProductCard.tsx` (+ test nếu có)

- [x] Stock còn hàng: `text-emerald-*` → `text-success`
- [x] Badge hết hàng: `bg-red-100 text-red-800…` → `bg-muted text-muted-foreground` (khớp UI_PATTERNS)
- [x] Verify sale badge đã `bg-sale` (giữ)
- [x] Aspect catalog: giữ `4/3` nếu đã có; không đổi sang square
- [x] `npm run build` pass
- [x] Smoke: ProductList + ProductDetail related/grid

**Done khi:** không raw emerald/red semantic trên ProductCard.

**Không làm:** redesign card layout lớn; đổi API product.

### Cách test Wave 1 (ProductCard)

**Chuẩn bị:** FE dev server + BE có data (còn hàng, sale, hết hàng nếu seed được).

1. **ProductList** (`/products`)
   - Card còn hàng: dòng stock màu **success** (xanh token, không emerald Tailwind raw).
   - Card sale: badge `-X%` màu **sale** (góc trên trái).
   - Card hết hàng: badge **Hết hàng** góc phải = `muted` (xám), không nền đỏ nhạt; text stock = destructive.
   - Ảnh card tỷ lệ **4/3**; hover shadow + scale nhẹ.
2. **Dark mode:** bật theme tối — stock success + badge hết hàng vẫn đọc được, không “đỏ raw” vỡ dark.
3. **ProductDetail** (nếu grid/related dùng ProductCard): cùng kiểm stock/badge.
4. **Regress nhẹ:** click vào card → đúng `/products/:id`; wishlist hover (nếu bật `showWishlist`) vẫn hoạt động.
5. **Build:** `cd frontend && npm run build` (đã pass khi ship wave).

**Pass khi:** không còn emerald/red-100 trên card; list + dark OK.

---

## Wave 2 — Cart — sale token + Button (P0)

**Mục tiêu:** funnel cart đúng token + shadcn controls.  
**Files:** `frontend/src/pages/CartPage.tsx`

- [x] Giá sale: `text-destructive` → `text-sale`
- [x] Nút qty − / + : raw `<button>` → `Button` (size icon / ghost), giữ `updatingId` + disable max stock
- [x] Nút xóa item: raw `<button>` → `Button` variant ghost/destructive-ish (không phá confirm nếu có)
- [x] Ảnh line item: `aspect-square` **giữ** (cart thumb — ngoại lệ catalog 4/3)
- [x] Empty / CAB / summary: không regression
- [x] `npm run build` pass
- [x] Test tay: qty, max stock, xóa, đi checkout

**Done khi:** không `text-destructive` cho sale; interactive chính dùng Button.

**Không làm:** đổi cart BE; redesign summary lớn.

### Cách test Wave 2 (Cart)

1. Login → thêm SP có **sale_price** + SP giá thường vào giỏ (`/cart`).
2. **Giá sale:** màu **sale** (không đỏ destructive).
3. **Qty − / +:** bấm liên tục — spinner/disable per-item; `+` disable khi `quantity >= stock` + hint tồn kho (nếu có).
4. **Xóa:** xoá 1 line — toast/update giỏ đúng; empty state hiện khi hết item.
5. **Keyboard/focus:** Tab tới − / + / xóa — focus ring Button rõ.
6. Light + dark + mobile width.
7. **CTA:** “Thanh toán” / sang checkout không gãy.
8. `npm run build`.

**Pass khi:** sale token đúng; không raw button qty/xóa; stock max vẫn chặn.

---

## Wave 3 — Checkout — empty Button asChild (P0)

**Mục tiêu:** empty/error CTAs chuẩn shadcn; không đụng payment logic.  
**Files:** `frontend/src/pages/CheckoutPage.tsx`

- [x] Empty cart: `Link` + raw `<button>` → `Button asChild` + `Link` (error state cart load)
- [x] Rà hardcode `bg-white` / raw button còn sót (không có bg-white; payment cards giữ button toggle)
- [x] Giữ validation thủ công + VNPay + stepper (không refactor form RHF)
- [x] `npm run build` pass
- [x] Test tay: empty cart CTAs; happy path form (không cần full VNPay sandbox nếu đã verify trước)

**Done khi:** empty state CTA focus-ring chuẩn; payment flow nguyên.

**Không làm:** sửa VNPay callback / replay; cài shadcn Form.

### Cách test Wave 3 (Checkout)

1. **Empty cart path:** giỏ trống → `/checkout` (hoặc redirect) — CTA “Quay lại giỏ” / “Xem sản phẩm” là **Button** (focus ring), click đúng route.
2. **Happy form:** giỏ có hàng → điền họ tên / SĐT / địa chỉ — validation `*` + lỗi inline.
3. **Không regression VNPay:** chọn VNPay → submit chỉ tới bước tạo URL/redirect như cũ (không cần full sandbox nếu đã verify trước; **không** sửa callback).
4. Light + dark + mobile (summary collapsible nếu có).
5. `npm run build`.

**Pass khi:** empty CTAs shadcn; form + payment path không đổi logic.

---

## Wave 4 — Sale / success token sweep (P1)

**Mục tiêu:** thống nhất semantic color ngoài Home.  
**Files (rà + sửa):**

| Vùng | Việc |
|------|------|
| Cart (nếu Wave 2 xong) | verify `text-sale` |
| ProductCard (Wave 1) | verify `text-success` |
| OrdersTab | `text-emerald-*` success chip → `text-success` / `bg-success/10` nếu semantic |
| CustomersAlsoBought | đã `text-sale` — verify |
| WishlistTab | đã `text-sale` — verify |
| Bất kỳ `text-destructive` cho **giá sale** | → `text-sale` |
| Bất kỳ `text-emerald-*` cho **còn hàng / thành công** | → `text-success` |

Checklist:

- [x] Grep `text-destructive` gần `sale_price` / formatPrice sale
- [x] Grep `text-emerald-` semantic (không decorative admin identity)
- [x] Grep `bg-red-100` / raw red badge catalog
- [x] Document trong UI_PATTERNS nếu chốt “giá sale = text-sale” 100% (storefront: sale = text-sale; admin status identity giữ riêng Wave 10)
- [x] `npm run build` pass

**Done khi:** grep sạch semantic lệch (trừ admin identity cố ý + Heart fill).

**Không làm:** đổi primary brand; ép Dashboard stat colors về 1 accent.

### Cách test Wave 4 (Token sweep)

1. **Grep gate (dev):**
   - `rg "sale_price|formatPrice" -g "*.tsx"` quanh chỗ còn `text-destructive`
   - `rg "text-emerald-" frontend/src` — chỉ còn decorative admin nếu cố ý
2. **UI spot-check:** Cart sale, Wishlist sale, CAB sale, OrdersTab success chip, ProductCard stock.
3. Light + dark trên 2–3 trang trên.
4. `npm run build`.

**Pass khi:** semantic sale/success dùng token; admin identity dashboard **không** bị ép đổi nếu đã chốt.

---

## Wave 5 — Chat product cards + residual (P1)

**Mục tiêu:** surface AI đồng bộ catalog nhẹ; **không** sửa SSE stream.  
**Files:** `frontend/src/pages/ChatPage.tsx` (+ component card reply nếu tách)

- [x] Product reply card: cân `aspect-square` → `aspect-[4/3]` (hoặc document ngoại lệ compact chat)
- [x] Giá sale trong bubble (nếu có): `text-sale`
- [x] Sparkles header/empty: **giữ** nếu context AI (không bắt buộc đổi)
- [x] Raw controls (nếu còn ngoài stream Stop/Send): Button shadcn (card “Xem” đã Button; stream Stop/Send giữ)
- [x] **Không** đổi `streamChat` / abort / token append logic
- [x] `npm run build` pass
- [x] Test tay: send, stream, stop, product chip/card click

**Done khi:** card gợi ý trong chat không lệch pattern catalog quá xa; stream intact.

### Cách test Wave 5 (Chat)

1. `/chat` — empty chips → gửi tin → **stream token** vẫn chảy; **Stop** abort đúng (không double message).
2. Reply có product card: ratio 4/3 (nếu đã đổi); giá sale đúng token; click → product detail.
3. Refresh / localStorage chat cũ vẫn load.
4. Light + dark + mobile (scroll trong khung chat, không nhảy page).
5. `npm run build`.

**Pass khi:** UX card ổn; **SSE/stream không regression**.

---

## Wave 6 — ProductList / Search buttons (P1)

**Mục tiêu:** discovery surface — control shadcn + card sau Wave 1.  
**Files:** `ProductListPage.tsx`, `SearchAutocomplete.tsx`, (optional) `CommandPalette.tsx`

- [x] ProductList: empty/loading; filter chips; dùng ProductCard đã token-fix
- [x] SearchAutocomplete: raw `<button>` → Button / role=option pattern (giữ keyboard nav) — clear history = Button; option list giữ button+role
- [x] CommandPalette: raw buttons → Button nếu low-risk (skip — listbox options, low risk defer Wave 11)
- [x] `npm run build` pass
- [x] Test: search keyboard, recent searches, filter list

**Done khi:** list + search không raw button critical path; card token đúng.

**Không làm:** rewrite filter IA.

### Cách test Wave 6 (List / Search)

1. `/products` — filter/chip, pagination, empty khi filter 0 kết quả; ProductCard token (Wave 1).
2. **SearchAutocomplete (header):** gõ → gợi ý; **↑↓ Enter Esc**; recent searches; clear.
3. CommandPalette (nếu sửa): mở/đóng, chọn item.
4. Light + dark + mobile.
5. `npm run build`.

**Pass khi:** keyboard search không gãy; list empty/loading OK.

---

## Wave 7 — ProductDetail residual (P1)

**Mục tiêu:** polish còn sót; không đụng buy flow atomic.  
**Files:** `ProductDetailPage.tsx`, `ImageGallery.tsx`, `ReviewSection.tsx`, `CustomersAlsoBought.tsx`

- [x] ImageGallery thumbs: raw button → Button/toggle pattern (giữ snap scroll)
- [x] Sale/giá: token sale nếu còn destructive/primary lẫn
- [x] Sticky CTA mobile: verify không che FAB-global (Home FAB không hiện ở route khác — OK)
- [x] CustomersAlsoBought: aspect/ratio + text-sale (đã có SaleBadge)
- [x] `npm run build` pass
- [x] Test: gallery, zoom dialog, add cart, buy now, tabs reviews

**Done khi:** detail consistent token; gallery a11y tốt hơn.

**Không làm:** đổi stock check BE; rewrite reviews API.

### Cách test Wave 7 (ProductDetail)

1. Gallery: đổi thumb, zoom dialog, keyboard/focus thumb nếu là Button.
2. Giá sale token; sticky CTA mobile (thêm giỏ / mua ngay).
3. Tabs Mô tả | Thông số | Đánh giá; CAB scroll.
4. Hết hàng: CTA disable/đúng copy.
5. `npm run build`.

**Pass khi:** gallery + buy path OK; token giá/stock nhất quán.

---

## Wave 8 — Account / OrderDetail (P2)

**Files:** `ProfilePage`, `components/account/*`, `OrderDetailPage.tsx`

- [x] OrdersTab: emerald success → `text-success` / `bg-success/10` (đã Wave 4 “Đã đánh giá”)
- [x] OrderDetail: status badge map UI_PATTERNS (pending/processing/completed/cancelled) — `orderStatus.ts`
- [x] WishlistTab: verify text-sale (đã)
- [x] Reorder / Mua lại: không regression (không đụng logic)
- [x] `npm run build` pass (+ `orderStatus.test.ts` 6/6)

**Done khi:** account semantic colors token; status badge nhất quán.

### Cách test Wave 8 (Account / Order)

1. `/profile?tab=orders` — chip/status success dùng token; “Mua lại” partial-fail toast nếu có.
2. Order detail timeline + badge status (pending…cancelled) đúng bảng UI_PATTERNS.
3. Wishlist tab giá sale.
4. Light + dark.
5. `npm run build`.

**Pass khi:** không emerald raw trên success chip; badge status đọc được dark mode.

---

## Wave 9 — Blog list/detail (P2)

**Files:** `BlogListPage.tsx`, `BlogDetailPage.tsx`, (admin blog optional riêng)

- [ ] BlogList: raw `<button>` pagination/filter → Button
- [ ] Empty/loading skeleton nếu thiếu
- [ ] Detail: typography/spacing nhẹ (không full redesign)
- [ ] `formatDateShort/Long` đã dùng — giữ
- [ ] `npm run build` pass

**Done khi:** blog storefront không raw button chính; đọc ổn mobile.

**Không làm:** CMS mới; blog block trên Home.

### Cách test Wave 9 (Blog)

1. `/blog` — pagination/filter Button; empty nếu 0 bài.
2. Detail — đọc mobile, ngày format, back list.
3. Light + dark.
4. `npm run build`.

**Pass khi:** không raw button phân trang; layout không vỡ mobile.

---

## Wave 10 — Admin status badges (P3)

**Files:** `AdminUserPage`, `AdminAuditPage`, `AdminOrderPage`, `AdminDashboardPage` (chỉ chỗ raw status)

- [ ] Map status → UI_PATTERNS Status Badge (pending/processing/completed/cancelled)
- [ ] User active/inactive: tránh `bg-red-50` raw nếu có token/muted
- [ ] **Giữ** Dashboard metric color identity (user đã chốt)
- [ ] Empty/error states: verify
- [ ] `npm run build` pass

**Done khi:** admin tables status đọc dark mode ổn; không ép landing aesthetic.

### Cách test Wave 10 (Admin)

1. Login admin → Users / Orders / Audit: badge status light+dark.
2. Dashboard: **metric màu identity giữ nguyên** (không regress chart).
3. Empty table + error load (nếu mock được).
4. `npm run build`.

**Pass khi:** status token; dashboard charts/stat colors không bị “sanitize” nhầm.

---

## Wave 11 — Shared micro-controls (P3 · optional)

**Files:** `HeartButton.tsx`, `StarRating.tsx`, `ImageGallery` (nếu sót), v.v.

- [ ] HeartButton: optional bọc styling shadcn; **giữ** API wishlist + motion burst
- [ ] StarRating: button a11y / Button nếu cần
- [ ] Không đổi behavior favorited

**Done khi:** micro-controls consistent enough; không bắt buộc 100% Button.

### Cách test Wave 11 (micro)

1. HeartButton: add/remove wishlist (auth + unauth → login).
2. StarRating: chọn sao (form review) nếu đụng.
3. `npm run build`.

**Pass khi:** behavior wishlist/rating không đổi.

---

## Out of scope (cố định)

| Item | Lý do |
|------|--------|
| Home redesign wave mới | FREEZE 2026-07-13 |
| Blog section trên Home | Đẩy Featured; đã out-scope |
| GSAP / marquee / liquid glass | MOTION + e-com trust |
| Đổi Geist / Lucide / shadcn stack | CLAUDE.md |
| VNPay / SSE stream / stock atomic | Critical path |
| Full-site 1 PR | Risk review |

---

## Manual test matrix (mỗi wave P0–P1)

| Check | Cart | Checkout | List | Detail | Chat |
|-------|------|----------|------|--------|------|
| Light + dark | ☐ | ☐ | ☐ | ☐ | ☐ |
| Mobile width | ☐ | ☐ | ☐ | ☐ | ☐ |
| Primary CTA focus | ☐ | ☐ | ☐ | ☐ | ☐ |
| `npm run build` | ☐ | ☐ | ☐ | ☐ | ☐ |

---

## Log

| Ngày | Wave | Việc | Commit | Ghi chú |
|------|------|------|--------|---------|
| 2026-07-13 | — | Tạo backlog sau review post-Home freeze | — | Recommend start Wave 1 |
| 2026-07-13 | 1 | ProductCard: success stock + muted hết hàng; thêm cách test từng wave | (chưa commit) | build pass |
| 2026-07-13 | 2 | Cart: text-sale + Button qty/xóa + text-success phí ship | (chưa commit) | build pass |
| 2026-07-13 | 3 | Checkout error CTAs Button asChild; empty giỏ vẫn redirect /cart | `63f2df1` | build pass |
| 2026-07-13 | 4–5 | Token sale/success + Chat 4/3 | `12db750` | build pass |
| 2026-07-13 | 6–7 | List chips + Gallery Button | `1fa80de` | build pass |
| 2026-07-13 | docs | tick P1 | `e842f2c` | — |
| 2026-07-13 | 8 | orderStatus badges UI_PATTERNS + fallback muted | (chưa commit) | tests 6/6 |
| | | | | |

---

## Next action

**Wave 8 code done (chưa commit).** Recommend: commit Wave 8 → **Wave 9** Blog (P2) hoặc push.

Home: **không** mở task UI mới trừ bug (Wave 0).

Khi bắt đầu wave: status → 🔄 · xong → ✅ + hash · cập nhật log.
