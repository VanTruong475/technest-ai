import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import MainLayout from "@/layouts/MainLayout";

// Pages
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ProductListPage from "@/pages/ProductListPage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import CartPage from "@/pages/CartPage";
import CheckoutPage from "@/pages/CheckoutPage";
import OrderListPage from "@/pages/OrderListPage";
import OrderDetailPage from "@/pages/OrderDetailPage";
import ChatPage from "@/pages/ChatPage";
import AdminProductPage from "@/pages/AdminProductPage";
import AdminOrderPage from "@/pages/AdminOrderPage";
import AdminUserPage from "@/pages/AdminUserPage";
import NotFoundPage from "@/pages/NotFoundPage";

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

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/chat" element={<ChatPage />} />

          {/* Protected */}
          <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrderListPage /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin/products" element={<AdminRoute><AdminProductPage /></AdminRoute>} />
          <Route path="/admin/orders" element={<AdminRoute><AdminOrderPage /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUserPage /></AdminRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
