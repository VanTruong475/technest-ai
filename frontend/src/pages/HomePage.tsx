import { Link, useNavigate } from "react-router-dom";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { useAuthStore } from "@/store/authStore";
import { useRecommendations } from "@/hooks/useRecommendations";
import { Button } from "@/components/ui/button";
import { SaleBadge } from "@/components/common/SaleBadge";
import { useCountdown } from "@/hooks/useCountdown";
import { formatPrice } from "@/utils/format";
import {
  useAddToCart,
  findCartItemId,
  setCheckoutItemIds,
} from "@/hooks/useCart";
import {
  Zap, ArrowRight, MessageCircle,
  Smartphone, ShieldCheck, Truck, RotateCcw, CreditCard, Star, PackageOpen,
} from "lucide-react";
import type { Product, Brand, Category } from "@/types";

// Category images — Unsplash photos matching each category
const CATEGORY_IMAGES: Record<string, string> = {
  "laptop": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80",
  "laptop-gaming": "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&q=80",
  "dien-thoai": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80",
  "tablet": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80",
  "tai-nghe": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80",
  "phu-kien": "https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=600&q=80",
  "default": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
};

export default function HomePage() {
  const navigate = useNavigate();
  const countdown = useCountdown();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addToCartMutation = useAddToCart();

  const handleQuickBuy = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    // 1 round-trip: POST returns cart → filter checkout to this product only
    addToCartMutation.mutate(
      {
        product_id: product.id,
        quantity: 1,
        optimistic: {
          product_name: product.name,
          image_url: product.image_url,
          price: product.price,
          sale_price: product.sale_price,
          stock: product.stock,
        },
      },
      {
        onSuccess: (cart) => {
          const itemId = findCartItemId(cart, product.id);
          if (itemId != null) setCheckoutItemIds([itemId]);
          navigate("/checkout");
        },
      }
    );
  };

  const { data: homepageData, isLoading } = useQuery<{
    brands: Brand[];
    categories: Category[];
    products: Product[];
  }>({
    queryKey: ["homepage"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/homepage");
      return res.data;
    },
    staleTime: 60_000,
  });

  const { data: flashSaleData } = useQuery<{ items: Product[]; total?: number }>({
    queryKey: ["home-flash-sale"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/products", { params: { page: 1, limit: 20 } });
      return res.data;
    },
  });

  const products = homepageData?.products || [];
  const categories = homepageData?.categories || [];

  // Gợi ý cá nhân hoá (có reason). Fallback về sản phẩm homepage nếu rỗng/lỗi.
  const { data: recommendData, isLoading: isRecommendLoading } = useRecommendations(4);
  const recommendations =
    recommendData?.results && recommendData.results.length > 0
      ? recommendData.results
      : products.slice(0, 4).map((p) => ({ product: p, score: 0, reason: "" }));
  const recommendLoading = isRecommendLoading && isLoading;
  const flashSaleProducts = (flashSaleData?.items || []).filter(
    (p) => p.sale_price && p.sale_price < p.price
  );

  // Tổng sản phẩm thật (bind động từ /api/products) — fallback an toàn khi chưa load.
  const totalProducts = flashSaleData?.total;

  // Sản phẩm showcase cho hero (B6-a): loại ảnh vỡ + hết hàng, chọn rating cao nhất
  // (tie-break theo số review). null khi rỗng/lỗi → card tự ẩn, không hiện lỗi.
  const heroProduct =
    products
      .filter((p) => p.image_url && p.stock > 0)
      .sort(
        (a, b) =>
          (b.average_rating ?? 0) - (a.average_rating ?? 0) ||
          (b.review_count ?? 0) - (a.review_count ?? 0)
      )[0] ?? null;

  // Categories bento: max 5 active; ≥3 → 1 large + rest, <3 → equal grid (không ô trống)
  const activeCategories = categories
    .filter((c) => c.is_active !== false)
    .slice(0, 5);
  const useCategoryBento = activeCategories.length >= 3;

  return (
    <div className="min-h-screen mt-32 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
      {/* ═══════════════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════════════ */}
      <section className="relative min-h-[calc(100dvh-128px)] flex items-center overflow-hidden">
        {/* Background — product-forward shot + overlay legibility + ambient glow (UI_PATTERNS) */}
        <div className="absolute inset-0 z-0 bg-muted">
          <OptimizedImage
            src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1920&q=80"
            alt="MacBook và thiết bị công nghệ trên bàn làm việc tối giản"
            width={1920}
            height={1080}
            className="w-full h-full object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent md:hidden" />
          <div className="pointer-events-none absolute right-0 top-0 h-[32rem] w-[32rem] translate-x-1/4 -translate-y-1/4 rounded-full bg-primary/15 blur-[140px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 w-full py-10 md:py-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2.5 mb-6">
              <span className="h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
              <span className="text-sm font-medium tracking-wide text-foreground/80">
                Gợi ý cá nhân hoá bằng AI
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-5 text-balance">
              Laptop, điện thoại, phụ kiện. Chọn đúng ngay từ đầu.
            </h1>

            <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed text-pretty">
              Nói nhu cầu và ngân sách, AI gợi ý từ{" "}
              {totalProducts ? `${totalProducts} sản phẩm` : "hàng trăm sản phẩm"} chính hãng.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button
                asChild
                className="h-auto rounded-2xl px-10 py-4 text-sm font-semibold shadow-xl shadow-primary/30 transition-all duration-200 active:scale-95"
              >
                <Link to="/products">Mua sắm ngay</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="h-auto rounded-2xl border border-primary/20 bg-card px-10 py-4 text-sm font-semibold text-primary transition-all duration-200 hover:bg-muted hover:text-primary"
              >
                <Link to="/chat">Tư vấn AI</Link>
              </Button>
            </div>

            {/* Mobile/tablet product card — in-flow dưới CTA, không absolute (UI_PATTERNS Phase 1) */}
            <div className="xl:hidden mt-8 max-w-sm">
              {isLoading ? (
                <div className="flex gap-3 rounded-2xl border border-border/60 bg-card/95 p-3 shadow-lg backdrop-blur-sm">
                  <div className="aspect-[4/3] w-28 shrink-0 animate-pulse rounded-xl bg-muted" />
                  <div className="flex flex-1 flex-col justify-center gap-2 py-1">
                    <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    <div className="h-5 w-24 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ) : heroProduct ? (
                <Link
                  to={`/products/${heroProduct.id}`}
                  className="group flex gap-3 rounded-2xl border border-border/60 bg-card/95 p-3 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-md"
                >
                  <div className="aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <OptimizedImage
                      src={heroProduct.image_url!}
                      alt={heroProduct.name}
                      width={160}
                      height={120}
                      className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="min-w-0 flex-1 py-0.5">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                      {heroProduct.name}
                    </h3>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      {heroProduct.sale_price != null && heroProduct.sale_price < heroProduct.price ? (
                        <>
                          <span className="text-base font-bold text-primary">
                            {formatPrice(heroProduct.sale_price)}
                          </span>
                          <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(heroProduct.price)}
                          </span>
                        </>
                      ) : (
                        <span className="text-base font-bold text-primary">
                          {formatPrice(heroProduct.price)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ) : null}
            </div>
          </div>

          {/* Desktop showcase — absolute zero layout shift; chỉ ≥xl */}
          <div className="hidden xl:block absolute right-8 top-1/2 w-[300px] -translate-y-1/2">
            {isLoading ? (
              <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-2xl shadow-primary/10">
                <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-muted" />
                <div className="mt-4 space-y-3">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-6 w-28 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ) : heroProduct ? (
              <Link
                to={`/products/${heroProduct.id}`}
                className="group relative block -rotate-1 rounded-3xl border border-border/60 bg-card p-5 shadow-2xl shadow-primary/10 transition-all duration-300 hover:rotate-0 hover:shadow-primary/20"
              >
                <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted">
                  <OptimizedImage
                    src={heroProduct.image_url!}
                    alt={heroProduct.name}
                    width={400}
                    height={300}
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="mt-4">
                  <h3 className="line-clamp-1 font-semibold text-foreground">{heroProduct.name}</h3>

                  {heroProduct.average_rating != null && heroProduct.average_rating > 0 && (
                    <div className="mt-1.5 flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="font-medium text-foreground">
                        {heroProduct.average_rating.toFixed(1)}
                      </span>
                      {heroProduct.review_count ? (
                        <span className="text-muted-foreground">({heroProduct.review_count})</span>
                      ) : null}
                    </div>
                  )}

                  <div className="mt-3 flex items-baseline gap-2">
                    {heroProduct.sale_price != null && heroProduct.sale_price < heroProduct.price ? (
                      <>
                        <span className="text-xl font-bold text-primary">
                          {formatPrice(heroProduct.sale_price)}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(heroProduct.price)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xl font-bold text-primary">
                        {formatPrice(heroProduct.price)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* Trust micro — under hero (divider row, 1 accent) */}
      <section
        className="border-y border-border/40 bg-background"
        aria-label="Cam kết dịch vụ"
      >
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 lg:px-8">
          <ul className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-sm text-muted-foreground">
            {[
              { icon: ShieldCheck, text: "Bảo hành chính hãng" },
              { icon: Truck, text: "Giao nhanh 1-2 ngày" },
              { icon: RotateCcw, text: "Đổi trả 30 ngày" },
              { icon: CreditCard, text: "VNPay · COD" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="font-medium text-foreground/80">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FLASH SALE SECTION
          ═══════════════════════════════════════════════════════ */}
      {flashSaleProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16">
          <div className="bg-sale rounded-[2rem] p-5 md:p-7 shadow-2xl">
            {/* Header denser — 1 hàng md+, countdown + CTA gọn */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <h2 className="flex items-center gap-2 text-2xl font-bold italic uppercase text-sale-foreground md:text-3xl">
                  <Zap className="h-7 w-7 fill-current" aria-hidden="true" />
                  Flash Sale
                </h2>
                <div className="flex items-center gap-2" aria-label={`Kết thúc sau ${countdown.display}`}>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-sale-foreground/75">
                    Còn
                  </span>
                  <div className="flex gap-1">
                    {countdown.display.split(":").map((part, i) => (
                      <span
                        key={i}
                        className="min-w-[1.75rem] rounded-md bg-black/20 px-1.5 py-0.5 text-center text-sm font-bold tabular-nums text-sale-foreground"
                      >
                        {part}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {/* Giữ 1 browse sale + Featured = 2 max “Xem tất cả” / page */}
              <Link
                to="/products"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-sale-foreground/90 hover:text-sale-foreground hover:underline"
              >
                Xem deal <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Products — aspect 4/3, SaleBadge, stock thật ≤5 */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
              {flashSaleProducts.slice(0, 4).map((product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-card p-3 transition-all hover:shadow-lg md:p-4"
                >
                  <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                    {product.image_url ? (
                      <OptimizedImage
                        src={product.image_url}
                        alt={product.name}
                        width={400}
                        height={300}
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Smartphone className="h-14 w-14 text-muted-foreground/30" />
                      </div>
                    )}
                    <SaleBadge price={product.price} salePrice={product.sale_price!} />
                  </div>

                  <h3 className="mb-2 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-foreground">
                    {product.name}
                  </h3>

                  <div className="mt-auto flex flex-col gap-0.5">
                    <span className="text-lg font-bold text-sale md:text-xl">
                      {formatPrice(product.sale_price!)}
                    </span>
                    <span className="text-xs text-muted-foreground line-through">
                      {formatPrice(product.price)}
                    </span>
                    {product.stock > 0 && product.stock <= 5 && (
                      <p className="mt-1.5 text-xs font-semibold text-sale">
                        Chỉ còn {product.stock} sản phẩm
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          RECS — Apple "hero pick" stage (1 product + side picks)
          NOT a 4-equal product-card grid
          ═══════════════════════════════════════════════════════ */}
      <section className="bg-muted/40 border-y border-border/30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-16">
          {recommendLoading ? (
            <div className="grid lg:grid-cols-12 gap-8 animate-pulse">
              <div className="lg:col-span-7 aspect-[4/3] rounded-3xl bg-muted" />
              <div className="lg:col-span-5 space-y-4 py-4">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-10 w-3/4 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-12 w-40 bg-muted rounded-full" />
              </div>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-10">
              <PackageOpen className="h-10 w-10 mx-auto text-muted-foreground/40" aria-hidden />
              <p className="mt-3 font-medium">Chưa có gợi ý</p>
              <p className="mt-1 text-sm text-muted-foreground">Chat AI để nhận đề xuất phù hợp.</p>
              <Button asChild className="mt-5 rounded-full">
                <Link to="/chat">Tư vấn AI</Link>
              </Button>
            </div>
          ) : (
            (() => {
              const primary = recommendations[0];
              const rest = recommendations.slice(1, 4);
              const p = primary.product;
              const hasSale = p.sale_price != null && p.sale_price < p.price;
              const unit = hasSale ? p.sale_price! : p.price;
              return (
                <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                  {/* Stage — huge product on soft field (Apple storefront) */}
                  <Link
                    to={`/products/${p.id}`}
                    className="lg:col-span-7 group relative block"
                  >
                    <div className="relative aspect-[4/3] sm:aspect-[16/11] rounded-[2rem] bg-gradient-to-b from-background to-muted/80 overflow-hidden">
                      {p.image_url ? (
                        <OptimizedImage
                          src={p.image_url}
                          alt={p.name}
                          width={900}
                          height={700}
                          className="absolute inset-0 m-auto h-[78%] w-[78%] object-contain transition-transform duration-700 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Smartphone className="h-20 w-20 text-muted-foreground/20" />
                        </div>
                      )}
                      {hasSale && (
                        <div className="absolute top-5 left-5">
                          <SaleBadge price={p.price} salePrice={p.sale_price!} />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Copy + CTA — no AI/reason notes on product */}
                  <div className="lg:col-span-5 space-y-5">
                    <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.1] text-balance">
                      <Link to={`/products/${p.id}`} className="hover:text-primary transition-colors">
                        {p.name}
                      </Link>
                    </h2>
                    <p className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums">
                      {formatPrice(unit)}
                      {hasSale && (
                        <span className="ml-3 text-base font-normal text-muted-foreground line-through">
                          {formatPrice(p.price)}
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-3 pt-1">
                      <Button
                        size="lg"
                        className="rounded-full h-12 px-7 font-semibold"
                        onClick={(e) => handleQuickBuy(e, p)}
                        disabled={
                          addToCartMutation.isPending &&
                          addToCartMutation.variables?.product_id === p.id
                        }
                      >
                        Mua ngay
                      </Button>
                      <Button asChild size="lg" variant="outline" className="rounded-full h-12 px-7">
                        <Link to={`/products/${p.id}`}>Xem chi tiết</Link>
                      </Button>
                    </div>

                    {/* Side picks — thumb row, not equal cards */}
                    {rest.length > 0 && (
                      <div className="pt-4 border-t border-border/50">
                        <p className="text-xs text-muted-foreground mb-3">Cũng có thể bạn thích</p>
                        <ul className="flex gap-3">
                          {rest.map(({ product: rp }) => (
                            <li key={rp.id}>
                              <Link
                                to={`/products/${rp.id}`}
                                className="block h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-background border border-border/40 overflow-hidden hover:border-primary/40 transition-colors"
                                aria-label={rp.name}
                              >
                                {rp.image_url ? (
                                  <OptimizedImage
                                    src={rp.image_url}
                                    alt={rp.name}
                                    width={80}
                                    height={80}
                                    className="h-full w-full object-contain p-1.5"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <Smartphone className="h-6 w-6 text-muted-foreground/30" />
                                  </div>
                                )}
                              </Link>
                            </li>
                          ))}
                          <li className="flex items-center">
                            <Link
                              to="/chat"
                              className="text-xs font-medium text-primary hover:underline pl-1"
                            >
                              Hỏi AI →
                            </Link>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CATEGORIES — bento: 1 large + N small (md+); 2-col equal (< md)
          ═══════════════════════════════════════════════════════ */}
      {activeCategories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex items-center gap-2.5 mb-8">
            <span className="h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
            <h2 className="font-semibold text-xl md:text-2xl">Danh mục hàng đầu</h2>
          </div>

          <div
            className={
              useCategoryBento
                ? "grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 md:auto-rows-[minmax(140px,auto)]"
                : "grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4"
            }
          >
            {activeCategories.map((cat, i) => {
              const img = CATEGORY_IMAGES[cat.slug] || CATEGORY_IMAGES.default;
              const isFeatured = useCategoryBento && i === 0;

              return (
                <Link
                  key={cat.id}
                  to={`/products?category_id=${cat.id}`}
                  className={
                    isFeatured
                      ? "group relative col-span-2 row-span-1 md:row-span-2 min-h-[180px] overflow-hidden rounded-2xl border border-border/60 bg-card md:min-h-0"
                      : "group relative overflow-hidden rounded-2xl border border-border/60 bg-card"
                  }
                >
                  <div
                    className={
                      isFeatured
                        ? "absolute inset-0 bg-muted"
                        : "aspect-[4/3] w-full bg-muted"
                    }
                  >
                    <OptimizedImage
                      src={img}
                      alt={cat.name}
                      width={isFeatured ? 800 : 400}
                      height={isFeatured ? 600 : 300}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                  </div>

                  <div
                    className={
                      isFeatured
                        ? "absolute inset-x-0 bottom-0 p-4 md:p-6"
                        : "absolute inset-x-0 bottom-0 p-3"
                    }
                  >
                    <h3
                      className={
                        isFeatured
                          ? "text-lg md:text-xl font-semibold text-foreground line-clamp-1"
                          : "text-sm font-semibold text-foreground line-clamp-1"
                      }
                    >
                      {cat.name}
                    </h3>
                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-all group-hover:gap-1.5 group-hover:text-primary">
                      Khám phá <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          FEATURED — Xiaomi/Apple horizontal showcase shelf
          Full-bleed scroll, large tiles, NO equal product-card grid
          ═══════════════════════════════════════════════════════ */}
      <section className="bg-background py-14 md:py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Sản phẩm nổi bật
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Vuốt xem · chạm để mở
            </p>
          </div>
          <Link
            to="/products"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Xem tất cả
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex gap-4 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[360px] sm:h-[400px] w-[min(72vw,280px)] sm:w-[300px] shrink-0 rounded-3xl bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="max-w-7xl mx-auto px-4 flex flex-col items-center py-12 text-muted-foreground">
            <PackageOpen className="h-12 w-12" aria-hidden />
            <p className="mt-4 text-lg font-medium text-foreground">Chưa có sản phẩm nổi bật</p>
            <Button asChild variant="outline" className="mt-6 rounded-full">
              <Link to="/products">Xem sản phẩm</Link>
            </Button>
          </div>
        ) : (
          /* items-stretch + fixed height: tránh tile lead/CTA cao lệch → trồi trụt */
          <div
            className="flex items-stretch gap-4 overflow-x-auto snap-x snap-mandatory px-4 md:px-6 lg:px-8 max-w-7xl mx-auto scroll-pl-4 md:scroll-pl-6 lg:scroll-pl-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {products.slice(0, 6).map((product) => {
              const hasSale =
                product.sale_price != null && product.sale_price < product.price;
              return (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  className="group relative flex h-[360px] sm:h-[400px] w-[min(72vw,280px)] sm:w-[300px] shrink-0 snap-start flex-col overflow-hidden rounded-3xl bg-muted/50"
                >
                  {/* Image area — fixed flex grow, scale only (no translate) */}
                  <div className="relative min-h-0 flex-1 overflow-hidden">
                    {product.image_url ? (
                      <OptimizedImage
                        src={product.image_url}
                        alt={product.name}
                        width={360}
                        height={400}
                        className="absolute inset-0 h-full w-full object-contain p-5 sm:p-6 transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Smartphone className="h-14 w-14 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>
                  {/* Text block — fixed in flow, not absolute overlay (ổn định chiều cao) */}
                  <div className="shrink-0 border-t border-border/20 bg-card/80 px-4 py-3.5 backdrop-blur-sm">
                    {hasSale && (
                      <span className="mb-1 block text-[11px] font-semibold text-sale">
                        Giảm giá
                      </span>
                    )}
                    <h3 className="text-sm font-semibold tracking-tight line-clamp-2 min-h-[2.5rem]">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-sm font-medium tabular-nums text-muted-foreground">
                      {hasSale ? (
                        <>
                          <span className="text-foreground font-semibold">
                            {formatPrice(product.sale_price!)}
                          </span>
                          <span className="ml-2 line-through">
                            {formatPrice(product.price)}
                          </span>
                        </>
                      ) : (
                        formatPrice(product.price)
                      )}
                    </p>
                  </div>
                </Link>
              );
            })}
            {/* CTA cùng chiều cao hàng */}
            <Link
              to="/products"
              className="flex h-[360px] sm:h-[400px] w-[min(60vw,220px)] sm:w-[240px] shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/60 bg-muted/30 p-6 hover:bg-muted/50 transition-colors"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <ArrowRight className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-center">
                Xem toàn bộ
                <br />
                sản phẩm
              </span>
            </Link>
          </div>
        )}
      </section>

      {/* CTA band — distinct layout family (full-width dark) */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
        <div className="rounded-[1.75rem] bg-foreground text-background px-6 py-10 sm:px-10 sm:py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-lg">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Chưa chắc chọn gì?
            </h2>
            <p className="mt-2 text-sm sm:text-base text-background/65 leading-relaxed">
              Nói ngân sách và nhu cầu, AI gợi ý trong vài giây. Hoặc xem toàn bộ danh mục.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Button
              asChild
              size="lg"
              className="rounded-full h-12 px-6 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link to="/chat">
                <MessageCircle className="h-4 w-4 mr-2" aria-hidden />
                Tư vấn AI
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="rounded-full h-12 px-6"
            >
              <Link to="/products">Xem sản phẩm</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          AI FAB — safe-area, không che content (padding page bù)
          ═══════════════════════════════════════════════════════ */}
      <Button
        asChild
        className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] right-[max(1.5rem,env(safe-area-inset-right,0px))] z-50 h-auto gap-2 rounded-full px-5 py-3.5 shadow-2xl shadow-primary/40 group hover:shadow-primary/50"
        aria-label="Mở trợ lý AI"
      >
        <Link to="/chat">
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          <span className="font-bold text-sm whitespace-nowrap">Trợ lý AI</span>
        </Link>
      </Button>
    </div>
  );
}
