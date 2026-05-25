import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search, Laptop,
  MessageSquare, ShieldCheck, Truck, RotateCcw, ArrowRight,
  Sparkles, Star, CreditCard, Package,
} from "lucide-react";
import { formatPrice } from "@/utils/format";
import { ProductGridSkeleton } from "@/components/common/Skeleton";
import { SaleBadge } from "@/components/common/SaleBadge";

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  price: number;
  sale_price: number | null;
  stock: number;
  status: string;
}

interface RecommendResult {
  product: Product;
  score: number;
  reason: string;
}

interface Brand {
  id: number;
  name: string;
  slug: string;
}

// Brand/product-line showcase — 12 cards (2 rows × 6 cols on desktop).
// brandSlug → link `/products?brand_id=<id>` (chỉ khi brand tồn tại trong DB).
// search → link `/products?search=<text>` cho Apple product lines + brands
// chưa có trong DB (Oppo/Vivo/Huawei/Realme).
//
// logoClass cố tình dùng colors hard-coded để khớp với brand identity thật
// (Samsung blue, Oppo green, Realme yellow, etc.) — không phụ thuộc theme.
const BRAND_SHOWCASE = [
  { key: "iphone",  label: "iPhone",  search: "iPhone",        logoText: "iPhone",  logoClass: "bg-muted text-foreground text-[10px] font-medium border border-border/60" },
  { key: "samsung", label: "Samsung", brandSlug: "samsung",    logoText: "SAMSUNG", logoClass: "bg-background text-blue-700 dark:text-blue-400 text-[7px] font-extrabold tracking-tight border border-border/60" },
  { key: "oppo",    label: "Oppo",    search: "Oppo",          logoText: "OPPO",    logoClass: "bg-emerald-500 text-white text-[9px] font-extrabold" },
  { key: "xiaomi",  label: "Xiaomi",  brandSlug: "xiaomi",     logoText: "mi",      logoClass: "bg-orange-500 text-white text-base font-bold" },
  { key: "vivo",    label: "Vivo",    search: "Vivo",          logoText: "vivo",    logoClass: "bg-background text-blue-600 dark:text-blue-400 text-[10px] font-semibold border border-border/60" },
  { key: "huawei",  label: "Huawei",  search: "Huawei",        logoText: "❀",      logoClass: "bg-background text-red-500 text-lg border border-border/60" },
  { key: "realme",  label: "Realme",  search: "Realme",        logoText: "realme",  logoClass: "bg-yellow-400 text-zinc-900 text-[9px] font-bold" },
  { key: "dell",    label: "Dell",    brandSlug: "dell",       logoText: "DELL",    logoClass: "bg-blue-700 text-white text-xs font-bold" },
  { key: "hp",      label: "HP",      brandSlug: "hp",         logoText: "HP",      logoClass: "bg-blue-600 text-white text-xs font-bold !rounded-full" },
  { key: "macbook", label: "Macbook", search: "MacBook",       logoText: "Macbook", logoClass: "bg-muted text-foreground text-[9px] font-medium border border-border/60" },
  { key: "ipad",    label: "iPad",    search: "iPad",          logoText: "iPad",    logoClass: "bg-muted text-foreground text-[10px] font-medium border border-border/60" },
  { key: "airpods", label: "AirPods", search: "AirPods",       logoText: "AirPods", logoClass: "bg-muted text-foreground text-[9px] font-medium border border-border/60" },
];

// Trust strip — mỗi box có color identity riêng (matching brand mood) +
// title chính + subtitle phụ để add depth. Hover lift + shadow subtle.
const TRUST_STRIP = [
  {
    icon: ShieldCheck,
    title: "Bảo hành chính hãng",
    sub: "Đầy đủ giấy tờ · hỗ trợ 24/7",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/20 dark:ring-emerald-400/20",
  },
  {
    icon: Truck,
    title: "Giao hàng nhanh",
    sub: "1-2 ngày tận nơi toàn quốc",
    iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    ring: "ring-sky-500/20 dark:ring-sky-400/20",
  },
  {
    icon: RotateCcw,
    title: "Đổi trả dễ dàng",
    sub: "Trong 30 ngày không lý do",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/20 dark:ring-amber-400/20",
  },
  {
    icon: CreditCard,
    title: "Thanh toán an toàn",
    sub: "VNPay · COD · bảo mật SSL",
    iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    ring: "ring-violet-500/20 dark:ring-violet-400/20",
  },
];

function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/products/${product.id}`} className="group">
      <Card className="h-full transition-all duration-300 cursor-pointer relative overflow-hidden border-border/60 hover:border-border hover:shadow-xl hover:-translate-y-1 rounded-2xl">
        {product.sale_price && product.sale_price < product.price && (
          <SaleBadge price={product.price} salePrice={product.sale_price} />
        )}
        <div className="aspect-[4/3] bg-muted/50 flex items-center justify-center rounded-t-2xl overflow-hidden">
          {product.image_url ? (
            <OptimizedImage
              src={product.image_url}
              alt={product.name}
              width={400}
              height={300}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <span className="text-4xl" aria-hidden="true">📦</span>
          )}
        </div>
        <CardContent className="space-y-2 p-4">
          <h3 className="font-medium line-clamp-2 text-sm leading-snug min-h-[2.5rem]">{product.name}</h3>
          <div className="flex items-baseline gap-2 flex-wrap">
            {product.sale_price ? (
              <>
                <span className="text-base font-bold text-destructive">
                  {formatPrice(product.sale_price)}
                </span>
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(product.price)}
                </span>
              </>
            ) : (
              <span className="text-base font-bold">{formatPrice(product.price)}</span>
            )}
          </div>
          <p className={`text-xs ${product.stock > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
            {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : "Hết hàng"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");

  const { data: brandsData } = useQuery<{ items: Brand[] }>({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/brands", { params: { limit: 100 } });
      return res.data;
    },
  });

  const { data: productsData, isLoading: productsLoading, error: productsError } = useQuery<{ items: Product[] }>({
    queryKey: ["home-products"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/products", { params: { page: 1, limit: 8 } });
      return res.data;
    },
  });

  const { data: recommendData, isLoading: recommendLoading, error: recommendError } = useQuery<{ results: RecommendResult[] }>({
    queryKey: ["home-recommend"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/ai/recommend", { params: { strategy: "popular", limit: 4 } });
      return res.data;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const products = productsData?.items || [];
  const recommendations = recommendData?.results || [];
  const brands = brandsData?.items || [];

  const getBrandIdBySlug = (slug: string) => brands.find((b) => b.slug === slug)?.id;

  // Resolve brand card → product list URL. Ưu tiên brand_id (chính xác hơn)
  // khi brand tồn tại DB; fallback search keyword cho Apple product lines
  // và brands chưa seed (Oppo/Vivo/Huawei/Realme).
  const getBrandHref = (item: typeof BRAND_SHOWCASE[number]) => {
    if (item.brandSlug) {
      const id = getBrandIdBySlug(item.brandSlug);
      if (id) return `/products?brand_id=${id}`;
    }
    return `/products?search=${encodeURIComponent(item.search || item.label)}`;
  };
  const heroProduct = products[0];
  const heroAccentProduct = products[1];

  return (
    <div className="space-y-16 md:space-y-20">
      {/* ── Hero Section ── */}
      <section className="relative -mx-4 px-4 pt-6 pb-12 md:pt-12 md:pb-16 lg:pt-16 overflow-hidden">
        {/* Soft gradient backdrop */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-background dark:from-primary/10" aria-hidden="true" />
        <div className="absolute top-0 right-0 -z-10 w-[40rem] h-[40rem] rounded-full bg-primary/5 blur-3xl translate-x-1/3 -translate-y-1/3" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 -z-10 w-[30rem] h-[30rem] rounded-full bg-violet-500/5 blur-3xl -translate-x-1/3 translate-y-1/3" aria-hidden="true" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-6 max-w-xl">
            {/* AI Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 backdrop-blur px-3 py-1 text-xs font-medium text-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI-powered shopping experience
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              Thiết bị công nghệ{" "}
              <span className="bg-gradient-to-r from-primary via-violet-600 to-primary bg-clip-text text-transparent">
                chính hãng
              </span>
              , giá tốt mỗi ngày
            </h1>

            <p className="text-muted-foreground text-base lg:text-lg leading-relaxed">
              Laptop, điện thoại, tai nghe, phụ kiện — tuyển chọn kỹ, bảo hành minh bạch.
              Trợ lý AI giúp bạn chọn đúng nhu cầu trong vài giây.
            </p>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Bạn cần tìm gì hôm nay?"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 h-12 rounded-xl"
                  aria-label="Tìm kiếm sản phẩm"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 rounded-xl">Tìm kiếm</Button>
            </form>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link to="/products" className="flex-1 sm:flex-none">
                <Button size="lg" className="h-12 rounded-xl w-full sm:w-auto px-6">
                  Khám phá sản phẩm
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link to="/chat" className="flex-1 sm:flex-none">
                <Button size="lg" variant="outline" className="h-12 rounded-xl w-full sm:w-auto px-6">
                  <Sparkles className="h-4 w-4 mr-2 text-primary" />
                  Tư vấn AI
                </Button>
              </Link>
            </div>

            {/* Social proof bar */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="font-medium text-foreground">4.9</span>
                <span>từ 10K+ khách hàng</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-primary" />
                <span><span className="font-medium text-foreground">{products.length > 0 ? "75+" : "Nhiều"}</span> sản phẩm chính hãng</span>
              </div>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="relative hidden lg:block">
            <div className="relative w-full max-w-lg mx-auto">
              {/* Main hero card */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-border bg-card aspect-[4/5]">
                {heroProduct?.image_url ? (
                  <OptimizedImage
                    src={heroProduct.image_url}
                    alt={heroProduct.name}
                    width={600}
                    height={750}
                    className="w-full h-full object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-violet-500/10">
                    <Laptop className="h-32 w-32 text-primary/30" />
                  </div>
                )}

                {/* Top badge */}
                <span className="absolute top-5 left-5 inline-flex items-center gap-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1.5 shadow-lg">
                  <Sparkles className="h-3 w-3" />
                  Ưu đãi đến 20%
                </span>

                {/* Bottom product info */}
                {heroProduct && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-16">
                    <p className="text-white font-semibold text-lg line-clamp-1">{heroProduct.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {heroProduct.sale_price ? (
                        <>
                          <span className="text-white font-bold text-lg">{formatPrice(heroProduct.sale_price)}</span>
                          <span className="text-white/60 text-sm line-through">{formatPrice(heroProduct.price)}</span>
                        </>
                      ) : (
                        <span className="text-white font-bold text-lg">{formatPrice(heroProduct.price)}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Floating mini-card: secondary product */}
              {heroAccentProduct && (
                <div className="absolute -left-6 bottom-12 w-44 rounded-2xl bg-card border border-border shadow-xl p-3 hidden xl:block">
                  <div className="aspect-square rounded-xl overflow-hidden bg-muted mb-2">
                    {heroAccentProduct.image_url && (
                      <OptimizedImage
                        src={heroAccentProduct.image_url}
                        alt={heroAccentProduct.name}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <p className="text-xs font-medium line-clamp-1">{heroAccentProduct.name}</p>
                  <p className="text-sm font-bold text-destructive mt-0.5">
                    {formatPrice(heroAccentProduct.sale_price || heroAccentProduct.price)}
                  </p>
                </div>
              )}

              {/* Floating AI badge — pulse dot xanh để show AI "đang hoạt động" */}
              <div className="absolute -right-4 top-8 rounded-2xl bg-card border border-border shadow-xl px-4 py-3 flex items-center gap-2.5 hidden xl:flex">
                <div className="relative h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground leading-tight">Gợi ý bởi</p>
                  <p className="text-sm font-semibold leading-tight">AI Assistant</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile: simple visual showcase */}
          <div className="lg:hidden">
            {heroProduct && (
              <Link to={`/products/${heroProduct.id}`}>
                <div className="relative rounded-3xl overflow-hidden shadow-xl ring-1 ring-border bg-card aspect-[4/3]">
                  {heroProduct.image_url ? (
                    <OptimizedImage
                      src={heroProduct.image_url}
                      alt={heroProduct.name}
                      width={600}
                      height={450}
                      className="w-full h-full object-cover"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-violet-500/10">
                      <Laptop className="h-24 w-24 text-primary/30" />
                    </div>
                  )}
                  <span className="absolute top-4 left-4 inline-flex items-center gap-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1.5 shadow-lg">
                    <Sparkles className="h-3 w-3" />
                    Ưu đãi đến 20%
                  </span>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
                    <p className="text-white font-semibold line-clamp-1">{heroProduct.name}</p>
                    <p className="text-white font-bold">{formatPrice(heroProduct.sale_price || heroProduct.price)}</p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Trust strip — 4 cards với color identity riêng cho mỗi commitment */}
        <div className="mt-12 md:mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {TRUST_STRIP.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`group flex items-start gap-3 rounded-2xl border border-border/60 bg-card/70 backdrop-blur px-4 py-4 ring-1 ring-transparent hover:${item.ring} hover:shadow-md hover:-translate-y-0.5 transition-all`}
              >
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg} transition-transform group-hover:scale-110`}>
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

      {/* ── Brand Showcase ── */}
      <section>
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Khám phá theo thương hiệu</h2>
          <p className="text-sm text-muted-foreground mt-1.5">Mua sắm theo thương hiệu yêu thích</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 md:gap-3">
          {BRAND_SHOWCASE.map((item) => (
            <Link key={item.key} to={getBrandHref(item)}>
              <Card className="h-full hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group border-border/60 rounded-xl">
                <CardContent className="flex items-center gap-3 py-3 px-3">
                  <div className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${item.logoClass}`}>
                    <span aria-hidden="true">{item.logoText}</span>
                  </div>
                  <span className="text-sm font-medium truncate">{item.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section>
        <div className="flex items-end justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Sản phẩm nổi bật</h2>
            <p className="text-sm text-muted-foreground mt-1.5">Sản phẩm mới nhất từ TechSphere</p>
          </div>
          <Link to="/products" className="shrink-0">
            <Button variant="outline" size="sm" className="rounded-full">
              Xem tất cả
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {productsLoading ? (
          <ProductGridSkeleton count={8} />
        ) : productsError ? (
          <div className="text-center py-12 text-muted-foreground">Không thể tải sản phẩm. Vui lòng thử lại sau.</div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Chưa có sản phẩm nào.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* ── AI Consultation ── */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-violet-500/5 p-6 md:p-10">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" aria-hidden="true" />
        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl md:text-2xl font-bold tracking-tight">Không biết chọn sản phẩm nào?</h3>
            <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              Trợ lý AI của TechSphere phân tích nhu cầu, ngân sách và mục đích sử dụng của bạn
              để gợi ý sản phẩm phù hợp nhất trong vài giây.
            </p>
          </div>
          <Link to="/chat" className="w-full md:w-auto">
            <Button size="lg" className="w-full md:w-auto rounded-xl h-12 px-6">
              <MessageSquare className="h-4 w-4 mr-2" />
              Bắt đầu tư vấn
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Popular / Recommendations ── */}
      {recommendations.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Phổ biến nhất</h2>
              <p className="text-sm text-muted-foreground mt-1.5">Sản phẩm được nhiều người quan tâm</p>
            </div>
          </div>

          {recommendLoading ? (
            <ProductGridSkeleton count={4} />
          ) : recommendError ? (
            <div className="text-center py-12 text-muted-foreground">Không thể tải gợi ý.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              {recommendations.map((item) => (
                <ProductCard key={item.product.id} product={item.product} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
