"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/store/inventory", label: "Products", exact: true },
  { href: "/store/inventory/categories", label: "Categories" },
  { href: "/store/inventory/brands", label: "Brands" },
  { href: "/store/inventory/tax", label: "Tax Rules" },
];

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Sub-navigation */}
      <div className="border-b border-border bg-white px-6">
        <nav className="-mb-px flex gap-0">
          {TABS.map((tab) => {
            const active = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "border-[var(--color-navy)] text-[var(--color-navy)]"
                    : "border-transparent text-[var(--color-slate)] hover:border-[var(--color-navy)]/40 hover:text-[var(--color-navy)]",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex-1">{children}</div>
    </div>
  );
}
