import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/motion";
import { useAuthStore } from "@/store/authStore";
import MainLayout from "@/layouts/MainLayout";
import AdminLayout from "@/layouts/AdminLayout";
import ScrollToTopOnNavigate from "@/components/common/ScrollToTopOnNavigate";

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
const OrderDetailPage = lazy(() => import("@/pages/OrderDetailPage"));
const ChatPage = lazy(() => import("@/pages/ChatPage"));
const AdminProductPage = lazy(() => import("@/pages/AdminProductPage"));
const AdminOrderPage = lazy(() => import("@/pages/AdminOrderPage"));
const AdminUserPage = lazy(() => import("@/pages/AdminUserPage"));
const AdminDashboardPage = lazy(() => import("@/pages/AdminDashboardPage"));
const AdminReviewsPage = lazy(() => import("@/pages/AdminReviewsPage"));
const AdminAuditPage = lazy(() => import("@/pages/AdminAuditPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const PaymentResultPage = lazy(() => import("@/pages/PaymentResultPage"));
const BlogListPage = lazy(() => import("@/pages/BlogListPage"));
const BlogDetailPage = lazy(() => import("@/pages/BlogDetailPage"));
const AdminBlogPage = lazy(() => import("@/pages/AdminBlogPage"));
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

function AnimatedRoutes() {
  const location = useLocation();
  const { pageTransition } = useReducedMotionSafe();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageTransition}
        initial="initial"
        animate="enter"
        exit="exit"
      >
        <Routes location={location}>
          {/* Auth pages — no header/footer */}
        <Route path="/login" element={<Suspense fallback={<RouteFallback />}><LoginPage /></Suspense>} />
        <Route path="/register" element={<Suspense fallback={<RouteFallback />}><RegisterPage /></Suspense>} />
        <Route path="/forgot-password" element={<Suspense fallback={<RouteFallback />}><ForgotPasswordPage /></Suspense>} />
        <Route path="/reset-password" element={<Suspense fallback={<RouteFallback />}><ResetPasswordPage /></Suspense>} />

        {/* Admin — own layout with sidebar, no MainLayout header/footer */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Suspense fallback={<RouteFallback />}><AdminDashboardPage /></Suspense>} />
          <Route path="products" element={<Suspense fallback={<RouteFallback />}><AdminProductPage /></Suspense>} />
          <Route path="orders" element={<Suspense fallback={<RouteFallback />}><AdminOrderPage /></Suspense>} />
          <Route path="users" element={<Suspense fallback={<RouteFallback />}><AdminUserPage /></Suspense>} />
          <Route path="reviews" element={<Suspense fallback={<RouteFallback />}><AdminReviewsPage /></Suspense>} />
          <Route path="audit-logs" element={<Suspense fallback={<RouteFallback />}><AdminAuditPage /></Suspense>} />
          <Route path="blogs" element={<Suspense fallback={<RouteFallback />}><AdminBlogPage /></Suspense>} />
        </Route>

        <Route element={<MainLayout />}>
          {/* Public */}
          <Route path="/" element={<Suspense fallback={<RouteFallback />}><HomePage /></Suspense>} />
          <Route path="/products" element={<Suspense fallback={<RouteFallback />}><ProductListPage /></Suspense>} />
          <Route path="/products/:id" element={<Suspense fallback={<RouteFallback />}><ProductDetailPage /></Suspense>} />
          <Route path="/blog" element={<Suspense fallback={<RouteFallback />}><BlogListPage /></Suspense>} />
          <Route path="/blog/:slug" element={<Suspense fallback={<RouteFallback />}><BlogDetailPage /></Suspense>} />
          <Route path="/chat" element={<Suspense fallback={<RouteFallback />}><ChatPage /></Suspense>} />

          {/* Protected */}
          <Route path="/cart" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><CartPage /></Suspense></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><CheckoutPage /></Suspense></ProtectedRoute>} />
          {/* /orders & /wishlist gộp vào trang tài khoản dạng tab (redirect giữ link cũ chạy) */}
          <Route path="/orders" element={<Navigate to="/profile?tab=orders" replace />} />
          <Route path="/orders/:id" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><OrderDetailPage /></Suspense></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><ProfilePage /></Suspense></ProtectedRoute>} />
          <Route path="/wishlist" element={<Navigate to="/profile?tab=wishlist" replace />} />
          <Route path="/payment/result" element={<Suspense fallback={<RouteFallback />}><PaymentResultPage /></Suspense>} />

          {/* 404 */}
          <Route path="*" element={<Suspense fallback={<RouteFallback />}><NotFoundPage /></Suspense>} />
        </Route>
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <ScrollToTopOnNavigate />
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
