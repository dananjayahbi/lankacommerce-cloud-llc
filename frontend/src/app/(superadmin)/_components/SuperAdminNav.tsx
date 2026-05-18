"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  HeartPulse,
} from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/superadmin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Tenants",
    href: "/superadmin/tenants",
    icon: Building2,
    exact: false,
  },
  {
    label: "System Health",
    href: "/superadmin/health",
    icon: HeartPulse,
    exact: false,
  },
];

export default function SuperAdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-l-4 border-[#F97316] bg-white/10 pl-2 text-white font-semibold"
                : "border-l-4 border-transparent text-white/80 hover:text-[#F97316] hover:bg-white/5",
            ].join(" ")}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
