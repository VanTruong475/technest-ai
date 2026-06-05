import { useState, useEffect, useMemo } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart, User, LogOut, LayoutDashboard, Menu, X,
  Headphones, Heart, Mail, Sparkles, Search,
} from "lucide-react";

// Brand icons
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
import CommandPalette from "@/components/common/CommandPalette";
import { useCategories, getCategoryIdBySlug } from "@/hooks/useCategories";

const CATEGORY_NAV = [
  { slug: "laptop", label: "Laptop" },
  { slug: "dien-thoai", label: "Điện thoại" },
  { slug: "tai-nghe", label: "Tai nghe" },
  { slug: "phu-kien", label: "Phụ kiện" },
];

export default function MainLayout() {
  const { isAuthenticated, isAdmin, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isChatPage = location.pathname === "/chat";
  const isAdminPage = location.pathname.startsWith("/admin");
  const isHomePage = location.pathname === "/";
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
    links.push({ to: "/blog", label: "Blog" });
    links.push({ to: "/chat", label: "Giải pháp AI" });
    return links;
  }, [categories]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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

  return (
    <div className="min-h-screen bg-background">
      {/* ═══════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════ */}
      <header className="fixed top-0 w-full z-[60] bg-card/90 backdrop-blur-xl border-b border-border/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          {/* Top bar */}
          <div className="flex items-center justify-between h-20 gap-8">
            {/* Logo — text only, matching example */}
            <Link to="/" className="text-2xl font-bold text-primary tracking-tight shrink-0" onClick={closeMobile}>
              TechSphere AI
            </Link>

            {/* Search bar */}
            <div className="hidden md:flex flex-1 max-w-2xl relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = (e.target as HTMLFormElement).querySelector("input") as HTMLInputElement;
                  if (input.value.trim()) {
                    navigate(`/products?search=${encodeURIComponent(input.value.trim())}`);
                  }
                }}
                className="w-full"
              >
                <input
                  type="text"
                  placeholder="Tìm kiếm Laptop, iPhone, Phụ kiện..."
                  className="block w-full pl-12 pr-4 py-2.5 bg-muted border-none focus:ring-2 focus:ring-primary/20 rounded-xl text-sm outline-none"
                />
              </form>
              <div className="absolute inset-y-0 right-2 flex items-center">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
                  className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                  aria-label="Mở tìm kiếm nhanh (Ctrl K)"
                >
                  <Sparkles className="h-3 w-3" />
                  AI Search
                  <kbd className="ml-1 hidden lg:inline-block text-[10px] font-mono border border-primary/30 rounded px-1">⌘K</kbd>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 shrink-0">
              {/* Hỗ trợ — with border separator */}
              <Link to="/chat" className="hidden lg:flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors border-r border-border pr-4 mr-2">
                <Headphones className="h-4 w-4" />
                <span className="text-xs font-bold uppercase">Hỗ trợ</span>
              </Link>

              <ThemeToggle />

              {/* Cart */}
              {isAuthenticated && (
                <Link to="/cart" id="cart-icon" className="relative p-2 text-foreground hover:bg-muted rounded-full transition-colors">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute top-0 right-0 bg-destructive text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-card">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Wishlist */}
              {isAuthenticated && (
                <Link to="/wishlist" className="hidden md:flex p-2 text-foreground hover:bg-muted rounded-full transition-colors">
                  <Heart className="h-5 w-5" />
                </Link>
              )}

              {/* Auth — desktop */}
              <div className="hidden md:flex items-center gap-2">
                {isAuthenticated ? (
                  <>
                    <Link to="/orders">
                      <Button variant="ghost" size="sm">Đơn hàng</Button>
                    </Link>
                    {isAdmin && (
                      <Link to="/admin/dashboard">
                        <Button variant="ghost" size="sm">
                          <LayoutDashboard className="h-4 w-4 mr-1" />
                          Admin
                        </Button>
                      </Link>
                    )}
                    <Link to="/profile" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground ml-1">
                      <User className="h-4 w-4" />
                      <span className="hidden xl:inline">{user?.full_name}</span>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Đăng xuất">
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login">
                      <Button size="sm" className="px-6 py-2.5 rounded-xl text-xs uppercase font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all">
                        Đăng nhập
                      </Button>
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
          </div>

          {/* Category nav */}
          <nav className="hidden md:flex items-center gap-8 h-12 overflow-x-auto no-scrollbar border-t border-border/10" aria-label="Điều hướng danh mục">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to || (link.to !== "/" && location.pathname + location.search === link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`whitespace-nowrap h-full flex items-center px-1 text-xs font-bold uppercase tracking-wider transition-colors ${
                    isActive
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <nav
            id="mobile-menu"
            role="navigation"
            aria-label="Menu di động"
            className="md:hidden border-t bg-background px-4 py-4 space-y-1"
          >
            {/* Mobile search */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = (e.target as HTMLFormElement).querySelector("input") as HTMLInputElement;
                if (input.value.trim()) {
                  navigate(`/products?search=${encodeURIComponent(input.value.trim())}`);
                  closeMobile();
                }
              }}
              className="mb-3"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border/40 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </form>

            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="block text-sm py-2.5 px-2 rounded hover:bg-accent"
                onClick={closeMobile}
              >
                {link.label}
              </Link>
            ))}

            <div className="py-1">
              <ThemeToggle variant="full" className="w-full justify-start px-2 text-sm" />
            </div>

            {isAuthenticated ? (
              <>
                <Link to="/wishlist" className="block text-sm py-2.5 px-2 rounded hover:bg-accent" onClick={closeMobile}>
                  Yêu thích
                </Link>
                <Link to="/cart" className="flex items-center justify-between text-sm py-2.5 px-2 rounded hover:bg-accent" onClick={closeMobile}>
                  Giỏ hàng
                  {cartCount > 0 && (
                    <span className="h-5 min-w-[20px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <Link to="/orders" className="block text-sm py-2.5 px-2 rounded hover:bg-accent" onClick={closeMobile}>
                  Đơn hàng
                </Link>
                {isAdmin && (
                  <Link to="/admin/dashboard" className="block text-sm py-2.5 px-2 rounded hover:bg-accent" onClick={closeMobile}>
                    Quản trị
                  </Link>
                )}
                <Link to="/profile" className="block text-sm py-2.5 px-2 rounded hover:bg-accent" onClick={closeMobile}>
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

      {/* Command Palette ⌘K — mount toàn cục */}
      <CommandPalette />

      {/* Main content */}
      {isAdminPage ? (
        <Outlet />
      ) : isChatPage ? (
        <main className="h-[calc(100vh-3.5rem)] overflow-hidden">
          <Outlet />
        </main>
      ) : (
        <main className={isHomePage ? "" : "max-w-7xl mx-auto px-6 mt-36 pb-6"}>
          <Outlet />
        </main>
      )}

      {/* ═══════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════ */}
      {!isChatPage && !isAdminPage && (
      <footer className="bg-card border-t border-border/40 pt-16 pb-8 mt-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
            {/* Brand info */}
            <div className="lg:col-span-2">
              <Link to="/" className="inline-flex items-center gap-2 mb-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-600 text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="text-xl font-bold tracking-tight text-primary">TechSphere AI</span>
              </Link>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">
                Hệ sinh thái mua sắm công nghệ thông minh, mang tương lai AI đến gần hơn với cuộc sống của bạn tại Việt Nam.
              </p>
              <div className="flex gap-3">
                <a
                  href="https://github.com/VanTruong475/techsphere-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white hover:border-primary transition-all"
                >
                  <GithubIcon className="h-4 w-4" />
                </a>
                <a
                  href="#"
                  aria-label="Facebook"
                  className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white hover:border-primary transition-all"
                >
                  <FacebookIcon className="h-4 w-4" />
                </a>
                <a
                  href="mailto:support@techsphere.vn"
                  aria-label="Email"
                  className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white hover:border-primary transition-all"
                >
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Products */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-widest mb-5">Sản phẩm</h4>
              <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
                {categories.slice(0, 4).map((cat) => (
                  <li key={cat.id}>
                    <Link to={`/products?category_id=${cat.id}`} className="hover:text-primary transition-colors">{cat.name}</Link>
                  </li>
                ))}
                {categories.length === 0 && (
                  <li><Link to="/products" className="hover:text-primary transition-colors">Tất cả sản phẩm</Link></li>
                )}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-widest mb-5">Hỗ trợ khách hàng</h4>
              <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
                <li><Link to="/orders" className="hover:text-primary transition-colors">Tra cứu đơn hàng</Link></li>
                <li><Link to="/chat" className="hover:text-primary transition-colors">Tư vấn AI</Link></li>
                <li><span className="hover:text-primary transition-colors cursor-default">Chính sách bảo hành</span></li>
                <li><span className="hover:text-primary transition-colors cursor-default">Đổi trả 30 ngày</span></li>
              </ul>
            </div>

            {/* System */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-widest mb-5">Hệ thống</h4>
              <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
                <li><span className="hover:text-primary transition-colors cursor-default">Về TechSphere AI</span></li>
                <li><span className="hover:text-primary transition-colors cursor-default">Liên hệ</span></li>
                <li><a href="https://github.com/VanTruong475/techsphere-ai" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">GitHub</a></li>
                <li><span className="hover:text-primary transition-colors cursor-default">Đạo đức AI</span></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border/40 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} TechSphere AI. Giấy phép kinh doanh số: 0102030405.</p>
            <div className="flex gap-6 uppercase font-bold tracking-tight">
              <span className="hover:text-primary cursor-default transition-colors">Chính sách bảo mật</span>
              <span className="hover:text-primary cursor-default transition-colors">Điều khoản dịch vụ</span>
              <span className="hover:text-primary cursor-default transition-colors">Liên hệ quảng cáo</span>
            </div>
          </div>
        </div>
      </footer>
      )}

      {!isChatPage && !isAdminPage && <ScrollToTop />}
    </div>
  );
}
