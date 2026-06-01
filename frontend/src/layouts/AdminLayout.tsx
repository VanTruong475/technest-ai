import { useState, useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Star, FileText,
  LogOut, Menu, X, ArrowLeft, Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";

const ADMIN_LINKS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/products", label: "Sản phẩm", icon: Package },
  { to: "/admin/orders", label: "Đơn hàng", icon: ShoppingCart },
  { to: "/admin/users", label: "Người dùng", icon: Users },
  { to: "/admin/reviews", label: "Đánh giá", icon: Star },
  { to: "/admin/audit-logs", label: "Nhật ký", icon: FileText },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on Escape
  useEffect(() => {
    if (!sidebarOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex flex-col w-60 border-r bg-card shrink-0">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2 px-4 border-b">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-600 text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-bold text-sm tracking-tight">Admin Panel</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-0.5" aria-label="Điều hướng admin">
          {ADMIN_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại cửa hàng
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Điều hướng admin di động"
      >
        <div className="h-14 flex items-center justify-between px-4 border-b">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-600 text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-bold text-sm tracking-tight">Admin Panel</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5" aria-label="Điều hướng admin di động">
          {ADMIN_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại cửa hàng
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 flex items-center justify-between px-4 border-b bg-card shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở menu admin"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-sm font-semibold text-muted-foreground">
              {ADMIN_LINKS.find((l) => location.pathname === l.to)?.label || "Admin"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.full_name}</span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
