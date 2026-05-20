import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/common/Skeleton";
import {
  ArrowLeft, Check, ShoppingCart, CreditCard, Package,
  ShieldCheck, Truck, Clock,
} from "lucide-react";
import { formatPrice } from "@/utils/format";

interface CartItem {
  id: number;
  product_id: number;
  product_name: string;
  image_url: string | null;
  price: number;
  sale_price: number | null;
  quantity: number;
  subtotal: number;
}

interface CartData {
  id: number;
  items: CartItem[];
  total_items: number;
  total_amount: number;
}

const STEPS = [
  { label: "Giỏ hàng", icon: ShoppingCart },
  { label: "Thông tin giao hàng", icon: CreditCard },
  { label: "Hoàn tất", icon: Package },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [shippingAddress, setShippingAddress] = useState("");
  const [note, setNote] = useState("");
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express">("standard");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "vnpay">("cod");
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string; shippingAddress?: string }>({});
  const clearError = (field: keyof typeof errors) => setErrors((p) => ({ ...p, [field]: undefined }));

  const { data: cart, isLoading, error: cartError } = useQuery<CartData>({
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
        } catch (err: any) {
          toast.error(err.response?.data?.detail || "Không thể tạo thanh toán VNPay");
        }
      } else {
        toast.success("Đặt hàng thành công!");
        navigate(`/orders/${data.id}`);
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Đặt hàng thất bại"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!fullName.trim()) newErrors.fullName = "Vui lòng nhập họ tên";
    if (!phone.trim()) newErrors.phone = "Vui lòng nhập số điện thoại";
    else if (!/^0\d{9}$/.test(phone.replace(/\s/g, ""))) newErrors.phone = "Số điện thoại không hợp lệ (VD: 0901234567)";
    if (!shippingAddress.trim()) newErrors.shippingAddress = "Vui lòng nhập địa chỉ giao hàng";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    orderMutation.mutate();
  };

  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingFee = shippingMethod === "express" ? 50000 : 0;
  const total = subtotal + shippingFee;

  useEffect(() => {
    if (!isLoading && items.length === 0 && !cartError) {
      navigate("/cart");
    }
  }, [isLoading, items.length, navigate, cartError]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-center gap-4 mb-10">
          {STEPS.map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-4 w-20" />
              {i < 2 && <Skeleton className="w-8 h-0.5 mx-2" />}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (cartError) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        <Card className="max-w-md mx-auto mt-12 text-center border-border/60 shadow-sm">
          <CardContent className="pt-8 pb-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">Không thể tải thông tin giỏ hàng</h2>
            <div className="flex gap-2 justify-center pt-2">
              <Link to="/cart"><Button variant="outline">Quay lại giỏ hàng</Button></Link>
              <Link to="/products"><Button>Xem sản phẩm</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* ── Progress Steps ── */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-10">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === 1;
          const isDone = i < 1;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                isDone ? "bg-primary text-primary-foreground" :
                isActive ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                "bg-muted text-muted-foreground"
              }`}>
                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`hidden sm:block text-sm ${isActive ? "font-semibold" : "text-muted-foreground"}`}>
                {step.label}
              </span>
              {i < 2 && <div className={`w-8 sm:w-12 h-0.5 ${isDone ? "bg-primary" : "bg-muted"}`} />}
            </div>
          );
        })}
      </div>

      {/* ── Main Layout ── */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Left: Form ── */}
          <div className="lg:col-span-3 space-y-6">
            {/* Shipping info */}
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-6 space-y-5">
                <h2 className="text-lg font-semibold">Thông tin giao hàng</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Họ tên <span className="text-destructive">*</span></label>
                    <Input
                      placeholder="Nguyễn Văn A"
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); clearError("fullName"); }}
                      className={`h-11 rounded-xl bg-muted/30 ${errors.fullName ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Số điện thoại <span className="text-destructive">*</span></label>
                    <Input
                      placeholder="0901234567"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); clearError("phone"); }}
                      className={`h-11 rounded-xl bg-muted/30 ${errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Địa chỉ nhận hàng <span className="text-destructive">*</span></label>
                  <Input
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                    value={shippingAddress}
                    onChange={(e) => { setShippingAddress(e.target.value); clearError("shippingAddress"); }}
                    className={`h-11 rounded-xl bg-muted/30 ${errors.shippingAddress ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {errors.shippingAddress && <p className="text-xs text-destructive">{errors.shippingAddress}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Ghi chú</label>
                  <Input
                    placeholder="Giao giờ hành chính, gọi trước khi giao..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="h-11 rounded-xl bg-muted/30"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Shipping method */}
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">Phương thức vận chuyển</h2>
                <div className="space-y-3">
                  {([
                    { key: "standard" as const, label: "Giao hàng tiêu chuẩn", desc: "Dự kiến 3-5 ngày", price: "Miễn phí", icon: Truck },
                    { key: "express" as const, label: "Giao hàng nhanh", desc: "Dự kiến 1-2 ngày", price: "50.000 ₫", icon: Clock },
                  ]).map((opt) => (
                    <label
                      key={opt.key}
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                        shippingMethod === opt.key
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/60 hover:border-border"
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
                      <opt.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                      <span className={`text-sm font-semibold ${opt.key === "standard" ? "text-green-600" : ""}`}>
                        {opt.price}
                      </span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment method */}
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">Phương thức thanh toán</h2>
                <div className="space-y-3">
                  {([
                    { key: "cod" as const, label: "Thanh toán khi nhận hàng (COD)", desc: "Thanh toán bằng tiền mặt khi nhận hàng" },
                    { key: "vnpay" as const, label: "Thanh toán qua VNPay", desc: "ATM, Visa, MasterCard, QR Code" },
                  ]).map((opt) => (
                    <label
                      key={opt.key}
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                        paymentMethod === opt.key
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/60 hover:border-border"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === opt.key}
                        onChange={() => setPaymentMethod(opt.key)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        paymentMethod === opt.key ? "border-primary" : "border-muted-foreground/30"
                      }`}>
                        {paymentMethod === opt.key && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Back link */}
            <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Quay lại giỏ hàng
            </Link>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-20 lg:self-start">
              <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6 space-y-5">
                <h2 className="text-lg font-semibold">Đơn hàng của bạn</h2>

                {/* Items */}
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-muted rounded-lg overflow-hidden shrink-0">
                        {item.image_url ? (
                          <OptimizedImage src={item.image_url} alt={item.product_name} width={56} height={56} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">SL: {item.quantity}</p>
                      </div>
                      <span className="text-sm font-semibold shrink-0">{formatPrice(item.subtotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tạm tính</span>
                    <span className="font-medium">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phí vận chuyển</span>
                    <span className={`font-medium ${shippingFee === 0 ? "text-green-600" : ""}`}>
                      {shippingFee === 0 ? "Miễn phí" : formatPrice(shippingFee)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Thuế / VAT</span>
                    <span className="font-medium">Đã bao gồm</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-baseline">
                    <span className="font-semibold text-base">Tổng cộng</span>
                    <span className="text-2xl font-bold">{formatPrice(total)}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 text-base rounded-xl"
                  disabled={orderMutation.isPending}
                >
                  {orderMutation.isPending ? "Đang đặt hàng..." : "Đặt hàng"}
                </Button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Bảo mật 256-bit | Đổi trả 30 ngày
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
