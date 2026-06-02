import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { getErrorMessage } from "@/utils/api";
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, ShieldCheck,
  ShoppingCart,
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const clearError = (field: keyof typeof errors) => setErrors((p) => ({ ...p, [field]: undefined }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = "Vui lòng nhập email";
    if (!password) newErrors.password = "Vui lòng nhập mật khẩu";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      await login(email, password);
      toast.success("Đăng nhập thành công!");
      // Admin → dashboard, User → trang chủ
      const isAdmin = useAuthStore.getState().isAdmin;
      navigate(isAdmin ? "/admin/dashboard" : "/");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Đăng nhập thất bại"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* ═══ Left: Visual (desktop) ═══ */}
      <section className="relative hidden md:flex md:w-1/2 lg:w-3/5 bg-foreground items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/20 via-foreground to-foreground/90" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-violet-600 rounded-full mix-blend-screen filter blur-[120px] opacity-10" />

        <div className="relative z-10 px-10 max-w-lg">
          <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6 leading-tight">
            Mua sắm công nghệ<br /><span className="text-violet-300">thông minh hơn</span>
          </h1>
          <p className="text-white/70 text-lg mb-10 leading-relaxed">
            148+ sản phẩm chính hãng từ Apple, Samsung, Sony, Dell... Tư vấn AI miễn phí, giao hàng nhanh toàn quốc.
          </p>

          {/* Feature highlights */}
          <div className="space-y-3">
            {[
              { icon: Sparkles, text: "Tư vấn AI — gợi ý sản phẩm phù hợp nhu cầu" },
              { icon: ShoppingCart, text: "Thanh toán VNPay an toàn, COD tiện lợi" },
              { icon: ShieldCheck, text: "Bảo hành chính hãng, đổi trả 30 ngày" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
                <f.icon className="h-5 w-5 text-violet-300 shrink-0" />
                <span className="text-white/90 text-sm">{f.text}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-10 flex gap-8 pt-6 border-t border-white/10">
            <div>
              <p className="text-2xl font-bold text-white">148+</p>
              <p className="text-[11px] text-white/50 uppercase tracking-wider font-bold">Sản phẩm</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">370+</p>
              <p className="text-[11px] text-white/50 uppercase tracking-wider font-bold">Tests pass</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">24/7</p>
              <p className="text-[11px] text-white/50 uppercase tracking-wider font-bold">AI tư vấn</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Right: Form ═══ */}
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
            <h2 className="text-2xl font-bold">Chào mừng trở lại</h2>
            <p className="text-muted-foreground text-sm mt-1">Đăng nhập để tiếp tục mua sắm và theo dõi đơn hàng.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold" htmlFor="login-email">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="login-email"
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
              <div className="flex justify-between items-center">
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold" htmlFor="login-password">Mật khẩu</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">Quên mật khẩu?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
                  autoComplete="current-password"
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-primary/90 shadow-sm hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-60"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              {!loading && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-4 text-xs text-muted-foreground uppercase tracking-wider font-bold">Hoặc</span>
            </div>
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">Tạo tài khoản miễn phí</Link>
          </p>

          {/* Security badge */}
          <div className="mt-8 flex items-center justify-center gap-2 text-muted-foreground/50">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Bảo mật JWT · Mã hóa bcrypt</span>
          </div>
        </div>
      </section>
    </div>
  );
}
