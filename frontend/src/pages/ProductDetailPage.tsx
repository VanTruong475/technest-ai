import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ShoppingCart, LogIn } from "lucide-react";
import { formatPrice } from "@/utils/format";
import { ProductDetailSkeleton } from "@/components/common/Skeleton";
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
  category_id: number;
  brand_id: number;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);

  // Fetch product
  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await axiosClient.get(`/api/products/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // Fetch related products
  const { data: relatedData } = useQuery<{ items: Product[] }>({
    queryKey: ["related-products", product?.category_id, id],
    queryFn: async () => {
      const res = await axiosClient.get("/api/products", {
        params: { category_id: product!.category_id, page: 1, limit: 5 },
      });
      return res.data;
    },
    enabled: !!product?.category_id,
  });

  // Add to cart mutation
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
    onError: (err: any) => {
      const detail = err.response?.data?.detail || "Không thể thêm vào giỏ hàng";
      toast.error(detail);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">Không tìm thấy sản phẩm.</p>
        <Link to="/products">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Quay lại danh sách
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link to="/products" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Quay lại danh sách
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="aspect-square bg-muted flex items-center justify-center rounded-xl overflow-hidden relative">
          {product.sale_price && product.sale_price < product.price && (
            <SaleBadge price={product.price} salePrice={product.sale_price} />
          )}
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-8xl">📦</span>
          )}
        </div>

        {/* Product info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {product.status === "ACTIVE" ? "Đang bán" : "Ngừng bán"}
            </p>
          </div>

          {/* Price */}
          <div className="flex items-center gap-3">
            {product.sale_price ? (
              <>
                <span className="text-3xl font-bold text-destructive">
                  {formatPrice(product.sale_price)}
                </span>
                <span className="text-xl text-muted-foreground line-through">
                  {formatPrice(product.price)}
                </span>
                <span className="bg-destructive/10 text-destructive text-sm px-2 py-0.5 rounded">
                  -{Math.round((1 - product.sale_price / product.price) * 100)}%
                </span>
              </>
            ) : (
              <span className="text-3xl font-bold">{formatPrice(product.price)}</span>
            )}
          </div>

          {/* Stock */}
          <p className="text-sm">
            {product.stock > 0 ? (
              <span className="text-green-600">Còn {product.stock} sản phẩm</span>
            ) : (
              <span className="text-destructive">Hết hàng</span>
            )}
          </p>

          {/* Description */}
          {product.description && (
            <Card>
              <CardContent>
                <h3 className="font-medium mb-2">Mô tả sản phẩm</h3>
                <p className="text-sm text-muted-foreground">{product.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Add to cart */}
          {product.stock > 0 && product.status === "ACTIVE" && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="qty" className="text-sm">Số lượng:</label>
                <Input
                  id="qty"
                  type="number"
                  min={1}
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, Number(e.target.value))))}
                  className="w-20"
                />
              </div>

              {isAuthenticated ? (
                <Button
                  onClick={() => addToCartMutation.mutate()}
                  disabled={addToCartMutation.isPending}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  {addToCartMutation.isPending ? "Đang thêm..." : "Thêm vào giỏ"}
                </Button>
              ) : (
                <Link to="/login">
                  <Button variant="outline">
                    <LogIn className="h-4 w-4 mr-1" />
                    Đăng nhập để mua
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedData && relatedData.items && relatedData.items.filter((p) => p.id !== Number(id)).length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Sản phẩm liên quan</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedData.items
              .filter((p) => p.id !== Number(id))
              .slice(0, 4)
              .map((p) => (
                <Link key={p.id} to={`/products/${p.id}`}>
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden">
                    {p.sale_price && p.sale_price < p.price && (
                      <SaleBadge price={p.price} salePrice={p.sale_price} />
                    )}
                    <div className="aspect-square bg-muted flex items-center justify-center rounded-t-xl overflow-hidden">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">📦</span>
                      )}
                    </div>
                    <CardContent className="space-y-2">
                      <h3 className="font-medium line-clamp-2 text-sm">{p.name}</h3>
                      <div className="flex items-center gap-2">
                        {p.sale_price ? (
                          <>
                            <span className="text-base font-bold text-destructive">{formatPrice(p.sale_price)}</span>
                            <span className="text-xs text-muted-foreground line-through">{formatPrice(p.price)}</span>
                          </>
                        ) : (
                          <span className="text-base font-bold">{formatPrice(p.price)}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
