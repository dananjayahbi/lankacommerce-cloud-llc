/**
 * themeCssVars.ts — Server-safe utility
 *
 * Builds CSS custom properties from a ThemeConfig. Kept in a separate file
 * (no "use client") so server components (e.g. the webstore layout) can import
 * it directly without triggering the client boundary error.
 */

import type { ThemeConfig } from "./types";
import type React from "react";

export function buildThemeCssVars(themeConfig: ThemeConfig): React.CSSProperties {
  const { colors } = themeConfig.global_settings;
  const { heading_font, body_font } = themeConfig.global_settings.typography;

  return {
    "--ws-color-primary": colors.primary,
    "--ws-color-secondary": colors.secondary,
    "--ws-color-background": colors.background,
    "--ws-color-text": colors.text,
    "--ws-color-accent": colors.accent,
    "--ws-font-heading": `'${heading_font}', sans-serif`,
    "--ws-font-body": `'${body_font}', sans-serif`,
  } as React.CSSProperties;
}
