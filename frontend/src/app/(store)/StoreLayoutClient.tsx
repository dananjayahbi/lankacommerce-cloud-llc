"use client";

import { useEffect } from "react";
import { jwtDecode } from "jwt-decode";

import { ScreenLockOverlay } from "@/components/auth/ScreenLockOverlay";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import { useAuthStore } from "@/stores/authStore";
import type { UserPayload } from "@/stores/authStore";

interface StoreLayoutClientProps {
  children: React.ReactNode;
  /** Access token passed from the Server Component layout (read from cookie via headers) */
  accessToken?: string;
}

export function StoreLayoutClient({
  children,
  accessToken,
}: StoreLayoutClientProps) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // Hydrate the auth store on initial mount if the user is not yet set
  // (e.g., after a page refresh where Zustand in-memory state is cleared)
  useEffect(() => {
    if (!user && accessToken) {
      try {
        const payload = jwtDecode<UserPayload>(accessToken);
        setUser(
          {
            user_id: payload.user_id,
            email: payload.email,
            role: payload.role as UserPayload["role"],
            permissions: payload.permissions ?? [],
            tenant_id: payload.tenant_id,
            session_version: payload.session_version,
          },
          accessToken,
        );
      } catch {
        // Token could not be decoded — middleware will handle redirection
      }
    }
  }, [user, accessToken, setUser]);

  // Enable inactivity timer when a user is authenticated
  useInactivityTimer({
    timeoutMs: 10 * 60 * 1000, // 10 minutes
    enabled: !!user,
  });

  return (
    <>
      {children}
      <ScreenLockOverlay />
    </>
  );
}
