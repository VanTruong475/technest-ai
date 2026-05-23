import { useState, useRef, useEffect, useMemo } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import axiosClient from "@/api/axiosClient";
import { Button } from "@/components/ui/button";
import { ShoppingCart, User, LogOut, LayoutDashboard, Menu, X, ChevronDown, Headphones, Heart } from "lucide-react";
import ScrollToTop from "@/components/common/ScrollToTop";
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
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
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
      <footer className="border-t bg-muted/30 mt-12">
        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <h3 className="font-bold text-lg mb-3">TechSphere</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Cửa hàng thiết bị công nghệ chính hãng. Laptop, điện thoại, phụ kiện với giá tốt nhất.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Sản phẩm</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <Link to={`/products?category_id=${cat.id}`} className="hover:text-foreground">{cat.name}</Link>
                  </li>
                ))}
                {categories.length === 0 && (
                  <li><Link to="/products" className="hover:text-foreground">Tất cả sản phẩm</Link></li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Hỗ trợ</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/orders" className="hover:text-foreground">Theo dõi đơn hàng</Link></li>
                <li><span>Chính sách bảo hành</span></li>
                <li><span>Đổi trả dễ dàng</span></li>
                <li><span>Hotline: 1900 xxxx</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Liên hệ</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Email: support@techsphere.vn</li>
                <li>Địa chỉ: Hà Nội, Việt Nam</li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} TechSphere. All rights reserved.
          </div>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}
