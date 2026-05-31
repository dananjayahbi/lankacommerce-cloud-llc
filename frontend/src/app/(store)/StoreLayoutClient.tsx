"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { jwtDecode } from "jwt-decode";

import { ScreenLockOverlay } from "@/components/auth/ScreenLockOverlay";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import { useAuthStore } from "@/stores/authStore";
import type { UserPayload } from "@/stores/authStore";
import { StoreSidebar } from "@/app/(store)/components/StoreSidebar";
import { Search, Bell } from "lucide-react";

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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans min-h-screen">
      {/* Sleek Dark Sidebar Navigation */}
      <StoreSidebar />

      {/* Main Content Workspace Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Unified Premium Horizontal Header */}
        <header className="h-16 shrink-0 bg-white border-b border-slate-200/80 flex items-center justify-between px-6 z-10 shadow-sm shadow-slate-100/40 select-none">
          {/* Left branding OS context */}
          <div className="flex items-center gap-4">
            <button className="text-slate-500 hover:text-slate-800 transition-colors lg:hidden p-1.5 rounded-xl hover:bg-slate-50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[10px] font-extrabold text-[#F97316] uppercase tracking-widest font-mono leading-none">
                Retail Core Engine
              </span>
              <span className="text-[11px] text-slate-400 font-medium mt-1 leading-none">
                LankaCommerce Retail OS v1.2
              </span>
            </div>
          </div>

          {/* Right quick controls, search and profile widget */}
          <div className="flex items-center gap-5">
            {/* Search Pill */}
            <div className="hidden md:flex relative max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search POS or Inventory..."
                className="rounded-xl bg-slate-50 border border-slate-200 pl-8 pr-4 py-1.5 text-xs text-slate-700 w-52 focus:bg-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all duration-300 outline-none"
              />
            </div>

            {/* Notification alert Bell */}
            <div className="relative cursor-pointer text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-xl hover:bg-slate-50 group">
              <span className="block group-hover:scale-105 transition-transform text-slate-400 group-hover:text-slate-600">
                <Bell size={16} />
              </span>
              <span className="absolute top-1 right-1 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                3
              </span>
            </div>

            {/* User info credential widget */}
            <div className="flex items-center gap-3 border-l border-slate-200/80 pl-5">
              <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-orange-500/10 border border-orange-400/30 select-none">
                {user?.email ? user.email.substring(0, 2).toUpperCase() : "LC"}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[140px] leading-tight select-none">
                  {user?.email ?? "Store Associate"}
                </span>
                <span className="text-[9px] font-extrabold text-[#F97316] uppercase tracking-wider leading-none mt-1 select-none">
                  {user?.role ?? "Cashier"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content viewport pane */}
        <div className="flex-1 overflow-auto bg-slate-50">
          {children}
        </div>
      </div>

      <ScreenLockOverlay />
    </div>
  );
}
