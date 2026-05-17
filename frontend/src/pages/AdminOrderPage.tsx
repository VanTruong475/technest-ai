import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
import AdminNav from "@/components/common/AdminNav";
import { formatPrice, formatDate } from "@/utils/format";
import { ORDER_STATUS_MAP, ORDER_STATUS_OPTIONS } from "@/constants/orderStatus";

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

export default function AdminOrderPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Fetch orders (admin)
  const { data, isLoading, error } = useQuery<OrdersResponse>({
    queryKey: ["admin-orders", page],
    queryFn: async () => {
      const res = await axiosClient.get("/api/orders", { params: { page, limit } });
      return res.data;
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      await axiosClient.put(`/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      toast.success("Cập nhật trạng thái thành công!");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Cập nhật thất bại");
    },
  });

  const orders = data?.items || [];
  const filtered = statusFilter
    ? orders.filter((o) => o.status === statusFilter)
    : orders;

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Đang tải đơn hàng...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-destructive">Không thể tải đơn hàng.</div>;
  }

  return (
    <div className="space-y-6">
      <AdminNav />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý đơn hàng</h1>
        <p className="text-sm text-muted-foreground">{orders.length} đơn hàng</p>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "" ? "default" : "outline"}
          size="sm"
          onClick={() => { setStatusFilter(""); setPage(1); }}
        >
          Tất cả
        </Button>
        {ORDER_STATUS_OPTIONS.map((status) => {
          const info = ORDER_STATUS_MAP[status];
          return (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => { setStatusFilter(status); setPage(1); }}
            >
              {info.label}
            </Button>
          );
        })}
      </div>

      {/* Orders table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {statusFilter ? "Không có đơn hàng nào với trạng thái này." : "Chưa có đơn hàng nào."}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">ID</th>
                    <th className="text-left p-3 font-medium">User ID</th>
                    <th className="text-left p-3 font-medium">Ngày đặt</th>
                    <th className="text-left p-3 font-medium">Điện thoại</th>
                    <th className="text-left p-3 font-medium">Địa chỉ</th>
                    <th className="text-right p-3 font-medium">Tổng tiền</th>
                    <th className="text-center p-3 font-medium">Trạng thái</th>
                    <th className="text-center p-3 font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order) => {
                    const statusInfo = ORDER_STATUS_MAP[order.status] || { label: order.status, color: "text-gray-600 bg-gray-50" };
                    return (
                      <tr key={order.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">#{order.id}</td>
                        <td className="p-3">{order.user_id}</td>
                        <td className="p-3">{formatDate(order.created_at)}</td>
                        <td className="p-3">{order.phone}</td>
                        <td className="p-3 max-w-[200px] truncate">{order.shipping_address}</td>
                        <td className="p-3 text-right font-medium">{formatPrice(order.total_amount)}</td>
                        <td className="p-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Link to={`/orders/${order.id}`}>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            {/* Quick status update */}
                            <select
                              className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs"
                              value={order.status}
                              onChange={(e) => updateStatusMutation.mutate({ orderId: order.id, status: e.target.value })}
                              disabled={updateStatusMutation.isPending}
                            >
                              {ORDER_STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{ORDER_STATUS_MAP[s].label}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page} / {data.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.total_pages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
