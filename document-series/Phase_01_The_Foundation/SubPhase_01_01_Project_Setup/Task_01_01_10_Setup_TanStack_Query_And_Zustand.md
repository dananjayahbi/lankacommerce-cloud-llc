# Task 01.01.10 — Setup TanStack Query and Zustand

## Metadata

| Field | Value |
|---|---|
| Sub-Phase | SubPhase 01.01 — Project Setup & Configuration |
| Phase | Phase 01 — The Foundation |
| Estimated Complexity | Low |
| Dependencies | Task_01_01_09 |

## Objective

Install TanStack Query and Zustand, create the `QueryClientProvider` component and three Zustand store skeleton files, and wire the provider into the root layout so that server data fetching and global state infrastructure is available to every page in the frontend application. TanStack Query will be used throughout LankaCommerce to fetch data from the Django REST API endpoints.

## Instructions

All file paths and commands in this task are relative to the `frontend/` directory unless stated otherwise.

### Step 1: Install TanStack Query

Run the following command from inside `frontend/`:

```
pnpm add @tanstack/react-query @tanstack/react-query-devtools
```

This installs the core TanStack Query library and the developer tools panel as production dependencies. The devtools package renders a floating query inspector UI that is visible only in development mode (when `NODE_ENV` is `"development"`) and is automatically excluded from production bundles through Next.js's tree-shaking. Both packages are listed as production dependencies because Next.js requires dependencies to be available during its build step even if they are conditionally rendered only in certain environments.

In LankaCommerce, TanStack Query replaces any server-side Prisma data access that existed in the original Next.js monolith. All data fetching now flows through HTTP requests to the Django REST API backend running on port 8000. TanStack Query's caching, revalidation, and loading state management are used on every page that displays data retrieved from Django. The actual API client helper functions will be created in `src/lib/api/` (established in Task 01.01.06) and consumed by TanStack Query hooks throughout the application.

### Step 2: Install Zustand

Run:

```
pnpm add zustand
```

Zustand is intentionally lightweight — it does not require context providers, reducers, or action type constants. Each store is defined as a single function call that returns a typed React hook. The library has TypeScript support built in, so no separate type definition package is needed.

### Step 3: Create the QueryClient Provider Component

Create the file `src/components/shared/QueryProvider.tsx`. This file must begin with the `"use client"` directive on the very first line of the file, because TanStack Query's `QueryClientProvider` uses React context under the hood, and React context requires a client component boundary in the Next.js App Router. Import `useState` from `"react"`, `QueryClient` and `QueryClientProvider` from `"@tanstack/react-query"`, and `ReactQueryDevtools` from `"@tanstack/react-query-devtools"`.

Inside the component, create the `QueryClient` instance using React's `useState` hook with an initialiser function — call `useState` with a factory function that creates and returns a new `QueryClient`. This pattern ensures that each browser session receives a fresh, isolated `QueryClient` instance. A module-level constant would be shared across server-side render requests in different user sessions, which is a data isolation bug.

Configure the `QueryClient`'s `defaultOptions.queries` with:
- `staleTime` set to `300_000` (five minutes in milliseconds) — data fetched from the Django API is considered fresh for five minutes before TanStack Query refetches it
- `gcTime` set to `600_000` (ten minutes) — inactive cached API responses are retained in memory for ten minutes
- `retry` set to `1` — a single retry is attempted on network failure before an error is surfaced to the UI

Wrap the `children` prop in a `QueryClientProvider` passing the `QueryClient` instance, and nest the `ReactQueryDevtools` component inside with `initialIsOpen` set to `false` so the developer panel starts collapsed. Export the component as the default export named `QueryProvider`. Type the `children` prop as `React.ReactNode`.

The complete file should resemble:

```tsx
'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

interface QueryProviderProps {
  children: React.ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 300_000,
            gcTime: 600_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Step 4: Create the Cart Store Skeleton

Create the file `src/stores/cartStore.ts`. Remove the `.gitkeep` file from `src/stores/` since this directory now contains real content. Import the `create` function from `"zustand"`. Define a TypeScript interface named `CartStore`. At this skeleton stage, the interface should contain: an `items` property typed as `unknown[]` (the actual `CartItem` type will be defined when the POS feature is built in a later sub-phase), a `total` property typed as `number`, an `addItem` action typed as a function accepting an `unknown` parameter and returning `void`, and a `removeItem` action typed as a function accepting an `unknown` parameter and returning `void`. Create the Zustand store by calling `create` and passing a function that returns the initial state: `items` as an empty array, `total` as `0`, `addItem` as a no-op function body, and `removeItem` as a no-op function body. Export the resulting hook as the named export `useCartStore`.

### Step 5: Create the Offline Queue Store Skeleton

Create the file `src/stores/offlineStore.ts`. This store will eventually manage a queue of POS transactions that could not be submitted to the Django backend due to network unavailability — supporting the offline-first requirement of LankaCommerce. Define a TypeScript interface named `OfflineStore` with: a `queue` property typed as `unknown[]`, an `isOnline` property typed as `boolean`, an `enqueue` action typed as a function accepting `unknown` and returning `void`, and a `processQueue` action typed as a function returning `void`. Create the Zustand store initialising `isOnline` as `true` and `queue` as an empty array, with `enqueue` and `processQueue` as no-op stubs. Export the hook as `useOfflineStore`.

### Step 6: Create the UI State Store Skeleton

Create the file `src/stores/uiStore.ts`. This store manages application-wide UI state that multiple unrelated components need to share, such as the sidebar's open or closed state and the currently active modal. Define a TypeScript interface named `UIStore` with: `isSidebarOpen` typed as `boolean`, `activeModal` typed as `string | null`, `setSidebarOpen` typed as a function accepting a `boolean` and returning `void`, and `setActiveModal` typed as a function accepting `string | null` and returning `void`. Create the Zustand store initialising `isSidebarOpen` as `true` (the navy sidebar starts open by default) and `activeModal` as `null`. Export the hook as `useUIStore`.

### Step 7: Wire QueryProvider into the Root Layout

Open `src/app/layout.tsx`. Import the `QueryProvider` component from `"@/components/shared/QueryProvider"`. Inside the `RootLayout` component's return, wrap the `children` prop inside the `body` element with the `QueryProvider` component:

```tsx
<body>
  <QueryProvider>
    {children}
  </QueryProvider>
</body>
```

This placement makes the TanStack Query context accessible to every page, layout, and component in the entire application without affecting the HTML document structure above the `body` element.

### Step 8: Verify the Setup

Run `pnpm dev` and open `http://localhost:3000`. Open Chrome DevTools and look in the lower-right corner of the browser viewport for the TanStack Query DevTools icon — it appears as a small logo once the client component mounts. Click the icon to expand the query inspector panel and confirm it opens without errors showing an empty query cache state (no active queries yet — data fetching from the Django API will begin in later sub-phases). Open the Console tab and confirm no errors or warnings related to `QueryClient`, Zustand, or React hydration are present. Stop the development server.

## Expected Output

- `@tanstack/react-query`, `@tanstack/react-query-devtools`, and `zustand` are installed as production dependencies in `frontend/package.json`
- `src/components/shared/QueryProvider.tsx` exports a `QueryProvider` client component with devtools, using `useState` to create the `QueryClient` with Django-appropriate default options
- `src/stores/cartStore.ts`, `src/stores/offlineStore.ts`, and `src/stores/uiStore.ts` each export a typed Zustand store hook skeleton
- The root layout wraps the `body`'s children in `QueryProvider`
- TanStack Query DevTools icon is visible and functional in the development browser

## Validation

- [ ] `pnpm dev` starts without errors after wiring the `QueryProvider`
- [ ] TanStack Query DevTools icon appears in the lower-right corner of the browser
- [ ] No React hydration errors appear in the browser console
- [ ] `pnpm tsc --noEmit` passes with all three Zustand store files present and typed
- [ ] `useCartStore`, `useOfflineStore`, and `useUIStore` are importable using the `@/stores` path alias

## Notes

The `QueryClient` configuration uses `staleTime: 300_000` (five minutes) because the LankaCommerce Django REST API is the authoritative data source for all business data. Five minutes of client-side caching strikes a balance between network efficiency and data freshness for a retail ERP. For data that changes frequently (such as live stock levels or active POS cart state), individual query hooks in later sub-phases will override `staleTime` with a lower value (or `0` for always-fresh) on a per-query basis. The Zustand store skeletons defined in this task use `unknown[]` and `unknown` types as deliberate placeholders — these will be replaced with specific domain types (`CartItem`, `OfflineTransaction`, etc.) when those features are implemented in their respective sub-phases.
