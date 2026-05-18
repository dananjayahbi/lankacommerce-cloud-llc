import { create } from "zustand";

/**
 * Decoded JWT payload shape — mirrors the Django CustomTokenObtainPairSerializer claims.
 */
export interface UserPayload {
  user_id: string;
  email: string;
  role: "SUPER_ADMIN" | "OWNER" | "MANAGER" | "CASHIER" | "STOCK_CLERK";
  permissions: string[];
  tenant_id: string | null;
  session_version: number;
}

interface AuthState {
  user: UserPayload | null;
  setUser: (user: UserPayload) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
