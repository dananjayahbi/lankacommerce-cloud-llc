# Task 01.01.04 — Install ShadCN and Theme

## Metadata

| Field | Value |
|---|---|
| Sub-Phase | SubPhase 01.01 — Project Setup & Configuration |
| Phase | Phase 01 — The Foundation |
| Estimated Complexity | Medium |
| Dependencies | Task_01_01_03 |

## Objective

Install ShadCN/UI using its CLI initialiser and re-skin all core UI components to use LankaCommerce design tokens exclusively, ensuring no generic grey scale colours remain in any ShadCN component file. The result is a component library that reflects the clean navy-and-orange visual identity of LankaCommerce.

## Instructions

All commands and file paths in this task are relative to the `frontend/` directory unless stated otherwise.

### Step 1: Run the ShadCN CLI Initialiser

From inside `frontend/`, run:

```
pnpm dlx shadcn@latest init
```

The CLI will prompt for configuration options. Select `"New York"` as the style variant — this style produces components with a slightly more refined, compact, and professional aesthetic compared to the Default style, which suits LankaCommerce's enterprise ERP positioning. When asked for the base colour, select `"neutral"` as a starting point — it will be fully overridden by LankaCommerce tokens in the next step. Accept CSS variables (`yes`). When asked for the global CSS file path, enter `src/app/globals.css`. When asked for the Tailwind config path, enter `tailwind.config.ts`. Confirm the components alias as `@/components` and the utils alias as `@/lib/utils`. Allow the CLI to complete its initialisation and install its dependencies.

### Step 2: Replace ShadCN's Default CSS Variables with LankaCommerce Tokens

The ShadCN CLI injects a large set of CSS custom property declarations into `globals.css` covering `--background`, `--foreground`, `--primary`, and a complete design system palette. Open `globals.css` and locate the `:root` block added by ShadCN. Replace the ShadCN-generated CSS variable values with mappings to LankaCommerce tokens as follows:

- `--background` → `var(--color-surface)` — white card and modal backgrounds
- `--foreground` → `var(--color-text-primary)` — main dark text
- `--primary` → `var(--color-orange)` — orange primary accent (`#F97316`)
- `--primary-foreground` → `#FFFFFF` — white text on orange buttons
- `--secondary` → `var(--color-background)` — slate-100 for secondary surfaces
- `--secondary-foreground` → `var(--color-text-primary)` — dark text on secondary
- `--muted` → `var(--color-background)` — muted surface same as app background
- `--muted-foreground` → `var(--color-text-muted)` — slate-500 for placeholder and hint text
- `--accent` → `var(--color-navy)` — dark navy for accent panels and sidebar-adjacent elements
- `--accent-foreground` → `#FFFFFF` — white text on navy
- `--destructive` → `var(--color-danger)` — red danger token
- `--border` → `var(--color-border)` — slate-200 dividers
- `--input` → `var(--color-border)` — input field borders
- `--ring` → `var(--color-orange)` — orange focus ring to match primary brand colour
- `--radius` → `8px` — consistent with the button border radius token from Task 01.01.03

Remove the `.dark` theme block entirely — LankaCommerce does not implement a dark mode in its initial versions. The navy sidebar is a structural dark element, not a system-wide dark theme.

### Step 3: Add and Audit the Button Component

Run the following command to scaffold the Button component:

```
pnpm dlx shadcn@latest add button
```

Open the generated `src/components/ui/button.tsx` and review its variant configuration. The primary (default) variant should produce a button with the `--primary` CSS variable as its background, which now maps to orange (`#F97316`) via the remapping in Step 2. Confirm the hover state references `--color-orange-dark` — if not, update the hover class to use `hover:bg-orange-dark`. Verify the `"secondary"` variant uses `--secondary` background (slate-100) with a `--border` coloured outline. Verify the `"ghost"` variant shows no background at rest but applies orange text on hover by referencing the `--primary` variable or `text-orange`. The `"destructive"` variant should resolve to the danger token via `--destructive`. If any variant references Tailwind grey scale classes directly (`zinc`, `slate`, `gray`, `stone`), replace them with the equivalent LankaCommerce token reference.

### Step 4: Add and Audit Card and Form Input Components

Run:

```
pnpm dlx shadcn@latest add card input select textarea
```

Open each generated file. The `Card` component's outer container should have its background set to `--background` (surface white, `#FFFFFF`) and its border to `--border` (slate-200). Cards are white panels floating on the slate-100 app background, which creates the depth visible in the reference design. Open `input.tsx` and confirm the input field background is `--background` (white), the border is `--input` (slate-200), and the focus ring uses `--ring` (orange). The `Select` and `Textarea` components should mirror the Input styling for a consistent form element appearance throughout the application.

### Step 5: Add and Audit Table, Badge, Dialog, Sheet, and Toast Components

Run:

```
pnpm dlx shadcn@latest add table badge dialog sheet sonner
```

For the `Table` component, the header row (`thead`) background should use the surface white and the column headers should use `text-text-muted` for a subtle, readable styling. For alternating data rows, apply `bg-background` (slate-100) to even rows for a clean striped appearance. For the `Badge` component, audit whether it includes semantic variants — if not, manually add variant entries for `"success"`, `"warning"`, and `"info"` that apply the corresponding semantic colour tokens as their backgrounds with white foreground text. The default badge should use the `orange` token as its background. For `Dialog` and `Sheet`, the content panels should use `surface` (white) backgrounds with `border` (slate-200) borders. The `Sonner` toast component should have its success, error, and info variants' background and border colours derived from the LankaCommerce semantic tokens — `--color-success`, `--color-danger`, and `--color-info` respectively.

### Step 6: Audit All Components for Remaining Grey Scale Usage

Perform a full-text search across the entire `src/components/ui/` directory for any of the following class prefixes: `"gray-"`, `"zinc-"`, `"slate-"`, `"stone-"`, `"neutral-"`. In VS Code, you can scope the search to that directory using the search panel's "files to include" filter. If any occurrences are found, replace each one with the semantically appropriate LankaCommerce token. As a reference:

- Neutral or muted greys → `text-muted` or `border`
- Background greys → `background` or `surface`
- Dark foreground greys → `text-primary` or `navy`

No component file should contain any grey scale Tailwind class after this audit. The only dark colour used in LankaCommerce UI is `navy` (`#1B2B3A`), and it is used intentionally for the sidebar and accent contexts rather than as a substitute for grey.

### Step 7: Visual Verification in the Browser

Run `pnpm dev` and temporarily add `Button`, `Card`, and `Badge` components to the placeholder page in `src/app/page.tsx`. Render the primary button, secondary button, ghost button, and destructive button. Render a Card with a white background. Render badges with the `success`, `warning`, and `info` variants. Use Chrome DevTools to inspect the computed CSS colour values and confirm:

- Primary button background is orange (`#F97316`)
- Card background is white (`#FFFFFF`) contrasting against the page background (`#F1F5F9`)
- Success badge background is `#22C55E`

Remove the temporary test elements from `page.tsx` after verification and stop the development server.

## Expected Output

- `src/components/ui/` contains `button.tsx`, `card.tsx`, `input.tsx`, `select.tsx`, `textarea.tsx`, `table.tsx`, `badge.tsx`, `dialog.tsx`, `sheet.tsx`, and `sonner.tsx`
- The ShadCN CSS variables in `globals.css` are fully re-mapped to LankaCommerce tokens with no ShadCN defaults remaining
- No component file in `src/components/ui/` contains any grey scale Tailwind class (`gray`, `zinc`, `slate`, `stone`, `neutral`)
- The Button primary variant renders with orange (`#F97316`) background confirmed in Chrome DevTools
- The Badge component has at minimum `success`, `warning`, `destructive`, and `info` variants

## Validation

- [ ] `pnpm dev` starts without errors after ShadCN installation and theming
- [ ] The Button primary variant shows the orange (`#F97316`) background colour in the browser inspector
- [ ] No grey scale Tailwind classes exist anywhere in `src/components/ui/`
- [ ] The Badge component has at minimum four semantic variants: `success`, `warning`, `destructive`, and `info`
- [ ] `pnpm tsc --noEmit` passes with zero errors

## Notes

ShadCN ships components as editable source files that live directly inside your project — they are not an npm dependency that receives updates automatically. This means you own every component file and are responsible for keeping them consistent with LankaCommerce tokens. For any future ShadCN component additions, run the grey scale audit described in Step 6 as an immediate follow-up. The `shadcn add` command accepts multiple component names in a single invocation, which reduces the number of CLI interactions needed during setup. The navy colour (`#1B2B3A`) is used as the `--accent` ShadCN variable, meaning any component that uses `bg-accent` will render the dark navy background — this is intentional and appropriate for sidebar headers, selected states, and dark panel accents.
