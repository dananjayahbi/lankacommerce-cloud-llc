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
}

const NAV: NavItem[] = [
  { href: "/store/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/store/pos", label: "Point of Sale", icon: ShoppingCart },
  { href: "/store/inventory", label: "Inventory", icon: Package },
  { href: "/store/customers", label: "Customers", icon: Users },
  { href: "/store/suppliers", label: "Suppliers", icon: Truck, roles: ["OWNER", "MANAGER"] },
  { href: "/store/staff", label: "Staff", icon: UserCircle, roles: ["OWNER", "MANAGER"] },
  { href: "/store/promotions", label: "Promotions", icon: Tag, roles: ["OWNER", "MANAGER"] },
  { href: "/store/reports/profit-loss", label: "Reports", icon: BarChart2, roles: ["OWNER", "MANAGER"] },
  { href: "/store/billing", label: "Billing", icon: Wallet, roles: ["OWNER"] },
  { href: "/store/settings", label: "Settings", icon: Settings, roles: ["OWNER", "MANAGER"] },
];

export function StoreSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const clearUser = useAuthStore((s) => s.clearUser);

  const role = user?.role ?? "";

  const visibleNav = NAV.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  function handleLogout() {
    // Clear httpOnly cookies via API route, then redirect
    fetch("/api/auth/sign-out", { method: "POST" }).finally(() => {
      clearUser();
      window.location.href = "/login";
    });
  }

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-slate-200 bg-white min-h-screen">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#F97316" }}
          >
            <span className="text-white font-bold text-sm font-mono">LC</span>
          </div>
          <span className="font-semibold text-slate-800 text-sm">
            LankaCommerce
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/store/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-orange-50 text-[#F97316] font-medium border-l-4 border-[#F97316] pl-2"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-slate-100 pt-3">
        {user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-medium text-slate-700 truncate">
              {user.email}
            </p>
            <p className="text-xs text-slate-400">{role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
