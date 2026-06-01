import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/common/Skeleton";
import Pagination from "@/components/common/Pagination";
import { ReviewDialog } from "@/components/common/ReviewDialog";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Package, ChevronRight, Home, Star, CheckCircle2 } from "lucide-react";
import { formatPrice, formatDate } from "@/utils/format";
import { ORDER_STATUS_MAP, ORDER_STATUS_OPTIONS } from "@/constants/orderStatus";
import type { OrdersResponse, CanReviewResult } from "@/types";

const STATUS_TABS = [
  { key: "", label: "Tất cả" },
  ...ORDER_STATUS_OPTIONS.map((s) => ({ key: s, label: ORDER_STATUS_MAP[s].label })),
];

function OrderCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-14 w-full" />
    </div>
  );
}

export default function OrderListPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [reviewTarget, setReviewTarget] = useState<{
    productId: number;
    productName: string;
    productImage?: string | null;
  } | null>(null);

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

  // Collect all product IDs from COMPLETED orders for bulk can-review check
  const completedProductIds = orders
    .filter((o) => o.status === "COMPLETED")
    .flatMap((o) => o.items.map((item) => item.product_id));

  const { data: canReviewData } = useQuery<{ results: Record<number, CanReviewResult> }>({
    queryKey: ["can-review-bulk", ...completedProductIds],
    queryFn: async () => {
      const res = await axiosClient.post("/api/reviews/can-review-bulk", {
        product_ids: completedProductIds,
      });
      return res.data;
    },
    enabled: completedProductIds.length > 0,
  });

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
            const isCompleted = order.status === "COMPLETED";

            return (
              <Card key={order.id} className="border-border/60 shadow-sm rounded-2xl overflow-hidden">
                {/* Order header — clickable */}
                <Link to={`/orders/${order.id}`}>
                  <CardContent className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors">
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
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto mt-1" />
                    </div>
                  </CardContent>
                </Link>

                {/* Items with review buttons for COMPLETED orders */}
                {isCompleted && (
                  <div className="px-5 pb-4 space-y-2 border-t pt-3">
                    {order.items.map((item) => {
                      const canReview = canReviewData?.results[item.product_id];
                      return (
                        <div key={item.id} className="flex items-center gap-3 py-2">
                          <div className="w-10 h-10 bg-muted rounded-lg overflow-hidden shrink-0">
                            {item.image_url ? (
                              <OptimizedImage src={item.image_url} alt={item.product_name} width={40} height={40} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm">📦</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link to={`/products/${item.product_id}`} className="text-sm font-medium hover:underline line-clamp-1">
                              {item.product_name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {item.sale_price ? formatPrice(item.sale_price) : formatPrice(item.price)} × {item.quantity}
                            </p>
                          </div>
                          {/* Review button */}
                          {canReview && (
                            canReview.has_reviewed ? (
                              <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg shrink-0">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="font-medium">Đã đánh giá</span>
                              </div>
                            ) : canReview.can_review ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg gap-1.5 shrink-0"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setReviewTarget({
                                    productId: item.product_id,
                                    productName: item.product_name,
                                    productImage: item.image_url,
                                  });
                                }}
                              >
                                <Star className="h-3.5 w-3.5" />
                                Đánh giá
                              </Button>
                            ) : null
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
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

      {/* Review Dialog */}
      {reviewTarget && (
        <ReviewDialog
          isOpen={true}
          onClose={() => setReviewTarget(null)}
          productId={reviewTarget.productId}
          productName={reviewTarget.productName}
          productImage={reviewTarget.productImage}
        />
      )}
    </div>
  );
}
