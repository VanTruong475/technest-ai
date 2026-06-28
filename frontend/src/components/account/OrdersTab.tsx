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
import { Package, ChevronRight, Star, CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { formatPrice, formatDate } from "@/utils/format";
import { ORDER_STATUS_MAP, ORDER_STATUS_OPTIONS } from "@/constants/orderStatus";
import { useReorder } from "@/hooks/useReorder";
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

/** Tab "Đơn hàng" — filter trạng thái, card đơn (header/body/tổng), Mua lại, đánh giá. */
export default function OrdersTab() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const reorder = useReorder();
  const [reorderingId, setReorderingId] = useState<number | null>(null);

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

  const handleReorder = (orderId: number, items: { product_id: number; quantity: number }[]) => {
    setReorderingId(orderId);
    reorder.mutate(items, { onSettled: () => setReorderingId(null) });
  };

  return (
    <div>
      {/* Filter trạng thái */}
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

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <OrderCardSkeleton key={i} />)}
        </div>
      )}

      {error && (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-destructive font-medium">Không thể tải đơn hàng</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Thử lại</Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state (UI_PATTERNS.md) */}
      {!isLoading && !error && orders.length === 0 && (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Package className="h-12 w-12" />
          <p className="mt-4 text-lg font-medium text-foreground">
            {statusFilter
              ? `Không có đơn hàng "${STATUS_TABS.find((t) => t.key === statusFilter)?.label || statusFilter}"`
              : "Bạn chưa có đơn hàng nào"}
          </p>
          <p className="mt-1 text-sm">
            {statusFilter ? "Thử chọn trạng thái khác." : "Hãy đặt hàng đầu tiên của bạn."}
          </p>
          {!statusFilter && (
            <Link to="/products">
              <Button className="mt-5">Mua sắm ngay</Button>
            </Link>
          )}
        </div>
      )}

      {/* Danh sách đơn */}
      {!isLoading && !error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo = ORDER_STATUS_MAP[order.status] || { label: order.status, color: "text-muted-foreground bg-muted" };
            const isCompleted = order.status === "COMPLETED";
            const previewItems = order.items.slice(0, 3);
            const isReordering = reorderingId === order.id && reorder.isPending;

            return (
              <Card key={order.id} className="border-border/60 shadow-sm rounded-2xl overflow-hidden">
                {/* Header: mã đơn + ngày + status */}
                <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b bg-muted/20">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Link to={`/orders/${order.id}`} className="font-semibold hover:underline">
                        Đơn hàng #{order.id}
                      </Link>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(order.created_at)}</p>
                  </div>
                  <Link
                    to={`/orders/${order.id}`}
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                  >
                    Chi tiết <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* Body: sản phẩm thu gọn */}
                <div className="p-4 sm:p-5 space-y-3">
                  {previewItems.map((item) => {
                    const canReview = isCompleted ? canReviewData?.results[item.product_id] : undefined;
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden shrink-0">
                          {item.image_url ? (
                            <OptimizedImage src={item.image_url} alt={item.product_name} width={48} height={48} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm" aria-hidden="true">📦</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link to={`/products/${item.product_id}`} className="text-sm font-medium hover:underline line-clamp-1">
                            {item.product_name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {formatPrice(item.sale_price ?? item.price)} × {item.quantity}
                          </p>
                        </div>
                        {canReview && (
                          canReview.has_reviewed ? (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg shrink-0">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span className="font-medium hidden sm:inline">Đã đánh giá</span>
                            </div>
                          ) : canReview.can_review ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-lg gap-1.5 shrink-0"
                              onClick={() =>
                                setReviewTarget({
                                  productId: item.product_id,
                                  productName: item.product_name,
                                  productImage: item.image_url,
                                })
                              }
                            >
                              <Star className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Đánh giá</span>
                            </Button>
                          ) : null
                        )}
                      </div>
                    );
                  })}
                  {order.items.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{order.items.length - 3} sản phẩm khác</p>
                  )}
                </div>

                {/* Footer: tổng tiền + Mua lại */}
                <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-t">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Tổng tiền: </span>
                    <span className="text-lg font-bold">{formatPrice(order.total_amount)}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg gap-1.5 shrink-0"
                    disabled={isReordering}
                    onClick={() =>
                      handleReorder(
                        order.id,
                        order.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }))
                      )
                    }
                  >
                    {isReordering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    Mua lại
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {data && data.total_pages > 1 && (
        <div className="mt-6">
          <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
        </div>
      )}

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
