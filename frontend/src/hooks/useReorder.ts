import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { CART_QUERY_KEY, setCartCache } from "@/hooks/useCart";
import type { Cart } from "@/types";

interface ReorderItem {
  product_id: number;
  quantity: number;
}

/**
 * "Mua lại" — thêm lại toàn bộ sản phẩm của 1 đơn vào giỏ.
 * Gọi tuần tự endpoint sẵn có POST /api/cart/items (KHÔNG đổi API) để tôn trọng
 * stock check atomic ở backend; đếm số item thành công để báo partial-failure.
 */
export function useReorder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: ReorderItem[]) => {
      let added = 0;
      let lastCart: Cart | null = null;
      for (const item of items) {
        try {
          const res = await axiosClient.post<Cart>("/api/cart/items", {
            product_id: item.product_id,
            quantity: item.quantity,
          });
          lastCart = res.data;
          added += 1;
        } catch {
          // Bỏ qua item lỗi (hết hàng/INACTIVE) — tiếp tục các item còn lại.
        }
      }
      return { added, total: items.length, lastCart };
    },
    onSuccess: ({ added, total, lastCart }) => {
      if (lastCart) setCartCache(queryClient, lastCart);
      else queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      if (added === 0) {
        toast.error("Không thể thêm sản phẩm (có thể đã hết hàng).");
        return;
      }
      toast.success(
        added < total
          ? `Đã thêm ${added}/${total} sản phẩm vào giỏ.`
          : "Đã thêm tất cả sản phẩm vào giỏ."
      );
      navigate("/cart");
    },
    onError: () => toast.error("Không thể mua lại đơn hàng."),
  });
}
