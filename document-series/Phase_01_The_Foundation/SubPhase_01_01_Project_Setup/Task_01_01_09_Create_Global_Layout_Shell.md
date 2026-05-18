# Task 01.01.09 — Create Global Layout Shell

## Metadata

| Field | Value |
|---|---|
| Sub-Phase | SubPhase 01.01 — Project Setup & Configuration |
| Phase | Phase 01 — The Foundation |
| Estimated Complexity | Medium |
| Dependencies | Task_01_01_04, Task_01_01_08 |

## Objective

Create the root layout and all route-group layout shells for `(store)`, `(superadmin)`, and `(auth)` that establish the foundational page structure, apply LankaCommerce design tokens as default backgrounds, and finalise the global CSS file with all CSS custom property declarations.

## Instructions

All file paths and commands in this task are relative to the `frontend/` directory unless stated otherwise.

### Step 1: Finalise the Global CSS File

Open `src/app/globals.css`. By this point it should contain the three Tailwind directives, the `:root` block from Task 01.01.03, and the ShadCN CSS variable overrides from Task 01.01.04. Reorganise and finalise the file so its sections appear in the following canonical order:

1. The three Tailwind directives (`@tailwind base`, `@tailwind components`, `@tailwind utilities`)
2. The `:root` block declaring all twelve `--color-*` CSS custom properties with their hex values and the two `--font-*` custom properties (which will be populated dynamically by `next/font` at render time — leave their values as empty strings in the static CSS, since `next/font` injects the actual values via the class names applied to the `html` element)
3. The ShadCN CSS variable remappings (`--background`, `--foreground`, `--primary`, etc.) that were set in Task 01.01.04
4. A global `body` rule setting `background-color` to `var(--color-background)` (slate-100, `#F1F5F9`), `color` to `var(--color-text-primary)`, and `font-family` to `var(--font-body, system-ui, sans-serif)`
5. A universal box model rule applying `box-sizing: border-box` to all elements using the `*` selector

This finalised `globals.css` is the CSS baseline that all LankaCommerce components build upon — it should not be modified further during Phase 01.

### Step 2: Create the Root Layout

Open the existing `src/app/layout.tsx`, which was initially scaffolded by the Next.js CLI. Import `bodyFont` and `monoFont` from `"@/lib/fonts"` (note: only two fonts, not three). Import `globals.css`. Define and export a `Metadata` object at the module level with `title` set to `"LankaCommerce"` and `description` set to `"SaaS Tenant ERP for modern retail"`. Define the `RootLayout` component accepting a `children` prop typed as `React.ReactNode`. Inside the component, return an `html` element with the `"lang"` attribute set to `"en"`. The `html` element's `className` should be a string combining the `.variable` property from both font objects concatenated with spaces, plus the Tailwind `"antialiased"` utility class:

```tsx
<html lang="en" className={`${bodyFont.variable} ${monoFont.variable} antialiased`}>
```

Inside the `html` element, render a `body` element that renders the `children` prop directly without additional wrappers at this stage — the `QueryProvider` wrapper will be added in Task 01.01.10.

### Step 3: Create the Store Route Group Layout

Create the file `src/app/(store)/layout.tsx`. This layout wraps every page within the store-facing area of LankaCommerce: the POS terminal, inventory management, reports dashboard, and customer management pages. At this stage, the layout is a minimal structural shell.

Define and export a `StoreLayout` component that accepts a `children` prop typed as `React.ReactNode`. The component should return a single `div` element with the following class values:

- `min-h-screen` — full viewport height
- `flex` — flexbox container for the sidebar-plus-content two-column layout that will be built in a later sub-phase
- `bg-background` — the slate-100 background (`#F1F5F9`) matching the clean light interface in the reference design

Inside the `div`, render the `children` prop directly. Add a comment in the file:

```tsx
{/* Shell placeholder — the AppSidebar (bg-navy) and main content area will be
    integrated in SubPhase 02.xx when the navigation components are built. */}
```

### Step 4: Create the Super Admin Route Group Layout

Create the file `src/app/(superadmin)/layout.tsx`. This layout wraps all pages in the platform administrator section used by the LankaCommerce operations team to manage merchant stores, platform users, and billing. Define and export a `SuperAdminLayout` component accepting `children` typed as `React.ReactNode`. Return a `div` with `min-h-screen`, `flex`, and `bg-navy` classes to establish the dark navy background (`#1B2B3A`) characteristic of the super admin interface. The super admin area uses a full navy background, in contrast to the store area which uses a navy sidebar on a white/slate content area. Render `children` inside the `div`. Add a comment noting:

```tsx
{/* Shell placeholder — the full SuperAdmin layout is implemented in Phase 03. */}
```

### Step 5: Create the Auth Route Group Layout

Create the file `src/app/(auth)/layout.tsx`. This layout wraps the login page, two-factor authentication page, and password reset page. Auth pages are centered, isolated views with no navigation chrome. Define and export an `AuthLayout` component accepting `children` typed as `React.ReactNode`. Return a `div` with the classes `min-h-screen`, `bg-background`, `flex`, `items-center`, and `justify-center`. This centres the auth form on the slate-100 background. Inside this outer `div`, render a second inner `div` with `max-w-md` and `w-full` to constrain the auth form width to a readable maximum. Render `children` inside the inner `div`.

### Step 6: Create Placeholder Dashboard Pages

For each route group, create a minimal placeholder `page.tsx` to prevent 404 errors and confirm that route group layouts are being applied correctly during development.

In `src/app/(store)/dashboard/`, create a `page.tsx` file:

```tsx
export default function StoreDashboardPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold text-text-primary">
        LankaCommerce Store Dashboard — In Development
      </h1>
    </main>
  );
}
```

In `src/app/(superadmin)/dashboard/`, create a `page.tsx` file:

```tsx
export default function SuperAdminDashboardPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold text-surface">
        LankaCommerce SuperAdmin Dashboard — In Development
      </h1>
    </main>
  );
}
```

Note that the SuperAdmin heading uses `text-surface` (white) because the SuperAdmin layout has a dark navy background. These are temporary placeholder pages that will be fully replaced in their respective sub-phases.

### Step 7: Verify the Layout Application

Run `pnpm dev`. Navigate to `http://localhost:3000/dashboard` and confirm the store dashboard placeholder page loads. Use Chrome DevTools to inspect the computed `background-color` of the outermost `div` rendered by the store layout — it should be the slate-100 colour (`#F1F5F9`). Navigate to a superadmin path and confirm the navy background (`#1B2B3A`) is applied. Inspect the `html` element and confirm both font CSS classes (for `--font-body` and `--font-mono`) are applied to it. Open the Console tab and confirm there are no React hydration warning messages, which would indicate a server-client render mismatch that needs to be resolved before proceeding.

## Expected Output

- `src/app/globals.css` is finalised with the `:root` custom property block, ShadCN variable remappings, body base styles (using `var(--color-background)`), and box-sizing reset in the correct section order
- `src/app/layout.tsx` applies both font variable class names, the `"en"` language attribute, and `"antialiased"` to the `html` element
- `src/app/(store)/layout.tsx` is a flex shell `div` with `bg-background` (slate-100)
- `src/app/(superadmin)/layout.tsx` is a flex shell `div` with `bg-navy` (dark navy `#1B2B3A`)
- `src/app/(auth)/layout.tsx` is a centered-form container with `bg-background`
- Placeholder dashboard pages exist in `(store)/dashboard/` and `(superadmin)/dashboard/` using the LankaCommerce project name
- No hydration warnings appear in the browser console

## Validation

- [ ] `pnpm dev` starts without compilation errors
- [ ] Chrome DevTools confirms the store layout renders `bg-background` (`#F1F5F9`)
- [ ] Chrome DevTools confirms the superadmin layout renders `bg-navy` (`#1B2B3A`)
- [ ] The `html` element carries both font variable class names (`--font-body` and `--font-mono` — not three)
- [ ] No React hydration warnings appear in the browser console
- [ ] `pnpm tsc --noEmit` passes after all layout files are created
- [ ] A 404 does not occur when navigating to `/dashboard`

## Notes

The `children` prop in all layout components must be typed as `React.ReactNode` rather than `React.ReactElement` or `JSX.Element`. The Next.js App Router may pass async server components, context providers, or other complex structures as children, and `React.ReactNode` is the only type broad enough to accept all of these correctly. The colour distinction between route groups is deliberate: the store area uses `bg-background` (slate-100) as the outer canvas with white (`bg-surface`) cards floating on it, while the superadmin area uses a full `bg-navy` canvas. The auth area uses `bg-background` to match the store area's light, open feel. These colour assignments are set here in Phase 01 and should not be changed without updating both the layout files and the design token definitions in `globals.css`.
