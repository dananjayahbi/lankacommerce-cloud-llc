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
  /** Raw JWT access token — stored so client components can use it as a Bearer token in API calls. */
  accessToken: string | null;
  setUser: (user: UserPayload, accessToken?: string) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setUser: (user, accessToken) => set({ user, accessToken: accessToken ?? null }),
  clearUser: () => set({ user: null, accessToken: null }),
}));
