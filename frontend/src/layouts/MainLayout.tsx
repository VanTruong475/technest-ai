import { useState, useRef, useEffect, useMemo } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart, User, LogOut, LayoutDashboard, Menu, X, ChevronDown,
  Headphones, Heart, Mail, MapPin, Phone, Sparkles, ShieldCheck, Truck,
  RotateCcw, CreditCard,
} from "lucide-react";

// Brand icons không có trong lucide-react v1.16 → dùng inline SVG.
function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12.07C22 6.51 17.52 2 12 2S2 6.51 2 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.02H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.77l-.44 2.91h-2.33V22c4.78-.75 8.44-4.91 8.44-9.93z" />
    </svg>
  );
}
import ScrollToTop from "@/components/common/ScrollToTop";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useCategories, getCategoryIdBySlug } from "@/hooks/useCategories";

const CATEGORY_NAV = [
  { slug: "laptop", label: "Laptop" },
  { slug: "dien-thoai", label: "Điện thoại" },
  { slug: "phu-kien", label: "Phụ kiện" },
];

export default function MainLayout() {
  const { isAuthenticated, isAdmin, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: categories = [] } = useCategories();
  const { data: cartData } = useQuery<{ total_items: number }>({
    queryKey: ["cart"],
    queryFn: async () => {
      const res = await axiosClient.get("/api/cart");
      return res.data;
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
  const cartCount = cartData?.total_items || 0;

  const navLinks = useMemo(() => {
    const links = [
      { to: "/", label: "Trang chủ" },
      { to: "/products", label: "Sản phẩm" },
    ];
    for (const cat of CATEGORY_NAV) {
      const id = getCategoryIdBySlug(categories, cat.slug);
      if (id) links.push({ to: `/products?category_id=${id}`, label: cat.label });
    }
    return links;
  }, [categories]);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile menu on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate("/");
  };

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAdminDropdownOpen(false);
      }
    }
    if (adminDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [adminDropdownOpen]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 left-0 right-0 z-[60] border-b bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-bold tracking-tight" onClick={closeMobile}>
              TechSphere
            </Link>
            {/* Nav: 2 link chính (Trang chủ, Sản phẩm) hiển thị từ md+,
                các category links hiện ở lg+ để tránh overflow viewport
                trung bình. Index 0,1 = primary; còn lại = category. */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Điều hướng chính">
              {navLinks.map((link, idx) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                    idx >= 2 ? "hidden lg:inline-block" : ""
                  } ${
                    location.pathname === link.to || (link.to !== "/" && location.pathname + location.search === link.to)
                      ? "text-foreground bg-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: Desktop */}
          <div className="hidden md:flex items-center gap-2">
            <Link to="/chat">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Headphones className="h-4 w-4 mr-1.5" />
                Tư vấn mua hàng
              </Button>
            </Link>

            <ThemeToggle />

            {isAuthenticated ? (
              <>
                <Link to="/wishlist">
                  <Button variant="ghost" size="icon" aria-label="Danh sách yêu thích">
                    <Heart className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/cart" className="relative">
                  <Button variant="ghost" size="icon" aria-label={cartCount > 0 ? `Giỏ hàng (${cartCount} sản phẩm)` : "Giỏ hàng"}>
                    <ShoppingCart className="h-5 w-5" />
                  </Button>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </Link>
                <Link to="/orders">
                  <Button variant="ghost" size="sm">
                    Đơn hàng
                  </Button>
                </Link>
                {isAdmin && (
                  <div className="relative" ref={dropdownRef}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                      id="admin-menu-trigger"
                      aria-haspopup="menu"
                      aria-expanded={adminDropdownOpen}
                      aria-controls="admin-menu-panel"
                    >
                      <LayoutDashboard className="h-4 w-4 mr-1" />
                      Admin
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                    {adminDropdownOpen && (
                      <div
                        id="admin-menu-panel"
                        role="menu"
                        aria-labelledby="admin-menu-trigger"
                        className="absolute right-0 top-full mt-1 w-48 rounded-md border bg-popover shadow-md z-50"
                      >
                        <Link
                          to="/admin/dashboard"
                          role="menuitem"
                          className="block px-3 py-2 text-sm hover:bg-accent rounded-t-md"
                          onClick={() => setAdminDropdownOpen(false)}
                        >
                          Dashboard
                        </Link>
                        <Link
                          to="/admin/products"
                          role="menuitem"
                          className="block px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => setAdminDropdownOpen(false)}
                        >
                          Quản lý sản phẩm
                        </Link>
                        <Link
                          to="/admin/orders"
                          role="menuitem"
                          className="block px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => setAdminDropdownOpen(false)}
                        >
                          Quản lý đơn hàng
                        </Link>
                        <Link
                          to="/admin/users"
                          role="menuitem"
                          className="block px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => setAdminDropdownOpen(false)}
                        >
                          Quản lý người dùng
                        </Link>
                        <Link
                          to="/admin/reviews"
                          role="menuitem"
                          className="block px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => setAdminDropdownOpen(false)}
                        >
                          Quản lý đánh giá
                        </Link>
                        <Link
                          to="/admin/audit-logs"
                          role="menuitem"
                          className="block px-3 py-2 text-sm hover:bg-accent rounded-b-md"
                          onClick={() => setAdminDropdownOpen(false)}
                        >
                          Nhật ký hệ thống
                        </Link>
                      </div>
                    )}
                  </div>
                )}
                <Link to="/profile" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground ml-1">
                  <User className="h-4 w-4" />
                  <span>{user?.full_name}</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Đăng xuất">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Đăng nhập
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Đăng ký</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <nav
            id="mobile-menu"
            role="navigation"
            aria-label="Menu di động"
            className="md:hidden border-t bg-background px-4 py-4 space-y-1"
          >
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="block text-sm py-2 px-2 rounded hover:bg-accent"
                onClick={closeMobile}
              >
                {link.label}
              </Link>
            ))}
            <Link to="/chat" className="block text-sm py-2 px-2 rounded hover:bg-accent" onClick={closeMobile}>
              Tư vấn mua hàng
            </Link>
            <div className="py-1">
              <ThemeToggle variant="full" className="w-full justify-start px-2 text-sm" />
            </div>
            {isAuthenticated ? (
              <>
                <Link to="/wishlist" className="block text-sm py-2 px-2 rounded hover:bg-accent" onClick={closeMobile}>
                  Yêu thích
                </Link>
                <Link to="/cart" className="flex items-center justify-between text-sm py-2 px-2 rounded hover:bg-accent" onClick={closeMobile}>
                  Giỏ hàng
                  {cartCount > 0 && (
                    <span className="h-5 min-w-[20px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <Link to="/orders" className="block text-sm py-2 px-2 rounded hover:bg-accent" onClick={closeMobile}>
                  Đơn hàng
                </Link>
                {isAdmin && (
                  <>
                    <Link to="/admin/products" className="block text-sm py-2 px-2 rounded hover:bg-accent" onClick={closeMobile}>
                      Quản lý sản phẩm
                    </Link>
                    <Link to="/admin/orders" className="block text-sm py-2 px-2 rounded hover:bg-accent" onClick={closeMobile}>
                      Quản lý đơn hàng
                    </Link>
                    <Link to="/admin/users" className="block text-sm py-2 px-2 rounded hover:bg-accent" onClick={closeMobile}>
                      Quản lý người dùng
                    </Link>
                  </>
                )}
                <Link to="/profile" className="block text-sm py-2 px-2 rounded hover:bg-accent" onClick={closeMobile}>
                  Hồ sơ cá nhân
                </Link>
                <div className="border-t pt-3 mt-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{user?.full_name}</span>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-1" />
                    Đăng xuất
                  </Button>
                </div>
              </>
            ) : (
              <div className="border-t pt-3 mt-2 flex gap-2">
                <Link to="/login" onClick={closeMobile}>
                  <Button variant="outline" size="sm">Đăng nhập</Button>
                </Link>
                <Link to="/register" onClick={closeMobile}>
                  <Button size="sm">Đăng ký</Button>
                </Link>
              </div>
            )}
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="relative border-t bg-gradient-to-b from-muted/20 via-muted/30 to-muted/40 mt-16">
        {/* Trust bar — 4 commitments inline, đậm hơn ở footer */}
        <div className="border-b border-border/60">
          <div className="container mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: ShieldCheck, label: "Bảo hành chính hãng", color: "text-emerald-600 dark:text-emerald-400" },
              { icon: Truck, label: "Giao nhanh 1-2 ngày", color: "text-sky-600 dark:text-sky-400" },
              { icon: RotateCcw, label: "Đổi trả 30 ngày", color: "text-amber-600 dark:text-amber-400" },
              { icon: CreditCard, label: "Thanh toán an toàn", color: "text-violet-600 dark:text-violet-400" },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-2 text-xs md:text-sm">
                <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                <span className="font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-12 gap-8">
            {/* Brand — cột rộng nhất */}
            <div className="col-span-2 md:col-span-4">
              <Link to="/" className="inline-flex items-center gap-2 mb-4">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600 text-primary-foreground shadow-md">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="font-bold text-xl tracking-tight">TechSphere</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-sm">
                Thiết bị công nghệ chính hãng — laptop, điện thoại, tablet, tai nghe.
                Trợ lý AI giúp bạn chọn đúng nhu cầu trong vài giây.
              </p>
              <div className="flex items-center gap-2">
                <a
                  href="https://github.com/VanTruong475/techsphere-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub repository"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                >
                  <GithubIcon className="h-4 w-4" />
                </a>
                <a
                  href="#"
                  aria-label="Facebook"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                >
                  <FacebookIcon className="h-4 w-4" />
                </a>
                <a
                  href="mailto:support@techsphere.vn"
                  aria-label="Email"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                >
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Sản phẩm — categories */}
            <div className="md:col-span-3">
              <h4 className="font-semibold mb-4 text-sm">Sản phẩm</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {categories.slice(0, 5).map((cat) => (
                  <li key={cat.id}>
                    <Link to={`/products?category_id=${cat.id}`} className="hover:text-foreground transition-colors">{cat.name}</Link>
                  </li>
                ))}
                {categories.length === 0 && (
                  <li><Link to="/products" className="hover:text-foreground transition-colors">Tất cả sản phẩm</Link></li>
                )}
              </ul>
            </div>

            {/* Hỗ trợ */}
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-4 text-sm">Hỗ trợ</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link to="/orders" className="hover:text-foreground transition-colors">Theo dõi đơn</Link></li>
                <li><Link to="/chat" className="hover:text-foreground transition-colors">Tư vấn AI</Link></li>
                <li><span>Bảo hành</span></li>
                <li><span>Đổi trả</span></li>
              </ul>
            </div>

            {/* Liên hệ */}
            <div className="col-span-2 md:col-span-3">
              <h4 className="font-semibold mb-4 text-sm">Liên hệ</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                  <a href="mailto:support@techsphere.vn" className="hover:text-foreground transition-colors break-all">support@techsphere.vn</a>
                </li>
                <li className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                  <span>1900 xxxx</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                  <span>Hà Nội, Việt Nam</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar: copyright + payment methods */}
          <div className="border-t mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>
              © {new Date().getFullYear()} <span className="font-semibold text-foreground">TechSphere</span>. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">Phương thức:</span>
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">VNPay</span>
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[10px] font-semibold">COD</span>
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">SSL</span>
            </div>
          </div>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}
