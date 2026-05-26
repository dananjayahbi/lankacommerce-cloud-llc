/**
 * HeroBanner Block
 *
 * Full-width visually dominant section. Supports:
 *   - Background image (CSS background-image) with darkening overlay
 *   - Four height presets: small (400px), medium (560px), large (720px), full (100vh)
 *   - Content alignment: left | center | right
 *   - Two CTA buttons (primary + secondary)
 *   - Nested block sub-elements for heading / subheading / button (override settings)
 *
 * Mobile: reduced text sizes, buttons stack vertically.
 * CSS vars drive primary/secondary brand colours throughout.
 */

import Link from "next/link";
import type { BlockComponentProps } from "@/lib/webstore/themeRenderer";

// ---------------------------------------------------------------------------
// Height map
// ---------------------------------------------------------------------------

const HEIGHT_MAP: Record<string, string> = {
  small: "min-h-[400px]",
  medium: "min-h-[560px]",
  large: "min-h-[720px]",
  full: "min-h-screen",
};

// ---------------------------------------------------------------------------
// Alignment map (for container flex + text)
// ---------------------------------------------------------------------------

const ALIGN_MAP: Record<string, { container: string; text: string }> = {
  left: { container: "items-start", text: "text-left" },
  center: { container: "items-center", text: "text-center" },
  right: { container: "items-end", text: "text-right" },
};

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

interface BannerButtonProps {
  label: string;
  href: string;
  style: "primary" | "secondary" | "outline";
  isPreview: boolean;
}

function BannerButton({ label, href, style, isPreview }: BannerButtonProps) {
  const baseClass =
    "inline-block rounded-md px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2";

  const styleMap: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: "var(--ws-color-primary)",
      color: "#FFFFFF",
    },
    secondary: {
      backgroundColor: "var(--ws-color-secondary)",
      color: "#FFFFFF",
    },
    outline: {
      backgroundColor: "transparent",
      color: "#FFFFFF",
      border: "2px solid #FFFFFF",
    },
  };

  if (isPreview) {
    return (
      <span
        className={`${baseClass} cursor-not-allowed opacity-60`}
        style={styleMap[style] ?? styleMap.primary}
        title="Not available in preview"
        aria-disabled="true"
      >
        {label}
      </span>
    );
  }

  return (
    <Link href={href} className={baseClass} style={styleMap[style] ?? styleMap.primary}>
      {label}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// HeroBanner
// ---------------------------------------------------------------------------

export function HeroBanner({
  settings,
  blocks,
  blockOrder,
  isPreview,
}: BlockComponentProps) {
  const {
    background_image,
    background_color,
    overlay_opacity,
    overlay_color,
    height,
    content_alignment,
    text_color,
    heading,
    subheading,
    button_label,
    button_link,
    button_style,
    button2_label,
    button2_link,
    button2_style,
  } = settings;

  // Allow nested block overrides (heading/subheading/button blocks)
  let resolvedHeading = (heading as string) ?? "";
  let resolvedSubheading = (subheading as string) ?? "";
  let resolvedButtonLabel = (button_label as string) ?? "";
  let resolvedButtonLink = (button_link as string) ?? "";
  let resolvedButton2Label = (button2_label as string) ?? "";
  let resolvedButton2Link = (button2_link as string) ?? "";

  for (const id of blockOrder) {
    const blk = blocks[id];
    if (!blk) continue;
    if (blk.type === "heading" && blk.settings.text) resolvedHeading = blk.settings.text as string;
    if (blk.type === "subheading" && blk.settings.text) resolvedSubheading = blk.settings.text as string;
    if (blk.type === "button") {
      if (!resolvedButtonLabel) {
        resolvedButtonLabel = (blk.settings.label as string) ?? "";
        resolvedButtonLink = (blk.settings.link as string) ?? "";
      } else {
        resolvedButton2Label = (blk.settings.label as string) ?? "";
        resolvedButton2Link = (blk.settings.link as string) ?? "";
      }
    }
  }

  const heightClass = HEIGHT_MAP[(height as string) ?? "medium"] ?? "min-h-[560px]";
  const align = ALIGN_MAP[(content_alignment as string) ?? "center"] ?? { container: "items-center", text: "text-center" };
  const overlayAlpha = Math.min(90, Math.max(0, (overlay_opacity as number) ?? 30)) / 100;

  return (
    <section
      className={`relative flex w-full flex-col justify-center overflow-hidden ${heightClass}`}
      style={{
        backgroundColor: (background_color as string) ?? "var(--ws-color-secondary)",
      }}
    >
      {/* Background image */}
      {background_image && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${background_image as string}')` }}
          aria-hidden="true"
        />
      )}

      {/* Overlay */}
      {overlayAlpha > 0 && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: (overlay_color as string) ?? "#000000",
            opacity: overlayAlpha,
          }}
          aria-hidden="true"
        />
      )}

      {/* Content */}
      <div
        className={`relative z-10 mx-auto flex w-full max-w-[var(--ws-max-width,1280px)] flex-col gap-5 px-4 py-12 sm:px-6 lg:px-8 ${align.container} ${align.text}`}
      >
        {resolvedHeading && (
          <h1
            className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl"
            style={{
              color: (text_color as string) ?? "#FFFFFF",
              fontFamily: "var(--ws-font-heading)",
            }}
          >
            {resolvedHeading}
          </h1>
        )}

        {resolvedSubheading && (
          <p
            className="max-w-prose text-base sm:text-lg"
            style={{ color: (text_color as string) ?? "#FFFFFF", opacity: 0.9 }}
          >
            {resolvedSubheading}
          </p>
        )}

        {/* Button row */}
        {(resolvedButtonLabel || resolvedButton2Label) && (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {resolvedButtonLabel && resolvedButtonLink && (
              <BannerButton
                label={resolvedButtonLabel}
                href={resolvedButtonLink}
                style={(button_style as "primary" | "secondary" | "outline") ?? "primary"}
                isPreview={isPreview}
              />
            )}
            {resolvedButton2Label && resolvedButton2Link && (
              <BannerButton
                label={resolvedButton2Label}
                href={resolvedButton2Link}
                style={(button2_style as "primary" | "secondary" | "outline") ?? "outline"}
                isPreview={isPreview}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
