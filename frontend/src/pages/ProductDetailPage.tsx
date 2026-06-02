import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import {
  ChevronRight, Home, Sparkles, Send,
  Package, Minus, Plus,
} from "lucide-react";
import { formatPrice } from "@/utils/format";
import { ProductDetailSkeleton } from "@/components/common/Skeleton";
import { StarRating } from "@/components/common/StarRating";
import ImageGallery from "@/components/common/ImageGallery";
import { ReviewSection } from "@/components/common/ReviewSection";
import HeartButton from "@/components/common/HeartButton";
import RecentlyViewed from "@/components/common/RecentlyViewed";
import CustomersAlsoBought from "@/components/common/CustomersAlsoBought";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { getErrorMessage } from "@/utils/api";
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

type TabKey = "specs" | "reviews" | "description";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<TabKey>("specs");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

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

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      await axiosClient.post("/api/cart/items", {
        product_id: Number(id),
        quantity,
      });
    },
    onSuccess: () => {
      toast.success("Đã thêm vào giỏ hàng!");
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không thể thêm vào giỏ hàng"));
    },
  });

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    await addToCartMutation.mutateAsync();
    navigate("/cart");
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

  const TABS: { key: TabKey; label: string }[] = [
    { key: "specs", label: "Thông số kỹ thuật" },
    { key: "reviews", label: "Đánh giá khách hàng" },
    { key: "description", label: "Tính năng chi tiết" },
  ];

  return (
    <div className="space-y-16">
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* ── Left: Image Gallery ── */}
        <div className="lg:col-span-7">
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
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
          {/* Title + Rating */}
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-2xl font-bold leading-tight mb-2">
              {product.name}
            </h1>
            <p className="text-muted-foreground text-sm mb-3">
              {product.description
                ? product.description.slice(0, 120) + (product.description.length > 120 ? "..." : "")
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
          <div className="space-y-1">
            <div className="flex items-end gap-3">
              <span className="text-[28px] leading-8 font-bold text-primary tracking-tight">
                {formatPrice(hasSale ? product.sale_price! : product.price)}
              </span>
              {hasSale && (
                <>
                  <span className="text-muted-foreground line-through text-base mb-0.5">
                    {formatPrice(product.price)}
                  </span>
                  <span className="bg-destructive/10 text-destructive text-xs font-bold px-2 py-0.5 rounded">
                    -{discount}%
                  </span>
                </>
              )}
            </div>
            <p className="text-sm">
              {product.stock > 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
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
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Số lượng:</span>
                <div className="flex items-center border border-border rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 hover:bg-muted transition-colors"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="px-3 py-2 hover:bg-muted transition-colors"
                    disabled={quantity >= product.stock}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Buy buttons — theo example: font-headline-md (24px), w-full */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleBuyNow}
                  disabled={addToCartMutation.isPending}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-xl text-lg font-bold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20"
                >
                  Mua Ngay
                </button>
                <button
                  onClick={() => addToCartMutation.mutate()}
                  disabled={addToCartMutation.isPending}
                  className="w-full py-4 border border-primary text-primary rounded-xl text-lg font-bold hover:bg-primary/5 transition-all"
                >
                  {addToCartMutation.isPending ? "Đang thêm..." : "Thêm vào giỏ hàng"}
                </button>
              </div>

              {/* Wishlist */}
              <HeartButton
                productId={product.id}
                className="w-full justify-center py-3 border rounded-xl text-sm hover:bg-accent"
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

          {/* AI Consultation Box — theo example: glass-panel, rounded-2xl */}
          <div className="p-6 rounded-2xl bg-card/70 backdrop-blur-sm border border-primary/20 shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-primary">Tư vấn AI cho {product.name.split(" ")[0]}</h3>
                  <p className="text-xs text-muted-foreground">Hỏi AI về hiệu năng cho nhu cầu của bạn</p>
                </div>
              </div>
              <div className="space-y-2 mb-3">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => navigate("/chat")}
                    className="w-full text-left p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm border border-border/10"
                  >
                    "{s}"
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Hỏi AI về sản phẩm..."
                  className="flex-1 bg-card border border-border/40 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") navigate("/chat");
                  }}
                />
                <button
                  onClick={() => navigate("/chat")}
                  className="bg-primary text-primary-foreground p-2.5 rounded-lg hover:scale-105 transition-transform active:scale-95"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          TABS SECTION — theo example
          ═══════════════════════════════════════════════════════ */}
      <div>
        {/* Tab headers */}
        <div className="flex border-b border-border/30 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-8 py-4 whitespace-nowrap font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-b-2 border-primary text-primary font-bold"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="py-10">
          {/* Specs tab — 2-column grid theo example */}
          {activeTab === "specs" && (
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
                        <span className="text-emerald-600">Còn hàng ({product.stock})</span>
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
                      <dd className="font-semibold text-sm text-destructive">
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
          )}

          {/* Reviews tab */}
          {activeTab === "reviews" && (
            <ReviewSection productId={Number(id)} mode="full" />
          )}

          {/* Description tab */}
          {activeTab === "description" && (
            <div className="max-w-3xl">
              {product.description ? (
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              ) : (
                <p className="text-muted-foreground">Chưa có mô tả chi tiết cho sản phẩm này.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          RECOMMENDATIONS
          ═══════════════════════════════════════════════════════ */}
      <CustomersAlsoBought productId={Number(id)} limit={4} />
      <RecentlyViewed currentProductId={Number(id)} />
    </div>
  );
}
