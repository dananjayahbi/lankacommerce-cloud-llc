# Task 05.03.08 — Perform Accessibility Audit and Fixes

## Metadata

| Field | Value |
|---|---|
| Task ID | 05.03.08 |
| SubPhase | 05.03 — Production Deployment and Polish |
| Complexity | High |
| Estimated Effort | 2 days |
| Dependencies | All UI components across all phases |
| Produces | Modifications to existing component files across the entire frontend tree |
| Blocked By | None |

---

## Objective

Perform a comprehensive accessibility audit of the LankaCommerce application and implement all identified fixes. The audit covers ARIA labelling for icon-only controls, ShadCN modal component title elements, focus management after modal dismissal, colour contrast compliance against WCAG 2.1 AA standard, form label association, and live region announcements for toast notifications. This task produces no new files — it is exclusively a series of targeted fixes applied to the existing component and page tree.

---

## Instructions

### Step 1: Audit and Fix All Icon-Only Buttons

An icon-only button is any interactive button element that renders a visual icon with no visible text label. Without an `aria-label`, screen reader users hear only "button" with no indication of function. Locate and fix the following icon-only buttons:

Sidebar navigation collapse toggle: add `aria-label="Collapse navigation"` when expanded and `aria-label="Expand navigation"` when collapsed. Search clear button: add `aria-label="Clear search"`. Cart item remove button in the POS terminal: add `aria-label` set to a dynamic string such as "Remove [product name] from cart". Variant quantity stepper buttons: add `aria-label="Increase quantity"` and `aria-label="Decrease quantity"`. Table row action menus: add `aria-label="Open actions for [row context]"`. Notification dismiss button: add `aria-label="Dismiss notification"`. Date picker open trigger: add `aria-label="Open date picker"`.

After fixing each button, run a targeted grep across the codebase using the search term "icon" combined with "Button" to catch any remaining instances.

### Step 2: Verify ShadCN Modal Title Elements

ShadCN `Dialog`, `Sheet`, and `AlertDialog` components all require a title element for screen reader announcement. Audit every usage and verify the accompanying title component is present. Every `Dialog` must contain a `DialogTitle` element inside a `DialogHeader`. Every `Sheet` must contain a `SheetTitle` inside a `SheetHeader`. Every `AlertDialog` must contain an `AlertDialogTitle` inside an `AlertDialogHeader`. If a design requires a visually hidden title, wrap the title in a ShadCN `VisuallyHidden` component rather than removing it entirely.

### Step 3: Verify Focus Management After Modal Dismissal

When a modal dialog closes, keyboard focus must return to the element that triggered the modal to open. Radix UI (which underlies ShadCN) handles this automatically via its internal focus trap and restore mechanism. Verify this behaviour in the following flows: open and close the Add Product modal — confirm focus returns to the "Add Product" button. Open and close the Delete Confirmation AlertDialog — confirm focus returns to the table row action trigger button. Open and close the Sale Receipt detail Sheet — confirm focus returns to the sale row that was clicked.

### Step 4: Verify Colour Contrast Ratios

Check the following key colour pairings against the WCAG 2.1 AA minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text (18px+ or bold 14px+). Navy (#1B2B3A) text on background (#F1F5F9) background: expected to exceed 7:1, passing AAA. Navy text on surface (#FFFFFF) background: expected to pass AA. Orange (#F97316) text on background (#F1F5F9) background: use only for large text (18px+) to ensure compliance. White text on orange (#F97316) background: verify passes AA for button label text sizes. Text-muted (#64748B) text on navy (#1B2B3A) background: verify passes AA. If any pairing fails, adjust the colour value slightly darker or lighter until compliance is met.

### Step 5: Verify All Form Inputs Have Associated Labels

Every input, select, textarea, and checkbox rendered via React Hook Form must have an associated label element. The label must be connected to its input either via `htmlFor` matching the input's `id` attribute, or by nesting the input directly inside the label element. ShadCN Form components (`FormLabel`, `FormControl`) handle this automatically when used correctly — audit that no `FormControl` is rendered without an accompanying `FormLabel` in the same `FormItem`.

### Step 6: Add ARIA Live Region to Toast Container

Locate the `Toaster` or `ToastViewport` component from ShadCN/UI in the application root layout. Add the props `role="status"`, `aria-live="polite"`, and `aria-atomic="false"` to the toast container element. For error toasts specifically (`variant="destructive"`), use `aria-live="assertive"` by conditionally applying the prop based on the toast variant.

### Step 7: Add Skip Navigation Link

Add a visually hidden "Skip to main content" anchor link as the very first focusable element in the document body, before the sidebar navigation. This link should be invisible until focused (use `-translate-y-full` which transitions to `translate-y-0` on `:focus`). Its `href` should point to `#main-content` and the main content area should have `id="main-content"` applied. Place this link in the root layout component in `frontend/app/[tenantSlug]/layout.tsx`.

---

## Expected Output

Modifications to existing files throughout `frontend/` including: all icon-only button components with `aria-label` props added; all ShadCN Dialog/Sheet/AlertDialog verified to contain title elements; toast container updated with `role="status"` and `aria-live="polite"`; dashboard layout updated with skip navigation link; any colour token value adjustments documented.

---

## Validation

- All icon-only buttons in the POS terminal CartPanel, sidebar, and table action menus carry descriptive `aria-label` props.
- All Dialog, Sheet, and AlertDialog components contain their required title child elements.
- Pressing Tab from the first position in the document and then Enter activates the "Skip to main content" link.
- Focus returns to the triggering button after dismissing all key modals.
- Navy-on-background contrast ratio passes WCAG 2.1 AA (minimum 4.5:1).
- White-on-orange CTA button contrast ratio passes WCAG 2.1 AA.
- All form inputs have associated label elements.
- Toast container carries `role="status"` `aria-live="polite"` and announces new toast text to a screen reader.

---

## Notes

Use the Chrome DevTools Accessibility panel to verify ARIA tree output for complex components. The "Inspect Accessibility Tree" view shows exactly what a screen reader receives without requiring an actual screen reader installation. Contrast ratio calculations use the WCAG 2.1 formula `(L1 + 0.05) / (L2 + 0.05)`. Tools such as WebAIM Contrast Checker accept hex values and return the ratio with a pass/fail indicator. Orange (#F97316) on background (#F1F5F9) will likely produce a contrast ratio near 2.5:1, which fails AA for normal text — ensure orange is used only for large text headings (18px regular or 14px bold) on background backgrounds, where the requirement drops to 3:1.
