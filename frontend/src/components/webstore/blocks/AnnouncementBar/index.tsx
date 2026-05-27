/**
 * AnnouncementBar Block
 *
 * A thin promotional strip rendered above the StorefrontHeader.
 * Supports multiple announcement items with auto-rotation and a dismiss button
 * whose state is persisted in localStorage.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { BlockComponentProps } from "@/lib/webstore/themeRenderer";

const DISMISS_KEY = "ws-announcement-dismissed";

function getDismissedMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function AnnouncementBar({
  settings,
  blocks,
  blockOrder,
}: BlockComponentProps) {
  const {
    text,
    link,
    background_color,
    text_color,
    enable_auto_rotate,
    rotation_interval,
    show_close_button,
  } = settings;

  // Build the list of announcements from nested blocks, falling back to the
  // section-level `text` / `link` settings if no nested blocks exist.
  const announcements: Array<{ text: string; link: string; id: string }> = [];
  if (blockOrder.length > 0) {
    for (const id of blockOrder) {
      const blk = blocks[id];
      if (blk?.type === "announcement") {
        announcements.push({
          id,
          text: (blk.settings.text as string) ?? "",
          link: (blk.settings.link as string) ?? "",
        });
      }
    }
  }
  if (announcements.length === 0 && text) {
    announcements.push({ id: "__default__", text: text as string, link: (link as string) ?? "" });
  }

  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Read persisted dismiss state (keyed by the first announcement text so
  // changing the announcement content re-shows the bar).
  const dismissKey = `${DISMISS_KEY}-${announcements[0]?.text ?? "default"}`;

  useEffect(() => {
    const map = getDismissedMap();
    if (map[dismissKey]) setDismissed(true);
  }, [dismissKey]);

  // Auto-rotate — disabled when user prefers reduced motion
  useEffect(() => {
    if (!enable_auto_rotate || announcements.length <= 1) return;
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    const ms = ((rotation_interval as number) ?? 10) * 1000;
    intervalRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % announcements.length);
    }, ms);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enable_auto_rotate, rotation_interval, announcements.length]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      const map = getDismissedMap();
      map[dismissKey] = true;
      localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
    } catch {
      // localStorage may be unavailable (private browsing, storage full).
    }
  }, [dismissKey]);

  if (dismissed || announcements.length === 0) return null;

  const current = announcements[activeIndex] ?? announcements[0];
  if (!current) return null;
  const Tag = current.link ? "a" : "div";
  const linkProps = current.link
    ? { href: current.link, rel: "noopener noreferrer" }
    : {};

  return (
    <div
      className="relative flex items-center justify-center px-10 py-2 text-sm font-medium"
      style={{
        backgroundColor: (background_color as string) ?? "var(--ws-color-secondary)",
        color: (text_color as string) ?? "#FFFFFF",
      }}
      aria-live="polite"
    >
      <Tag
        className="text-center transition-opacity duration-300"
        dangerouslySetInnerHTML={{ __html: current.text }}
        {...(linkProps as object)}
      />

      {show_close_button && (
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Close announcement"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
