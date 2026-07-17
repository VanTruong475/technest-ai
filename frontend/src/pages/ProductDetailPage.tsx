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
      // 1 round-trip only: POST returns full cart → pick item id → checkout
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
      <div className="text-center py-20">
        <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <p className="text-lg font-semibold mb-2">Không tìm thấy sản phẩm</p>
        <p className="text-muted-foreground mb-6">Sản phẩm có thể đã bị xóa hoặc không tồn tại.</p>
        <Link to="/products">
          <Button variant="outline">Quay lại danh sách sản phẩm</Button>
        </Link>
      </div>
    );
  }

  const hasSale = product.sale_price != null && product.sale_price < product.price;
  const discount = hasSale ? Math.round((1 - product.sale_price! / product.price) * 100) : 0;
  const suggestions = getAISuggestions(product.slug || "");

  // Color → image mapping
  const colors = product.colors || [];
  const activeColorImage = colors.find((c) => c.name === selectedColor)?.image || null;

  return (
    <div className="space-y-10 pb-24 lg:pb-0">
      {/* ═══════════════════════════════════════════════════════
          BREADCRUMB
          ═══════════════════════════════════════════════════════ */}
      <nav className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-muted-foreground">
        <Link to="/" className="hover:text-primary flex items-center gap-1">
          <Home className="h-3.5 w-3.5" />
          Trang chủ
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/products" className="hover:text-primary">Sản phẩm</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground normal-case tracking-normal line-clamp-1">{product.name}</span>
      </nav>

      {/* ═══════════════════════════════════════════════════════
          PRODUCT OVERVIEW
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Left: Image Gallery ── */}
        <div className="lg:col-span-7" ref={imageRef}>
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

        {/* ── Right: Product Info (sticky) ── */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-28">
          {/* Title + Rating */}
          <div>
            <h1 className="text-xl md:text-2xl font-bold leading-tight mb-1.5">
              {product.name}
            </h1>
            <p className="text-muted-foreground text-xs mb-2 line-clamp-2">
              {product.description
                ? product.description.slice(0, 150) + (product.description.length > 150 ? "..." : "")
                : "Sản phẩm chính hãng, bảo hành toàn quốc."}
            </p>
            {product.average_rating != null && product.average_rating > 0 && (
              <div className="flex items-center gap-2">
                <StarRating rating={Math.round(product.average_rating)} size="sm" />
                <span className="text-xs text-muted-foreground">
                  ({product.review_count ?? 0} đánh giá)
                </span>
              </div>
            )}
          </div>

          {/* Price */}
          <div>
            <div className="flex items-end gap-2 flex-wrap">
              <span className={`text-3xl font-bold ${hasSale ? "text-sale" : "text-primary"}`}>
                {formatPrice(hasSale ? product.sale_price! : product.price)}
              </span>
              {hasSale && (
                <>
                  <span className="text-muted-foreground line-through text-lg ml-2">
                    {formatPrice(product.price)}
                  </span>
                  <span className="bg-sale/10 text-sale text-[11px] font-bold px-1.5 py-0.5 rounded">
                    -{discount}%
                  </span>
                </>
              )}
            </div>
            <p className="text-sm">
              {product.stock > 0 ? (
                <span className="text-success font-medium">
                  Còn {product.stock} sản phẩm
                </span>
              ) : (
                <span className="text-destructive font-medium">Hết hàng</span>
              )}
            </p>
          </div>

          {/* Color selector — above quantity */}
          {colors.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                Màu sắc{selectedColor && <span className="text-foreground normal-case">: {selectedColor}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                      selectedColor === color.name
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/50 text-muted-foreground"
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-border/40 shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-sm">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {product.stock > 0 && product.status === "ACTIVE" && (
            <div className="space-y-3">
              {/* Quantity */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Số lượng:</span>
                <div className="flex items-center border border-border rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-2.5 py-1.5 hover:bg-muted transition-colors"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-3 py-1.5 text-sm font-medium min-w-[2.5rem] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="px-2.5 py-1.5 hover:bg-muted transition-colors"
                    disabled={quantity >= product.stock}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Buy buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleBuyNow}
                  disabled={buyNowPending || addToCartMutation.isPending}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20 disabled:opacity-60"
                >
                  {buyNowPending ? "Đang chuyển..." : "Mua ngay"}
                </button>
                <button
                  onClick={handleAddToCart}
                  disabled={addToCartMutation.isPending || buyNowPending}
                  className="w-full py-3 border border-primary text-primary rounded-lg text-sm font-semibold hover:bg-primary/5 transition-all disabled:opacity-60"
                >
                  {addToCartMutation.isPending && !buyNowPending
                    ? "Đang thêm..."
                    : "Thêm vào giỏ hàng"}
                </button>
              </div>

              {/* Wishlist */}
              <HeartButton
                productId={product.id}
                className="w-full justify-center py-2 border rounded-lg text-xs hover:bg-accent"
                showLabel
              />
            </div>
          )}

          {/* Out of stock */}
          {(product.stock <= 0 || product.status !== "ACTIVE") && (
            <div className="p-4 rounded-xl bg-muted/50 border border-border/20 text-center">
              <p className="text-muted-foreground font-medium">Sản phẩm tạm hết hàng</p>
            </div>
          )}

          {/* AI Consultation Box */}
          <div className="p-4 rounded-xl bg-card/70 backdrop-blur-sm border border-primary/15 relative overflow-hidden">
            <div className="absolute -right-3 -top-3 w-20 h-20 bg-primary/5 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/20">
                  <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-primary">Tư vấn AI</h3>
                  <p className="text-[11px] text-muted-foreground">Hỏi AI về sản phẩm này</p>
                </div>
              </div>
              <div className="space-y-1.5 mb-2.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => navigate(`/chat?q=${encodeURIComponent(s)}`)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted transition-colors text-xs border border-border/10"
                  >
                    "{s}"
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Hỏi AI về sản phẩm..."
                  className="flex-1 bg-card border border-border/40 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value.trim()) {
                      navigate(`/chat?q=${encodeURIComponent(e.currentTarget.value.trim())}`);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Hỏi AI về sản phẩm..."]') as HTMLInputElement;
                    if (input?.value.trim()) navigate(`/chat?q=${encodeURIComponent(input.value.trim())}`);
                    else navigate("/chat");
                  }}
                  className="bg-primary text-primary-foreground p-2 rounded-lg hover:scale-105 transition-transform active:scale-95"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          TABS SECTION — shadcn/ui Tabs
          ═══════════════════════════════════════════════════════ */}
      <Tabs defaultValue="description">
        <TabsList className="flex w-full max-w-md overflow-x-auto">
          <TabsTrigger value="description" className="flex-1">Mô tả</TabsTrigger>
          <TabsTrigger value="specs" className="flex-1">Thông số</TabsTrigger>
          <TabsTrigger value="reviews" className="flex-1">
            Đánh giá ({product.review_count ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* Mô tả */}
        <TabsContent value="description" className="py-6">
          <div className="max-w-3xl">
            {product.description ? (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            ) : (
              <p className="text-muted-foreground">Chưa có mô tả chi tiết cho sản phẩm này.</p>
            )}
          </div>
        </TabsContent>

        {/* Thông số — 2-column grid */}
        <TabsContent value="specs" className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Thông tin sản phẩm</h2>
              <dl className="space-y-3">
                <div className="flex justify-between py-2.5 border-b border-border/10">
                  <dt className="text-muted-foreground text-sm">Tên sản phẩm</dt>
                  <dd className="font-semibold text-sm text-right">{product.name}</dd>
                </div>
                <div className="flex justify-between py-2.5 border-b border-border/10">
                  <dt className="text-muted-foreground text-sm">Tình trạng</dt>
                  <dd className="font-semibold text-sm">
                    {product.stock > 0 ? (
                      <span className="text-success">Còn hàng ({product.stock})</span>
                    ) : (
                      <span className="text-destructive">Hết hàng</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between py-2.5 border-b border-border/10">
                  <dt className="text-muted-foreground text-sm">Giá gốc</dt>
                  <dd className="font-semibold text-sm">{formatPrice(product.price)}</dd>
                </div>
                {hasSale && (
                  <div className="flex justify-between py-2.5 border-b border-border/10">
                    <dt className="text-muted-foreground text-sm">Giá khuyến mãi</dt>
                    <dd className="font-semibold text-sm text-sale">
                      {formatPrice(product.sale_price!)} (-{discount}%)
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Mô tả chi tiết</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {product.description || "Chưa có mô tả chi tiết cho sản phẩm này."}
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Đánh giá */}
        <TabsContent value="reviews" className="py-6">
          <ReviewSection productId={Number(id)} mode="full" />
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════
          RECOMMENDATIONS
          ═══════════════════════════════════════════════════════ */}
      <CustomersAlsoBought productId={Number(id)} limit={4} />
      <RecentlyViewed currentProductId={Number(id)} />

      {/* ═══════════════════════════════════════════════════════
          STICKY CTA — chỉ hiện trên mobile (< lg)
          ═══════════════════════════════════════════════════════ */}
      {product.stock > 0 && product.status === "ACTIVE" && (
        <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Giá gọn */}
            <div className="shrink-0">
              <p className="text-lg font-bold text-primary leading-none">
                {formatPrice(hasSale ? product.sale_price! : product.price)}
              </p>
              {hasSale && (
                <p className="text-xs text-muted-foreground line-through">
                  {formatPrice(product.price)}
                </p>
              )}
            </div>
            {/* Wishlist */}
            <HeartButton
              productId={product.id}
              className="shrink-0 h-11 w-11 border border-border hover:bg-accent"
            />
            {/* Thêm vào giỏ — optimistic badge, no extra GET */}
            <button
              onClick={handleAddToCart}
              disabled={addToCartMutation.isPending || buyNowPending}
              className="flex-1 flex items-center justify-center gap-2 h-11 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              <ShoppingCart className="h-4 w-4" />
              {addToCartMutation.isPending && !buyNowPending
                ? "Đang thêm..."
                : "Thêm vào giỏ"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
