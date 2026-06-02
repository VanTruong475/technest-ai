import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { getErrorMessage } from "@/utils/api";
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, ShieldCheck, User,
  Star, Truck, RotateCcw,
} from "lucide-react";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string; confirmPassword?: string }>({});
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const clearError = (field: keyof typeof errors) => setErrors((p) => ({ ...p, [field]: undefined }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!fullName.trim()) newErrors.fullName = "Vui lòng nhập họ tên";
    if (!email.trim()) newErrors.email = "Vui lòng nhập email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Email không hợp lệ";
    if (!password) newErrors.password = "Vui lòng nhập mật khẩu";
    else if (password.length < 8) newErrors.password = "Mật khẩu phải ít nhất 8 ký tự";
    if (!confirmPassword) newErrors.confirmPassword = "Vui lòng nhập lại mật khẩu";
    else if (password !== confirmPassword) newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      await register({ full_name: fullName, email, password });
      toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
      navigate("/login");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Đăng ký thất bại"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* ═══ Left: Form ═══ */}
      <section className="flex-1 flex flex-col justify-center items-center px-6 py-10 bg-card">
        <div className="w-full max-w-[420px]">
          {/* Branding */}
          <div className="mb-8 text-center md:text-left">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-primary tracking-tight">TechSphere AI</span>
            </Link>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Tạo tài khoản</h1>
            <p className="text-muted-foreground text-sm mt-1">Mua sắm công nghệ thông minh với AI tư vấn miễn phí.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold" htmlFor="reg-name">Họ và tên</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="reg-name"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); clearError("fullName"); }}
                  autoComplete="name"
                  className={`w-full bg-muted/30 border rounded-lg pl-11 pr-4 py-3 text-sm outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all ${errors.fullName ? "border-destructive" : "border-border/40"}`}
                />
              </div>
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold" htmlFor="reg-email">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="reg-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
                  autoComplete="email"
                  className={`w-full bg-muted/30 border rounded-lg pl-11 pr-4 py-3 text-sm outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all ${errors.email ? "border-destructive" : "border-border/40"}`}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold" htmlFor="reg-password">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Ít nhất 8 ký tự"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
                  autoComplete="new-password"
                  className={`w-full bg-muted/30 border rounded-lg pl-11 pr-11 py-3 text-sm outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all ${errors.password ? "border-destructive" : "border-border/40"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold" htmlFor="reg-confirm">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="reg-confirm"
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); clearError("confirmPassword"); }}
                  autoComplete="new-password"
                  className={`w-full bg-muted/30 border rounded-lg pl-11 pr-4 py-3 text-sm outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all ${errors.confirmPassword ? "border-destructive" : "border-border/40"}`}
                />
              </div>
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-primary/90 shadow-sm hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-60"
            >
              {loading ? "Đang đăng ký..." : "Tạo tài khoản"}
              {!loading && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          {/* Benefits */}
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              { icon: Star, label: "Đánh giá\nsản phẩm" },
              { icon: Truck, label: "Theo dõi\nđơn hàng" },
              { icon: RotateCcw, label: "Lưu sản phẩm\nyêu thích" },
            ].map((b) => (
              <div key={b.label} className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-muted/20 border border-border/20">
                <b.icon className="h-4 w-4 text-primary" />
                <span className="text-[10px] text-muted-foreground text-center font-medium leading-tight whitespace-pre-line">{b.label}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-4 text-xs text-muted-foreground uppercase tracking-wider font-bold">Hoặc</span>
            </div>
          </div>

          {/* Login link */}
          <p className="text-center text-sm text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">Đăng nhập ngay</Link>
          </p>

          {/* Security badge */}
          <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground/50">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Bảo mật JWT · Mã hóa bcrypt</span>
          </div>
        </div>
      </section>

      {/* ═══ Right: Visual (desktop) ═══ */}
      <section className="hidden lg:flex w-2/5 bg-foreground items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/20 via-foreground to-foreground/90" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-violet-600 rounded-full mix-blend-screen filter blur-[120px] opacity-10" />

        <div className="relative z-10 px-10 max-w-md text-center">
          <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-white leading-tight mb-4 tracking-tight">
            Bắt đầu mua sắm<br />công nghệ thông minh
          </h2>
          <p className="text-white/70 text-sm leading-relaxed mb-8">
            Tạo tài khoản miễn phí để lưu sản phẩm yêu thích, theo dõi đơn hàng, đánh giá sản phẩm và nhận tư vấn AI cá nhân hóa.
          </p>
          <div className="flex gap-6 justify-center pt-6 border-t border-white/10">
            <div>
              <p className="text-xl font-bold text-white">148+</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-bold">Sản phẩm</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white">9</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-bold">Thương hiệu</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white">5</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-bold">Danh mục</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
