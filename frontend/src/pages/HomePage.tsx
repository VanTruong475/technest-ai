import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search, Smartphone, Laptop, Tablet, Headphones, Cable,
  MessageSquare, ShieldCheck, Truck, RotateCcw, ArrowRight,
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

interface Category {
  id: number;
  name: string;
  slug: string;
}

const CATEGORY_SHOWCASE = [
  { slug: "laptop", label: "Laptop", icon: Laptop, color: "bg-blue-50 text-blue-600" },
  { slug: "dien-thoai", label: "Điện thoại", icon: Smartphone, color: "bg-green-50 text-green-600" },
  { slug: "tablet", label: "Tablet", icon: Tablet, color: "bg-purple-50 text-purple-600" },
  { slug: "tai-nghe", label: "Tai nghe", icon: Headphones, color: "bg-orange-50 text-orange-600" },
  { slug: "phu-kien", label: "Phụ kiện", icon: Cable, color: "bg-pink-50 text-pink-600" },
];

function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/products/${product.id}`}>
      <Card className="h-full hover:shadow-lg transition-all cursor-pointer relative overflow-hidden group">
        {product.sale_price && product.sale_price < product.price && (
          <SaleBadge price={product.price} salePrice={product.sale_price} />
        )}
        <div className="aspect-[4/3] bg-muted flex items-center justify-center rounded-t-xl overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <span className="text-4xl">📦</span>
          )}
        </div>
        <CardContent className="space-y-2">
          <h3 className="font-medium line-clamp-2 text-sm">{product.name}</h3>
          <div className="flex items-center gap-2">
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
          <p className="text-xs text-muted-foreground">
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

  // Fetch categories for slug → id mapping
  const { data: categoriesData } = useQuery<{ items: Category[] }>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/categories", { params: { limit: 100 } });
      return res.data;
    },
  });

  // Fetch featured products
  const { data: productsData, isLoading: productsLoading, error: productsError } = useQuery<{ items: Product[] }>({
    queryKey: ["home-products"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/products", { params: { page: 1, limit: 8 } });
      return res.data;
    },
  });

  // Fetch popular recommendations
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
  const categories = categoriesData?.items || [];

  const getCategoryIdBySlug = (slug: string) => categories.find((c) => c.slug === slug)?.id;
  const heroProduct = products[0];

  return (
    <div className="space-y-12">
      {/* ── Hero Section ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left: Content */}
        <div className="space-y-6">
          <span className="inline-block text-sm font-medium text-primary tracking-wide uppercase">
            TechSphere Store
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15]">
            Mua sắm thiết bị <br className="hidden sm:block" />
            công nghệ chính hãng
          </h1>
          <p className="text-muted-foreground text-base lg:text-lg max-w-lg leading-relaxed">
            Laptop, điện thoại, tai nghe và phụ kiện với giá tốt, bảo hành rõ ràng, hỗ trợ tư vấn nhanh.
          </p>

          <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm sản phẩm..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-11"
              />
            </div>
            <Button type="submit" size="lg">Tìm kiếm</Button>
          </form>

          <div className="flex flex-wrap gap-3">
            <Link to="/products">
              <Button size="lg">Mua ngay</Button>
            </Link>
            <Link to="/products">
              <Button size="lg" variant="outline">
                Xem sản phẩm
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Right: Product showcase card */}
        <div className="relative flex justify-center lg:justify-end">
          <div className="relative w-full max-w-md">
            {/* Main showcase card */}
            <div className="relative rounded-3xl overflow-hidden shadow-xl bg-muted">
              <div className="aspect-[4/3] overflow-hidden">
                {heroProduct?.image_url ? (
                  <img
                    src={heroProduct.image_url}
                    alt={heroProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <Laptop className="h-24 w-24 text-primary/30" />
                  </div>
                )}
              </div>

              {/* Discount badge */}
              <span className="absolute top-4 right-4 bg-destructive text-destructive-foreground text-sm font-bold px-3 py-1 rounded-full shadow-lg">
                Ưu đãi đến 20%
              </span>

              {/* Product info overlay */}
              {heroProduct && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-12">
                  <p className="text-white font-semibold text-lg line-clamp-1">{heroProduct.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {heroProduct.sale_price ? (
                      <>
                        <span className="text-white font-bold">{formatPrice(heroProduct.sale_price)}</span>
                        <span className="text-white/60 text-sm line-through">{formatPrice(heroProduct.price)}</span>
                      </>
                    ) : (
                      <span className="text-white font-bold">{formatPrice(heroProduct.price)}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Trust badges below card */}
            <div className="flex justify-center gap-4 mt-4">
              {[
                { icon: ShieldCheck, label: "Bảo hành" },
                { icon: Truck, label: "Giao hàng nhanh" },
                { icon: RotateCcw, label: "Đổi trả dễ dàng" },
              ].map((badge) => (
                <div key={badge.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <badge.icon className="h-4 w-4 text-primary" />
                  <span>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Category Shortcuts ── */}
      <section>
        <h2 className="text-xl font-bold mb-5">Danh mục nổi bật</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {CATEGORY_SHOWCASE.map((cat) => {
            const catId = getCategoryIdBySlug(cat.slug);
            const href = catId ? `/products?category_id=${catId}` : "/products";
            const Icon = cat.icon;
            return (
              <Link key={cat.slug} to={href}>
                <Card className="hover:shadow-md transition-all cursor-pointer group">
                  <CardContent className="flex flex-col items-center gap-3 py-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cat.color} transition-transform group-hover:scale-110`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-medium">{cat.label}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold">Sản phẩm nổi bật</h2>
            <p className="text-sm text-muted-foreground mt-1">Sản phẩm mới nhất từ TechSphere</p>
          </div>
          <Link to="/products">
            <Button variant="outline" size="sm">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* ── AI Consultation (subtle) ── */}
      <section className="bg-muted/50 rounded-2xl border p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-lg font-bold">Cần tư vấn chọn sản phẩm?</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Mô tả nhu cầu của bạn, TechSphere sẽ gợi ý sản phẩm phù hợp dựa trên ngân sách và mục đích sử dụng.
          </p>
        </div>
        <Link to="/chat">
          <Button variant="outline" size="lg">
            <MessageSquare className="h-4 w-4 mr-2" />
            Tư vấn mua hàng
          </Button>
        </Link>
      </section>

      {/* ── Popular / Recommendations ── */}
      {recommendations.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold">Phổ biến nhất</h2>
              <p className="text-sm text-muted-foreground mt-1">Sản phẩm được nhiều người quan tâm</p>
            </div>
          </div>

          {recommendLoading ? (
            <ProductGridSkeleton count={4} />
          ) : recommendError ? (
            <div className="text-center py-12 text-muted-foreground">Không thể tải gợi ý.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
