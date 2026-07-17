import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Minus, ShoppingCart, ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";
import { formatPrice } from "@/utils/format";
import { Skeleton } from "@/components/common/Skeleton";
import CustomersAlsoBought from "@/components/common/CustomersAlsoBought";
import {
  CART_QUERY_KEY,
  useUpdateCartQuantity,
  useDeleteCartItem,
  setCheckoutItemIds,
} from "@/hooks/useCart";
import type { Cart } from "@/types";

function CartItemCardSkeleton() {
  return (
    <div className="flex items-center gap-5 p-5 bg-card rounded-2xl border border-border/60 shadow-sm">
      <Skeleton className="w-5 h-5 rounded shrink-0" />
      <Skeleton className="w-[120px] h-[120px] rounded-xl shrink-0" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-5 w-24 ml-auto" />
        <Skeleton className="h-8 w-8 ml-auto rounded-lg" />
      </div>
    </div>
  );
}

export default function CartPage() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data: cart, isLoading, error, refetch } = useQuery<Cart>({
    queryKey: CART_QUERY_KEY,
    queryFn: async () => {
      const res = await axiosClient.get("/api/cart");
      return res.data;
    },
  });

  const { updateQuantity, isPending: isUpdatingQty, variables: qtyVars } =
    useUpdateCartQuantity();
  const deleteMutation = useDeleteCartItem();

  const handleQuantityChange = (itemId: number, newQty: number) => {
    if (newQty < 1) return;
    // Optimistic + debounced — UI instant, network coalesced
    updateQuantity(itemId, newQty);
  };

  const items = cart?.items || [];
  const itemCount = cart?.total_items || 0;
  // Chỉ hiện subtle pending trên item đang sync server (không block +/-)
  const syncingId = isUpdatingQty ? qtyVars?.itemId : null;

  // Select all on initial load
  useEffect(() => {
    if (items.length > 0 && selectedIds.size === 0) {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remove deleted items from selection
  useEffect(() => {
    const itemIds = new Set(items.map((i) => i.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => itemIds.has(id)));
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [items]);

  const toggleItem = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const selectedItems = items.filter((i) => selectedIds.has(i.id));
  const selectedSubtotal = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const allSelected = items.length > 0 && selectedIds.size === items.length;

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      toast.error("Vui lòng chọn sản phẩm để thanh toán");
      return;
    }
    setCheckoutItemIds(selectedItems.map((i) => i.id));
    navigate("/checkout");
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 -mx-4 -my-6 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <CartItemCardSkeleton key={i} />
              ))}
            </div>
            <div className="lg:col-span-2">
              <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6 space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen bg-muted/30 -mx-4 -my-6 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Card className="max-w-md mx-auto mt-12 text-center border-border/60 shadow-sm">
            <CardContent className="pt-8 pb-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                <ShoppingCart className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold">Không thể tải giỏ hàng</h2>
              <p className="text-sm text-muted-foreground">Đã xảy ra lỗi, vui lòng thử lại.</p>
              <div className="flex gap-2 justify-center pt-2">
                <Button variant="outline" onClick={() => refetch()}>Thử lại</Button>
                <Link to="/products"><Button>Xem sản phẩm</Button></Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Empty ── (empty-state pattern theo UI_PATTERNS.md)
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-muted/30 -mx-4 -my-6 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <ShoppingCart className="h-16 w-16" />
            <p className="mt-4 text-lg font-medium text-foreground">Giỏ hàng của bạn đang trống</p>
            <p className="mt-1 text-sm">Hãy khám phá các sản phẩm công nghệ mới nhất của chúng tôi.</p>
            <Link to="/products">
              <Button size="lg" className="mt-5">Tiếp tục mua sắm</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main ──
  return (
    <div className="min-h-screen bg-muted/30 -mx-4 -my-6 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Giỏ hàng của bạn</h1>
          <p className="text-muted-foreground mt-1">Bạn đang có {itemCount} sản phẩm trong giỏ hàng.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Left: Cart items ── */}
          <div className="lg:col-span-3 space-y-4">
            {/* Select all */}
            <label className="flex items-center gap-3 px-4 py-3 bg-card rounded-xl border border-border/40 cursor-pointer hover:bg-muted/30 transition-colors">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 accent-primary"
              />
              <span className="text-sm font-medium">
                Chọn tất cả ({selectedIds.size}/{items.length} sản phẩm)
              </span>
            </label>

            {/* Items */}
            {items.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 p-4 sm:p-5 bg-card rounded-2xl border shadow-sm hover:shadow-md transition-all ${
                    isSelected ? "border-primary/40 ring-1 ring-primary/10" : "border-border/60"
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleItem(item.id)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 accent-primary shrink-0"
                  />

                  {/* Image */}
                  <Link to={`/products/${item.product_id}`} className="shrink-0">
                    <div className="w-20 h-20 aspect-square bg-muted rounded-md overflow-hidden">
                      {item.image_url ? (
                        <OptimizedImage src={item.image_url} alt={item.product_name} width={80} height={80} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <Link to={`/products/${item.product_id}`} className="font-medium text-sm sm:text-base hover:underline line-clamp-2 block">
                      {item.product_name}
                    </Link>
                    <div className="flex items-center gap-2">
                      {item.sale_price ? (
                        <>
                          <span className="font-bold text-sale text-sm">{formatPrice(item.sale_price)}</span>
                          <span className="text-xs text-muted-foreground line-through">{formatPrice(item.price)}</span>
                        </>
                      ) : (
                        <span className="font-bold text-sm">{formatPrice(item.price)}</span>
                      )}
                    </div>

                    {/* Quantity stepper — optimistic: never block +/- while syncing */}
                    <div className="inline-flex items-center border border-border rounded-lg overflow-hidden">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-none"
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label="Giảm số lượng"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="relative w-12 h-8 flex items-center justify-center border-x border-border">
                        <Input
                          readOnly
                          value={item.quantity}
                          aria-label="Số lượng"
                          className="w-full h-8 text-center text-xs font-medium px-0 border-0 rounded-none focus-visible:ring-0 bg-transparent"
                        />
                        {syncingId === item.id && (
                          <Loader2
                            className="absolute right-0.5 h-3 w-3 animate-spin text-muted-foreground"
                            aria-hidden
                          />
                        )}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-none"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        disabled={item.stock != null && item.quantity >= item.stock}
                        aria-label="Tăng số lượng"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    {item.stock != null && item.quantity >= item.stock && (
                      <p className="text-xs text-muted-foreground">
                        Đã đạt số lượng tồn kho tối đa ({item.stock})
                      </p>
                    )}

                    {/* Mobile: subtotal + delete */}
                    <div className="flex items-center justify-between sm:hidden">
                      <p className="text-base font-bold">{formatPrice(item.subtotal)}</p>
                      <ConfirmDialog
                        title="Xóa sản phẩm"
                        description="Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?"
                        variant="destructive"
                        onConfirm={async () => {
                          await deleteMutation.mutateAsync(item.id);
                        }}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Xóa ${item.product_name} khỏi giỏ`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </ConfirmDialog>
                    </div>
                  </div>

                  {/* Right: subtotal + delete */}
                  <div className="text-right shrink-0 space-y-2 hidden sm:block">
                    <p className="text-base font-bold">{formatPrice(item.subtotal)}</p>
                    <ConfirmDialog
                      title="Xóa sản phẩm"
                      description="Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?"
                      variant="destructive"
                      onConfirm={async () => {
                        await deleteMutation.mutateAsync(item.id);
                      }}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Xóa ${item.product_name} khỏi giỏ`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ConfirmDialog>
                  </div>
                </div>
              );
            })}

            {/* Continue shopping */}
            <Link to="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-2">
              <ArrowLeft className="h-4 w-4" />
              Tiếp tục mua sắm
            </Link>
          </div>

          {/* ── Right: Order summary ── */}
          <div className="lg:col-span-2 lg:sticky lg:top-20 lg:self-start">
            <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6 space-y-5">
              <h2 className="text-lg font-semibold">Tóm tắt đơn hàng</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sản phẩm đã chọn</span>
                  <span className="font-medium">{selectedItems.length}/{items.length}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span className="font-medium">{formatPrice(selectedSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phí vận chuyển</span>
                  <span className="font-medium text-success">Miễn phí</span>
                </div>
                <Separator />
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-base">Tổng cộng</span>
                  <span className="text-2xl font-bold">{formatPrice(selectedSubtotal)}</span>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full h-12 text-base rounded-xl"
                disabled={selectedItems.length === 0}
                onClick={handleCheckout}
              >
                Tiến hành thanh toán ({selectedItems.length})
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Thanh toán an toàn & bảo mật
              </div>
            </div>
          </div>
        </div>

        {/* Mini gợi ý — dựa trên sản phẩm đầu trong giỏ (API recommend có sẵn) */}
        {items[0] && (
          <div className="mt-12">
            <CustomersAlsoBought productId={items[0].product_id} limit={3} />
          </div>
        )}
      </div>
    </div>
  );
}
