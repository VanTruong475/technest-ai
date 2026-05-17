import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, ShoppingCart } from "lucide-react";

interface CartItem {
  id: number;
  product_id: number;
  product_name: string;
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

function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN").format(price) + "đ";
}

export default function CartPage() {
  const queryClient = useQueryClient();

  // Fetch cart
  const { data: cart, isLoading, error } = useQuery<CartData>({
    queryKey: ["cart"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/cart");
      return res.data;
    },
  });

  // Update quantity mutation
  const updateMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: number; quantity: number }) => {
      await axiosClient.put(`/api/cart/items/${itemId}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Không thể cập nhật số lượng");
    },
  });

  // Delete item mutation
  const deleteMutation = useMutation({
    mutationFn: async (itemId: number) => {
      await axiosClient.delete(`/api/cart/items/${itemId}`);
    },
    onSuccess: () => {
      toast.success("Đã xóa sản phẩm khỏi giỏ hàng");
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Không thể xóa sản phẩm");
    },
  });

  const handleQuantityChange = (itemId: number, newQty: number) => {
    if (newQty < 1) return;
    updateMutation.mutate({ itemId, quantity: newQty });
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Đang tải giỏ hàng...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-destructive">Không thể tải giỏ hàng.</div>;
  }

  const items = cart?.items || [];
  const isEmpty = items.length === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Giỏ hàng</h1>

      {isEmpty ? (
        <div className="text-center py-12">
          <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Giỏ hàng trống</p>
          <Link to="/products">
            <Button>Mua sắm ngay</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Cart items */}
          <div className="space-y-4">
            {items.map((item) => {
              return (
                <Card key={item.id}>
                  <CardContent className="flex items-center gap-4">
                    {/* Product image placeholder */}
                    <div className="w-20 h-20 bg-muted flex items-center justify-center rounded-lg shrink-0">
                      <span className="text-2xl">📦</span>
                    </div>

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <Link to={`/products/${item.product_id}`} className="font-medium hover:underline line-clamp-1">
                        {item.product_name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        {item.sale_price ? (
                          <>
                            <span className="text-sm font-bold text-destructive">{formatPrice(item.sale_price)}</span>
                            <span className="text-xs text-muted-foreground line-through">{formatPrice(item.price)}</span>
                          </>
                        ) : (
                          <span className="text-sm font-bold">{formatPrice(item.price)}</span>
                        )}
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon-xs"
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1 || updateMutation.isPending}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (val > 0) handleQuantityChange(item.id, val);
                        }}
                        className="w-14 text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon-xs"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        disabled={updateMutation.isPending}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right min-w-[100px]">
                      <p className="font-bold">{formatPrice(item.subtotal)}</p>
                    </div>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Summary */}
          <Card>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng cộng ({cart?.total_items} sản phẩm)</p>
                <p className="text-2xl font-bold">{formatPrice(cart?.total_amount || 0)}</p>
              </div>
              <Link to="/checkout">
                <Button size="lg">Thanh toán</Button>
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
