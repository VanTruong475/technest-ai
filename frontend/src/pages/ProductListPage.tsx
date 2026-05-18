import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/common/Skeleton";
import { SaleBadge } from "@/components/common/SaleBadge";
import HeartButton from "@/components/common/HeartButton";
import {
  Search, ChevronRight, X, SlidersHorizontal, Home,
  Smartphone, Laptop, Tablet, Headphones, Cable,
} from "lucide-react";
import { formatPrice } from "@/utils/format";

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
  category_id: number;
  brand_id: number;
}

interface ProductsResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Brand {
  id: number;
  name: string;
  slug: string;
}

const CATEGORY_ICONS: Record<string, typeof Smartphone> = {
  "dien-thoai": Smartphone,
  "laptop": Laptop,
  "tablet": Tablet,
  "tai-nghe": Headphones,
  "phu-kien": Cable,
};

function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const page = parseInt(searchParams.get("page") || "1");
  const limit = 12;
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("category_id") || "";
  const brandId = searchParams.get("brand_id") || "";

  const { data, isLoading, error } = useQuery<ProductsResponse>({
    queryKey: ["products", page, search, categoryId, brandId],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (search) params.search = search;
      if (categoryId) params.category_id = categoryId;
      if (brandId) params.brand_id = brandId;
      const res = await axiosClient.get("/api/products", { params });
      return res.data;
    },
  });

  const { data: categoriesData } = useQuery<{ items: Category[] }>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/categories", { params: { limit: 100 } });
      return res.data;
    },
  });

  const { data: brandsData } = useQuery<{ items: Brand[] }>({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/brands", { params: { limit: 100 } });
      return res.data;
    },
  });

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    params.set("page", "1");
    setSearchParams(params);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchInput });
  };

  const clearAllFilters = () => {
    setSearchParams({});
    setSearchInput("");
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(newPage));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const products = data?.items || [];
  const totalPages = data?.total_pages || 1;
  const total = data?.total || 0;
  const categories = categoriesData?.items || [];
  const brands = brandsData?.items || [];

  const getCategoryName = (id: number) => categories.find((c) => c.id === id)?.name;
  const getBrandName = (id: number) => brands.find((b) => b.id === id)?.name;
  const selectedCategoryName = categoryId ? getCategoryName(Number(categoryId)) : null;
  const selectedBrandName = brandId ? getBrandName(Number(brandId)) : null;

  const hasActiveFilters = search || categoryId || brandId;
  const fromItem = (page - 1) * limit + 1;
  const toItem = Math.min(page * limit, total);

  // ── Sidebar content (shared between desktop and mobile) ──
  const filterContent = (
    <div className="space-y-6">
      {/* Active filters */}
      {hasActiveFilters && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Đang lọc</span>
            <button onClick={clearAllFilters} className="text-xs text-destructive hover:underline">
              Xóa tất cả
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {search && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-xs font-medium">
                "{search}"
                <button onClick={() => updateParams({ search: "" })}><X className="h-3 w-3" /></button>
              </span>
            )}
            {selectedCategoryName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {selectedCategoryName}
                <button onClick={() => updateParams({ category_id: "" })}><X className="h-3 w-3" /></button>
              </span>
            )}
            {selectedBrandName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {selectedBrandName}
                <button onClick={() => updateParams({ brand_id: "" })}><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Categories */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Danh mục</h3>
        <div className="space-y-1">
          <button
            onClick={() => updateParams({ category_id: "" })}
            className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
              !categoryId ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
            }`}
          >
            Tất cả danh mục
          </button>
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.slug];
            return (
              <button
                key={cat.id}
                onClick={() => updateParams({ category_id: String(cat.id) })}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  categoryId === String(cat.id) ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Brands */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Thương hiệu</h3>
        <div className="space-y-1">
          <button
            onClick={() => updateParams({ brand_id: "" })}
            className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
              !brandId ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
            }`}
          >
            Tất cả thương hiệu
          </button>
          {brands.map((brand) => (
            <button
              key={brand.id}
              onClick={() => updateParams({ brand_id: String(brand.id) })}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                brandId === String(brand.id) ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
              }`}
            >
              {brand.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground flex items-center gap-1">
          <Home className="h-3.5 w-3.5" />
          Trang chủ
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Sản phẩm</span>
      </nav>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sản phẩm</h1>
          {!isLoading && total > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Hiển thị {fromItem}-{toItem} của {total} sản phẩm
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="lg:hidden"
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
        >
          <SlidersHorizontal className="h-4 w-4 mr-1.5" />
          Bộ lọc
        </Button>
      </div>

      {/* ── Mobile filter overlay ── */}
      {mobileFilterOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileFilterOpen(false)} />
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto bg-white rounded-t-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <h2 className="text-lg font-semibold">Bộ lọc</h2>
              <button onClick={() => setMobileFilterOpen(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            {filterContent}
            <Button className="w-full" onClick={() => setMobileFilterOpen(false)}>
              Xem {total} sản phẩm
            </Button>
          </div>
        </>
      )}

      {/* ── Main layout ── */}
      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-20 bg-white rounded-2xl border border-border/60 shadow-sm p-5">
            {filterContent}
          </div>
        </aside>

        {/* Product grid area */}
        <div className="flex-1 min-w-0">
          {/* Search bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm sản phẩm..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-white"
              />
            </div>
          </form>

          {/* Loading */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <Card className="border-border/60 shadow-sm">
              <CardContent className="py-12 text-center space-y-3">
                <p className="text-destructive font-medium">Không thể tải sản phẩm</p>
                <Button variant="outline" onClick={() => window.location.reload()}>Thử lại</Button>
              </CardContent>
            </Card>
          )}

          {/* Empty */}
          {!isLoading && !error && products.length === 0 && (
            <Card className="border-border/60 shadow-sm">
              <CardContent className="py-16 text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <Search className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold">Không tìm thấy sản phẩm phù hợp</p>
                <p className="text-sm text-muted-foreground">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearAllFilters} className="mt-2">Xóa bộ lọc</Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Product grid */}
          {!isLoading && !error && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map((product) => {
                const categoryName = getCategoryName(product.category_id);
                const brandName = getBrandName(product.brand_id);
                return (
                  <Link key={product.id} to={`/products/${product.id}`}>
                    <Card className="h-full hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden border-border/60 shadow-sm rounded-2xl group">
                      {product.sale_price && product.sale_price < product.price && (
                        <SaleBadge price={product.price} salePrice={product.sale_price} />
                      )}
                      <div className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <HeartButton productId={product.id} />
                      </div>
                      <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <span className="text-5xl">📦</span>
                        )}
                      </div>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          {brandName && (
                            <span className="text-xs font-semibold text-primary">{brandName}</span>
                          )}
                          {categoryName && (
                            <span className="text-xs text-muted-foreground">· {categoryName}</span>
                          )}
                        </div>
                        <h3 className="font-semibold line-clamp-2 text-sm leading-snug">{product.name}</h3>
                        <div className="flex items-center gap-2">
                          {product.sale_price && product.sale_price < product.price ? (
                            <>
                              <span className="text-lg font-bold text-destructive">{formatPrice(product.sale_price)}</span>
                              <span className="text-sm text-muted-foreground line-through">{formatPrice(product.price)}</span>
                            </>
                          ) : (
                            <span className="text-lg font-bold">{formatPrice(product.price)}</span>
                          )}
                        </div>
                        <p className={`text-xs font-medium ${product.stock > 0 ? "text-green-600" : "text-destructive"}`}>
                          {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : "Hết hàng"}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="rounded-lg"
              >
                Trước
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "dots")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("dots");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "dots" ? (
                    <span key={`dots-${i}`} className="px-1 text-muted-foreground">...</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(p as number)}
                      className="rounded-lg min-w-[36px]"
                    >
                      {p}
                    </Button>
                  )
                )}
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="rounded-lg"
              >
                Sau
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
