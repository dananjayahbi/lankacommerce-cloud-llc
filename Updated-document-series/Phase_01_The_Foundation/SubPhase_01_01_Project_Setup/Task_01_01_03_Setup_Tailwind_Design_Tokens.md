# Task 01.01.03 — Setup Tailwind Design Tokens

## Metadata

| Field | Value |
|---|---|
| Sub-Phase | SubPhase 01.01 — Project Setup & Configuration |
| Phase | Phase 01 — The Foundation |
| Estimated Complexity | Medium |
| Dependencies | Task_01_01_01 |

## Objective

Configure all twelve LankaCommerce design tokens — six brand and surface colours, six semantic colours, custom typography font families, and spacing extensions — in `tailwind.config.ts`, and declare the corresponding CSS custom properties in the global stylesheet so that every token is available both as a raw CSS variable and as a Tailwind utility class.

## Instructions

All commands and file paths in this task are relative to the `frontend/` directory unless stated otherwise.

### Step 1: Define CSS Custom Properties in the Global Stylesheet

Open `src/app/globals.css`. After the three Tailwind directives, add a CSS rule targeting the `:root` pseudo-class. Inside it, declare all twelve colour custom properties as hex values:

- `--color-navy` set to `#1B2B3A`
- `--color-orange` set to `#F97316`
- `--color-orange-dark` set to `#EA6C05`
- `--color-surface` set to `#FFFFFF`
- `--color-background` set to `#F1F5F9`
- `--color-border` set to `#E2E8F0`
- `--color-success` set to `#22C55E`
- `--color-warning` set to `#F59E0B`
- `--color-danger` set to `#EF4444`
- `--color-info` set to `#3B82F6`
- `--color-text-primary` set to `#0F172A`
- `--color-text-muted` set to `#64748B`

Also declare two font custom property placeholders that will be populated with actual values by `next/font` in Task 01.01.08: `--font-body` and `--font-mono`, each set to empty strings for now. These placeholders ensure that the CSS variable names exist in the `:root` scope before `next/font` activates them at runtime.

Following the `:root` block, add a global `body` rule setting `background-color` to `var(--color-background)` and `color` to `var(--color-text-primary)`. This gives every page the LankaCommerce slate-100 background (`#F1F5F9`) by default, matching the clean light interface visible in the reference design.

The complete addition to `globals.css` after the Tailwind directives should read:

```css
:root {
  --color-navy: #1B2B3A;
  --color-orange: #F97316;
  --color-orange-dark: #EA6C05;
  --color-surface: #FFFFFF;
  --color-background: #F1F5F9;
  --color-border: #E2E8F0;
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --color-info: #3B82F6;
  --color-text-primary: #0F172A;
  --color-text-muted: #64748B;
  --font-body: '';
  --font-mono: '';
}

body {
  background-color: var(--color-background);
  color: var(--color-text-primary);
}
```

### Step 2: Configure Colour Tokens in tailwind.config.ts

Open `tailwind.config.ts`. Inside the `theme.extend.colors` object, add each of the twelve colour tokens by name, with each value referencing the corresponding CSS custom property using Tailwind's CSS variable syntax. Use the token name without the `--color-` prefix as the key. For the `orange-dark` token, use the key `"orange-dark"` (quoted, as it contains a hyphen) and reference `var(--color-orange-dark)`. With these entries in place, every colour token generates a full suite of utility classes: `bg-navy`, `text-orange`, `border-border`, `ring-orange`, and so on across all twelve tokens.

The `theme.extend.colors` addition should look like:

```ts
colors: {
  navy: 'var(--color-navy)',
  orange: 'var(--color-orange)',
  'orange-dark': 'var(--color-orange-dark)',
  surface: 'var(--color-surface)',
  background: 'var(--color-background)',
  border: 'var(--color-border)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  info: 'var(--color-info)',
  'text-primary': 'var(--color-text-primary)',
  'text-muted': 'var(--color-text-muted)',
},
```

### Step 3: Configure Font Family Extensions

Inside the `theme.extend.fontFamily` object in `tailwind.config.ts`, add two font family entries. LankaCommerce uses only two fonts — there is no separate display or heading font. The `"body"` entry should reference `--font-body` as its first value and include `"system-ui"` and the generic `"sans-serif"` keyword as fallbacks. The `"mono"` entry should reference `--font-mono` with `"Menlo"` and `"monospace"` as fallbacks. These entries make the utility classes `font-body` and `font-mono` available for use in JSX classNames throughout the application.

```ts
fontFamily: {
  body: ['var(--font-body)', 'system-ui', 'sans-serif'],
  mono: ['var(--font-mono)', 'Menlo', 'monospace'],
},
```

### Step 4: Verify the Content Paths Configuration

Confirm that the `content` array in `tailwind.config.ts` covers all TypeScript and JSX/TSX files under the `src/` directory. The recommended glob pattern is `"./src/**/*.{js,ts,jsx,tsx,mdx}"`. If the Next.js CLI generated a different or narrower pattern, update it to match this one. Correct content configuration is essential for Tailwind's JIT (just-in-time) engine to scan every component and page file for class name usage and include every referenced utility in the final CSS bundle.

### Step 5: Add Border Radius and Spacing Extensions

Inside `theme.extend` in `tailwind.config.ts`, add a `borderRadius` extension with two named entries. The `"card"` entry should be set to `"12px"` — this is the standard border radius for all card surfaces in LankaCommerce. The `"button"` entry should be set to `"8px"` for button components. Using named radius tokens rather than raw pixel values means that if the design system's corner radius standard changes, it can be updated in one place and propagate everywhere. Add no additional spacing overrides at this stage; the default Tailwind spacing scale is sufficient for Phase 01.

### Step 6: Verify Token Availability via IntelliSense

Start the development server with `pnpm dev` (from inside `frontend/`). Open any TypeScript component file and begin typing a `className` string. Confirm that VS Code's Tailwind CSS IntelliSense extension surfaces the `navy`, `orange`, `surface`, and `background` tokens in its autocomplete dropdown with correct hex colour swatches. Verify that `text-text-primary`, `bg-background`, and `border-border` also appear. Remove any temporary test elements you added. Stop the development server once verification is complete.

## Expected Output

- `src/app/globals.css` contains a `:root` block declaring all twelve `--color-*` CSS custom properties and two `--font-*` placeholder custom properties
- The `body` rule in `globals.css` sets `background-color` to `var(--color-background)` and `color` to `var(--color-text-primary)`
- `tailwind.config.ts` extends `colors` with all twelve token names referencing their CSS variables
- `tailwind.config.ts` extends `fontFamily` with `body` and `mono` entries referencing the two font CSS variables
- `tailwind.config.ts` extends `borderRadius` with `card` (12px) and `button` (8px) named values
- The application body has a background colour of `#F1F5F9` (slate-100) by default
- All twelve colour utility classes are available and previewed correctly in Tailwind IntelliSense

## Validation

- [ ] All twelve colour tokens appear in Tailwind CSS IntelliSense with correct colour swatches
- [ ] The application background in the browser is `#F1F5F9` as confirmed in Chrome DevTools
- [ ] `pnpm tsc --noEmit` passes with no errors after `tailwind.config.ts` modifications
- [ ] The utility classes `bg-navy`, `text-orange`, `border-border`, and `bg-background` are all valid
- [ ] The two font family utilities `font-body` and `font-mono` are defined and visible in IntelliSense

## Notes

Tailwind CSS 4 introduces an alternative CSS-first configuration approach where tokens can be defined inside a `@theme` block directly in `globals.css` rather than in `tailwind.config.ts`. If the installed version of Tailwind CSS supports and recommends this approach, the `@theme` block in `globals.css` is equally acceptable as long as all twelve tokens produce valid Tailwind utility classes. Verify the installed Tailwind CSS version and consult its release documentation to determine the preferred configuration strategy. Either approach is valid as an outcome for this task. Note that the `background` token name shadows Tailwind's built-in `background` utilities — if this causes IntelliSense conflicts, rename the custom token to `bg-app` in both the CSS variable and the Tailwind config, and update any references accordingly.
