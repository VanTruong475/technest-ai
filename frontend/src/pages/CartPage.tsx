import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Minus, ShoppingCart, ArrowLeft, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/utils/format";
import { Skeleton } from "@/components/common/Skeleton";

interface CartItem {
  id: number;
  product_id: number;
  product_name: string;
  image_url: string | null;
  price: number;
  sale_price: number | null;
  quantity: number;
  subtotal: number;
}

interface CartData {
  id: number;
  user_id: number;
  items: CartItem[];
  total_items: number;
  total_amount: number;
}

function CartItemCardSkeleton() {
  return (
    <div className="flex items-center gap-5 p-5 bg-card rounded-2xl border border-border/60 shadow-sm">
      <Skeleton className="w-[120px] h-[120px] rounded-xl shrink-0" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-5 w-24 ml-auto" />
        <Skeleton className="h-8 w-8 ml-auto rounded-lg" />
      </div>
    </div>
  );
}

export default function CartPage() {
  const queryClient = useQueryClient();

  const { data: cart, isLoading, error, refetch } = useQuery<CartData>({
    queryKey: ["cart"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/cart");
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: number; quantity: number }) => {
      await axiosClient.put(`/api/cart/items/${itemId}`, { quantity });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
    onError: (err: any) => toast.error(err.response?.data?.detail || "Không thể cập nhật số lượng"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: number) => {
      await axiosClient.delete(`/api/cart/items/${itemId}`);
    },
    onSuccess: () => {
      toast.success("Đã xóa sản phẩm khỏi giỏ hàng");
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Không thể xóa sản phẩm"),
  });

  const handleQuantityChange = (itemId: number, newQty: number) => {
    if (newQty < 1) return;
    updateMutation.mutate({ itemId, quantity: newQty });
  };

  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = cart?.total_items || 0;

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 -mx-4 -my-6 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <CartItemCardSkeleton key={i} />
              ))}
            </div>
            <div className="lg:col-span-2">
              <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6 space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen bg-muted/30 -mx-4 -my-6 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Card className="max-w-md mx-auto mt-12 text-center border-border/60 shadow-sm">
            <CardContent className="pt-8 pb-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                <ShoppingCart className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold">Không thể tải giỏ hàng</h2>
              <p className="text-sm text-muted-foreground">Đã xảy ra lỗi, vui lòng thử lại.</p>
              <div className="flex gap-2 justify-center pt-2">
                <Button variant="outline" onClick={() => refetch()}>Thử lại</Button>
                <Link to="/products">
                  <Button>Xem sản phẩm</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Empty ──
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-muted/30 -mx-4 -my-6 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Card className="max-w-md mx-auto mt-12 text-center border-border/60 shadow-sm">
            <CardContent className="pt-8 pb-6 space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                <ShoppingCart className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold">Giỏ hàng của bạn đang trống</h2>
              <p className="text-sm text-muted-foreground">Hãy khám phá các sản phẩm công nghệ mới nhất của chúng tôi.</p>
              <Link to="/products">
                <Button size="lg" className="mt-2">Mua sắm ngay</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Main ──
  return (
    <div className="min-h-screen bg-muted/30 -mx-4 -my-6 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Giỏ hàng của bạn</h1>
          <p className="text-muted-foreground mt-1">Bạn đang có {itemCount} sản phẩm trong giỏ hàng.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Left: Cart items (3/5) ── */}
          <div className="lg:col-span-3 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-5 p-4 sm:p-5 bg-card rounded-2xl border border-border/60 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <Link to={`/products/${item.product_id}`} className="shrink-0">
                <div className="w-24 h-24 sm:w-[120px] sm:h-[120px] bg-muted rounded-xl overflow-hidden">
                  {item.image_url ? (
                    <OptimizedImage src={item.image_url} alt={item.product_name} width={96} height={96} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                  )}
                </div>
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-2">
                <Link to={`/products/${item.product_id}`} className="font-semibold text-base hover:underline line-clamp-2 block">
                  {item.product_name}
                </Link>
                <div className="flex items-center gap-2">
                  {item.sale_price ? (
                    <>
                      <span className="font-bold text-destructive">{formatPrice(item.sale_price)}</span>
                      <span className="text-sm text-muted-foreground line-through">{formatPrice(item.price)}</span>
                    </>
                  ) : (
                    <span className="font-bold">{formatPrice(item.price)}</span>
                  )}
                </div>

                {/* Quantity stepper */}
                <div className="inline-flex items-center border rounded-lg overflow-hidden">
                  <button
                    className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40"
                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1 || updateMutation.isPending}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-10 h-9 flex items-center justify-center text-sm font-medium border-x">{item.quantity}</span>
                  <button
                    className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40"
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    disabled={updateMutation.isPending}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Mobile: subtotal + delete inline */}
                <div className="flex items-center justify-between sm:hidden">
                  <p className="text-lg font-bold">{formatPrice(item.subtotal)}</p>
                  <button
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => deleteMutation.mutate(item.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Right: subtotal + delete */}
              <div className="text-right shrink-0 space-y-2 hidden sm:block">
                <p className="text-lg font-bold">{formatPrice(item.subtotal)}</p>
                <button
                  className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => deleteMutation.mutate(item.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Continue shopping */}
          <Link to="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-2">
            <ArrowLeft className="h-4 w-4" />
            Tiếp tục mua sắm
          </Link>
        </div>

        {/* ── Right: Order summary (2/5) ── */}
        <div className="lg:col-span-2 lg:sticky lg:top-20 lg:self-start">
          <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6 space-y-5">
            <h2 className="text-lg font-semibold">Tóm tắt đơn hàng</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tạm tính</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Giảm giá</span>
                <span className="font-medium">{formatPrice(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phí vận chuyển</span>
                <span className="font-medium text-green-600">Miễn phí</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-baseline">
                <span className="font-semibold text-base">Tổng cộng</span>
                <span className="text-2xl font-bold">{formatPrice(subtotal)}</span>
              </div>
            </div>

            <Link to="/checkout" className="block">
              <Button size="lg" className="w-full h-12 text-base rounded-xl">
                Tiến hành thanh toán
              </Button>
            </Link>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Thanh toán an toàn & bảo mật
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
