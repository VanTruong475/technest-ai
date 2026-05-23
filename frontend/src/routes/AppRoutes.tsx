import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import MainLayout from "@/layouts/MainLayout";

// Lazy-loaded page components — each becomes its own chunk
const HomePage = lazy(() => import("@/pages/HomePage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const ProductListPage = lazy(() => import("@/pages/ProductListPage"));
const ProductDetailPage = lazy(() => import("@/pages/ProductDetailPage"));
const CartPage = lazy(() => import("@/pages/CartPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const OrderListPage = lazy(() => import("@/pages/OrderListPage"));
const OrderDetailPage = lazy(() => import("@/pages/OrderDetailPage"));
const ChatPage = lazy(() => import("@/pages/ChatPage"));
const AdminProductPage = lazy(() => import("@/pages/AdminProductPage"));
const AdminOrderPage = lazy(() => import("@/pages/AdminOrderPage"));
const AdminUserPage = lazy(() => import("@/pages/AdminUserPage"));
const AdminDashboardPage = lazy(() => import("@/pages/AdminDashboardPage"));
const AdminReviewsPage = lazy(() => import("@/pages/AdminReviewsPage"));
const AdminAuditPage = lazy(() => import("@/pages/AdminAuditPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const WishlistPage = lazy(() => import("@/pages/WishlistPage"));
const PaymentResultPage = lazy(() => import("@/pages/PaymentResultPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

// Protected Route - requires auth
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Admin Route - requires admin role
function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Lightweight loader shown while a route chunk is downloading
function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Đang tải trang"
      className="flex items-center justify-center min-h-[50vh]"
    >
      <div className="h-8 w-8 rounded-full border-2 border-muted border-t-primary animate-spin" />
      <span className="sr-only">Đang tải trang...</span>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          {/* Public */}
          <Route path="/" element={<Suspense fallback={<RouteFallback />}><HomePage /></Suspense>} />
          <Route path="/products" element={<Suspense fallback={<RouteFallback />}><ProductListPage /></Suspense>} />
          <Route path="/products/:id" element={<Suspense fallback={<RouteFallback />}><ProductDetailPage /></Suspense>} />
          <Route path="/login" element={<Suspense fallback={<RouteFallback />}><LoginPage /></Suspense>} />
          <Route path="/register" element={<Suspense fallback={<RouteFallback />}><RegisterPage /></Suspense>} />
          <Route path="/forgot-password" element={<Suspense fallback={<RouteFallback />}><ForgotPasswordPage /></Suspense>} />
          <Route path="/reset-password" element={<Suspense fallback={<RouteFallback />}><ResetPasswordPage /></Suspense>} />
          <Route path="/chat" element={<Suspense fallback={<RouteFallback />}><ChatPage /></Suspense>} />

          {/* Protected */}
          <Route path="/cart" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><CartPage /></Suspense></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><CheckoutPage /></Suspense></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><OrderListPage /></Suspense></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><OrderDetailPage /></Suspense></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><ProfilePage /></Suspense></ProtectedRoute>} />
          <Route path="/wishlist" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><WishlistPage /></Suspense></ProtectedRoute>} />
          <Route path="/payment/result" element={<Suspense fallback={<RouteFallback />}><PaymentResultPage /></Suspense>} />

          {/* Admin */}
          <Route path="/admin/dashboard" element={<AdminRoute><Suspense fallback={<RouteFallback />}><AdminDashboardPage /></Suspense></AdminRoute>} />
          <Route path="/admin/products" element={<AdminRoute><Suspense fallback={<RouteFallback />}><AdminProductPage /></Suspense></AdminRoute>} />
          <Route path="/admin/orders" element={<AdminRoute><Suspense fallback={<RouteFallback />}><AdminOrderPage /></Suspense></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><Suspense fallback={<RouteFallback />}><AdminUserPage /></Suspense></AdminRoute>} />
          <Route path="/admin/reviews" element={<AdminRoute><Suspense fallback={<RouteFallback />}><AdminReviewsPage /></Suspense></AdminRoute>} />
          <Route path="/admin/audit-logs" element={<AdminRoute><Suspense fallback={<RouteFallback />}><AdminAuditPage /></Suspense></AdminRoute>} />

          {/* 404 */}
          <Route path="*" element={<Suspense fallback={<RouteFallback />}><NotFoundPage /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
