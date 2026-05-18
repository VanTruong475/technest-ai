import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "./StarRating";
import { MessageSquare, Trash2, Edit2 } from "lucide-react";

interface Review {
  id: number;
  user_id: number;
  user_name: string;
  product_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

interface ReviewSectionProps {
  productId: number;
}

export function ReviewSection({ productId }: ReviewSectionProps) {
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");

  // Fetch reviews
  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const res = await axiosClient.get(`/api/reviews/product/${productId}`);
      return res.data;
    },
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
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Không thể gửi đánh giá");
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
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Không thể cập nhật đánh giá");
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
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Không thể xóa đánh giá");
    },
  });

  const myReview = reviews.find((r) => r.user_id === user?.id);
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const startEdit = (review: Review) => {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment || "");
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Đánh giá sản phẩm
        </h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRating rating={Math.round(averageRating)} size="sm" />
            <span className="text-sm text-muted-foreground">
              {averageRating.toFixed(1)} ({reviews.length} đánh giá)
            </span>
          </div>
        )}
      </div>

      {/* Review Form */}
      {isAuthenticated && !myReview && (
        <Card>
          <CardContent className="space-y-4">
            <h3 className="font-medium">Viết đánh giá</h3>
            <div className="space-y-2">
              <label className="text-sm">Đánh giá sao</label>
              <StarRating
                rating={rating}
                size="lg"
                interactive
                onRatingChange={setRating}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm">Bình luận (tùy chọn)</label>
              <Textarea
                placeholder="Chia sẻ cảm nhận về sản phẩm..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={rating === 0 || createMutation.isPending}
            >
              {createMutation.isPending ? "Đang gửi..." : "Gửi đánh giá"}
            </Button>
          </CardContent>
        </Card>
      )}

      {!isAuthenticated && (
        <p className="text-sm text-muted-foreground">
          Đăng nhập để viết đánh giá sản phẩm.
        </p>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá sản phẩm này!
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="space-y-2">
                {editingId === review.id ? (
                  // Edit mode
                  <div className="space-y-3">
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
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateMutation.mutate(review.id)}
                        disabled={editRating === 0 || updateMutation.isPending}
                      >
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
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {review.user_name}
                        </span>
                        <StarRating rating={review.rating} size="sm" />
                      </div>
                      {user?.id === review.user_id && (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => startEdit(review)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteMutation.mutate(review.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">
                        {review.comment}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString("vi-VN")}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
