import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { useAuthStore } from "@/store/authStore";
import type { AISearchResult } from "@/types";

interface RecommendResponse {
  strategy: string;
  results: AISearchResult[];
  total: number;
}

/**
 * Gợi ý sản phẩm cá nhân hoá từ /api/ai/recommend (có sẵn `reason` server-side).
 * - Đã đăng nhập → strategy "history" (dựa trên đơn đã mua).
 * - Chưa đăng nhập → strategy "popular" (bán chạy, public, không cần product_id).
 */
export function useRecommendations(limit = 4) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const strategy = isAuthenticated ? "history" : "popular";

  return useQuery<RecommendResponse>({
    queryKey: ["ai-recommend", strategy, limit],
    queryFn: async () => {
      const res = await axiosClient.get("/api/ai/recommend", {
        params: { strategy, limit },
      });
      return res.data;
    },
    staleTime: 60_000,
    retry: false,
  });
}
