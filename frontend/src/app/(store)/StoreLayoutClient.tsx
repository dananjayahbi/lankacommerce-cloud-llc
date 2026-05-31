"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { jwtDecode } from "jwt-decode";

import { ScreenLockOverlay } from "@/components/auth/ScreenLockOverlay";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import { useAuthStore } from "@/stores/authStore";
import type { UserPayload } from "@/stores/authStore";
import { StoreSidebar } from "@/app/(store)/components/StoreSidebar";

interface StoreLayoutClientProps {
  children: React.ReactNode;
  /** Access token passed from the Server Component layout (read from cookie via headers) */
  accessToken?: string | undefined;
}

export function StoreLayoutClient({
  children,
  accessToken,
}: StoreLayoutClientProps) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // Hydrate synchronously on first render when the store is empty.
  // This avoids a flash where the sidebar shows fewer items or pages show
  // "no permission" before the useEffect fires.
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

  // Keep in sync if accessToken prop changes (e.g. after token refresh)
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

  const pathname = usePathname();
  // POS terminal runs full-screen — no sidebar, no screen-lock overlay
  const isPosTerminal = pathname?.startsWith("/store/pos") ?? false;

  // Enable inactivity timer when a user is authenticated
  useInactivityTimer({
    timeoutMs: 10 * 60 * 1000, // 10 minutes
    enabled: !!user,
  });

  if (isPosTerminal) {
    return <div className="flex-1">{children}</div>;
  }

  return (
    <>
      <StoreSidebar />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
      <ScreenLockOverlay />
    </>
  );
}
