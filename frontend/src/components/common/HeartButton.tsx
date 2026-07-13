import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import axiosClient from "@/api/axiosClient";
import { getErrorMessage } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeartButtonProps {
  productId: number;
  className?: string;
  showLabel?: boolean;
}

export default function HeartButton({ productId, className = "", showLabel = false }: HeartButtonProps) {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [justAdded, setJustAdded] = useState(false);

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
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 600);
      toast.success("Đã thêm vào yêu thích");
    },
    onError: (err: unknown) => {
      if (err instanceof Error && "response" in err && (err as any).response?.status === 409) {
        toast.info("Sản phẩm đã có trong yêu thích");
      } else {
        toast.error(getErrorMessage(err, "Không thể thêm vào yêu thích"));
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
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "sm" : "icon"}
      onClick={handleClick}
      disabled={isLoading}
      aria-label={isFavorited ? "Xóa khỏi yêu thích" : "Thêm vào yêu thích"}
      aria-pressed={isFavorited}
      className={cn(
        "rounded-full transition-all",
        showLabel ? "h-9 gap-1.5 px-3" : "h-9 w-9",
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <span className="relative inline-flex">
          <motion.span
            animate={justAdded ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="inline-flex"
          >
            <Heart
              className={cn(
                "h-5 w-5 transition-colors",
                isFavorited
                  ? "fill-current text-sale"
                  : "text-muted-foreground hover:text-sale"
              )}
            />
          </motion.span>
          {/* Burst particles khi vừa thêm vào yêu thích */}
          <AnimatePresence>
            {justAdded && (
              <motion.span
                key="burst"
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                {[0, 72, 144, 216, 288].map((deg) => (
                  <motion.span
                    key={deg}
                    className="absolute h-1 w-1 rounded-full bg-sale"
                    initial={{ x: 0, y: 0, opacity: 0.9 }}
                    animate={{
                      x: Math.cos((deg * Math.PI) / 180) * 12,
                      y: Math.sin((deg * Math.PI) / 180) * 12,
                      opacity: 0,
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                ))}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      )}
      {showLabel && (
        <span className="text-sm">{isFavorited ? "Đã yêu thích" : "Yêu thích"}</span>
      )}
    </Button>
  );
}
