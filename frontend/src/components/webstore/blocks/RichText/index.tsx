/**
 * RichText Block
 *
 * Centered column of formatted text. Used for brand statements, mission
 * descriptions, or policy text. Content is rendered as raw HTML (richtext).
 */

import type { BlockComponentProps } from "@/lib/webstore/themeRenderer";

const ALIGN_CLASS: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function RichText({ settings }: BlockComponentProps) {
  const {
    content,
    text_alignment,
    narrow_content,
    background_color,
    padding_top,
    padding_bottom,
  } = settings;

  const textAlignClass = ALIGN_CLASS[(text_alignment as string) ?? "center"] ?? "text-center";

  return (
    <section
      className="w-full"
      style={{
        backgroundColor: (background_color as string) ?? "var(--ws-color-background)",
        paddingTop: `${padding_top ?? 40}px`,
        paddingBottom: `${padding_bottom ?? 40}px`,
      }}
    >
      <div
        className={`mx-auto px-4 sm:px-6 lg:px-8 ${narrow_content ? "max-w-2xl" : "max-w-[var(--ws-max-width,1280px)]"} ${textAlignClass}`}
      >
        <div
          className="prose max-w-none"
          style={{ color: "var(--ws-color-text)" }}
          dangerouslySetInnerHTML={{ __html: (content as string) ?? "" }}
        />
      </div>
    </section>
  );
}
