import { create } from "zustand";
import axiosClient from "@/api/axiosClient";

interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  is_2fa_enabled?: boolean;
}

interface LoginResult {
  requires_2fa: boolean;
  temp_token?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;

  login: (email: string, password: string) => Promise<LoginResult>;
  verify2FA: (tempToken: string, code: string) => Promise<void>;
  register: (data: { email: string; password: string; full_name: string }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  fetchCurrentUser: () => Promise<void>;
}

function loadStoredUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

const storedUser = loadStoredUser();

export const useAuthStore = create<AuthState>((set, get) => ({
  // User profile may stay in localStorage (non-secret). Auth session = HttpOnly cookie.
  user: storedUser,
  isAuthenticated: !!storedUser,
  isAdmin: storedUser?.role === "ADMIN",

  login: async (email: string, password: string) => {
    const res = await axiosClient.post("/api/auth/login", { email, password });
    const data = res.data as {
      access_token?: string;
      requires_2fa?: boolean;
      temp_token?: string;
    };

    if (data.requires_2fa && data.temp_token) {
      return { requires_2fa: true, temp_token: data.temp_token };
    }

    await get().fetchCurrentUser();
    return { requires_2fa: false };
  },

  verify2FA: async (tempToken: string, code: string) => {
    await axiosClient.post("/api/auth/2fa/verify-login", {
      temp_token: tempToken,
      code,
    });
    await get().fetchCurrentUser();
  },

  register: async (data) => {
    await axiosClient.post("/api/auth/register", data);
  },

  logout: async () => {
    try {
      await axiosClient.post("/api/auth/logout");
    } catch {
      // Cookie clear best-effort — still wipe client state
    }
    localStorage.removeItem("user");
    localStorage.removeItem("access_token"); // legacy cleanup
    set({ user: null, isAuthenticated: false, isAdmin: false });
  },

  setUser: (user: User) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, isAdmin: user.role === "ADMIN", isAuthenticated: true });
  },

  fetchCurrentUser: async () => {
    try {
      const res = await axiosClient.get("/api/auth/me");
      const user = res.data as User;
      localStorage.setItem("user", JSON.stringify(user));
      // Drop any legacy token left from older builds
      localStorage.removeItem("access_token");
      set({ user, isAdmin: user.role === "ADMIN", isAuthenticated: true });
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("access_token");
      set({ user: null, isAuthenticated: false, isAdmin: false });
    }
  },
}));
