import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { formatPrice } from "@/utils/format";

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
  items: CartItem[];
  total_items: number;
  total_amount: number;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [shippingAddress, setShippingAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  // Fetch cart
  const { data: cart, isLoading, error: cartError } = useQuery<CartData>({
    queryKey: ["cart"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/cart");
      return res.data;
    },
  });

  // Create order mutation
  const orderMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.post("/api/orders", {
        shipping_address: shippingAddress,
        phone,
        note: note || undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Đặt hàng thành công!");
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      navigate(`/orders/${data.id}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Đặt hàng thất bại");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingAddress.trim()) {
      toast.error("Vui lòng nhập địa chỉ giao hàng");
      return;
    }
    if (!phone.trim()) {
      toast.error("Vui lòng nhập số điện thoại");
      return;
    }
    orderMutation.mutate();
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Đang tải...</div>;
  }

  if (cartError) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-destructive mb-4">Không thể tải thông tin giỏ hàng.</p>
        <div className="flex gap-2 justify-center">
          <Link to="/cart">
            <Button variant="outline">Quay lại giỏ hàng</Button>
          </Link>
          <Link to="/products">
            <Button>Xem sản phẩm</Button>
          </Link>
        </div>
      </div>
    );
  }

  const items = cart?.items || [];

  useEffect(() => {
    if (!isLoading && items.length === 0) {
      navigate("/cart");
    }
  }, [isLoading, items.length, navigate]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/cart")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Thanh toán</h1>
      </div>

      {/* Order summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Đơn hàng của bạn</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {item.product_name} x{item.quantity}
              </span>
              <span className="font-medium">{formatPrice(item.subtotal)}</span>
            </div>
          ))}
          <div className="border-t pt-3 flex justify-between">
            <span className="font-medium">Tổng cộng</span>
            <span className="text-xl font-bold">{formatPrice(cart?.total_amount || 0)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Shipping form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin giao hàng</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="address" className="text-sm font-medium">
                Địa chỉ giao hàng <span className="text-destructive">*</span>
              </label>
              <Input
                id="address"
                placeholder="123 Nguyễn Huệ, Q1, TP.HCM"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Số điện thoại <span className="text-destructive">*</span>
              </label>
              <Input
                id="phone"
                placeholder="0901234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="note" className="text-sm font-medium">
                Ghi chú (tùy chọn)
              </label>
              <Input
                id="note"
                placeholder="Giao giờ hành chính..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={orderMutation.isPending}>
              {orderMutation.isPending ? "Đang đặt hàng..." : "Đặt hàng"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
