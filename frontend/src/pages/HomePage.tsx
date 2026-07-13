import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { useAuthStore } from "@/store/authStore";
import { useRecommendations } from "@/hooks/useRecommendations";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SaleBadge } from "@/components/common/SaleBadge";
import { ProductGridSkeleton } from "@/components/common/Skeleton";
import HeartButton from "@/components/common/HeartButton";
import { useCountdown } from "@/hooks/useCountdown";
import { formatPrice } from "@/utils/format";
import {
  Sparkles, Zap, ArrowRight, ArrowUpRight, MessageCircle,
  Smartphone, ShieldCheck, Truck, RotateCcw, CreditCard, Star,
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
  const queryClient = useQueryClient();

  const quickBuyMutation = useMutation({
    mutationFn: async (productId: number) => {
      await axiosClient.post("/api/cart/items", { product_id: productId, quantity: 1 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      navigate("/checkout");
    },
    onError: () => {
      toast.error("Không thể thêm vào giỏ hàng");
    },
  });

  const handleQuickBuy = (e: React.MouseEvent, productId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    quickBuyMutation.mutate(productId);
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
    <div className="min-h-screen mt-32">
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
                    <div className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                      <Sparkles className="h-3 w-3 shrink-0" />
                      Đề xuất bởi AI
                    </div>
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
                <div className="absolute -right-3 -top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/30">
                  <Sparkles className="h-3.5 w-3.5" />
                  Đề xuất bởi AI
                </div>

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

      {/* ═══════════════════════════════════════════════════════
          FLASH SALE SECTION
          ═══════════════════════════════════════════════════════ */}
      {flashSaleProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16">
          <div className="bg-sale rounded-[2rem] p-6 md:p-8 shadow-2xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
              <div className="flex items-center gap-4 flex-wrap justify-center md:justify-start">
                <h2 className="text-sale-foreground text-3xl md:text-4xl font-bold italic flex items-center gap-3 uppercase">
                  <Zap className="h-8 w-8 fill-current" />
                  Flash Sale
                </h2>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sale-foreground/80 text-xs uppercase">Kết thúc sau:</span>
                  <div className="flex gap-1.5">
                    {countdown.display.split(":").map((part, i) => (
                      <span key={i} className="bg-black/20 text-sale-foreground px-2 py-1 rounded font-bold text-sm tabular-nums">
                        {part}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <Link to="/products" className="text-sale-foreground font-bold text-xs flex items-center gap-2 hover:underline">
                Xem tất cả <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Products grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {flashSaleProducts.slice(0, 4).map((product) => {
                const discount = product.sale_price
                  ? Math.round((1 - product.sale_price / product.price) * 100)
                  : 0;

                return (
                  <Link key={product.id} to={`/products/${product.id}`}>
                    <div className="bg-card rounded-2xl p-4 relative group cursor-pointer hover:shadow-lg transition-all h-full">
                      {/* Discount badge */}
                      <div className="absolute top-2 left-2 bg-sale text-sale-foreground text-[11px] font-bold px-2 py-1 rounded">
                        Giảm {discount}%
                      </div>

                      {/* Image */}
                      <div className="aspect-square mb-4 overflow-hidden rounded-xl bg-muted">
                        {product.image_url ? (
                          <OptimizedImage
                            src={product.image_url}
                            alt={product.name}
                            width={300}
                            height={300}
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Smartphone className="h-16 w-16 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <h3 className="font-bold text-foreground text-base line-clamp-1 mb-2">{product.name}</h3>

                      {/* Price */}
                      <div className="flex flex-col">
                        <span className="text-sale font-bold text-xl">
                          {formatPrice(product.sale_price!)}
                        </span>
                        <span className="text-muted-foreground text-xs line-through">
                          {formatPrice(product.price)}
                        </span>
                      </div>

                      {/* Tồn kho thật — chỉ báo khi sắp hết (stock <= 5), còn lại không hiện */}
                      {product.stock > 0 && product.stock <= 5 && (
                        <p className="mt-3 text-xs font-semibold text-sale">
                          Chỉ còn {product.stock} sản phẩm
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          PRODUCT RECOMMENDATIONS
          ═══════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16">
        {/* Không “Xem tất cả” — primary browse CTA giữ ở Featured (UI_PATTERNS max 1–2) */}
        <div className="flex items-center gap-2.5 mb-8">
          <span className="h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
          <h2 className="font-semibold text-xl md:text-2xl">Gợi ý riêng cho bạn</h2>
        </div>

        {recommendLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border/60 overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-3 w-20 bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-6 w-28 bg-muted rounded" />
                  <div className="h-10 w-full bg-muted rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {recommendations.map(({ product, reason }) => {
              const hasSale = product.sale_price != null && product.sale_price < product.price;
              return (
                <motion.div key={product.id} variants={fadeUp} className="bg-card rounded-2xl overflow-hidden border border-border/60 hover:shadow-2xl transition-all duration-500 group flex flex-col h-full">
                  {/* Image — aspect 4/3 khớp ProductCard */}
                  <div className="relative aspect-[4/3]">
                    {product.image_url ? (
                      <OptimizedImage
                        src={product.image_url}
                        alt={product.name}
                        width={400}
                        height={300}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Smartphone className="h-20 w-20 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                      {hasSale && <SaleBadge price={product.price} salePrice={product.sale_price!} />}
                      {product.stock <= 5 && product.stock > 0 && (
                        <span className="bg-sale text-sale-foreground px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                          Sắp hết
                        </span>
                      )}
                    </div>

                    {/* Wishlist — HeartButton wire API (không dead control) */}
                    <HeartButton
                      productId={product.id}
                      className="absolute bottom-3 right-3 h-9 w-9 bg-card/90 backdrop-blur text-primary rounded-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-lg hover:bg-card"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    {reason && (
                      <div className="inline-flex items-center gap-1.5 self-start mb-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                        <Sparkles className="h-3 w-3 shrink-0" />
                        <span className="line-clamp-1">{reason}</span>
                      </div>
                    )}

                    <h3 className="font-semibold text-base mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {product.name}
                    </h3>

                    <div className="mt-auto">
                      <div className="flex flex-col mb-4">
                        <span className="text-xl font-bold text-primary">
                          {formatPrice(hasSale ? product.sale_price! : product.price)}
                        </span>
                        {hasSale && (
                          <span className="text-muted-foreground text-sm line-through">
                            {formatPrice(product.price)}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-5 gap-2">
                        <Button
                          onClick={(e) => handleQuickBuy(e, product.id)}
                          disabled={quickBuyMutation.isPending && quickBuyMutation.variables === product.id}
                          className="col-span-4 rounded-xl font-bold text-xs uppercase shadow-lg shadow-primary/10"
                        >
                          Mua ngay
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          size="icon"
                          aria-label="Xem chi tiết sản phẩm"
                          className="col-span-1 rounded-xl hover:border-primary hover:text-primary"
                        >
                          <Link to={`/products/${product.id}`}>
                            <ArrowUpRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
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
          FEATURED PRODUCTS GRID
          ═══════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16 border-t border-border/30">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
            <h2 className="font-semibold text-xl md:text-2xl">Sản phẩm nổi bật</h2>
          </div>
          <Link to="/products" className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            Xem tất cả <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.slice(0, 8).map((product) => {
              const hasSale = product.sale_price != null && product.sale_price < product.price;
              return (
                <Link key={product.id} to={`/products/${product.id}`} className="group block h-full">
                  {/* Pattern ProductCard (UI_PATTERNS.md): aspect 4/3, badge top-2 left-2,
                      hover shadow-md + scale-[1.02], giá font-bold text-primary */}
                  <Card className="h-full border-border/60 rounded-2xl overflow-hidden hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                    <div className="relative aspect-[4/3] bg-muted/50 overflow-hidden">
                      {product.image_url ? (
                        <OptimizedImage
                          src={product.image_url}
                          alt={product.name}
                          width={400}
                          height={300}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Smartphone className="h-16 w-16 text-muted-foreground/20" />
                        </div>
                      )}
                      {hasSale && <SaleBadge price={product.price} salePrice={product.sale_price!} />}
                      {product.stock <= 0 && (
                        <span className="absolute top-2 right-2 bg-muted text-muted-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                          Hết hàng
                        </span>
                      )}
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-medium line-clamp-2 text-sm leading-snug min-h-[2.5rem]">{product.name}</h3>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        {hasSale ? (
                          <>
                            <span className="text-base font-bold text-primary">{formatPrice(product.sale_price!)}</span>
                            <span className="text-xs text-muted-foreground line-through">{formatPrice(product.price)}</span>
                          </>
                        ) : (
                          <span className="text-base font-bold text-primary">{formatPrice(product.price)}</span>
                        )}
                      </div>
                      <p className={`text-xs font-medium ${product.stock > 0 ? "text-success" : "text-destructive"}`}>
                        {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : "Hết hàng"}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════
          TRUST STRIP
          ═══════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16 border-t border-border/30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: ShieldCheck, title: "Bảo hành chính hãng", sub: "Đầy đủ giấy tờ · hỗ trợ 24/7", color: "text-emerald-600 bg-emerald-500/10" },
            { icon: Truck, title: "Giao hàng nhanh", sub: "1-2 ngày tận nơi toàn quốc", color: "text-sky-600 bg-sky-500/10" },
            { icon: RotateCcw, title: "Đổi trả dễ dàng", sub: "Trong 30 ngày không lý do", color: "text-amber-600 bg-amber-500/10" },
            { icon: CreditCard, title: "Thanh toán an toàn", sub: "VNPay · COD · bảo mật SSL", color: "text-violet-600 bg-violet-500/10" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-card px-4 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${item.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm leading-tight">{item.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 leading-snug">{item.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          AI FAB BUTTON
          ═══════════════════════════════════════════════════════ */}
      <Button
        asChild
        className="fixed bottom-6 right-6 rounded-full px-5 py-3.5 h-auto shadow-2xl shadow-primary/40 z-50 gap-2 group hover:shadow-primary/50"
        aria-label="Mở trợ lý AI"
      >
        <Link to="/chat">
          <MessageCircle className="h-5 w-5" />
          <span className="font-bold text-sm whitespace-nowrap">Trợ lý AI</span>
        </Link>
      </Button>
    </div>
  );
}
