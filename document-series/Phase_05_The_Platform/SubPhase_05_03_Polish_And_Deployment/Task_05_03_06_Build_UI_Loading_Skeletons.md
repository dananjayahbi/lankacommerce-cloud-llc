# Task 05-03-06: Build UI Loading Skeletons

## Metadata

| Attribute | Value |
|-----------|-------|
| **Phase** | Phase 05 — The Platform |
| **Sub-Phase** | SubPhase 05-03 — Polish and Deployment |
| **Task ID** | Task 05-03-06 |
| **Priority** | Medium |
| **Dependencies** | Task 01-01-03 (Setup Tailwind Design Tokens), Task 01-01-04 (Install ShadCN and Theme) |
| **Estimated Effort** | 4 hours |
| **Status** | Not Started |

## Objective

LankaCommerce is a data-heavy application with product lists, customer directories, sales reports, and dashboard widgets that all depend on API responses. Without loading indicators, users see blank screens or layout shifts while data loads, creating a poor perception of performance. Skeleton screens — placeholder shapes that mimic the final layout — provide immediate visual feedback and significantly improve perceived performance.

This task builds a reusable skeleton component library with five reusable components: `TableSkeleton`, `CardGridSkeleton`, `ListSkeleton`, and `ChartSkeleton`. Each component uses Tailwind's `animate-pulse` utility with the LankaCommerce design token for borders (`#E2E8F0` at 40% opacity). All skeletons are `aria-hidden="true"` and `role="presentation"` for accessibility. The skeletons are integrated into every list and report page via `loading.tsx` files for Suspense-based loading.

## Instructions

1. **Create the skeleton components directory.**
   - Create `frontend/components/skeletons/` directory.
   - Create an `index.ts` barrel file that re-exports all skeleton components.

2. **Define the base skeleton style.**
   - In `frontend/components/skeletons/base_skeleton.tsx`:
     - Create `BaseSkeleton` component:
       - Props: `className?: string`, `as?: "div" | "span"` (default `"div"`).
       - Base classes: `animate-pulse rounded-md bg-[#E2E8F0] bg-opacity-40`.
       - Merge with `className` prop via `cn()` utility.
       - Set `aria-hidden="true"` and `role="presentation"`.
     - Export `BaseSkeleton` as the building block for all other skeletons.

3. **Build `TableSkeleton`.**
   - Create `frontend/components/skeletons/table_skeleton.tsx`:
     - Props: `columns?: number` (default 5), `rows?: number` (default 8).
     - Render a table structure:
       - Header row: `columns` number of `BaseSkeleton header cells (taller, slightly wider).
       - Body rows: `rows` number of rows, each with `columns` cells.
       - Each cell is a `BaseSkeleton` with varying widths (randomized between 60% and 100% of column width for realism).
     - Wrap in a `<div role="presentation" aria-hidden="true">` with `overflow-hidden`.
     - Apply border and border-radius matching the ShadCN table component.

4. **Build `CardGridSkeleton`.**
   - Create `frontend/components/skeletons/card_grid_skeleton.tsx`:
     - Props: `count?: number` (default 3).
     - Render a CSS grid with `grid-cols-1 md:grid-cols-3` and `gap-4`.
     - Each card:
       - `BaseSkeleton` for an icon area (40x40px, rounded-full).
       - `BaseSkeleton` for the title (60% width, 16px height).
       - `BaseSkeleton` for the value (80% width, 32px height).
       - `BaseSkeleton` for the trend indicator (40% width, 12px height).
       - Card wrapper with `bg-[#FFFFFF]`, `rounded-lg`, `border border-[#E2E8F0]`, `p-4`.

5. **Build `ListSkeleton`.**
   - Create `frontend/components/skeletons/list_skeleton.tsx`:
     - Props: `items?: number` (default 6).
     - Render a vertical list with `space-y-3`.
     - Each item:
       - Flex row layout.
       - `BaseSkeleton` for avatar circle (40x40px, rounded-full).
       - Two `BaseSkeleton` lines stacked vertically:
         - Primary text line: 70% width, 14px height.
         - Secondary text line: 40% width, 12px height.
       - Right-aligned `BaseSkeleton` for a badge or action (60x24px, rounded).
     - Wrapper with `bg-[#FFFFFF]`, `rounded-lg`, `border border-[#E2E8F0]`, `p-4`.

6. **Build `ChartSkeleton`.**
   - Create `frontend/components/skeletons/chart_skeleton.tsx`:
     - Props: `barCount?: number` (default 7).
     - Render a container with `h-[#FFFFFF]`, `rounded-lg`, `border border-[#E2E8F0]`, `p-4`, `h-[320px]`.
     - Inside, render a flex row with `items-end justify-between` and `h-full`:
       - `barCount` number of `BaseSkeleton` bars.
       - Each bar has a random height between 30% and 100% of the container height.
       - Each bar is `w-8` wide with `rounded-t-md`.
     - Below the bars, render `BaseSkeleton` labels (same count, 12px height, 40% width).
     - Add a `BaseSkeleton` for the chart title at the top (40% width, 18px height).

7. **Create the barrel export file.**
   - In `frontend/components/skeletons/index.ts`:
     ```ts
     export { BaseSkeleton } from "./base_skeleton";
     export { TableSkeleton } from "./table_skeleton";
     export { CardGridSkeleton } from "./card_grid_skeleton";
     export { ListSkeleton } from "./list_skeleton";
     export { ChartSkeleton } from "./chart_skeleton";
     ```

8. **Integrate `TableSkeleton` into product list page.**
   - Create `frontend/app/[tenantSlug]/products/loading.tsx`:
     - Export default function that renders `<TableSkeleton columns={6} rows={10} />`.
     - This file is automatically used by Next.js Suspense while the products page loads.

9. **Integrate `ListSkeleton` into customer list page.**
   - Create `frontend/app/[tenantSlug]/customers/loading.tsx`:
     - Export default function that renders `<ListSkeleton items={8} />`.

10. **Integrate `ListSkeleton` into POS search.**
    - In `frontend/app/[tenantSlug]/pos/page.tsx`, wrap the product search results in a Suspense boundary:
      ```tsx
      <Suspense fallback={<ListSkeleton items={5} />}>
        <ProductSearchResults />
      </Suspense>
      ```

11. **Integrate `ChartSkeleton` and `TableSkeleton` into reports page.**
    - Create `frontend/app/[tenantSlug]/reports/loading.tsx`:
      - Export default function that renders:
        - `<ChartSkeleton barCount={12} />` at the top.
        - `<TableSkeleton columns={5} rows={6} />` below the chart.
      - Use `space-y-6` to separate the two skeletons.

12. **Integrate `CardGridSkeleton` into the dashboard page.**
    - Create `frontend/app/[tenantSlug]/dashboard/loading.tsx`:
      - Export default function that renders:
        - `<CardGridSkeleton count={3} />` for the stat cards.
        - Below, a two columns: `<ChartSkeleton barCount={7} />` and `<ListSkeleton items={5} />`.

13. **Verify accessibility.**
    - Ensure all skeleton components have `aria-hidden="true"` and `role="presentation"`.
    - Ensure skeleton containers do not trap focus or interfere with screen reader navigation.
    - Test with Chrome Lighthouse Accessibility audit — should pass without violations.

## Expected Output

- Five reusable skeleton components (`BaseSkeleton`, `TableSkeleton`, `CardGridSkeleton`, `ListSkeleton`, `ChartSkeleton`) in `frontend/components/skeletons/`.
- `loading.tsx` files exist for products, customers, reports, and dashboard pages.
- POS search results are wrapped in a Suspense boundary with `ListSkeleton`.
- All skeletons use `animate-pulse` with `#E2E8F0` at 40% opacity.
- All skeletons are properly hidden from screen readers via `aria-hidden="true"`.
- Pages show skeleton placeholders immediately during data fetching, eliminating blank screens.

## Validation

1. `frontend/components/skeletons/base_skeleton.tsx` exists with `BaseSkeleton` component.
2. `frontend/components/skeletons/table_skeleton.tsx` exists with configurable `columns` and `rows` props.
3. `frontend/components/skeletons/card_grid_skeleton.tsx` exists with configurable `count` prop.
4. `frontend/components/skeletons/list_skeleton.tsx` exists with configurable `items` prop.
5. `frontend/components/skeletons/chart_skeleton.tsx` exists with configurable `barCount` prop and random bar heights.
6. `frontend/components/skeletons/index.ts` re-exports all skeleton components.
7. `frontend/app/[tenantSlug]/products/loading.tsx` uses `<TableSkeleton>`.
8. `frontend/app/[tenantSlug]/customers/loading.tsx` uses `<ListSkeleton>`.
9. `frontend/app/[tenantSlug]/reports/loading.tsx` uses `<ChartSkeleton>` and `<TableSkeleton>`.
10. `frontend/app/[tenantSlug]/dashboard/loading.tsx` uses `<CardGridSkeleton>`, `<ChartSkeleton>`, and `<ListSkeleton>`.
11. POS search results are wrapped in `<Suspense fallback={<ListSkeleton />}>`.
12. All skeleton components have `aria-hidden="true"` and `role="presentation"`.
13. Lighthouse Accessibility audit passes with no violations related to skeleton components.

## Notes

- The `animate-pulse` class applies a subtle opacity animation. If a more dramatic effect is desired, use `animate-shimmer` with a custom CSS gradient animation.
- Skeleton dimensions should closely match the actual content dimensions to minimize layout shift (CLS). Use the same padding, border, and border-radius values as the real components.
- For pages with multiple data sections (e.g., dashboard), use multiple skeleton components stacked vertically to match the page layout.
- The `loading.tsx` files are automatically picked up by Next.js Suspense. They replace the page content entirely while the page component loads its data.
- For nested Suspense boundaries (e.g., POS search results inside a larger page), use `<Suspense>` directly in the page component rather than `loading.tsx`.
- Consider adding a "skip to content" link for accessibility that bypasses skeleton animations.
- If using ShadCN's `Skeleton` component, the `BaseSkeleton` can be a thin wrapper around it with the LankaCommerce design tokens.
- Test skeleton appearance on slow network conditions (e.g., Chrome DevTools "Slow 3G" throttling) to ensure they appear long enough to be visible.
