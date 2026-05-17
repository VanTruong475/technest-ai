import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { formatPrice, formatDate } from "@/utils/format";
import { ORDER_STATUS_MAP, ORDER_STATUS_OPTIONS } from "@/constants/orderStatus";

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  image_url: string | null;
  price: number;
  sale_price: number | null;
  quantity: number;
  subtotal: number;
}

interface Order {
  id: number;
  user_id: number;
  total_amount: number;
  status: string;
  shipping_address: string;
  phone: string;
  note: string | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const queryClient = useQueryClient();

  // Fetch order
  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: ["order", id],
    queryFn: async () => {
      const res = await axiosClient.get(`/api/orders/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await axiosClient.put(`/api/orders/${id}/status`, { status: newStatus });
    },
    onSuccess: () => {
      toast.success("Cập nhật trạng thái thành công!");
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Cập nhật thất bại");
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Đang tải đơn hàng...</div>;
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">Không tìm thấy đơn hàng.</p>
        <Link to="/orders">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Quay lại danh sách
          </Button>
        </Link>
      </div>
    );
  }

  const statusInfo = ORDER_STATUS_MAP[order.status] || { label: order.status, color: "text-gray-600 bg-gray-50" };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <Link to="/orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Quay lại danh sách
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Đơn hàng #{order.id}</h1>
        <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Order info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin đơn hàng</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Ngày đặt</p>
            <p className="font-medium">{formatDate(order.created_at)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tổng tiền</p>
            <p className="text-xl font-bold">{formatPrice(order.total_amount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Địa chỉ giao hàng</p>
            <p className="font-medium">{order.shipping_address}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Số điện thoại</p>
            <p className="font-medium">{order.phone}</p>
          </div>
          {order.note && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Ghi chú</p>
              <p className="font-medium">{order.note}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sản phẩm</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2 border-b last:border-0">
              <div className="w-12 h-12 bg-muted flex items-center justify-center rounded shrink-0 overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm">📦</span>
                )}
              </div>
              <div className="flex-1">
                <Link to={`/products/${item.product_id}`} className="font-medium hover:underline">
                  {item.product_name}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  {item.sale_price ? (
                    <>
                      <span className="text-sm text-destructive">{formatPrice(item.sale_price)}</span>
                      <span className="text-xs text-muted-foreground line-through">{formatPrice(item.price)}</span>
                    </>
                  ) : (
                    <span className="text-sm">{formatPrice(item.price)}</span>
                  )}
                  <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                </div>
              </div>
              <p className="font-medium">{formatPrice(item.subtotal)}</p>
            </div>
          ))}
          <div className="flex justify-between pt-3 border-t">
            <span className="font-medium">Tổng cộng</span>
            <span className="text-xl font-bold">{formatPrice(order.total_amount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Admin: Update status */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cập nhật trạng thái (Admin)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ORDER_STATUS_OPTIONS.map((status) => {
                const info = ORDER_STATUS_MAP[status];
                const isCurrent = order.status === status;
                return (
                  <Button
                    key={status}
                    variant={isCurrent ? "default" : "outline"}
                    size="sm"
                    disabled={isCurrent || updateStatusMutation.isPending}
                    onClick={() => updateStatusMutation.mutate(status)}
                  >
                    {info.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
