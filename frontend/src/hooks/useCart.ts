import { useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { getErrorMessage } from "@/utils/api";
import type { Cart, CartItem } from "@/types";

export const CART_QUERY_KEY = ["cart"] as const;

const QTY_DEBOUNCE_MS = 280;

/** Unit price used for subtotal (sale if present). */
function unitPrice(item: Pick<CartItem, "price" | "sale_price">): number {
  return item.sale_price ?? item.price;
}

/** Recompute totals after local qty/item changes. */
function recomputeCart(cart: Cart): Cart {
  let total_items = 0;
  let total_amount = 0;
  const items = cart.items.map((item) => {
    const subtotal = unitPrice(item) * item.quantity;
    total_items += item.quantity;
    total_amount += subtotal;
    return { ...item, subtotal };
  });
  return { ...cart, items, total_items, total_amount };
}

export function setCartCache(
  queryClient: ReturnType<typeof useQueryClient>,
  cart: Cart
) {
  queryClient.setQueryData<Cart>(CART_QUERY_KEY, cart);
}

function applyOptimisticQuantity(
  queryClient: ReturnType<typeof useQueryClient>,
  itemId: number,
  quantity: number
): Cart | undefined {
  const previous = queryClient.getQueryData<Cart>(CART_QUERY_KEY);
  if (!previous) return undefined;
  const next = recomputeCart({
    ...previous,
    items: previous.items.map((item) =>
      item.id === itemId ? { ...item, quantity } : item
    ),
  });
  setCartCache(queryClient, next);
  return previous;
}

/**
 * Optimistic quantity change for cart page.
 * UI updates immediately; API is debounced (latest qty wins) to avoid races
 * when the user taps +/- quickly. Server still validates stock.
 */
export function useUpdateCartQuantity() {
  const queryClient = useQueryClient();
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  // Snapshot before first optimistic change in a debounce window (for rollback)
  const rollbackRef = useRef<Map<number, Cart>>(new Map());

  const mutation = useMutation({
    mutationFn: async ({
      itemId,
      quantity,
    }: {
      itemId: number;
      quantity: number;
    }) => {
      const res = await axiosClient.put<Cart>(`/api/cart/items/${itemId}`, {
        quantity,
      });
      return res.data;
    },
    onSuccess: (cart, { itemId }) => {
      setCartCache(queryClient, cart);
      rollbackRef.current.delete(itemId);
    },
    onError: (err, { itemId }) => {
      const snap = rollbackRef.current.get(itemId);
      if (snap) setCartCache(queryClient, snap);
      rollbackRef.current.delete(itemId);
      toast.error(getErrorMessage(err, "Không thể cập nhật số lượng"));
    },
  });

  const updateQuantity = useCallback(
    (itemId: number, quantity: number) => {
      if (quantity < 1) return;

      // Capture pre-window snapshot once
      if (!rollbackRef.current.has(itemId)) {
        const current = queryClient.getQueryData<Cart>(CART_QUERY_KEY);
        if (current) rollbackRef.current.set(itemId, current);
      }

      // Instant UI
      applyOptimisticQuantity(queryClient, itemId, quantity);

      // Debounce network — only latest quantity is sent
      const existing = timersRef.current.get(itemId);
      if (existing) clearTimeout(existing);

      timersRef.current.set(
        itemId,
        setTimeout(() => {
          timersRef.current.delete(itemId);
          mutation.mutate({ itemId, quantity });
        }, QTY_DEBOUNCE_MS)
      );
    },
    [mutation, queryClient]
  );

  return {
    updateQuantity,
    isPending: mutation.isPending,
    variables: mutation.variables,
  };
}

export function useDeleteCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: number) => {
      const res = await axiosClient.delete<Cart>(`/api/cart/items/${itemId}`);
      return res.data;
    },
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previous = queryClient.getQueryData<Cart>(CART_QUERY_KEY);

      if (previous) {
        setCartCache(
          queryClient,
          recomputeCart({
            ...previous,
            items: previous.items.filter((item) => item.id !== itemId),
          })
        );
      }

      return { previous };
    },
    onError: (err, _itemId, ctx) => {
      if (ctx?.previous) setCartCache(queryClient, ctx.previous);
      toast.error(getErrorMessage(err, "Không thể xóa sản phẩm"));
    },
    onSuccess: (cart) => {
      setCartCache(queryClient, cart);
      toast.success("Đã xóa sản phẩm khỏi giỏ hàng");
    },
  });
}

/**
 * Add product to cart. Uses POST response (full Cart) — no extra GET / invalidate.
 * Optional product snapshot optimistically bumps badge count.
 */
export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      product_id: number;
      quantity: number;
      optimistic?: Pick<
        CartItem,
        "product_name" | "image_url" | "price" | "sale_price" | "stock"
      >;
    }) => {
      const res = await axiosClient.post<Cart>("/api/cart/items", {
        product_id: payload.product_id,
        quantity: payload.quantity,
      });
      return res.data;
    },
    onMutate: async ({ product_id, quantity, optimistic }) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previous = queryClient.getQueryData<Cart>(CART_QUERY_KEY);

      if (previous && optimistic) {
        const existing = previous.items.find((i) => i.product_id === product_id);
        let items: CartItem[];
        if (existing) {
          items = previous.items.map((i) =>
            i.product_id === product_id
              ? { ...i, quantity: i.quantity + quantity }
              : i
          );
        } else {
          items = [
            ...previous.items,
            {
              id: -product_id,
              product_id,
              product_name: optimistic.product_name,
              image_url: optimistic.image_url,
              price: optimistic.price,
              sale_price: optimistic.sale_price,
              quantity,
              subtotal: 0,
              stock: optimistic.stock,
            },
          ];
        }
        setCartCache(queryClient, recomputeCart({ ...previous, items }));
      }

      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) setCartCache(queryClient, ctx.previous);
      toast.error(getErrorMessage(err, "Không thể thêm vào giỏ hàng"));
    },
    onSuccess: (cart) => {
      setCartCache(queryClient, cart);
    },
  });
}

/** Find cart item id for a product after add (for buy-now checkout filter). */
export function findCartItemId(cart: Cart, productId: number): number | null {
  const item = cart.items.find((i) => i.product_id === productId);
  return item?.id ?? null;
}

export function setCheckoutItemIds(itemIds: number[]) {
  sessionStorage.setItem("checkout_items", JSON.stringify(itemIds));
}
