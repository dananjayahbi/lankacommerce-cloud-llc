"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart2,
  Settings,
  LogOut,
  UserCircle,
  Tag,
  Truck,
  Wallet,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
  permission?: string;
  newTab?: boolean;
}

const MAIN_NAV: NavItem[] = [
  { href: "/store/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/store/pos", label: "Point of Sale", icon: ShoppingCart, newTab: true },
  { href: "/store/inventory", label: "Inventory", icon: Package },
  { href: "/store/customers", label: "Customers", icon: Users },
  { href: "/store/suppliers", label: "Suppliers", icon: Truck, roles: ["OWNER", "MANAGER"] },
  { href: "/store/staff", label: "Staff", icon: UserCircle, roles: ["OWNER", "MANAGER"] },
  { href: "/store/promotions", label: "Promotions", icon: Tag, roles: ["OWNER", "MANAGER"] },
];

const BOTTOM_NAV: NavItem[] = [
  { href: "/store/reports/profit-loss", label: "Reports", icon: BarChart2, roles: ["OWNER", "MANAGER"] },
  { href: "/store/billing", label: "Billing", icon: Wallet, roles: ["OWNER"] },
  { href: "/store/settings", label: "Settings", icon: Settings, roles: ["OWNER", "MANAGER"] },
];

export function StoreSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const clearUser = useAuthStore((s) => s.clearUser);

  const role = user?.role ?? "";

  const visibleMain = MAIN_NAV.filter(
    (item) => !item.roles || item.roles.includes(role),
  );
  const visibleBottom = BOTTOM_NAV.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  function isActive(href: string) {
    if (href === "/store/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  function handleLogout() {
    fetch("/api/auth/sign-out", { method: "POST" }).finally(() => {
      clearUser();
      window.location.href = "/login";
    });
  }

  function renderNavItem(item: NavItem) {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        target={item.newTab ? "_blank" : undefined}
        rel={item.newTab ? "noopener noreferrer" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-300 ${
          active
            ? "bg-slate-800 text-orange-500 font-semibold border-l-4 border-orange-500 pl-2.5 shadow-sm shadow-black/10"
            : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-100"
        }`}
      >
        <Icon size={16} className={active ? "text-orange-500" : "text-slate-400 group-hover:text-slate-100"} />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-800/80 bg-[#0f172a] h-screen sticky top-0 z-20">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20"
            style={{ backgroundColor: "#F97316" }}
          >
            <span className="text-white font-bold text-sm font-mono select-none">LC</span>
          </div>
          <span className="font-bold text-white text-base tracking-tight font-sans select-none">
            LankaCommerce
          </span>
        </div>
      </div>

      {/* Nav Link list */}
      <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto custom-scrollbar">
        {/* Main navigation */}
        {visibleMain.map(renderNavItem)}

        {/* Bottom nav (reports, billing, settings) */}
        {visibleBottom.length > 0 && (
          <div className="space-y-1.5 mt-6">
            <div className="pt-2 pb-1 px-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Management
              </p>
            </div>
            {visibleBottom.map(renderNavItem)}
          </div>
        )}
      </nav>

      {/* Footer Profile Area */}
      <div className="px-4 pb-5 border-t border-slate-800/60 pt-4 bg-[#0b0f19]/30">
        {user && (
          <div className="px-3.5 py-2.5 mb-3 rounded-xl bg-slate-800/20 border border-slate-800/40">
            <p className="text-xs font-semibold text-slate-200 truncate select-none">
              {user.email}
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 select-none">
              {role}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-400 hover:bg-red-950/30 hover:text-red-400 border border-transparent hover:border-red-900/20 transition-all duration-300"
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
