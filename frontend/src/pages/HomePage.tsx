import { Link, useNavigate } from "react-router-dom";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SaleBadge } from "@/components/common/SaleBadge";
import { useCountdown } from "@/hooks/useCountdown";
import { formatPrice } from "@/utils/format";
import {
  Sparkles, Zap, ArrowRight, ShoppingCart, Heart,
  Smartphone, ShieldCheck, Truck, RotateCcw, CreditCard, Brain,
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

  const { data: flashSaleData } = useQuery<{ items: Product[] }>({
    queryKey: ["home-flash-sale"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/products", { params: { page: 1, limit: 20 } });
      return res.data;
    },
  });

  const products = homepageData?.products || [];
  const categories = homepageData?.categories || [];
  const flashSaleProducts = (flashSaleData?.items || []).filter(
    (p) => p.sale_price && p.sale_price < p.price
  );

  return (
    <div className="min-h-screen mt-32">
      {/* ═══════════════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════════════ */}
      <section className="relative h-[calc(100vh-128px)] flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <OptimizedImage
            src="https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1920&q=80"
            alt="Công nghệ"
            width={1920}
            height={1080}
            className="w-full h-full object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-2xl">
            {/* AI badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="h-[18px] w-[18px] text-primary fill-primary" />
              <span className="text-primary text-xs font-bold uppercase tracking-wider">Kỷ nguyên mua sắm AI Precision</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.15] mb-6">
              Công nghệ tối tân.<br />Trải nghiệm thông minh.
            </h1>

            <p className="text-lg text-muted-foreground mb-10 max-w-lg leading-relaxed">
              Khám phá danh mục thiết bị công nghệ hàng đầu được tuyển chọn bởi AI dành riêng cho nhu cầu của bạn.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/products">
                <button className="bg-primary text-primary-foreground px-10 py-4 rounded-2xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 active:scale-95">
                  Mua sắm ngay
                </button>
              </Link>
              <Link to="/chat">
                <button className="bg-card text-primary border border-primary/20 px-10 py-4 rounded-2xl text-sm font-semibold hover:bg-muted transition-all">
                  Tư vấn AI
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FLASH SALE SECTION
          ═══════════════════════════════════════════════════════ */}
      {flashSaleProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="bg-[#ba1a1a] rounded-[2rem] p-6 md:p-8 shadow-2xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
              <div className="flex items-center gap-4 flex-wrap justify-center md:justify-start">
                <h2 className="text-white text-3xl md:text-4xl font-bold italic flex items-center gap-3 uppercase">
                  <Zap className="h-8 w-8 fill-current" />
                  Flash Sale
                </h2>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-white/80 text-xs uppercase">Kết thúc sau:</span>
                  <div className="flex gap-1.5">
                    {countdown.display.split(":").map((part, i) => (
                      <span key={i} className="bg-red-900/60 text-white px-2 py-1 rounded font-bold text-sm tabular-nums">
                        {part}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <Link to="/products" className="text-white font-bold text-xs flex items-center gap-2 hover:underline">
                Xem tất cả <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Products grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {flashSaleProducts.slice(0, 4).map((product) => {
                const discount = product.sale_price
                  ? Math.round((1 - product.sale_price / product.price) * 100)
                  : 0;
                const soldPercent = product.stock > 0 ? Math.max(10, Math.min(95, 100 - (product.stock * 2))) : 100;

                return (
                  <Link key={product.id} to={`/products/${product.id}`}>
                    <div className="bg-white dark:bg-card rounded-2xl p-4 relative group cursor-pointer hover:shadow-lg transition-all h-full">
                      {/* Discount badge */}
                      <div className="absolute top-2 left-2 bg-red-600 text-white text-[11px] font-bold px-2 py-1 rounded">
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
                        <span className="text-red-600 font-bold text-xl">
                          {formatPrice(product.sale_price!)}
                        </span>
                        <span className="text-muted-foreground text-xs line-through">
                          {formatPrice(product.price)}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3 bg-muted h-3 rounded-full overflow-hidden relative">
                        <div
                          className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500"
                          style={{ width: `${soldPercent}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-muted-foreground italic">
                          {product.stock <= 3 ? "Sắp cháy hàng!" : `Đã bán ${Math.floor(soldPercent / 5)}/20`}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          AI SHOP ASSISTANT
          ═══════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl p-8 md:p-12 relative overflow-hidden border border-primary/10">
          {/* Decorative icon */}
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Brain className="h-60 w-60 text-primary" />
          </div>

          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-3 text-primary mb-4">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-bold">Trợ lý mua sắm AI</span>
            </div>

            <h2 className="text-foreground text-2xl md:text-3xl font-bold mb-4">
              Bạn chưa biết chọn sản phẩm nào?
            </h2>

            <p className="text-muted-foreground text-base mb-8 leading-relaxed">
              Mô tả nhu cầu của bạn, AI sẽ phân tích hàng ngàn đánh giá và cấu hình để tìm ra thiết bị hoàn hảo nhất.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                navigate("/chat");
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="text"
                placeholder='Gõ nhu cầu: "Laptop code game dưới 30tr"...'
                className="flex-1 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl px-5 py-3.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
              />
              <Link to="/chat">
                <Button className="px-7 py-3.5 rounded-xl font-semibold shadow-lg shadow-primary/10 w-full sm:w-auto">
                  Tìm cho tôi
                </Button>
              </Link>
            </form>

            <div className="mt-5 flex flex-wrap gap-2 items-center">
              <span className="text-muted-foreground text-xs font-bold uppercase">Gợi ý:</span>
              {["Màn hình đồ họa tốt nhất", "Tai nghe chống ồn", "Laptop văn phòng"].map((s) => (
                <Link
                  key={s}
                  to={`/chat?q=${encodeURIComponent(s)}`}
                  className="text-primary text-xs hover:underline"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          PRODUCT RECOMMENDATIONS
          ═══════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <Sparkles className="h-7 w-7 text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold">Gợi ý riêng cho bạn</h2>
          </div>
          <Link to="/products" className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            Xem tất cả <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border/60 overflow-hidden animate-pulse">
                <div className="aspect-square bg-muted" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.slice(0, 4).map((product) => {
              const hasSale = product.sale_price != null && product.sale_price < product.price;
              return (
                <div key={product.id} className="bg-card rounded-2xl overflow-hidden border border-border/60 hover:shadow-2xl transition-all duration-500 group flex flex-col h-full">
                  {/* Image */}
                  <div className="relative aspect-square">
                    {product.image_url ? (
                      <OptimizedImage
                        src={product.image_url}
                        alt={product.name}
                        width={400}
                        height={400}
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
                        <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                          Sắp hết
                        </span>
                      )}
                    </div>

                    {/* Wishlist */}
                    <button className="absolute bottom-3 right-3 bg-card/90 backdrop-blur text-primary p-2.5 rounded-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-lg">
                      <Heart className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-semibold text-base mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {product.name}
                    </h3>

                    <div className="mt-auto">
                      {/* Price */}
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

                      {/* Action buttons */}
                      <div className="grid grid-cols-5 gap-2">
                        <button
                          onClick={(e) => handleQuickBuy(e, product.id)}
                          className="col-span-4 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-xs uppercase text-center hover:bg-primary/90 transition-colors shadow-lg shadow-primary/10"
                        >
                          Mua ngay
                        </button>
                        <Link
                          to={`/products/${product.id}`}
                          className="col-span-1 border border-border hover:border-primary hover:text-primary rounded-xl flex items-center justify-center transition-all"
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════
          CATEGORIES
          ═══════════════════════════════════════════════════════ */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center uppercase tracking-widest">
            Danh mục hàng đầu
          </h2>

          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {categories.filter((c) => c.is_active !== false).slice(0, 6).map((cat) => {
              const img = CATEGORY_IMAGES[cat.slug] || CATEGORY_IMAGES.default;
              return (
                <Link
                  key={cat.id}
                  to={`/products?category_id=${cat.id}`}
                  className="group relative rounded-xl overflow-hidden aspect-[3/4] cursor-pointer"
                >
                  <OptimizedImage
                    src={img}
                    alt={cat.name}
                    width={300}
                    height={400}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-white text-sm font-bold">{cat.name}</h3>
                    <span className="text-white/70 text-[11px] flex items-center gap-1 group-hover:gap-1.5 transition-all">
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
      <section className="max-w-7xl mx-auto px-4 py-12 md:py-16 border-t border-border/30">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-2xl md:text-3xl font-bold border-l-4 border-primary pl-6">
            Sản phẩm nổi bật
          </h2>
          <Link to="/products" className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            Xem tất cả <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.slice(0, 8).map((product) => {
            const hasSale = product.sale_price != null && product.sale_price < product.price;
            return (
              <Link key={product.id} to={`/products/${product.id}`} className="group">
                <Card className="h-full border-border/60 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="relative aspect-[4/3] bg-muted/50 overflow-hidden">
                    {product.image_url ? (
                      <OptimizedImage
                        src={product.image_url}
                        alt={product.name}
                        width={400}
                        height={300}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Smartphone className="h-16 w-16 text-muted-foreground/20" />
                      </div>
                    )}
                    {hasSale && <SaleBadge price={product.price} salePrice={product.sale_price!} />}
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-medium line-clamp-2 text-sm leading-snug min-h-[2.5rem]">{product.name}</h3>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      {hasSale ? (
                        <>
                          <span className="text-base font-bold text-destructive">{formatPrice(product.sale_price!)}</span>
                          <span className="text-xs text-muted-foreground line-through">{formatPrice(product.price)}</span>
                        </>
                      ) : (
                        <span className="text-base font-bold">{formatPrice(product.price)}</span>
                      )}
                    </div>
                    <p className={`text-xs font-medium ${product.stock > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                      {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : "Hết hàng"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          TRUST STRIP
          ═══════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 py-12 md:py-16 border-t border-border/30">
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
      <Link
        to="/chat"
        className="fixed bottom-6 right-6 bg-primary text-primary-foreground px-5 py-3.5 rounded-full shadow-2xl shadow-primary/40 active:scale-95 transition-transform z-50 flex items-center gap-2 group hover:shadow-primary/50"
      >
        <Sparkles className="h-5 w-5" />
        <span className="font-bold text-sm whitespace-nowrap">Trợ lý AI</span>
      </Link>
    </div>
  );
}
