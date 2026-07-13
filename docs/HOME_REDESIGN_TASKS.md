# HomePage Redesign — Task Control

> **Mục tiêu:** nâng Home thành landing e-com tin cậy, product-forward, anti-slop.  
> **Mode:** redesign-preserve (không overhaul brand / token / stack).  
> **Source of truth:** `UI_PATTERNS.md` > skill taste (mâu thuẫn → báo trước, không tự áp).  
> **Skills:** `design-taste-frontend` + `redesign-existing-projects` (Leonxlnx/taste-skill).  
> **Cập nhật lần cuối:** 2026-07-13

---

## Dials (giữ cố định trừ khi chốt lại)

| Dial | Value | Ý nghĩa |
|------|-------|---------|
| `DESIGN_VARIANCE` | 5 | Left-align + asymmetry nhẹ (Categories bento) |
| `MOTION_INTENSITY` | 4 | Stagger nhẹ, không GSAP / marquee / sticky-stack |
| `VISUAL_DENSITY` | 5 | E-com dense vừa, không gallery airy |

---

## Quy tắc làm việc (bắt buộc)

1. **1 phase / 1 lượt code** — không gộp nhiều phase.
2. **Audit 5–8 dòng → confirm user → code** (trừ phase user đã chốt sẵn).
3. **Test sau mỗi phase:** light + dark + mobile; `cd frontend && npm run build`.
4. **Commit theo chức năng** (1 phase ≈ 1 commit, hoặc tách docs/code nếu cần).
5. **Cập nhật file này** khi xong task: `[ ]` → `[x]`, điền ngày + hash commit.
6. **Không đụng:** payment/VNPay, chat SSE stream, stock atomic, cài UI lib mới, đổi font khỏi Geist, đổi Lucide → Phosphor.
7. **Không làm:** blog section trên Home, Awwwards motion, overhaul IA/nav.

---

## Tiến độ tổng

| Phase | Tên | Status | Commit | Ngày |
|-------|-----|--------|--------|------|
| 0 | Chốt pattern docs | ✅ done | (chưa commit) | 2026-07-13 |
| 1 | Hero polish | ⬜ todo | — | — |
| 2 | Categories bento | ⬜ todo | — | — |
| 3 | Recommendations consistency | ⬜ todo | — | — |
| 4 | Flash Sale polish | ⬜ todo | — | — |
| 5 | Featured + Trust | ⬜ todo | — | — |
| 6 | Landing glue + a11y | ⬜ todo | — | — |
| 7 | Docs freeze + portfolio | ⬜ todo | — | — |

**Status legend:** ⬜ todo · 🔄 in progress · ✅ done · ⏸ blocked · ❌ cancelled

---

## Phase 0 — Chốt chuẩn vào UI_PATTERNS

**Mục tiêu:** pattern mới được document trước khi code nhiều.  
**Effort:** ~½ ngày · **Risk:** thấp

- [x] Thêm rule Hero: no em-dash; subtext ≤ ~20 từ; bind số liệu động
- [x] Thêm rule Hero mobile: mini product card dưới CTA (`lg:hidden` hoặc tương đương)
- [x] Thêm rule Categories: bento (1 large + N small / 2+3), không equal 5-col
- [x] Thêm rule Product card trên Home: **luôn `aspect-[4/3]`** (khớp ProductCard)
- [x] Thêm rule Trust strip: **1 accent family** (không rainbow 4 màu)
- [x] Thêm rule “Xem tất cả”: tối đa 1–2 lần / page; tránh 3 link identical
- [x] Cập nhật mục “Redesign HomePage — tiến độ” (bỏ follow-up đã xong: Button shadcn, flag bar, AI section, Sparkles, success token)

**Done khi:** `UI_PATTERNS.md` phản ánh đủ rule Phase 1–5; không còn follow-up mâu thuẫn code đã ship.

**Không làm:** code UI.

---

## Phase 1 — Hero polish

**Mục tiêu:** first impression product-forward, copy sạch, mobile có product.  
**Effort:** 1–2 ngày · **Risk:** thấp–trung · **Files chính:** `HomePage.tsx`, (optional) asset URL

- [ ] H1: bỏ em-dash (`—` → `.` hoặc `-` / viết lại câu)
- [ ] Subtext: ≤ ~20 từ; giữ bind `totalProducts`
- [ ] Type scale: cân nhắc `text-4xl md:text-5xl lg:text-6xl` nếu vẫn ≤ 2 dòng desktop
- [ ] Hero background: đổi sang product-forward shot (giữ overlay + ambient glow pattern UI_PATTERNS)
- [ ] Desktop showcase (`xl:`): giữ absolute zero-shift; polish hover/depth nếu cần
- [ ] Mobile/tablet: mini product card dưới CTA (không chỉ stock bg)
- [ ] Loading/empty hero product: skeleton hoặc ẩn an toàn (đã có — verify sau đổi)
- [ ] Test light/dark + iOS `dvh` + CTA focus-ring
- [ ] `npm run build` pass

**Done khi:** phone + desktop đều thấy product thật trong hero; copy không em-dash; CTA visible above fold.

**Không làm:** Categories, Trust, GSAP, đổi token màu.

---

## Phase 2 — Categories bento

**Mục tiêu:** phá equal grid 5 ô đều tay.  
**Effort:** ~1 ngày · **Risk:** trung · **Files chính:** `HomePage.tsx`

- [ ] Desktop: bento 1 large + 4 small **hoặc** 2+3 (N items → N cells, không ô trống)
- [ ] Mobile `< md`: 2 cột đều, rõ ràng
- [ ] Ảnh category + hover scale; semantic tokens only
- [ ] Header giữ flag bar (đã chốt)
- [ ] Test light/dark + 0 / 1 / 5 categories edge
- [ ] `npm run build` pass
- [ ] Cập nhật UI_PATTERNS nếu pattern bento chốt khác docs Phase 0

**Done khi:** section không còn “5 tile catalog đều”; mobile không gãy.

**Không làm:** hero, Recs, blog.

---

## Phase 3 — Recommendations consistency

**Mục tiêu:** card đồng bộ ProductCard; bớt dead UI; giảm lặp CTA.  
**Effort:** ~1 ngày · **Risk:** thấp · **Files chính:** `HomePage.tsx`

- [ ] Card image: `aspect-square` → `aspect-[4/3]`
- [ ] Wishlist hover button: **wire** (API wishlist) **hoặc remove** (không để dead control)
- [ ] Icon “xem chi tiết”: không dùng `ShoppingCart` (đổi `ArrowUpRight` / tương đương lucide)
- [ ] “Xem tất cả”: bỏ hoặc đổi wording (giảm lặp với Featured)
- [ ] Giữ: reason chip, quick-buy Button + pending disable, motion stagger
- [ ] Test quick-buy auth/unauth + loading skeleton
- [ ] `npm run build` pass

**Done khi:** Recs trông cùng “họ” với Featured; không dead button; icon semantics đúng.

**Không làm:** đổi recommendation API / strategy.

---

## Phase 4 — Flash Sale polish

**Mục tiêu:** identity sale rõ, không fake urgency (đã có stock thật).  
**Effort:** ½–1 ngày · **Risk:** thấp · **Files chính:** `HomePage.tsx`

- [ ] Header + countdown denser / căn hàng gọn (giữ Zap + sale identity)
- [ ] Card trong banner: padding/badge/giá đồng bộ
- [ ] “Xem tất cả” sale: giữ **hoặc** gộp theo rule max 1–2 / page (chốt ở Phase 0)
- [ ] Verify token `sale` only (không raw red)
- [ ] Test 0 flash products (section ẩn) + stock ≤ 5 badge
- [ ] `npm run build` pass

**Done khi:** banner sale gọn, thật, không progress bar giả.

**Không làm:** BE field “đã bán”; đổi countdown logic trừ bug.

---

## Phase 5 — Featured + Trust

**Mục tiêu:** product grid chuẩn + trust 1 accent, layout khác card-grid.  
**Effort:** ~1 ngày · **Risk:** thấp · **Files chính:** `HomePage.tsx`

### Featured
- [ ] Đúng ProductCard pattern (`aspect-[4/3]`, badge, hover, giá primary)
- [ ] Spacing/nhịp section; “Xem tất cả” — **primary browse CTA** của page (nếu chỉ giữ 1)
- [ ] Stock text dùng `text-success` / `text-destructive` (đã có — verify)

### Trust
- [ ] 1 accent family (`text-primary bg-primary/10` hoặc muted thống nhất)
- [ ] Layout divider / inline row (không 4 rainbow equal cards) — chốt visual trước khi code nếu cần mock
- [ ] Copy trust giữ tiếng Việt cụ thể (BH, giao hàng, đổi trả, VNPay/COD)

- [ ] Test light/dark
- [ ] `npm run build` pass

**Done khi:** Featured = catalog chuẩn; Trust không rainbow; browse CTA không lặp 3 lần.

---

## Phase 6 — Landing glue + a11y

**Mục tiêu:** nhịp page + trạng thái + a11y hoàn thiện.  
**Effort:** 1–2 ngày · **Risk:** thấp · **Files chính:** `HomePage.tsx`, có thể `lib/motion`

- [ ] Section rhythm: `border-t` / `bg-muted/30` có chủ đích (không dark-block giữa light page)
- [ ] `useReducedMotion` cho stagger Recs (và motion khác nếu có)
- [ ] Empty/loading mọi block còn sót
- [ ] Focus-visible CTA; contrast AA; alt images đầy đủ
- [ ] FAB: không che content quan trọng mobile (safe-area nếu cần)
- [ ] Rà em-dash / filler copy còn sót
- [ ] `npm run build` pass

**Done khi:** scroll full page mượt, a11y cơ bản ổn, motion tôn trọng reduced-motion.

---

## Phase 7 — Docs freeze + portfolio

**Mục tiêu:** khoá Home, sẵn demo.  
**Effort:** ~½ ngày · **Risk:** thấp

- [ ] `UI_PATTERNS.md`: mục HomePage = **done**; list follow-up còn lại (nếu có) rõ ràng
- [ ] Cập nhật bảng tiến độ file này = tất cả ✅
- [ ] (Optional) Screenshot light/dark desktop+mobile cho portfolio/docs
- [ ] **Freeze Home** — chỉ sửa bug; feature mới sang ProductDetail / Cart / trang khác

**Done khi:** docs khớp code; Home không còn “đang redesign”.

---

## Backlog đã xong (trước file này — 2026-07-13)

Không làm lại trừ regression:

- [x] Token `sale` + `success` (`index.css`)
- [x] Unify sale: SaleBadge, ProductCard, Wishlist, CustomersAlsoBought
- [x] Xoá AI Assistant section (form giả)
- [x] Button shadcn: quick-buy, wishlist shell, FAB, hero CTA
- [x] Giảm Sparkles; FAB → `MessageCircle`
- [x] Flag bar section headers (Recs / Categories / Featured)
- [x] Categories header left-align
- [x] Hero alt text cụ thể hơn
- [x] `RecommendResponse` type shared
- [x] `formatDateShort` / `formatDateLong` gom helper
- [x] Commits: `7c40ce1` · `a9da118` · `71322c1` · `6e23061` · `8c224b0`

---

## Out of scope (ghi rõ để khỏi trôi scope)

| Item | Lý do |
|------|--------|
| Blog trên Home | Đẩy Featured xuống; chưa cần |
| GSAP / marquee / liquid glass | MOTION 4 + perf + e-com trust |
| Đổi Geist / Lucide | Stack đã lock |
| Cài MUI/Ant/Chakra | CLAUDE.md cấm |
| Sửa chat SSE / VNPay / stock BE | Critical path khác |
| Full site redesign 1 PR | Risk cao, khó review |

---

## Log phiên làm việc

| Ngày | Phase | Việc | Commit | Ghi chú |
|------|-------|------|--------|---------|
| 2026-07-13 | — | Tạo file task control + audit taste skill | — | — |
| 2026-07-13 | 0 | Chốt pattern vào UI_PATTERNS + tick Phase 0 | (chưa commit) | Sẵn Phase 1 |
| | | | | |

---

## Next action

**Recommend:** Phase 1 — Hero polish (copy, type scale, product-forward bg, mobile mini card).

Khi bắt đầu phase: đổi status bảng tiến độ → 🔄, tick task con khi xong, ghi commit vào log.
