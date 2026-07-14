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

// Response interceptor: handle 401
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Use Zustand store to properly clear state and trigger React re-renders
      const { logout } = useAuthStore.getState();
      // Fire-and-forget cookie clear; don't await (interceptor must stay sync-ish)
      void logout();
      // Redirect to login if not already there
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
