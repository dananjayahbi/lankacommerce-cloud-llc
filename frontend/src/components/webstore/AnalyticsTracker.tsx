/**
 * AnalyticsTracker — Client Component
 *
 * Bridges the server-rendered webstore layout with the client-side
 * useAnalytics hook. Injected at layout level so every page navigation
 * automatically fires a pageview event without any per-page boilerplate.
 *
 * Derives `pageType` and `pageHandle` from the current pathname so
 * analytics categorisation is automatic.
 */

"use client";

import { usePathname } from "next/navigation";
import { useAnalytics } from "@/hooks/useAnalytics";

interface AnalyticsTrackerProps {
  tenantSlug: string;
}

/**
 * Infer page type + handle from a storefront pathname.
 * e.g. "/products/my-sneaker" → { pageType: "product", pageHandle: "my-sneaker" }
 */
function parsePath(pathname: string): { pageType: string; pageHandle: string } {
  const segments = pathname.replace(/^\//, "").split("/");
  const first = segments[0] ?? "";

  if (first === "products" && segments[1]) {
    return { pageType: "product", pageHandle: segments[1] };
  }
  if (first === "collections" && segments[1]) {
    return { pageType: "collection", pageHandle: segments[1] };
  }
  if (first === "blog" && segments[1]) {
    return { pageType: "blog", pageHandle: segments[1] };
  }
  if (first === "blog") {
    return { pageType: "blog", pageHandle: "" };
  }
  if (first === "search") {
    return { pageType: "search", pageHandle: "" };
  }
  if (first === "pages" && segments[1]) {
    return { pageType: "page", pageHandle: segments[1] };
  }
  if (first === "" || first === "home") {
    return { pageType: "home", pageHandle: "" };
  }
  return { pageType: "page", pageHandle: pathname };
}

export function AnalyticsTracker({ tenantSlug }: AnalyticsTrackerProps) {
  const pathname = usePathname();
  const { pageType, pageHandle } = parsePath(pathname);

  useAnalytics({ tenantSlug, pageType, pageHandle });

  return null;
}
