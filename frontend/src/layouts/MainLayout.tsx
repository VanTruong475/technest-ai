import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { ShoppingCart, User, LogOut, LayoutDashboard, MessageSquare, Menu, X } from "lucide-react";

export default function MainLayout() {
  const { isAuthenticated, isAdmin, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate("/");
  };

  const closeMobile = () => setMobileOpen(false);

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
                  <Link to="/admin/products">
                    <Button variant="ghost" size="sm">
                      <LayoutDashboard className="h-4 w-4 mr-1" />
                      Admin
                    </Button>
                  </Link>
                )}
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user?.full_name}</span>
                </div>
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
    </div>
  );
}
