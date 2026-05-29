import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/common/Skeleton";
import { ArrowLeft, Package, Home, ChevronRight } from "lucide-react";
import { formatPrice, formatDate } from "@/utils/format";
import { ORDER_STATUS_MAP, ORDER_STATUS_OPTIONS, PAYMENT_STATUS_MAP, PAYMENT_METHOD_MAP } from "@/constants/orderStatus";
import { getErrorMessage } from "@/utils/api";
import type { Order } from "@/types";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const queryClient = useQueryClient();

  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: ["order", id],
    queryFn: async () => {
      const res = await axiosClient.get(`/api/orders/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await axiosClient.put(`/api/orders/${id}/status`, { status: newStatus });
    },
    onSuccess: () => {
      toast.success("Cập nhật trạng thái thành công!");
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, "Cập nhật thất bại")),
  });

  // Loading
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-60 w-full rounded-2xl" />
      </div>
    );
  }

  // Error
  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <Card className="max-w-md mx-auto mt-12 text-center border-border/60 shadow-sm">
          <CardContent className="pt-8 pb-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <Package className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">Không tìm thấy đơn hàng</h2>
            <Link to="/orders">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Quay lại danh sách
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = ORDER_STATUS_MAP[order.status] || { label: order.status, color: "text-gray-600 bg-gray-50" };
  const paymentStatusInfo = PAYMENT_STATUS_MAP[order.payment_status] || { label: order.payment_status, color: "text-gray-600 bg-gray-50" };
  const paymentMethodLabel = PAYMENT_METHOD_MAP[order.payment_method] || order.payment_method;

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground flex items-center gap-1">
          <Home className="h-3.5 w-3.5" />
          Trang chủ
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/orders" className="hover:text-foreground">Đơn hàng</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">#{order.id}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Đơn hàng #{order.id}</h1>
        <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Order info */}
      <Card className="border-border/60 shadow-sm rounded-2xl">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Thông tin đơn hàng</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Ngày đặt</p>
              <p className="font-medium">{formatDate(order.created_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Tổng tiền</p>
              <p className="text-xl font-bold">{formatPrice(order.total_amount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Địa chỉ giao hàng</p>
              <p className="font-medium">{order.shipping_address}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Số điện thoại</p>
              <p className="font-medium">{order.phone}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Phương thức thanh toán</p>
              <p className="font-medium">{paymentMethodLabel}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Trạng thái thanh toán</p>
              <span className={`text-sm px-2.5 py-0.5 rounded-full font-medium ${paymentStatusInfo.color}`}>
                {paymentStatusInfo.label}
              </span>
            </div>
            {order.note && (
              <div className="sm:col-span-2">
                <p className="text-muted-foreground mb-1">Ghi chú</p>
                <p className="font-medium">{order.note}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order items */}
      <Card className="border-border/60 shadow-sm rounded-2xl">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Sản phẩm</h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 py-3 border-b last:border-0">
                <div className="w-16 h-16 bg-muted rounded-xl overflow-hidden shrink-0">
                  {item.image_url ? (
                    <OptimizedImage src={item.image_url} alt={item.product_name} width={64} height={64} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl" aria-hidden="true">📦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.product_id}`} className="font-medium hover:underline line-clamp-1">
                    {item.product_name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    {item.sale_price ? (
                      <>
                        <span className="text-sm text-destructive font-medium">{formatPrice(item.sale_price)}</span>
                        <span className="text-xs text-muted-foreground line-through">{formatPrice(item.price)}</span>
                      </>
                    ) : (
                      <span className="text-sm">{formatPrice(item.price)}</span>
                    )}
                    <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                  </div>
                </div>
                <p className="font-semibold shrink-0">{formatPrice(item.subtotal)}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-4 mt-2 border-t">
            <span className="font-semibold text-base">Tổng cộng</span>
            <span className="text-2xl font-bold">{formatPrice(order.total_amount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Admin: Update status */}
      {isAdmin && (
        <Card className="border-border/60 shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Cập nhật trạng thái (Admin)</h2>
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
                    className="rounded-lg"
                  >
                    {info.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back link */}
      <Link to="/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách đơn hàng
      </Link>
    </div>
  );
}
