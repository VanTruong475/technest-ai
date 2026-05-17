import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Sparkles, MessageSquare, TrendingUp, Zap, ShieldCheck } from "lucide-react";

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

function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN").format(price) + "đ";
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/products/${product.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <div className="aspect-square bg-muted flex items-center justify-center rounded-t-xl overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
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

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-primary/5 border p-8 md:p-12">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">TechSphere AI</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Mua sắm công nghệ <br className="hidden md:block" />
            <span className="text-primary">thông minh hơn</span>
          </h1>
          <p className="mt-4 text-muted-foreground text-base md:text-lg">
            Laptop, điện thoại, phụ kiện công nghệ với AI tư vấn sản phẩm phù hợp nhu cầu của bạn.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="mt-6 flex gap-2 max-w-lg">
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

          {/* CTA buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/products">
              <Button size="lg">Xem sản phẩm</Button>
            </Link>
            <Link to="/chat">
              <Button size="lg" variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Tư vấn với AI
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Sản phẩm nổi bật</h2>
            <p className="text-sm text-muted-foreground mt-1">Sản phẩm mới nhất từ TechSphere</p>
          </div>
          <Link to="/products">
            <Button variant="outline" size="sm">Xem tất cả</Button>
          </Link>
        </div>

        {productsLoading ? (
          <div className="text-center py-12 text-muted-foreground">Đang tải sản phẩm...</div>
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

      {/* AI Recommendations */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Phổ biến nhất
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Sản phẩm được yêu thích nhất</p>
          </div>
        </div>

        {recommendLoading ? (
          <div className="text-center py-12 text-muted-foreground">Đang tải gợi ý...</div>
        ) : recommendError ? (
          <div className="text-center py-12 text-muted-foreground">Không thể tải gợi ý. Vui lòng thử lại sau.</div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Chưa có dữ liệu gợi ý.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recommendations.map((item) => (
              <ProductCard key={item.product.id} product={item.product} />
            ))}
          </div>
        )}
      </section>

      {/* AI Features */}
      <section>
        <h2 className="text-2xl font-bold text-center mb-8">Tính năng AI</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Tìm kiếm thông minh</h3>
              <p className="text-sm text-muted-foreground">
                Tìm sản phẩm theo nhu cầu, không cần từ khóa chính xác. AI hiểu ý bạn.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Gợi ý sản phẩm</h3>
              <p className="text-sm text-muted-foreground">
                Dựa trên giỏ hàng và lịch sử mua, AI gợi ý sản phẩm phù hợp nhất.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Chatbot tư vấn</h3>
              <p className="text-sm text-muted-foreground">
                Hỏi AI về sản phẩm, ngân sách, nhu cầu. Nhận tư vấn tức thì.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trust badges */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="space-y-2">
          <ShieldCheck className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">Bảo hành chính hãng</p>
        </div>
        <div className="space-y-2">
          <Zap className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">Giao hàng nhanh</p>
        </div>
        <div className="space-y-2">
          <Sparkles className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">AI tư vấn miễn phí</p>
        </div>
        <div className="space-y-2">
          <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">Hỗ trợ 24/7</p>
        </div>
      </section>
    </div>
  );
}
