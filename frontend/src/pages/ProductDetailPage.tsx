import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ShoppingCart, LogIn, ChevronRight, Home } from "lucide-react";
import { formatPrice } from "@/utils/format";
import { ProductDetailSkeleton } from "@/components/common/Skeleton";
import { SaleBadge } from "@/components/common/SaleBadge";
import { ReviewSection } from "@/components/common/ReviewSection";
import HeartButton from "@/components/common/HeartButton";
import RecentlyViewed from "@/components/common/RecentlyViewed";
import CustomersAlsoBought from "@/components/common/CustomersAlsoBought";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { getErrorMessage } from "@/utils/api";
import type { Product } from "@/types";

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

  // Save to recently viewed when product loads
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
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không thể thêm vào giỏ hàng"));
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
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground flex items-center gap-1">
          <Home className="h-3.5 w-3.5" />
          Trang chủ
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/products" className="hover:text-foreground">Sản phẩm</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium line-clamp-1">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="aspect-square bg-muted flex items-center justify-center rounded-xl overflow-hidden relative">
          {product.sale_price && product.sale_price < product.price && (
            <SaleBadge price={product.price} salePrice={product.sale_price} />
          )}
          {product.image_url ? (
            <OptimizedImage src={product.image_url} alt={product.name} width={600} height={600} className="w-full h-full object-cover" priority />
          ) : (
            <span className="text-8xl" aria-hidden="true">📦</span>
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

          {/* Wishlist */}
          <div>
            <HeartButton
              productId={product.id}
              className="h-10 px-4 gap-2 border rounded-md text-sm hover:bg-accent"
              showLabel
            />
          </div>
        </div>
      </div>

      {/* Reviews */}
      <ReviewSection productId={Number(id)} />

      {/* "Có thể bạn cũng thích" — backend dùng co-occurrence (khách mua A
          cũng mua B), tự fallback về cùng category → popular nếu chưa đủ
          dữ liệu order. Strict upgrade so với phiên bản chỉ filter category. */}
      <CustomersAlsoBought productId={Number(id)} limit={4} />

      {/* Recently Viewed */}
      <RecentlyViewed currentProductId={Number(id)} />
    </div>
  );
}
