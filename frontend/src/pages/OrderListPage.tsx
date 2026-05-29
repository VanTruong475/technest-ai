import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/common/Skeleton";
import Pagination from "@/components/common/Pagination";
import { Package, ChevronRight, Home } from "lucide-react";
import { formatPrice, formatDate } from "@/utils/format";
import { ORDER_STATUS_MAP, ORDER_STATUS_OPTIONS } from "@/constants/orderStatus";
import type { OrdersResponse } from "@/types";

const STATUS_TABS = [
  { key: "", label: "Tất cả" },
  ...ORDER_STATUS_OPTIONS.map((s) => ({ key: s, label: ORDER_STATUS_MAP[s].label })),
];

function OrderCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5 flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-6 w-24" />
    </div>
  );
}

export default function OrderListPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, error } = useQuery<OrdersResponse>({
    queryKey: ["orders", page, statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (statusFilter) params.status = statusFilter;
      const res = await axiosClient.get("/api/orders", { params });
      return res.data;
    },
  });

  const orders = data?.items || [];

  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground flex items-center gap-1">
          <Home className="h-3.5 w-3.5" />
          Trang chủ
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Đơn hàng</span>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Đơn hàng của tôi</h1>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={statusFilter === tab.key ? "default" : "outline"}
            size="sm"
            className="rounded-lg"
            onClick={() => { setStatusFilter(tab.key); setPage(1); }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <OrderCardSkeleton key={i} />)}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-destructive font-medium">Không thể tải đơn hàng</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Thử lại</Button>
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!isLoading && !error && orders.length === 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="py-16 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold">
              {statusFilter
                ? `Không có đơn hàng "${STATUS_TABS.find((t) => t.key === statusFilter)?.label || statusFilter}"`
                : "Chưa có đơn hàng nào"}
            </p>
            <p className="text-sm text-muted-foreground">
              {statusFilter ? "Thử chọn trạng thái khác." : "Hãy đặt hàng đầu tiên của bạn."}
            </p>
            {!statusFilter && (
              <Link to="/products">
                <Button className="mt-2">Mua sắm ngay</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Order list */}
      {!isLoading && !error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo = ORDER_STATUS_MAP[order.status] || { label: order.status, color: "text-gray-600 bg-gray-50" };
            return (
              <Link key={order.id} to={`/orders/${order.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer border-border/60 shadow-sm rounded-2xl">
                  <CardContent className="flex items-center justify-between p-5">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">Đơn hàng #{order.id}</span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                      <p className="text-sm text-muted-foreground">{order.items.length} sản phẩm</p>
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

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="mt-6">
          <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
