/**
 * StorefrontHeader Block
 *
 * Global navigation bar. Renders:
 *   - (Optional) AnnouncementBar nested blocks
 *   - Logo (image or tenant name text)
 *   - Navigation links from the resolved menu
 *   - Cart / account / search icon buttons
 *
 * Mobile (< 768px): collapses nav links behind a hamburger toggle.
 * The drawer is fully accessible: focus-trapped, closes on Escape, has
 * role="dialog" and aria-modal="true".
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, ShoppingCart, User, Search } from "lucide-react";
import { useCartStore } from "@/lib/webstore/cartStore";
import type { BlockComponentProps, MenuItem } from "@/lib/webstore/themeRenderer";
import { AnnouncementBar } from "@/components/webstore/blocks/AnnouncementBar";

// ---------------------------------------------------------------------------
// Helper — get all focusable elements inside a container
// ---------------------------------------------------------------------------
function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

// ---------------------------------------------------------------------------
// Mobile Drawer
// ---------------------------------------------------------------------------

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
}

function MobileDrawer({ isOpen, onClose, menuItems }: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Escape key closes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !drawerRef.current) return;
    const focusable = getFocusable(drawerRef.current);
    focusable[0]?.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !drawerRef.current) return;
      const items = getFocusable(drawerRef.current);
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [isOpen]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[var(--ws-color-background)] shadow-xl"
      >
        <div className="flex items-center justify-between border-b px-4 py-4">
          <span
            className="font-semibold"
            style={{ color: "var(--ws-color-text)", fontFamily: "var(--ws-font-heading)" }}
          >
            Menu
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)]"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4">
          <ul className="space-y-1" role="list">
            {menuItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.url}
                  target={item.target}
                  rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
                  onClick={onClose}
                  className="block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)]"
                  style={{ color: "var(--ws-color-text)" }}
                >
                  {item.title}
                </Link>
                {item.children.length > 0 && (
                  <ul className="ml-4 mt-1 space-y-1 border-l pl-3">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={child.url}
                          target={child.target}
                          rel={child.target === "_blank" ? "noopener noreferrer" : undefined}
                          onClick={onClose}
                          className="block rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)]"
                          style={{ color: "var(--ws-color-text)", opacity: 0.8 }}
                        >
                          {child.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// StorefrontHeader
// ---------------------------------------------------------------------------

export function StorefrontHeader({
  settings,
  blocks,
  blockOrder,
  isPreview,
  tenantData,
}: BlockComponentProps) {
  const {
    logo_width,
    menu_handle,
    show_search_icon,
    show_cart_icon,
    show_account_icon,
    sticky,
  } = settings;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const openCart = useCartStore((s) => s.openCart);

  // Resolve menu from tenantData
  const menuData =
    tenantData.menus[(menu_handle as string) ?? "main-menu"];
  const menuItems: MenuItem[] = menuData?.items ?? [];

  // Check for announcement nested blocks
  const announcementBlocks = blockOrder.filter((id) => blocks[id]?.type === "announcement");

  return (
    <header
      className={`z-30 w-full bg-[var(--ws-color-background)] shadow-sm${sticky ? " sticky top-0" : ""}`}
    >
      {/* Announcement sub-bar — rendered if announcement nested blocks exist */}
      {announcementBlocks.length > 0 && (
        <AnnouncementBar
          settings={{
            enable_auto_rotate: true,
            rotation_interval: 8,
            show_close_button: true,
          }}
          blocks={blocks}
          blockOrder={announcementBlocks}
          isPreview={isPreview}
          tenantData={tenantData}
          blockType="announcement_bar"
        />
      )}

      {/* Main header row */}
      <div className="mx-auto flex h-16 max-w-[var(--ws-max-width,1280px)] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          className="mr-3 rounded p-1.5 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)] md:hidden"
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          onClick={openDrawer}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Logo */}
        <Link
          href="/"
          className="flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)]"
          aria-label={`${tenantData.tenant.name} — home`}
        >
          {tenantData.tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenantData.tenant.logo_url}
              alt={tenantData.tenant.name}
              width={Number(logo_width ?? 120)}
              height={48}
              style={{ width: `${logo_width ?? 120}px`, height: "auto", objectFit: "contain" }}
            />
          ) : (
            <span
              className="text-xl font-bold"
              style={{
                color: "var(--ws-color-primary)",
                fontFamily: "var(--ws-font-heading)",
              }}
            >
              {tenantData.tenant.name}
            </span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden flex-1 items-center justify-center md:flex" aria-label="Main navigation">
          <ul className="flex items-center gap-1" role="list">
            {menuItems.map((item) => (
              <li key={item.id} className="relative group">
                <Link
                  href={item.url}
                  target={item.target}
                  rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
                  className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-[var(--ws-color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)]"
                  style={{ color: "var(--ws-color-text)" }}
                >
                  {item.title}
                </Link>
                {item.children.length > 0 && (
                  <ul className="absolute left-0 top-full z-50 hidden min-w-[180px] rounded-md border bg-[var(--ws-color-background)] shadow-lg group-hover:block group-focus-within:block">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={child.url}
                          target={child.target}
                          rel={child.target === "_blank" ? "noopener noreferrer" : undefined}
                          className="block px-4 py-2 text-sm transition-colors hover:bg-gray-50 hover:text-[var(--ws-color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ws-color-primary)]"
                          style={{ color: "var(--ws-color-text)" }}
                        >
                          {child.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Icon bar (right) */}
        <div className="flex items-center gap-1">
          {show_search_icon && (
            <button
              type="button"
              aria-label="Search"
              className="rounded p-2 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)]"
              style={{ color: "var(--ws-color-text)" }}
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
          {show_account_icon && (
            <Link
              href="/account"
              aria-label="My account"
              className="rounded p-2 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)]"
              style={{ color: "var(--ws-color-text)" }}
            >
              <User className="h-5 w-5" aria-hidden="true" />
            </Link>
          )}
          {show_cart_icon && (
            <button
              type="button"
              aria-label={`Cart — ${itemCount} item${itemCount !== 1 ? "s" : ""}`}
              className="relative rounded p-2 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)]"
              style={{ color: "var(--ws-color-text)" }}
              onClick={isPreview ? undefined : openCart}
              title={isPreview ? "Not available in preview" : undefined}
            >
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              {itemCount > 0 && (
                <span
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: "var(--ws-color-primary)" }}
                  aria-hidden="true"
                >
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        menuItems={menuItems}
      />
    </header>
  );
}
