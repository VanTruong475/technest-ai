import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { useAuthStore } from "@/store/authStore";
import { Skeleton } from "@/components/common/Skeleton";
import {
  CreditCard, ShoppingCart, Truck, Zap, ShieldCheck,
  RotateCcw, Award, Lock, ArrowLeft,
} from "lucide-react";
import { formatPrice } from "@/utils/format";
import { getErrorMessage } from "@/utils/api";
import type { Cart } from "@/types";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [note, setNote] = useState("");
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express">("standard");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "vnpay">("cod");
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string; shippingAddress?: string }>({});
  const clearError = (field: keyof typeof errors) => setErrors((p) => ({ ...p, [field]: undefined }));

  const { data: cart, isLoading, error: cartError } = useQuery<Cart>({
    queryKey: ["cart"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/cart");
      return res.data;
    },
  });

  const orderMutation = useMutation({
    mutationFn: async () => {
      const parts = [note];
      if (shippingMethod === "express") parts.push("Giao hàng nhanh");
      const finalNote = parts.filter(Boolean).join(" | ");

      const res = await axiosClient.post("/api/orders", {
        shipping_address: shippingAddress,
        phone,
        note: finalNote || undefined,
        payment_method: paymentMethod === "vnpay" ? "VNPAY" : "COD",
      });
      return res.data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });

      if (paymentMethod === "vnpay") {
        try {
          const payRes = await axiosClient.post(`/api/orders/${data.id}/payment/vnpay`);
          window.location.href = payRes.data.payment_url;
        } catch (err: unknown) {
          toast.error(getErrorMessage(err, "Không thể tạo thanh toán VNPay"));
        }
      } else {
        toast.success("Đặt hàng thành công!");
        navigate(`/orders/${data.id}`);
      }
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, "Đặt hàng thất bại")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderMutation.isPending) return;
    const newErrors: typeof errors = {};
    if (!fullName.trim()) newErrors.fullName = "Vui lòng nhập họ tên";
    if (!phone.trim()) newErrors.phone = "Vui lòng nhập số điện thoại";
    else if (!/^0\d{9}$/.test(phone.replace(/\s/g, ""))) newErrors.phone = "Số điện thoại không hợp lệ";
    if (!shippingAddress.trim()) newErrors.shippingAddress = "Vui lòng nhập địa chỉ giao hàng";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    orderMutation.mutate();
  };

  const allItems = cart?.items || [];
  // Filter to only selected items (stored by CartPage)
  const selectedIds: number[] = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("checkout_items") || "[]");
    } catch {
      return [];
    }
  })();
  const items = selectedIds.length > 0
    ? allItems.filter((i) => selectedIds.includes(i.id))
    : allItems;
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingFee = shippingMethod === "express" ? 50000 : 0;
  const total = subtotal + shippingFee;

  useEffect(() => {
    if (!isLoading && allItems.length === 0 && !cartError) {
      navigate("/cart");
    }
  }, [isLoading, allItems.length, navigate, cartError]);

  if (!isLoading && allItems.length === 0 && !cartError) return null;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <Skeleton className="h-10 w-48 mb-10" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-6">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-96 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (cartError) {
    return (
      <div className="max-w-7xl mx-auto px-6 text-center py-20">
        <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <p className="text-lg font-semibold mb-2">Không thể tải giỏ hàng</p>
        <div className="flex gap-2 justify-center mt-4">
          <Link to="/cart"><button className="px-4 py-2 border rounded-lg text-sm">Quay lại giỏ hàng</button></Link>
          <Link to="/products"><button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">Xem sản phẩm</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* ═══ Left: Checkout Details ═══ */}
          <div className="lg:col-span-8 space-y-8">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Thanh toán</h1>

            {/* ── Section 1: Shipping Info ── */}
            <div className="bg-card p-6 md:p-8 rounded-2xl border border-border/40 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">1</div>
                <h2 className="text-lg font-semibold">Thông tin giao hàng</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Họ tên</label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); clearError("fullName"); }}
                    className={`w-full bg-muted/30 border rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all ${errors.fullName ? "border-destructive" : "border-border/40"}`}
                  />
                  {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="0901 234 567"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); clearError("phone"); }}
                    className={`w-full bg-muted/30 border rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all ${errors.phone ? "border-destructive" : "border-border/40"}`}
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Địa chỉ nhận hàng</label>
                  <textarea
                    placeholder="Số nhà, tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố"
                    value={shippingAddress}
                    onChange={(e) => { setShippingAddress(e.target.value); clearError("shippingAddress"); }}
                    rows={3}
                    className={`w-full bg-muted/30 border rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none ${errors.shippingAddress ? "border-destructive" : "border-border/40"}`}
                  />
                  {errors.shippingAddress && <p className="text-xs text-destructive">{errors.shippingAddress}</p>}
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Ghi chú</label>
                  <input
                    type="text"
                    placeholder="Giao giờ hành chính, gọi trước khi giao..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-muted/30 border border-border/40 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* ── Section 2: Shipping Method ── */}
            <div className="bg-card p-6 md:p-8 rounded-2xl border border-border/40 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">2</div>
                <h2 className="text-lg font-semibold">Phương thức vận chuyển</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "standard" as const, label: "Giao hàng Nhanh", desc: "Dự kiến nhận sau 2-3 ngày", price: "Miễn phí", icon: Truck },
                  { key: "express" as const, label: "Hỏa tốc", desc: "Nhận trong 2-4 giờ", price: "50.000đ", icon: Zap },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    className={`relative flex items-center p-5 rounded-2xl cursor-pointer transition-all ${
                      shippingMethod === opt.key
                        ? "border-2 border-primary bg-primary/5"
                        : "border-2 border-border/30 hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="shipping"
                      checked={shippingMethod === opt.key}
                      onChange={() => setShippingMethod(opt.key)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      shippingMethod === opt.key ? "border-primary" : "border-muted-foreground/30"
                    }`}>
                      {shippingMethod === opt.key && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{opt.label}</p>
                        <opt.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                    <span className={`text-sm font-bold ${opt.key === "standard" ? "text-green-600" : ""}`}>
                      {opt.price}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* ── Section 3: Payment Method ── */}
            <div className="bg-card p-6 md:p-8 rounded-2xl border border-border/40 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">3</div>
                  <h2 className="text-lg font-semibold">Phương thức thanh toán</h2>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 rounded-full">
                  <Lock className="h-3 w-3 text-green-600" />
                  <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">SSL Encrypted</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {[
                  { key: "cod" as const, label: "COD", desc: "Thanh toán khi nhận hàng", icon: ShoppingCart },
                  { key: "vnpay" as const, label: "VNPay", desc: "ATM, Visa, MasterCard, QR", icon: CreditCard },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setPaymentMethod(opt.key)}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl transition-all relative overflow-hidden ${
                      paymentMethod === opt.key
                        ? "border-2 border-primary bg-primary/5"
                        : "border-2 border-border/30 hover:border-primary/50 hover:bg-muted/30"
                    }`}
                  >
                    {paymentMethod === opt.key && (
                      <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary" />
                    )}
                    <opt.icon className={`h-8 w-8 ${paymentMethod === opt.key ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`font-bold text-sm ${paymentMethod === opt.key ? "text-primary" : ""}`}>
                      {opt.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Back link */}
            <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Quay lại giỏ hàng
            </Link>
          </div>

          {/* ═══ Right: Order Summary ═══ */}
          <aside className="lg:col-span-4 lg:sticky lg:top-28">
            <div className="bg-card rounded-2xl border border-border/40 shadow-xl overflow-hidden">
              {/* Header */}
              <div className="bg-muted/50 px-6 py-4 border-b border-border/20">
                <h3 className="text-lg font-semibold">Đơn hàng của bạn</h3>
              </div>

              <div className="p-6 space-y-5">
                {/* Product items */}
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-20 h-20 bg-muted/30 rounded-xl overflow-hidden shrink-0 border border-border/10 p-1.5">
                        {item.image_url ? (
                          <OptimizedImage src={item.image_url} alt={item.product_name} width={80} height={80} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm leading-tight line-clamp-1">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">Số lượng: {item.quantity}</p>
                        <p className="font-bold text-primary mt-1.5">{formatPrice(item.subtotal)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price breakdown */}
                <div className="space-y-3 pt-4 border-t border-border/20 text-sm">
                  <div className="flex justify-between font-medium">
                    <span>Tạm tính</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center font-medium">
                    <span>Phí vận chuyển</span>
                    <span className={shippingFee === 0 ? "text-green-600 bg-green-500/10 px-2.5 py-0.5 rounded text-xs font-bold uppercase" : ""}>
                      {shippingFee === 0 ? "Miễn phí" : formatPrice(shippingFee)}
                    </span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Thuế / VAT</span>
                    <span className="text-muted-foreground">Đã bao gồm</span>
                  </div>
                </div>

                {/* Total */}
                <div className="pt-5 border-t border-border/30 space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="font-bold text-base">Tổng cộng</span>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary tracking-tight">{formatPrice(total)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">(Đã bao gồm thuế VAT)</p>
                    </div>
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={orderMutation.isPending}
                    className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 hover:-translate-y-0.5 transition-all active:scale-95 shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    {orderMutation.isPending ? "Đang đặt hàng..." : "ĐẶT HÀNG NGAY"}
                  </button>

                  <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
                    Bằng cách xác nhận đơn hàng, bạn đồng ý tuân thủ{" "}
                    <span className="text-primary font-bold cursor-pointer hover:underline">Điều khoản sử dụng</span>{" "}
                    và Chính sách bảo mật của TechSphere AI.
                  </p>
                </div>
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { icon: ShieldCheck, label: "Bảo mật\nSSL 256-bit" },
                { icon: RotateCcw, label: "30 ngày\nđổi trả" },
                { icon: Award, label: "Cam kết\nchính hãng" },
              ].map((badge) => (
                <div key={badge.label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border/20 shadow-sm">
                  <badge.icon className="h-5 w-5 text-primary" />
                  <span className="text-[9px] font-bold text-muted-foreground text-center uppercase tracking-wider leading-tight whitespace-pre-line">
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
