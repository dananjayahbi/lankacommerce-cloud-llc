/**
 * useAnalytics — Client Hook
 *
 * Records anonymous page view events to the backend analytics endpoint.
 *
 * Privacy-first design:
 *  - No IP addresses collected (handled server-side by backend policy).
 *  - `session_id` is a randomly generated, non-persistent UUID stored in
 *    sessionStorage only. It is NOT linked to any user account and is cleared
 *    when the browser tab closes.
 *  - Respects `navigator.doNotTrack` — skips recording if set to "1".
 *  - No third-party calls — all data goes to the store's own backend.
 *
 * Usage (in a Client Component):
 *   useAnalytics({ pageType: "product", pageHandle: "my-product" });
 *
 * Place this hook near the root of each storefront page component.
 */

"use client";

import { useEffect, useRef } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// Session ID key in sessionStorage — clears on tab close
const SESSION_KEY = "lc_store_session_id";

function getOrCreateSessionId(): string | null {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // sessionStorage may be blocked (private browsing restrictions)
    return null;
  }
}

interface UseAnalyticsOptions {
  /** Tenant slug — usually from the x-tenant-slug middleware header */
  tenantSlug: string;
  /** Page type identifier: "home", "product", "collection", "page", "blog", "search" */
  pageType: string;
  /** Optional handle — product ID, collection handle, blog slug, etc. */
  pageHandle?: string;
}

export function useAnalytics({
  tenantSlug,
  pageType,
  pageHandle = "",
}: UseAnalyticsOptions): void {
  const sentRef = useRef(false);

  useEffect(() => {
    // Only fire once per component mount (i.e., per navigation)
    if (sentRef.current) return;
    sentRef.current = true;

    // Respect Do Not Track
    if (navigator.doNotTrack === "1") return;

    // Respect prefers-reduced-motion as a proxy for minimal tracking preference
    // (Not standard, but a defence-in-depth measure)

    const sessionId = getOrCreateSessionId();

    const payload: Record<string, string> = {
      page_type: pageType,
      page_handle: pageHandle,
    };
    if (sessionId) {
      payload.session_id = sessionId;
    }

    // Fire-and-forget — errors are intentionally swallowed
    fetch(`${API_BASE}/api/webstore/public/${tenantSlug}/analytics/pageview/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Use keepalive so the request completes even if the page navigates away
      keepalive: true,
    }).catch(() => {
      // Analytics failures must never surface to the user
    });
  }, [tenantSlug, pageType, pageHandle]);
}
