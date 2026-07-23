import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { flyToCart } from "@/lib/flyToCart";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import {
  ChevronRight, Home, Sparkles, Send,
  Package, Minus, Plus, ShoppingCart,
  ShieldCheck, Truck, RotateCcw,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatPrice } from "@/utils/format";
import { ProductDetailSkeleton } from "@/components/common/Skeleton";
import { StarRating } from "@/components/common/StarRating";
import ImageGallery from "@/components/common/ImageGallery";
import { ReviewSection } from "@/components/common/ReviewSection";
import HeartButton from "@/components/common/HeartButton";
import RecentlyViewed from "@/components/common/RecentlyViewed";
import CustomersAlsoBought from "@/components/common/CustomersAlsoBought";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import {
  useAddToCart,
  findCartItemId,
  setCheckoutItemIds,
} from "@/hooks/useCart";
import type { Product } from "@/types";

const AI_SUGGESTIONS: Record<string, string[]> = {
  laptop: [
    "Máy này chạy Premiere Pro mượt không?",
    "So sánh hiệu năng với MacBook Air M3?",
    "Pin dùng được bao lâu khi code?",
  ],
  "dien-thoai": [
    "Camera chụp đêm có tốt không?",
    "So sánh với iPhone 15 Pro?",
    "Pin dùng được cả ngày không?",
  ],
  tablet: [
    "Dùng vẽ illustration được không?",
    "Hỗ trợ Apple Pencil không?",
    "So sánh với iPad Air?",
  ],
  "tai-nghe": [
    "Chống ồn có tốt trên máy bay không?",
    "Đeo lâu có bị đau tai không?",
    "Pin dùng được bao lâu?",
  ],
  "phu-kien": [
    "Tương thích với MacBook không?",
    "Bảo hành bao lâu?",
    "Có phiên bản màu khác không?",
  ],
};

function getAISuggestions(slug: string): string[] {
  for (const [key, suggestions] of Object.entries(AI_SUGGESTIONS)) {
    if (slug?.includes(key)) return suggestions;
  }
  return [
    "Sản phẩm này có phù hợp với nhu cầu của tôi không?",
    "So sánh với sản phẩm tương tự?",
    "Chính sách bảo hành như thế nào?",
  ];
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [buyNowPending, setBuyNowPending] = useState(false);

  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await axiosClient.get(`/api/products/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const { addToRecentlyViewed } = useRecentlyViewed();
  useEffect(() => {
    if (product) {
      addToRecentlyViewed({
        id: product.id,
        name: product.name,
        image_url: product.image_url,
        price: product.price,
        sale_price: product.sale_price,
      });
    }
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Default first color when product has colorways
  useEffect(() => {
    if (product?.colors?.length && !selectedColor) {
      setSelectedColor(product.colors[0].name);
    }
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const imageRef = useRef<HTMLDivElement>(null);
  const addToCartMutation = useAddToCart();

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!product) return;
    addToCartMutation.mutate(
      {
        product_id: product.id,
        quantity,
        optimistic: {
          product_name: product.name,
          image_url: product.image_url,
          price: product.price,
          sale_price: product.sale_price,
          stock: product.stock,
        },
      },
      {
        onSuccess: () => {
          toast.success("Đã thêm vào giỏ hàng!");
          flyToCart(imageRef.current, product.image_url);
        },
      }
    );
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!product) return;
    setBuyNowPending(true);
    try {
      const cart = await addToCartMutation.mutateAsync({
        product_id: product.id,
        quantity,
        optimistic: {
          product_name: product.name,
          image_url: product.image_url,
          price: product.price,
          sale_price: product.sale_price,
          stock: product.stock,
        },
      });
      const itemId = findCartItemId(cart, product.id);
      if (itemId != null) setCheckoutItemIds([itemId]);
      navigate("/checkout");
    } catch {
      // toast already shown by useAddToCart
    } finally {
      setBuyNowPending(false);
    }
  };

  const hasSale = !!(product && product.sale_price != null && product.sale_price < product.price);
  const discount = product && hasSale
    ? Math.round((1 - product.sale_price! / product.price) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center py-20 text-muted-foreground">
        <Package className="h-16 w-16 text-muted-foreground/30" />
        <p className="mt-4 text-lg font-medium text-foreground">Không tìm thấy sản phẩm</p>
        <p className="mt-1 text-sm">Sản phẩm có thể đã bị xóa hoặc không tồn tại.</p>
        <Link to="/products" className="mt-5">
          <Button variant="outline">Quay lại danh sách sản phẩm</Button>
        </Link>
      </div>
    );
  }

  const suggestions = getAISuggestions(product.slug || "");
  const colors = product.colors || [];
  const activeColorImage = colors.find((c) => c.name === selectedColor)?.image || null;
  const inStock = product.stock > 0 && product.status === "ACTIVE";
  const unitPrice = hasSale ? product.sale_price! : product.price;
  const shortDesc = product.description
    ? product.description.replace(/\s+/g, " ").trim().slice(0, 120) +
      (product.description.length > 120 ? "…" : "")
    : "Sản phẩm chính hãng, bảo hành toàn quốc.";

  return (
    <div className="space-y-12 pb-28 lg:pb-0">
      {/* Breadcrumb — quieter */}
      <nav
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <Link to="/" className="hover:text-foreground transition-colors inline-flex items-center gap-1">
          <Home className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only sm:not-sr-only">Trang chủ</span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
        <Link to="/products" className="hover:text-foreground transition-colors">
          Sản phẩm
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
        <span className="text-foreground line-clamp-1 font-medium">{product.name}</span>
      </nav>

      {/* ═══ HERO STAGE ═══ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Gallery — clean stage, arrows + thumbs; color only jumps, does not lock */}
        <div className="lg:col-span-7" ref={imageRef}>
          <div className="rounded-2xl bg-muted/40 p-1 sm:p-1.5">
            <ImageGallery
              mainImage={product.image_url}
              extraImages={product.extra_images}
              productName={product.name}
              hasSale={hasSale}
              price={product.price}
              salePrice={product.sale_price ?? undefined}
              activeImage={activeColorImage}
            />
          </div>
        </div>

        {/* Buy column */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
          <div className="space-y-3">
            {hasSale && (
              <p className="inline-flex items-center gap-2 text-xs font-semibold text-sale">
                <span className="h-4 w-1 rounded-full bg-sale" aria-hidden />
                Đang giảm {discount}%
              </p>
            )}
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-[1.15] text-balance">
              {product.name}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[42ch] text-pretty">
              {shortDesc}
            </p>
            {product.average_rating != null && product.average_rating > 0 && (
              <div className="flex items-center gap-2 pt-0.5">
                <StarRating rating={Math.round(product.average_rating)} size="sm" />
                <span className="text-xs text-muted-foreground">
                  {product.average_rating.toFixed(1)} · {product.review_count ?? 0} đánh giá
                </span>
              </div>
            )}
          </div>

          {/* Price block */}
          <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5">
            <div className="flex items-end gap-2 flex-wrap">
              <span className={`text-3xl sm:text-4xl font-semibold tracking-tight ${hasSale ? "text-sale" : "text-foreground"}`}>
                {formatPrice(unitPrice)}
              </span>
              {hasSale && (
                <>
                  <span className="text-muted-foreground line-through text-base mb-1">
                    {formatPrice(product.price)}
                  </span>
                  <span className="mb-1.5 rounded-md bg-sale/10 text-sale text-[11px] font-bold px-1.5 py-0.5">
                    -{discount}%
                  </span>
                </>
              )}
            </div>
            <p className="mt-2 text-sm">
              {inStock ? (
                <span className="text-success font-medium">Còn {product.stock} sản phẩm</span>
              ) : (
                <span className="text-destructive font-medium">Hết hàng</span>
              )}
            </p>
          </div>

          {/* Colorways — swatch-first */}
          {colors.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                Màu sắc
                {selectedColor && (
                  <span className="text-muted-foreground font-normal"> · {selectedColor}</span>
                )}
              </p>
              <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Chọn màu">
                {colors.map((color) => {
                  const active = selectedColor === color.name;
                  return (
                    <button
                      key={color.name}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      className={`h-11 w-11 rounded-full border-2 transition-transform active:scale-95 ${
                        active
                          ? "border-primary scale-105 shadow-[0_0_0_2px_hsl(var(--background)),0_0_0_4px_hsl(var(--primary))]"
                          : "border-border hover:border-primary/40"
                      }`}
                      style={{ backgroundColor: color.hex }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Qty + CTAs */}
          {inStock && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Số lượng</span>
                <div className="inline-flex items-center rounded-xl border border-border overflow-hidden">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-none"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    aria-label="Giảm số lượng"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-10 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-none"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock}
                    aria-label="Tăng số lượng"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <Button
                  type="button"
                  size="lg"
                  className="w-full h-12 rounded-xl text-sm font-semibold shadow-md shadow-primary/15"
                  onClick={handleBuyNow}
                  disabled={buyNowPending || addToCartMutation.isPending}
                >
                  {buyNowPending ? "Đang chuyển..." : "Mua ngay"}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="w-full h-12 rounded-xl text-sm font-semibold border-primary text-primary hover:bg-primary/5"
                  onClick={handleAddToCart}
                  disabled={addToCartMutation.isPending || buyNowPending}
                >
                  {addToCartMutation.isPending && !buyNowPending
                    ? "Đang thêm..."
                    : "Thêm vào giỏ hàng"}
                </Button>
              </div>

              <HeartButton
                productId={product.id}
                className="w-full justify-center h-10 rounded-xl border border-border text-sm hover:bg-muted"
                showLabel
              />
            </div>
          )}

          {!inStock && (
            <div className="rounded-2xl border border-border/50 bg-muted/40 p-5 text-center">
              <p className="font-medium text-muted-foreground">Sản phẩm tạm hết hàng</p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 rounded-xl"
                onClick={() => navigate(`/chat?q=${encodeURIComponent(`Gợi ý sản phẩm tương tự ${product.name}`)}`)}
              >
                Hỏi AI gợi ý tương tự
              </Button>
            </div>
          )}

          {/* Trust — quiet divider row (no mini cards) */}
          <ul
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/50 pt-4 text-xs text-muted-foreground"
            aria-label="Cam kết"
          >
            {[
              { icon: ShieldCheck, text: "BH chính hãng" },
              { icon: Truck, text: "Giao nhanh" },
              { icon: RotateCcw, text: "Đổi trả 30 ngày" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="inline-flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} aria-hidden />
                {text}
              </li>
            ))}
          </ul>

          {/* Ask AI — minimal, no glow orb */}
          <div className="border-t border-border/50 pt-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Cần tư vấn?</p>
              <Link
                to="/chat"
                className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" aria-hidden />
                Mở chat AI
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.slice(0, 2).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => navigate(`/chat?q=${encodeURIComponent(s)}`)}
                  className="rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors text-left max-w-full line-clamp-1"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <label htmlFor="pdp-ai-input" className="sr-only">Hỏi AI về sản phẩm</label>
              <input
                id="pdp-ai-input"
                type="text"
                placeholder="Hỏi về sản phẩm này..."
                className="flex-1 bg-background border border-border/50 rounded-full px-3.5 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    navigate(`/chat?q=${encodeURIComponent(e.currentTarget.value.trim())}`);
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                className="rounded-full shrink-0 h-9 w-9"
                aria-label="Gửi câu hỏi AI"
                onClick={() => {
                  const input = document.getElementById("pdp-ai-input") as HTMLInputElement | null;
                  if (input?.value.trim()) navigate(`/chat?q=${encodeURIComponent(input.value.trim())}`);
                  else navigate("/chat");
                }}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ KEY FIGURES — Apple-style: big numbers, hairlines, no card grid ═══ */}
      <section
        aria-label="Thông tin nhanh"
        className="border-y border-border/60 py-10 sm:py-12"
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-6">
          <div className="sm:border-r sm:border-border/50 sm:pr-6">
            <p className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums">
              {inStock ? product.stock : "0"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {inStock ? "còn trong kho" : "tạm hết hàng"}
            </p>
          </div>

          <div className="lg:border-r lg:border-border/50 lg:pr-6 sm:pl-2 lg:pl-6">
            {product.average_rating != null && product.average_rating > 0 ? (
              <>
                <p className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums">
                  {product.average_rating.toFixed(1)}
                  <span className="text-lg text-muted-foreground font-medium">/5</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {product.review_count ?? 0} đánh giá
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl sm:text-4xl font-semibold tracking-tight text-muted-foreground">-</p>
                <p className="mt-2 text-sm text-muted-foreground">chưa có đánh giá</p>
              </>
            )}
          </div>

          <div className="sm:border-r sm:border-border/50 sm:pr-6 lg:pl-6">
            {hasSale ? (
              <>
                <p className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums text-sale">
                  -{discount}%
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  so với {formatPrice(product.price)}
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums">
                  {formatPrice(product.price).replace(/\s/g, "")}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">giá niêm yết</p>
              </>
            )}
          </div>

          <div className="sm:pl-2 lg:pl-6">
            {colors.length > 0 ? (
              <>
                <p className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums">
                  {colors.length}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  màu: {colors.map((c) => c.name).join(", ")}
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl sm:text-4xl font-semibold tracking-tight">1</p>
                <p className="mt-2 text-sm text-muted-foreground">phiên bản tiêu chuẩn</p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ═══ TABS ═══ */}
      <Tabs defaultValue="description">
        <TabsList className="flex w-full max-w-md overflow-x-auto h-11 rounded-xl">
          <TabsTrigger value="description" className="flex-1 rounded-lg">Mô tả</TabsTrigger>
          <TabsTrigger value="specs" className="flex-1 rounded-lg">Thông số</TabsTrigger>
          <TabsTrigger value="reviews" className="flex-1 rounded-lg">
            Đánh giá ({product.review_count ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="py-6">
          <div className="max-w-3xl">
            {product.description ? (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-pretty">
                {product.description}
              </p>
            ) : (
              <p className="text-muted-foreground">Chưa có mô tả chi tiết cho sản phẩm này.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="specs" className="py-6">
          {/* Spec cards — avoid dense hairline table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border/50 bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tên</p>
              <p className="mt-2 text-sm font-semibold leading-snug">{product.name}</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tình trạng</p>
              <p className={`mt-2 text-sm font-semibold ${inStock ? "text-success" : "text-destructive"}`}>
                {inStock ? `Còn hàng (${product.stock})` : "Hết hàng"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Giá gốc</p>
              <p className="mt-2 text-sm font-semibold">{formatPrice(product.price)}</p>
            </div>
            {hasSale && (
              <div className="rounded-2xl border border-sale/20 bg-sale/5 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-sale">Giá khuyến mãi</p>
                <p className="mt-2 text-sm font-semibold text-sale">
                  {formatPrice(product.sale_price!)} (-{discount}%)
                </p>
              </div>
            )}
            {colors.length > 0 && (
              <div className="rounded-2xl border border-border/50 bg-card p-5 sm:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Màu có sẵn</p>
                <p className="mt-2 text-sm font-semibold">{colors.map((c) => c.name).join(" · ")}</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="py-6">
          <ReviewSection productId={Number(id)} mode="full" />
        </TabsContent>
      </Tabs>

      {/* ═══ DARK BUY BAND ═══ */}
      {inStock && (
        <section
          className="rounded-[1.75rem] bg-foreground text-background px-5 py-8 sm:px-8 sm:py-10"
          aria-labelledby="pdp-buy-band"
        >
          <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-background/50">
                Sẵn sàng đặt hàng
              </p>
              <h2 id="pdp-buy-band" className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight line-clamp-2">
                {product.name}
              </h2>
              <p className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">
                {formatPrice(unitPrice)}
                {hasSale && (
                  <span className="ml-2 text-base font-normal text-background/45 line-through">
                    {formatPrice(product.price)}
                  </span>
                )}
              </p>
              <p className="mt-2 text-sm text-background/55">
                Giao nhanh · Đổi trả 30 ngày · Bảo hành chính hãng
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 shrink-0 w-full sm:w-auto">
              <Button
                type="button"
                size="lg"
                variant="secondary"
                className="h-12 rounded-xl px-6 font-semibold sm:min-w-[9rem]"
                onClick={handleAddToCart}
                disabled={addToCartMutation.isPending || buyNowPending}
              >
                {addToCartMutation.isPending && !buyNowPending ? "Đang thêm..." : "Thêm vào giỏ"}
              </Button>
              <Button
                type="button"
                size="lg"
                className="h-12 rounded-xl px-6 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 sm:min-w-[9rem]"
                onClick={handleBuyNow}
                disabled={buyNowPending || addToCartMutation.isPending}
              >
                {buyNowPending ? "Đang chuyển..." : "Mua ngay"}
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Recommendations */}
      <CustomersAlsoBought productId={Number(id)} limit={4} />
      <RecentlyViewed currentProductId={Number(id)} />

      {/* Sticky mobile CTA */}
      {inStock && (
        <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-background/95 backdrop-blur-md border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3 max-w-7xl mx-auto">
            <div className="shrink-0 min-w-0">
              <p className="text-lg font-bold text-primary leading-none tabular-nums">
                {formatPrice(unitPrice)}
              </p>
              {hasSale && (
                <p className="text-xs text-muted-foreground line-through">
                  {formatPrice(product.price)}
                </p>
              )}
            </div>
            <HeartButton
              productId={product.id}
              className="shrink-0 h-11 w-11 border border-border hover:bg-accent rounded-xl"
            />
            <Button
              type="button"
              className="flex-1 h-11 rounded-xl text-sm font-semibold gap-2"
              onClick={handleAddToCart}
              disabled={addToCartMutation.isPending || buyNowPending}
            >
              <ShoppingCart className="h-4 w-4" aria-hidden />
              {addToCartMutation.isPending && !buyNowPending ? "Đang thêm..." : "Thêm vào giỏ"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
