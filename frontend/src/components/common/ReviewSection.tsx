import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { StarRating } from "./StarRating";
import { getErrorMessage } from "@/utils/api";
import { formatDateLong } from "@/utils/format";
import {
  MessageSquare,
  Trash2,
  Edit2,
  ShoppingBag,
  Star,
  Loader2,
} from "lucide-react";
import type { Review } from "@/types";

interface CanReviewResponse {
  can_review: boolean;
  has_purchased: boolean;
  has_reviewed: boolean;
  reason: string | null;
}

interface ReviewSectionProps {
  productId: number;
  /** "display" = chỉ hiện reviews, "full" = hiện cả form + can-review check */
  mode?: "display" | "full";
}

/** Số review hiển thị mỗi lần; bấm "Xem thêm" sẽ tăng thêm bấy nhiêu. */
const REVIEW_PAGE_SIZE = 5;

export function ReviewSection({ productId, mode = "full" }: ReviewSectionProps) {
  const isDisplayOnly = mode === "display";
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  // Số review hiển thị — "Xem thêm" tăng dần client-side (không đổi API)
  const [visibleCount, setVisibleCount] = useState(REVIEW_PAGE_SIZE);

  // Fetch reviews
  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const res = await axiosClient.get(`/api/reviews/product/${productId}`);
      return res.data;
    },
  });

  // Check if user can review
  const { data: canReviewData } = useQuery<CanReviewResponse>({
    queryKey: ["can-review", productId],
    queryFn: async () => {
      const res = await axiosClient.get(`/api/reviews/can-review/${productId}`);
      return res.data;
    },
    enabled: isAuthenticated && !isDisplayOnly,
  });

  // Create review
  const createMutation = useMutation({
    mutationFn: async () => {
      await axiosClient.post("/api/reviews", {
        product_id: productId,
        rating,
        comment: comment.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Đã gửi đánh giá!");
      setRating(0);
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      queryClient.invalidateQueries({ queryKey: ["can-review", productId] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không thể gửi đánh giá"));
    },
  });

  // Update review
  const updateMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      await axiosClient.put(`/api/reviews/${reviewId}`, {
        rating: editRating,
        comment: editComment.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Đã cập nhật đánh giá!");
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không thể cập nhật đánh giá"));
    },
  });

  // Delete review
  const deleteMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      await axiosClient.delete(`/api/reviews/${reviewId}`);
    },
    onSuccess: () => {
      toast.success("Đã xóa đánh giá!");
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      queryClient.invalidateQueries({ queryKey: ["can-review", productId] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không thể xóa đánh giá"));
    },
  });

  const myReview = reviews.find((r) => r.user_id === user?.id);
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  // Rating distribution (1-5 stars)
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length;
    return {
      star,
      count,
      percentage: reviews.length > 0 ? (count / reviews.length) * 100 : 0,
    };
  });

  const startEdit = (review: Review) => {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment || "");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Đánh giá sản phẩm</h2>
          <p className="text-sm text-muted-foreground">
            {reviews.length > 0
              ? `${reviews.length} đánh giá từ khách hàng`
              : "Chưa có đánh giá nào"}
          </p>
        </div>
      </div>

      {/* Rating Summary */}
      {reviews.length > 0 && (
        <Card className="ring-1 ring-foreground/10">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-8">
              {/* Average score */}
              <div className="flex flex-col items-center justify-center min-w-[140px]">
                <span className="text-5xl font-bold text-primary">
                  {averageRating.toFixed(1)}
                </span>
                <StarRating rating={Math.round(averageRating)} size="md" />
                <span className="text-sm text-muted-foreground mt-1">
                  {reviews.length} đánh giá
                </span>
              </div>

              {/* Distribution bars */}
              <div className="flex-1 space-y-2">
                {ratingDistribution.map(({ star, count, percentage }) => (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-8 text-right">
                      {star}
                      <Star className="inline h-3 w-3 ml-0.5 fill-yellow-400 text-yellow-400" />
                    </span>
                    <Progress
                      value={percentage}
                      className="flex-1"
                      indicatorClassName="bg-yellow-400"
                      aria-label={`${star} sao: ${count} đánh giá`}
                    />
                    <span className="text-xs text-muted-foreground w-8">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Form */}
      {!isDisplayOnly && isAuthenticated && !myReview && canReviewData?.can_review && (
        <Card className="ring-1 ring-foreground/10 border-border/60 shadow-sm">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {user?.full_name ? getInitials(user.full_name) : "?"}
              </div>
              <h3 className="font-semibold">Viết đánh giá của bạn</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Đánh giá sao</label>
              <StarRating
                rating={rating}
                size="lg"
                interactive
                onRatingChange={setRating}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Bình luận{" "}
                <span className="text-muted-foreground font-normal">
                  (tùy chọn)
                </span>
              </label>
              <Textarea
                placeholder="Chia sẻ cảm nhận về sản phẩm..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={rating === 0 || createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {createMutation.isPending ? "Đang gửi..." : "Gửi đánh giá"}
              </Button>
              {rating === 0 && (
                <span className="text-xs text-muted-foreground">
                  Chọn số sao để gửi đánh giá
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cannot review messages */}
      {!isDisplayOnly && isAuthenticated && !myReview && canReviewData && !canReviewData.can_review && (
        <Card className="ring-1 ring-foreground/10 border-dashed">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
              {canReviewData.has_reviewed ? (
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              ) : (
                <ShoppingBag className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium text-sm">
                {canReviewData.has_reviewed
                  ? "Bạn đã đánh giá sản phẩm này"
                  : "Bạn cần mua sản phẩm để đánh giá"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {canReviewData.has_reviewed
                  ? "Bạn có thể chỉnh sửa đánh giá bên dưới."
                  : "Chỉ khách hàng đã mua và nhận hàng mới có thể đánh giá."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isDisplayOnly && !isAuthenticated && (
        <Card className="ring-1 ring-foreground/10 border-dashed">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">
                Đăng nhập để viết đánh giá
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chia sẻ cảm nhận giúp người mua khác đưa ra quyết định đúng đắn.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="ring-1 ring-foreground/10">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="h-4 w-full bg-muted animate-pulse rounded" />
                    <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <Card className="ring-1 ring-foreground/10 border-dashed">
          <CardContent className="p-10 flex flex-col items-center justify-center text-center">
            <div className="relative mb-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-xl" />
            </div>
            <h3 className="font-semibold text-lg mb-1">
              Chưa có đánh giá nào
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Hãy là người đầu tiên đánh giá sản phẩm này và chia sẻ cảm nhận
              của bạn với cộng đồng.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.slice(0, visibleCount).map((review) => (
            <Card key={review.id} className="ring-1 ring-foreground/10">
              <CardContent className="p-5">
                {editingId === review.id ? (
                  // Edit mode
                  <div className="space-y-4">
                    <StarRating
                      rating={editRating}
                      size="lg"
                      interactive
                      onRatingChange={setEditRating}
                    />
                    <Textarea
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateMutation.mutate(review.id)}
                        disabled={editRating === 0 || updateMutation.isPending}
                      >
                        {updateMutation.isPending && (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        )}
                        {updateMutation.isPending ? "Đang lưu..." : "Lưu"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        Hủy
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {getInitials(review.user_name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name + stars + actions */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-sm truncate">
                            {review.user_name}
                          </span>
                          <StarRating rating={review.rating} size="sm" />
                        </div>
                        {user?.id === review.user_id && (
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => startEdit(review)}
                              aria-label="Chỉnh sửa đánh giá"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteMutation.mutate(review.id)}
                              disabled={deleteMutation.isPending}
                              aria-label="Xóa đánh giá"
                            >
                              {deleteMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Comment */}
                      {review.comment && (
                        <p className="text-sm text-foreground/80 mt-2 leading-relaxed">
                          {review.comment}
                        </p>
                      )}

                      {/* Date */}
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDateLong(review.created_at)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Xem thêm — tăng số review hiển thị (client-side) */}
          {reviews.length > visibleCount && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((c) => c + REVIEW_PAGE_SIZE)}
              >
                Xem thêm đánh giá ({reviews.length - visibleCount})
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
