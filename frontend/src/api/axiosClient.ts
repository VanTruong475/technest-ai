import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
  // HttpOnly cookie session — must send credentials cross-origin (Vercel → Render)
  withCredentials: true,
});

// Public auth pages — 401 here is expected (no session) and must NOT redirect away
const AUTH_PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

function softClearAuth() {
  localStorage.removeItem("user");
  localStorage.removeItem("access_token"); // legacy cleanup
  useAuthStore.setState({ user: null, isAuthenticated: false, isAdmin: false });
}

// Response interceptor: handle 401
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      const isAuthPublic = AUTH_PUBLIC_PATHS.includes(path);
      const url: string = error.config?.url || "";
      const isAuthProbe =
        url.includes("/api/auth/me") || url.includes("/api/auth/logout");

      // Soft-clear client state. Avoid calling logout() here — that POSTs /auth/logout
      // and can recurse / race with the same 401 path (esp. on cold load of public pages).
      softClearAuth();

      // Only hard-redirect when the user was on a protected page.
      // /reset-password, /forgot-password, /login, /register must stay put.
      // Also skip redirect for silent session probes (/auth/me) on public pages.
      if (!isAuthPublic && !isAuthProbe) {
        // Non-probe 401 on a protected route → session expired mid-action
        if (path !== "/login") {
          window.location.href = "/login";
        }
      } else if (!isAuthPublic && isAuthProbe) {
        // Session probe failed on a non-auth page (e.g. Home with stale localStorage).
        // Soft-clear is enough — no forced redirect to login for public storefront.
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
