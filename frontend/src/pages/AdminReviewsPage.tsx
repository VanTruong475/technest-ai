import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Star } from "lucide-react";
import AdminNav from "@/components/common/AdminNav";
import Pagination from "@/components/common/Pagination";
import { TableSkeleton } from "@/components/common/Skeleton";
import { useScrollToTopOnChange } from "@/hooks/useScrollToTopOnChange";
import { formatDate } from "@/utils/format";
import { getErrorMessage } from "@/utils/api";

interface ReviewItem {
  id: number;
  user_id: number;
  user_name: string;
  product_id: number;
  product_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

interface ReviewsResponse {
  items: ReviewItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  useScrollToTopOnChange(page);
  const limit = 10;

  const { data, isLoading, error } = useQuery<ReviewsResponse>({
    queryKey: ["admin-reviews", page],
    queryFn: async () => {
      const res = await axiosClient.get("/api/admin/reviews", { params: { page, limit } });
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosClient.delete(`/api/admin/reviews/${id}`);
    },
    onSuccess: () => {
      toast.success("Đã xóa đánh giá!");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Xóa đánh giá thất bại"));
    },
  });

  const reviews = data?.items || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <AdminNav />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <h1 className="text-2xl font-bold">Quản lý đánh giá</h1>
        {data && (
          <p className="text-sm text-muted-foreground">{data.total} đánh giá</p>
        )}
      </div>

      {/* Loading */}
      {isLoading && <TableSkeleton columns={7} rows={5} />}

      {/* Error */}
      {error && (
        <div className="text-center py-12 text-destructive">
          Không thể tải danh sách đánh giá.
        </div>
      )}

      {/* Reviews table */}
      {!isLoading && !error && reviews.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-yellow-400/20 to-amber-500/20 blur-2xl rounded-full" />
              <div className="h-16 w-16 rounded-2xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
                <Star className="h-8 w-8" />
              </div>
            </div>
            <h3 className="font-semibold text-base mb-1.5">Chưa có đánh giá nào</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Khi khách hàng đánh giá sản phẩm, đánh giá sẽ xuất hiện ở đây
              để bạn quản lý.
            </p>
          </CardContent>
        </Card>
      ) : (
        !isLoading && !error && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">ID</th>
                      <th className="text-left p-3 font-medium">Người dùng</th>
                      <th className="text-left p-3 font-medium">Sản phẩm</th>
                      <th className="text-center p-3 font-medium">Đánh giá</th>
                      <th className="text-left p-3 font-medium">Bình luận</th>
                      <th className="text-left p-3 font-medium">Ngày tạo</th>
                      <th className="text-center p-3 font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((review) => (
                      <tr key={review.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">#{review.id}</td>
                        <td className="p-3 font-medium">{review.user_name}</td>
                        <td className="p-3 text-muted-foreground max-w-[180px] truncate">
                          {review.product_name}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{review.rating}</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                          {review.comment || "—"}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {formatDate(review.created_at)}
                        </td>
                        <td className="p-3 text-center">
                          <ConfirmDialog
                            title="Xóa đánh giá?"
                            description="Hành động này không thể hoàn tác. Đánh giá sẽ bị xóa khỏi hệ thống."
                            confirmText="Xóa"
                            cancelText="Hủy"
                            variant="destructive"
                            onConfirm={() => deleteMutation.mutate(review.id)}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={deleteMutation.isPending}
                              aria-label={`Xóa đánh giá #${review.id}`}
                              className="h-8 w-8 hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </ConfirmDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}
