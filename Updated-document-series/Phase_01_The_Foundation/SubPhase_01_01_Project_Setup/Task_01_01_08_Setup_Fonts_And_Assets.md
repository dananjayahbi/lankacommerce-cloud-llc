# Task 01.01.08 — Setup Fonts and Assets

## Metadata

| Field | Value |
|---|---|
| Sub-Phase | SubPhase 01.01 — Project Setup & Configuration |
| Phase | Phase 01 — The Foundation |
| Estimated Complexity | Low |
| Dependencies | Task_01_01_03 |

## Objective

Download and self-host the two LankaCommerce typography fonts, configure them via the `next/font/local` module with CSS variable exports, and apply the font variables to the root layout's `html` element and the Tailwind font family configuration. LankaCommerce uses two fonts only — Inter for all body text and UI elements at all sizes, and JetBrains Mono for codes and identifiers. There is no separate display or heading font.

## Instructions

All file paths and commands in this task are relative to the `frontend/` directory unless stated otherwise.

### Step 1: Download Font Files

Navigate to `fonts.google.com` and download the following font families and weights:

For **Inter**, download the Regular (400), SemiBold (600), and Bold (700) weights. Inter is the sole UI and body font for LankaCommerce, used at all sizes from small labels to large headings. No Playfair Display or other display font is used — Inter at 700 weight replaces all heading typography.

For **JetBrains Mono**, download the Regular (400) weight. JetBrains Mono is used exclusively for machine-readable identifiers such as SKUs, barcodes, order numbers, and transaction IDs.

For each font, obtain files in the WOFF2 format at minimum — WOFF2 provides superior compression compared to WOFF or TTF, resulting in faster font loading. A convenient method for obtaining pre-converted WOFF2 files is to use the google-webfonts-helper web tool (`gwfh.mranftl.com/fonts`), which allows you to select a font family, choose specific weights and subsets (select `"latin"` for LankaCommerce), and download a ready-to-use package of WOFF2 files.

### Step 2: Place Font Files in public/fonts/

Move all downloaded font files into the `public/fonts/` directory created in Task 01.01.06. Remove the `.gitkeep` placeholder from `public/fonts/` since the directory now has real content. Rename each file using a consistent lowercase kebab-case convention:

- `inter-400.woff2`
- `inter-600.woff2`
- `inter-700.woff2`
- `jetbrains-mono-400.woff2`

Four font files in total. Consistent naming makes font references in code easy to read and audit. If WOFF fallback files were also downloaded for older browser compatibility, name them with the same convention but with a `.woff` extension.

### Step 3: Create the Fonts Configuration File

Create a new file at `src/lib/fonts.ts`. This file centralises all `next/font` configuration for LankaCommerce and is the single source of truth for font loading. Import the `localFont` function from the `"next/font/local"` module — this is the correct `next/font` sub-module for self-hosted font files. Do not use `"next/font/google"`, which fetches fonts from Google's infrastructure at build time, because LankaCommerce self-hosts its fonts for full offline capability and to remove build-time external network dependencies.

In the file, create **two** font configuration objects by calling `localFont` twice. There is no `displayFont` — unlike VelvetPOS which used Playfair Display for headings, LankaCommerce uses Inter at all sizes.

For the **body font** representing Inter, configure the `src` array to include three entries, one for each weight file:

```ts
import localFont from 'next/font/local';

export const bodyFont = localFont({
  src: [
    { path: '../../public/fonts/inter-400.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/inter-600.woff2', weight: '600', style: 'normal' },
    { path: '../../public/fonts/inter-700.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-body',
});

export const monoFont = localFont({
  src: [
    { path: '../../public/fonts/jetbrains-mono-400.woff2', weight: '400', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-mono',
});
```

Export the two configurations as named exports: `bodyFont` and `monoFont`. There is no `displayFont` export. Any code or documentation referencing a `displayFont` is a carryover from the old VelvetPOS architecture and should be updated.

### Step 4: Apply Font Variables to the Root Layout

Open `src/app/layout.tsx`. Import `bodyFont` and `monoFont` from `"@/lib/fonts"`. The `next/font` module returns configuration objects with a `"variable"` property that contains the CSS class name responsible for injecting the corresponding CSS custom property (`--font-body`, `--font-mono`) into the document tree. Apply both variable class names to the `html` element's `className` attribute by combining them as a space-separated string:

```tsx
import { bodyFont, monoFont } from '@/lib/fonts';

// Inside the layout component's return:
<html lang="en" className={`${bodyFont.variable} ${monoFont.variable} antialiased`}>
```

This step makes the font CSS variables available globally to every component in the application. The `antialiased` Tailwind utility class ensures smooth font rendering on all platforms.

### Step 5: Confirm Tailwind Font Family References

Open `tailwind.config.ts` and verify that the `fontFamily` extensions added in Task 01.01.03 reference exactly the CSS variable names `"--font-body"` and `"--font-mono"`. These names must match precisely the `variable` option values set in the `next/font` configuration in Step 3. There should be exactly two font family entries — `body` and `mono`. If there is a third entry (for example `display` or `heading`) from a previous configuration, remove it. With only two fonts, the Tailwind `fontFamily` extension should contain only:

```ts
fontFamily: {
  body: ['var(--font-body)', 'system-ui', 'sans-serif'],
  mono: ['var(--font-mono)', 'Menlo', 'monospace'],
},
```

### Step 6: Handle the Icons Directory

Navigate to `public/icons/` and confirm the `.gitkeep` placeholder is present. This directory will hold SVG icon files and favicon image variants in later phases but remains empty at this task's stage. Do not remove the `.gitkeep` yet — it will be removed when the first icon file is added.

### Step 7: Verify Font Loading in the Browser

Run `pnpm dev` and open `http://localhost:3000` in Chrome. Open Chrome DevTools and navigate to the Network tab. Filter requests by the `"Font"` category. Reload the page and observe the font requests. Confirm that all font requests are served from the local path `/fonts/` (for example `/fonts/inter-400.woff2`) and that none are fetched from an external CDN or from `fonts.googleapis.com`. Check the status code for each font request — expect `200` for all four files. Confirm that no "Failed to load resource" errors appear in the Console tab. Confirm that exactly four WOFF2 files are loaded (three Inter weights and one JetBrains Mono weight) and no other font files are requested.

## Expected Output

- `public/fonts/` contains exactly four WOFF2 files: `inter-400.woff2`, `inter-600.woff2`, `inter-700.woff2`, `jetbrains-mono-400.woff2`
- `src/lib/fonts.ts` exports exactly two `next/font/local` configurations: `bodyFont` and `monoFont`, each with correct `variable` option names
- There is no `displayFont` export anywhere in the project
- `src/app/layout.tsx` applies both font variable `className`s to the `html` element
- `tailwind.config.ts` contains exactly two `fontFamily` entries (`body` and `mono`), not three
- Chrome DevTools confirms fonts are served from the local `/fonts/` path with HTTP 200

## Validation

- [ ] `public/fonts/` contains exactly four WOFF2 font files with the canonical naming convention
- [ ] `src/lib/fonts.ts` exports `bodyFont` and `monoFont` with correct variable names `--font-body` and `--font-mono`
- [ ] There is no `displayFont` export or reference anywhere in the project
- [ ] The `html` element in the root layout carries both font variable CSS classes
- [ ] Chrome DevTools Network panel shows fonts loaded from `/fonts/` locally with HTTP 200
- [ ] `pnpm tsc --noEmit` passes after `fonts.ts` is created

## Notes

Next.js's `next/font` module automatically generates the `@font-face` CSS declarations, handles preload link tags, and injects the CSS class that activates the custom property. You should not write manual `@font-face` rules in `globals.css` — doing so would create duplicate declarations that conflict with `next/font`'s generated styles. Inter is used at all heading sizes in LankaCommerce — use `font-body` with `font-bold` (700 weight) for all headings, `font-semibold` (600 weight) for sub-headings and labels, and no weight modifier for body text (400 weight). This two-font system is simpler to maintain and produces a clean, modern interface consistent with the reference design.
