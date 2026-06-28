import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/common/Skeleton";
import ProductCard from "@/components/common/ProductCard";
import Pagination from "@/components/common/Pagination";
import SearchAutocomplete from "@/components/common/SearchAutocomplete";
import {
  Search, ChevronRight, X, SlidersHorizontal, Home,
  Smartphone, Laptop, Tablet, Headphones, Cable, ArrowUpDown, Star,
} from "lucide-react";
import { formatPrice } from "@/utils/format";
import type { Category, Brand, ProductsResponse } from "@/types";

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá thấp → cao" },
  { value: "price_desc", label: "Giá cao → thấp" },
  { value: "rating_desc", label: "Đánh giá cao" },
];

const PRICE_PRESETS = [
  { label: "Tất cả", min: "", max: "" },
  { label: "Dưới 5 triệu", min: "", max: "5000000" },
  { label: "5 - 10 triệu", min: "5000000", max: "10000000" },
  { label: "10 - 20 triệu", min: "10000000", max: "20000000" },
  { label: "Trên 20 triệu", min: "20000000", max: "" },
];

const RATING_OPTIONS = [
  { label: "Tất cả", value: "" },
  { label: "4★ trở lên", value: "4" },
  { label: "3★ trở lên", value: "3" },
  { label: "2★ trở lên", value: "2" },
  { label: "1★ trở lên", value: "1" },
];

const CATEGORY_ICONS: Record<string, typeof Smartphone> = {
  "dien-thoai": Smartphone,
  "laptop": Laptop,
  "tablet": Tablet,
  "tai-nghe": Headphones,
  "phu-kien": Cable,
};

function ProductCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const listTopRef = useRef<HTMLDivElement>(null);

  const page = parseInt(searchParams.get("page") || "1");
  const limit = 12;
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("category_id") || "";
  const brandId = searchParams.get("brand_id") || "";
  const sort = searchParams.get("sort") || "newest";
  const minPrice = searchParams.get("min_price") || "";
  const maxPrice = searchParams.get("max_price") || "";
  const minRating = searchParams.get("min_rating") || "";

  const { data, isLoading, error } = useQuery<ProductsResponse>({
    queryKey: ["products", page, search, categoryId, brandId, sort, minPrice, maxPrice, minRating],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (search) params.search = search;
      if (categoryId) params.category_id = categoryId;
      if (brandId) params.brand_id = brandId;
      if (sort && sort !== "newest") params.sort = sort;
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;
      if (minRating) params.min_rating = minRating;
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

  const handleSearch = (query: string) => {
    updateParams({ search: query });
  };

  const clearAllFilters = () => {
    setSearchParams({});
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(newPage));
    setSearchParams(params);
    // Cuộn lên đầu danh sách sản phẩm (không phải đầu trang) khi đổi trang
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const hasActiveFilters = search || categoryId || brandId || minPrice || maxPrice || minRating;
  const activeFilterCount = [
    search,
    categoryId,
    brandId,
    minPrice || maxPrice,
    minRating,
    sort !== "newest" ? sort : "",
  ].filter(Boolean).length;
  const currentPricePreset = PRICE_PRESETS.find(
    (p) => p.min === minPrice && p.max === maxPrice
  );
  const currentSortLabel = SORT_OPTIONS.find((s) => s.value === sort)?.label || "Mới nhất";
  const currentRatingLabel = RATING_OPTIONS.find((r) => r.value === minRating)?.label || "Tất cả";
  const fromItem = (page - 1) * limit + 1;
  const toItem = Math.min(page * limit, total);

  // ── Sidebar content (shared between desktop and mobile) ──
  const filterContent = (
    <div className="space-y-6">
      {/* Active filters */}
      {hasActiveFilters && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Đang lọc: {activeFilterCount} bộ lọc
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-7 px-2 text-destructive hover:text-destructive"
            >
              Xóa tất cả
            </Button>
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
            {(minPrice || maxPrice) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
                {currentPricePreset?.label || `${minPrice ? formatPrice(Number(minPrice)) : "0"} - ${maxPrice ? formatPrice(Number(maxPrice)) : "∞"}`}
                <button onClick={() => updateParams({ min_price: "", max_price: "" })}><X className="h-3 w-3" /></button>
              </span>
            )}
            {minRating && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                {currentRatingLabel}
                <button onClick={() => updateParams({ min_rating: "" })}><X className="h-3 w-3" /></button>
              </span>
            )}
            {sort !== "newest" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                {currentSortLabel}
                <button onClick={() => updateParams({ sort: "" })}><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
          <Separator className="mt-4" />
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

      <Separator />

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

      <Separator />

      {/* Rating filter */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Đánh giá</h3>
        <div className="space-y-1">
          {RATING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateParams({ min_rating: opt.value })}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                minRating === opt.value ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
              }`}
            >
              {opt.value && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />}
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 pb-20 lg:pb-0">
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
      </div>

      {/* ── Mobile filter (Sheet collapsible) ── */}
      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="left" className="w-[88vw] max-w-sm flex flex-col p-0 lg:hidden">
          <SheetHeader className="p-5 pb-3 border-b border-border">
            <SheetTitle>Bộ lọc</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-5">
            {filterContent}
          </div>
          <SheetFooter className="p-5 pt-3 border-t border-border">
            <Button className="w-full" onClick={() => setMobileFilterOpen(false)}>
              Xem {total} sản phẩm
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Mobile sort dropdown ── */}
      {mobileSortOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileSortOpen(false)} />
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-2xl shadow-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b">
              <h2 className="text-lg font-semibold">Sắp xếp</h2>
              <button onClick={() => setMobileSortOpen(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-1 pt-2">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    updateParams({ sort: opt.value });
                    setMobileSortOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors ${
                    sort === opt.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Main layout ── */}
      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-20 bg-card rounded-2xl border border-border/60 shadow-sm p-5">
            {filterContent}
          </div>
        </aside>

        {/* Product grid area */}
        <div ref={listTopRef} className="flex-1 min-w-0 scroll-mt-24">
          {/* Search bar with autocomplete */}
          <div className="mb-4">
            <SearchAutocomplete
              onSearch={handleSearch}
              initialValue={search}
              categories={categories}
              brands={brands}
            />
          </div>

          {/* Sort + Price presets (desktop) */}
          <div className="hidden lg:flex items-center gap-3 mb-6">
            {/* Sort dropdown */}
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <select
                value={sort}
                onChange={(e) => updateParams({ sort: e.target.value })}
                className="h-9 pl-9 pr-8 rounded-lg border border-input bg-card text-sm appearance-none cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Price presets */}
            <div className="flex flex-wrap gap-2">
              {PRICE_PRESETS.map((preset) => {
                const isActive = preset.min === minPrice && preset.max === maxPrice;
                return (
                  <button
                    key={preset.label}
                    onClick={() => updateParams({ min_price: preset.min, max_price: preset.max })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price presets (mobile — inline, no sort since it's in sticky bar) */}
          <div className="flex flex-wrap gap-2 mb-6 lg:hidden">
            {PRICE_PRESETS.map((preset) => {
              const isActive = preset.min === minPrice && preset.max === maxPrice;
              return (
                <button
                  key={preset.label}
                  onClick={() => updateParams({ min_price: preset.min, max_price: preset.max })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Results count — ở đầu kết quả */}
          {!isLoading && !error && total > 0 && (
            <p className="text-sm text-muted-foreground mb-4">
              Tìm thấy <span className="font-semibold text-foreground">{total}</span> sản phẩm
              {search && (
                <> cho “<span className="font-semibold text-foreground">{search}</span>”</>
              )}
            </p>
          )}

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

          {/* Empty — pattern empty state theo UI_PATTERNS.md */}
          {!isLoading && !error && products.length === 0 && (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Search className="h-12 w-12" />
              <p className="mt-4 text-lg font-medium text-foreground">Không tìm thấy sản phẩm phù hợp</p>
              <p className="mt-1 text-sm">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearAllFilters} className="mt-4">Xóa bộ lọc</Button>
              )}
            </div>
          )}

          {/* Product grid */}
          {!isLoading && !error && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showBrandCategory
                  showWishlist
                  showRating
                  brandName={getBrandName(product.brand_id)}
                  categoryName={getCategoryName(product.category_id)}
                  highlight={search}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="mt-8">
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile sticky bottom bar ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border shadow-lg">
        <div className="flex">
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Lọc
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-primary" />
            )}
          </button>
          <div className="w-px bg-border" />
          <button
            onClick={() => setMobileSortOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <ArrowUpDown className="h-4 w-4" />
            Sắp xếp
          </button>
        </div>
      </div>
    </div>
  );
}
