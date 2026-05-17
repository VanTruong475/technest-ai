import { create } from "zustand";
import axiosClient from "@/api/axiosClient";

interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  access_token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; full_name: string }) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem("user") || "null"),
  access_token: localStorage.getItem("access_token"),
  isAuthenticated: !!localStorage.getItem("access_token"),
  isAdmin: JSON.parse(localStorage.getItem("user") || "null")?.role === "ADMIN",

  login: async (email: string, password: string) => {
    const res = await axiosClient.post("/api/auth/login", { email, password });
    const { access_token } = res.data;
    localStorage.setItem("access_token", access_token);
    set({ access_token, isAuthenticated: true });

    // Fetch user info
    await get().fetchCurrentUser();
  },

  register: async (data) => {
    await axiosClient.post("/api/auth/register", data);
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    set({ user: null, access_token: null, isAuthenticated: false, isAdmin: false });
  },

  setUser: (user: User) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, isAdmin: user.role === "ADMIN" });
  },

  fetchCurrentUser: async () => {
    try {
      const res = await axiosClient.get("/api/auth/me");
      const user = res.data;
      localStorage.setItem("user", JSON.stringify(user));
      set({ user, isAdmin: user.role === "ADMIN" });
    } catch {
      get().logout();
    }
  },
}));
