import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
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

function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN").format(price) + "đ";
}

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");

  const page = parseInt(searchParams.get("page") || "1");
  const limit = 12;
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("category_id") || "";
  const brandId = searchParams.get("brand_id") || "";

  // Fetch products
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

  // Fetch categories for filter
  const { data: categoriesData } = useQuery<{ items: Category[] }>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/categories", { params: { limit: 100 } });
      return res.data;
    },
  });

  // Fetch brands for filter
  const { data: brandsData } = useQuery<{ items: Brand[] }>({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/brands", { params: { limit: 100 } });
      return res.data;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput) {
      params.set("search", searchInput);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(newPage));
    setSearchParams(params);
  };

  const products = data?.items || [];
  const totalPages = data?.total_pages || 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sản phẩm</h1>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm sản phẩm..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button type="submit">Tìm</Button>
        </form>

        <div className="flex gap-2">
          <select
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={categoryId}
            onChange={(e) => handleFilterChange("category_id", e.target.value)}
          >
            <option value="">Tất cả danh mục</option>
            {categoriesData?.items?.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={brandId}
            onChange={(e) => handleFilterChange("brand_id", e.target.value)}
          >
            <option value="">Tất cả thương hiệu</option>
            {brandsData?.items?.map((brand) => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">Đang tải sản phẩm...</div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-12 text-destructive">
          Không thể tải sản phẩm. Vui lòng thử lại.
        </div>
      )}

      {/* Product Grid */}
      {!isLoading && !error && (
        <>
          {products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Không tìm thấy sản phẩm nào.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <Link key={product.id} to={`/products/${product.id}`}>
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                    {/* Placeholder image */}
                    <div className="aspect-square bg-muted flex items-center justify-center rounded-t-xl">
                      <span className="text-4xl">📦</span>
                    </div>
                    <CardContent className="space-y-2">
                      <h3 className="font-medium line-clamp-2">{product.name}</h3>
                      <div className="flex items-center gap-2">
                        {product.sale_price ? (
                          <>
                            <span className="text-lg font-bold text-destructive">
                              {formatPrice(product.sale_price)}
                            </span>
                            <span className="text-sm text-muted-foreground line-through">
                              {formatPrice(product.price)}
                            </span>
                          </>
                        ) : (
                          <span className="text-lg font-bold">{formatPrice(product.price)}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : "Hết hàng"}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Trang {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
