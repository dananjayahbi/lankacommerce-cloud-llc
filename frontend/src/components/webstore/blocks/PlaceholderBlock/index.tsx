/**
 * Placeholder Block
 *
 * Rendered for block types that are registered in the registry but do not yet
 * have a full implementation (Phase 7+). Shows a minimal grey box with the
 * block type name so the renderer never crashes.
 */

import type { BlockComponentProps } from "@/lib/webstore/themeRenderer";

export function PlaceholderBlock({ blockType }: BlockComponentProps) {
  return (
    <div
      className="flex min-h-[80px] items-center justify-center border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-400"
      aria-hidden="true"
    >
      <span className="font-mono">[{blockType ?? "unknown"}]</span>
      <span className="ml-2">— coming soon</span>
    </div>
  );
}
