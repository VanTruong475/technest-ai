import { useState, useRef, useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { ShoppingCart, User, LogOut, LayoutDashboard, MessageSquare, Menu, X, ChevronDown } from "lucide-react";
import ScrollToTop from "@/components/common/ScrollToTop";

export default function MainLayout() {
  const { isAuthenticated, isAdmin, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate("/");
  };

  const closeMobile = () => setMobileOpen(false);

  // Close dropdown when clicking outside
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
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-bold" onClick={closeMobile}>
              TechSphere
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link to="/products" className="text-sm text-muted-foreground hover:text-foreground">
                Sản phẩm
              </Link>
              <Link to="/chat" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                AI Assistant
              </Link>
            </nav>
          </div>

          {/* Right: Desktop */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to="/cart">
                  <Button variant="ghost" size="icon">
                    <ShoppingCart className="h-5 w-5" />
                  </Button>
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
                    >
                      <LayoutDashboard className="h-4 w-4 mr-1" />
                      Admin
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                    {adminDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 w-48 rounded-md border bg-popover shadow-md z-50">
                        <Link
                          to="/admin/products"
                          className="block px-3 py-2 text-sm hover:bg-accent rounded-t-md"
                          onClick={() => setAdminDropdownOpen(false)}
                        >
                          Quản lý sản phẩm
                        </Link>
                        <Link
                          to="/admin/orders"
                          className="block px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => setAdminDropdownOpen(false)}
                        >
                          Quản lý đơn hàng
                        </Link>
                        <Link
                          to="/admin/users"
                          className="block px-3 py-2 text-sm hover:bg-accent rounded-b-md"
                          onClick={() => setAdminDropdownOpen(false)}
                        >
                          Quản lý người dùng
                        </Link>
                      </div>
                    )}
                  </div>
                )}
                <Link to="/profile" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <User className="h-4 w-4" />
                  <span>{user?.full_name}</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
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
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t bg-background px-4 py-4 space-y-3">
            <Link to="/products" className="block text-sm py-2" onClick={closeMobile}>
              Sản phẩm
            </Link>
            <Link to="/chat" className="block text-sm py-2" onClick={closeMobile}>
              AI Assistant
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/cart" className="block text-sm py-2" onClick={closeMobile}>
                  Giỏ hàng
                </Link>
                <Link to="/orders" className="block text-sm py-2" onClick={closeMobile}>
                  Đơn hàng
                </Link>
                {isAdmin && (
                  <Link to="/admin/products" className="block text-sm py-2" onClick={closeMobile}>
                    Quản lý sản phẩm
                  </Link>
                )}
                {isAdmin && (
                  <Link to="/admin/orders" className="block text-sm py-2" onClick={closeMobile}>
                    Quản lý đơn hàng
                  </Link>
                )}
                {isAdmin && (
                  <Link to="/admin/users" className="block text-sm py-2" onClick={closeMobile}>
                    Quản lý người dùng
                  </Link>
                )}
                <Link to="/profile" className="block text-sm py-2" onClick={closeMobile}>
                  Hồ sơ cá nhân
                </Link>
                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{user?.full_name}</span>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-1" />
                    Đăng xuất
                  </Button>
                </div>
              </>
            ) : (
              <div className="border-t pt-3 flex gap-2">
                <Link to="/login" onClick={closeMobile}>
                  <Button variant="outline" size="sm">Đăng nhập</Button>
                </Link>
                <Link to="/register" onClick={closeMobile}>
                  <Button size="sm">Đăng ký</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-2">TechSphere AI</h3>
              <p className="text-sm text-muted-foreground">
                Nền tảng thương mại điện tử công nghệ với AI tư vấn thông minh.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Liên kết</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li><Link to="/products" className="hover:text-foreground">Sản phẩm</Link></li>
                <li><Link to="/chat" className="hover:text-foreground">AI Assistant</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Hỗ trợ</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>Hotline: 1900 xxxx</li>
                <li>Email: support@techsphere.vn</li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-6 pt-4 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} TechSphere AI. All rights reserved.
          </div>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}
