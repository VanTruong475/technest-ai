import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { ShoppingCart, User, LogOut, LayoutDashboard, MessageSquare } from "lucide-react";

export default function MainLayout() {
  const { isAuthenticated, isAdmin, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-bold">
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

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
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
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
