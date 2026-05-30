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

export default function WishlistPage() {
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
    onError: () => {
      toast.error("Không thể xóa");
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Sản phẩm yêu thích</h1>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <WishlistItemSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Sản phẩm yêu thích</h1>

      {error ? (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-destructive font-medium">Không thể tải danh sách yêu thích</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Thử lại</Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground">Chưa có sản phẩm yêu thích nào</p>
          <Link to="/products">
            <Button>Khám phá sản phẩm</Button>
          </Link>
        </div>
      ) : (
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
                        <span className="font-bold text-destructive">{formatPrice(item.sale_price)}</span>
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
      )}
    </div>
  );
}
