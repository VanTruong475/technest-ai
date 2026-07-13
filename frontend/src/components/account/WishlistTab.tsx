import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Trash2 } from "lucide-react";
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

/** Tab "Wishlist" — danh sách yêu thích + empty state. */
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
      <Card className="border-border/60 shadow-sm">
        <CardContent className="py-12 text-center space-y-3">
          <p className="text-destructive font-medium">Không thể tải danh sách yêu thích</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Thử lại</Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state (UI_PATTERNS.md)
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <Heart className="h-12 w-12" />
        <p className="mt-4 text-lg font-medium text-foreground">Chưa có sản phẩm yêu thích</p>
        <p className="mt-1 text-sm">Lưu lại những sản phẩm bạn quan tâm để xem sau.</p>
        <Link to="/products">
          <Button className="mt-5">Khám phá sản phẩm</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <CardContent className="p-4 flex gap-4">
            <Link to={`/products/${item.product_id}`} className="shrink-0">
              <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                {item.image_url ? (
                  <OptimizedImage src={item.image_url} alt={item.product_name} width={96} height={96} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl" aria-hidden="true">📦</span>
                )}
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <Link to={`/products/${item.product_id}`} className="hover:underline">
                <h3 className="font-semibold line-clamp-1">{item.product_name}</h3>
              </Link>
              <div className="flex items-center gap-2 mt-1">
                {item.sale_price && item.sale_price < item.price ? (
                  <>
                    <span className="font-bold text-sale">{formatPrice(item.sale_price)}</span>
                    <span className="text-sm text-muted-foreground line-through">{formatPrice(item.price)}</span>
                  </>
                ) : (
                  <span className="font-bold">{formatPrice(item.price)}</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeMutation.mutate(item.product_id)}
                disabled={removeMutation.isPending}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Xóa khỏi danh sách yêu thích"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
