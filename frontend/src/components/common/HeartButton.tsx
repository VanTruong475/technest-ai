import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import axiosClient from "@/api/axiosClient";

interface HeartButtonProps {
  productId: number;
  className?: string;
  showLabel?: boolean;
}

export default function HeartButton({ productId, className = "", showLabel = false }: HeartButtonProps) {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery<{ is_favorited: boolean }>({
    queryKey: ["wishlist-check", productId],
    queryFn: async () => {
      const res = await axiosClient.get(`/api/wishlist/check/${productId}`);
      return res.data;
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const isFavorited = data?.is_favorited ?? false;

  const addMutation = useMutation({
    mutationFn: async () => {
      await axiosClient.post(`/api/wishlist/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-check", productId] });
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success("Đã thêm vào yêu thích");
    },
    onError: (err: any) => {
      if (err.response?.status === 409) {
        toast.info("Sản phẩm đã có trong yêu thích");
      } else {
        toast.error("Không thể thêm vào yêu thích");
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      await axiosClient.delete(`/api/wishlist/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-check", productId] });
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success("Đã xóa khỏi yêu thích");
    },
    onError: () => {
      toast.error("Không thể xóa khỏi yêu thích");
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để sử dụng tính năng này");
      navigate("/login");
      return;
    }

    if (isFavorited) {
      removeMutation.mutate();
    } else {
      addMutation.mutate();
    }
  };

  const isLoading = addMutation.isPending || removeMutation.isPending;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={`flex items-center justify-center rounded-full transition-all ${className}`}
      aria-label={isFavorited ? "Xóa khỏi yêu thích" : "Thêm vào yêu thích"}
    >
      <Heart
        className={`h-5 w-5 transition-colors ${
          isFavorited
            ? "fill-red-500 text-red-500"
            : "text-muted-foreground hover:text-red-400"
        } ${isLoading ? "opacity-50" : ""}`}
      />
      {showLabel && (
        <span className="ml-1">{isFavorited ? "Đã yêu thích" : "Yêu thích"}</span>
      )}
    </button>
  );
}
