# Task 05.03.09 — Build Error Boundary Components

## Metadata

| Field | Value |
|---|---|
| Task ID | 05.03.09 |
| SubPhase | 05.03 — Production Deployment and Polish |
| Complexity | Medium |
| Estimated Effort | 1 day |
| Dependencies | Task 05.03.01 (Sentry configured) |
| Produces | `frontend/components/ErrorBoundary.tsx`, `frontend/components/ErrorBoundaryFallback.tsx`, updated page layout files |
| Blocked By | Task 05.03.01 |

---

## Objective

Implement React Error Boundary components that intercept unhandled JavaScript errors occurring in the component tree and display a styled, actionable fallback UI instead of crashing the entire page. Integrate Sentry error reporting into the boundary so every caught error is automatically captured with full tenant and user context. Wrap all major page sections — including the POS CartPanel, the product grid, each report chart, and all data tables — in error boundaries so that a failure in one section does not disrupt the rest of the page.

---

## Instructions

### Step 1: Build the ErrorBoundaryFallback Component

Create `frontend/components/ErrorBoundaryFallback.tsx` as a functional component. Accept three props: `error` (Error object), `resetErrorBoundary` (a no-argument function that resets the boundary state), and `errorId` (string — a short identifier for support reference).

The fallback renders a full-width rounded-xl card with a `background` (#F1F5F9) background and a 1px `orange` border. Inside the card, render a centered layout: a warning SVG triangle with an exclamation mark drawn in `orange` (#F97316); a heading in Inter 20px `navy` reading "Something went wrong"; a subtext paragraph in Inter 14px `text-muted` reading "An unexpected error occurred in this section. The error has been automatically reported."; a support reference line in Inter 12px `text-muted` reading "Reference: " followed by the `errorId` prop rendered in JetBrains Mono `navy`; a "Retry" ShadCN Button with variant outline and orange border calling `resetErrorBoundary`; and a "Reload page" text button calling `window.location.reload()`. Minimum height 200px.

### Step 2: Build the ErrorBoundary Class Component

Create `frontend/components/ErrorBoundary.tsx` as a React class component. State type has two fields: `hasError` (boolean) and `error` (Error or null). Implement `getDerivedStateFromError` as a static method: receives error, returns `{ hasError: true, error }`. Implement `}`. Implement `componentDidCatch` receiving error and `info` (React.ErrorInfo): call `Sentry.captureException(error, { extra: { componentStack: info.componentStack } })`. Generate `errorId` from `Date.now().toString(36)` last 8 characters. Render: if `hasError` is true, render `ErrorBoundaryFallback` with error, `resetErrorBoundary` arrow function calling `setState({ hasError: false, error: null })`, and `errorId`. If false, render `this.props.children`. Accept optional `fallback` prop of type `React.ReactNode` for custom fallbacks.

### Step 3: Wrap POS CartPanel

In the POS terminal page, locate the `CartPanel` component rendering. Wrap it in an `ErrorBoundary`. If the CartPanel crashes (e.g., malformed cart state in Zustand), the fallback renders inside the cart column with a Retry button. The left-side product grid must not be affected by a CartPanel error.

### Step 4: Wrap Product Grid

In the products page, wrap the product list table or grid component in an `ErrorBoundary`. This ensures a render error caused by malformed product data shows the fallback card rather than crashing the entire products page.

### Step 5: Wrap Each Report Chart

In each report page, wrap each chart component (`Recharts` or equivalent) in its own individual `ErrorBoundary`. Charts are the highest-risk render targets for runtime exceptions because they process large numeric datasets. Wrapping each chart independently means a failure in one chart does not crash adjacent charts or the data table.

### Step 6: Wrap Each Data Table

Wrap every significant data table component in an `ErrorBoundary`: sales history table, customer table, stock adjustment log table, staff management table, expense table. Each table receives its own `ErrorBoundary` instance so error states are isolated.

### Step 7: Export from Components Index

Add exports for both `ErrorBoundary` and `ErrorBoundaryFallback` to `frontend/components/index.ts`.

---

## Expected Output

- `frontend/components/ErrorBoundary.tsx` — React class component with `getDerivedStateFromError`, `componentDidCatch`, Sentry integration, and optional custom fallback prop.
- `frontend/components/ErrorBoundaryFallback.tsx` — Styled fallback card with warning icon, support reference code, Retry button, and Reload button.
- Updated POS terminal page — CartPanel wrapped in ErrorBoundary.
- Updated products page — Product table wrapped in ErrorBoundary.
- Updated report pages — Each chart component individually wrapped in ErrorBoundary.
- All major data table components wrapped in ErrorBoundary instances.

---

## Validation

- Deliberately throwing inside a child of ErrorBoundary in development triggers the fallback UI rather than a full page crash.
- The Retry button resets the boundary state and re-renders the child component tree.
- `Sentry.captureException` is called in `componentDidCatch` — visible in the Sentry Issues list after triggering the error.
- The `errorId` support reference code is present in both the fallback UI and the corresponding Sentry event's extra context.
- Crashing the CartPanel does not affect the POS product grid or navigation chrome.
- Crashing one report chart does not crash adjacent charts on the same report page.
- ErrorBoundaryFallback renders correctly in the LankaCommerce design palette.

---

## Notes

React Error Boundaries only catch errors during rendering, in lifecycle methods, and in constructors of class components below them in the tree. They do not catch errors inside event handlers. For event handlers that could throw, use standard try/catch and display an error state via React Hook Form's `setError` or a toast notification. The `errorId` generated from `Date.now().toString(36)` is not a globally unique identifier and is not linked to Sentry by a foreign key. Its purpose is solely to give support staff a time-approximate reference they can use to search the Sentry timeline.