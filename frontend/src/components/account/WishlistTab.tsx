import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Trash2, Package } from "lucide-react";
import { formatPrice } from "@/utils/format";
import { WishlistItemSkeleton } from "@/components/common/Skeleton";

interface WishlistItem {
  id: number;
  product_id: number;
  product_name: string;
  product_slug: string;
  image_url: string | null;
  price: number;
  sale_price: number | null;
  created_at: string;
}

/** Tab "Yêu thích" — list + empty state theo UI_PATTERNS. */
export default function WishlistTab() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, error } = useQuery<WishlistItem[]>({
    queryKey: ["wishlist"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/wishlist");
      return res.data;
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (productId: number) => {
      await axiosClient.delete(`/api/wishlist/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success("Đã xóa khỏi yêu thích");
    },
    onError: () => toast.error("Không thể xóa"),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <WishlistItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-12 text-center space-y-3">
          <p className="text-destructive font-medium">Không thể tải danh sách yêu thích</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Thử lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <Heart className="h-12 w-12" aria-hidden="true" />
        <p className="mt-4 text-lg font-medium text-foreground">Chưa có sản phẩm yêu thích</p>
        <p className="mt-1 text-sm">Lưu lại những sản phẩm bạn quan tâm để xem sau.</p>
        <Button asChild className="mt-5">
          <Link to="/products">Khám phá sản phẩm</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const onSale = item.sale_price != null && item.sale_price < item.price;
        return (
          <Card key={item.id} className="border-border/60 overflow-hidden">
            <CardContent className="p-4 flex gap-4 items-center">
              <Link to={`/products/${item.product_id}`} className="shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center border border-border/40">
                  {item.image_url ? (
                    <OptimizedImage
                      src={item.image_url}
                      alt={item.product_name}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
                  )}
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <Link to={`/products/${item.product_id}`} className="hover:text-primary transition-colors">
                  <h3 className="font-medium text-sm sm:text-base line-clamp-2 leading-snug">
                    {item.product_name}
                  </h3>
                </Link>
                <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
                  {onSale ? (
                    <>
                      <span className="font-bold text-primary">{formatPrice(item.sale_price!)}</span>
                      <span className="text-sm text-muted-foreground line-through">
                        {formatPrice(item.price)}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold text-primary">{formatPrice(item.price)}</span>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeMutation.mutate(item.product_id)}
                disabled={removeMutation.isPending}
                className="text-muted-foreground hover:text-destructive shrink-0"
                aria-label="Xóa khỏi danh sách yêu thích"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
