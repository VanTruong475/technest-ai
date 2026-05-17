import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { formatPrice, formatDate } from "@/utils/format";
import { ORDER_STATUS_MAP } from "@/constants/orderStatus";

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
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

interface OrdersResponse {
  items: Order[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export default function OrderListPage() {
  const { data, isLoading, error } = useQuery<OrdersResponse>({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/orders");
      return res.data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Đang tải đơn hàng...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-destructive">Không thể tải đơn hàng.</div>;
  }

  const orders = data?.items || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Đơn hàng của tôi</h1>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Chưa có đơn hàng nào</p>
          <Link to="/products">
            <Button>Mua sắm ngay</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo = ORDER_STATUS_MAP[order.status] || { label: order.status, color: "text-gray-600 bg-gray-50" };
            return (
              <Link key={order.id} to={`/orders/${order.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">Đơn hàng #{order.id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.items.length} sản phẩm
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatPrice(order.total_amount)}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
