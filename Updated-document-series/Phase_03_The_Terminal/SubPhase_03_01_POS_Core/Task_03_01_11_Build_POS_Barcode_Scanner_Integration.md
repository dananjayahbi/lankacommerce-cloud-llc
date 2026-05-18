# Task 03.01.11 — Build POS Barcode Scanner Integration

## Metadata

| Field | Value |
|---|---|
| Task ID | 03.01.11 |
| Task Name | Build POS Barcode Scanner Integration |
| Sub-Phase | 03.01 — POS Core |
| Complexity | Medium |
| Dependency | Task_03_01_07 |
| Output Files | `frontend/hooks/useBarcodeScanner.ts` |

---

## Objective

Implement a hardware barcode scanner integration as a custom React hook that captures high-speed keystroke sequences from USB HID barcode scanners, resolves the scanned barcode against the product catalog by querying `GET /api/catalog/products/by-barcode/` via TanStack Query, and adds the matching product variant to the cart. The integration must handle fast-scan patterns correctly, avoid interfering with other text inputs on the terminal, and gracefully handle out-of-stock and unknown barcode scenarios.

---

## Step 1 — Understand How Hardware Barcode Scanners Work

USB HID barcode scanners are designed to integrate with any operating system without requiring drivers. They present themselves to the OS as a standard USB keyboard device. When a barcode label is scanned, the scanner reads the barcode optically and then emits the decoded barcode string as a rapid sequence of keyboard `keydown` and `keyup` events, followed by a simulated Enter keypress. The emission speed is typically between 50 and 200 characters per second — far faster than any human typist.

This speed difference is the key to distinguishing scanner input from human keyboard input. The `useBarcodeScanner` hook exploits this by measuring the time between consecutive `keydown` events. If two events occur within 50 milliseconds of each other, they are assumed to originate from a scanner. If more than 50 milliseconds elapse between two characters, the input is assumed to be from a human typing.

The 50ms threshold is stored as a configurable constant in `frontend/config/pos.config.ts` as `BARCODE_INTER_KEYSTROKE_THRESHOLD_MS`. This value was derived empirically from USB HID scanner hardware. If integration testing with a physical device reveals false positives or false negatives, the constant can be adjusted without modifying the hook's logic.

LankaCommerce barcodes use the `LKC` prefix (for example `LKC000147`). However, the scanner hook must handle any barcode format — the backend's `by-barcode` endpoint is responsible for looking up the SKU regardless of format. The hook does not validate or parse the barcode prefix.

---

## Step 2 — Design the useBarcodeScanner Hook

Create `frontend/hooks/useBarcodeScanner.ts`. The hook accepts three parameters: `tenantId` (string), `onAdd` (a callback function invoked when a variant is successfully added to the cart, receiving `variantId` and `productName` as arguments so the notification strip can display the added item's name), and `enabled` (boolean, defaulting to `true` — set to `false` when any modal that captures keyboard input is open, such as `VariantSelectionModal` or `CartManagerPINModal`).

All internal state for this hook must use `useRef` rather than `useState`. Using `useRef` for `buffer`, `lastKeyTime`, and `flushTimeoutRef` means that updating these values does not trigger React re-renders. This is critical: a React component re-render on every single keydown event (potentially hundreds of times during a fast scan sequence) would degrade performance and could cause missed keystrokes in the buffer. The hook's only job is to accumulate the buffer silently and call `addItem` once when the scan is complete.

---

## Step 3 — Implement the Event Listener

Use a `useEffect` hook to attach the keydown listener to `window` when the component mounts and to detach it when the component unmounts. Always attach the listener with `window.addEventListener('keydown', handleKeyDown)` and remove it in the cleanup function returned by `useEffect` with `window.removeEventListener('keydown', handleKeyDown)`.

The cleanup is essential for two reasons. First, if the component unmounts and the listener is not removed, the handler function holds a stale closure over the component's refs — this creates a memory leak and could cause errors when the handler tries to update refs that belong to a destroyed component. Second, React's StrictMode double-invokes effects in development, so without cleanup the listener would be registered twice, causing every scan to be processed twice.

Inside the `handleKeyDown` event handler, perform two early-exit checks before any processing. First, check `document.activeElement`. If the currently focused element is an `HTMLInputElement`, an `HTMLTextAreaElement`, or has `contentEditable` set to `"true"`, return immediately and allow the event to propagate normally. This prevents the barcode scanner from capturing characters typed by the cashier in the product search input, the opening float input in `ShiftOpenModal`, or any other text field on the terminal. Second, check the `enabled` prop value — if it is `false`, return immediately without processing.

---

## Step 4 — Buffer Accumulation and Timing Logic

Inside the `handleKeyDown` handler, after the early-exit checks, implement the following logic.

When any key is pressed that is not a special key — determine this by checking `event.key.length === 1`, which is true for printable characters and false for named keys like `"Shift"`, `"Control"`, `"Enter"`, `"Backspace"`, `"Tab"`, etc. — compute the elapsed time since the last keydown event: `elapsed = Date.now() - lastKeyTime.current`.

If `elapsed` is less than or equal to `BARCODE_INTER_KEYSTROKE_THRESHOLD_MS` (50ms): this keystroke is part of a scan sequence. Append `event.key` to `buffer.current`. Update `lastKeyTime.current` to `Date.now()`. Cancel any pending flush timeout using `clearTimeout(flushTimeoutRef.current)`. Schedule a new flush timeout for 100ms: after 100ms of no new keystrokes, the flush function will be called with the accumulated buffer. This timeout handles the case where a barcode scanner does not send an Enter key or sends it with a small delay.

If `elapsed` is greater than `BARCODE_INTER_KEYSTROKE_THRESHOLD_MS` (50ms): this is a slow keystroke from a human. If `buffer.current` is empty, this is just normal human typing — do nothing and allow the keypress to propagate. If `buffer.current` is non-empty, a scan sequence was in progress but was interrupted by a slow keystroke — this is likely an error condition. Clear `buffer.current` to reset the state and discard the partial scan.

When the `"Enter"` key is pressed and `buffer.current` has a length of 6 or more characters: call the flush function immediately with the accumulated buffer. Clear `buffer.current` and cancel any pending flush timeout.

---

## Step 5 — Implement the Flush and Resolve Logic

The flush function receives the accumulated barcode string as its argument. Trim whitespace from both ends of the string. If the trimmed string's length is less than 6 characters, discard it silently — strings this short are unlikely to be valid barcodes and may be keyboard noise.

Use TanStack Query's `queryClient.fetchQuery` to look up the barcode. Construct the query with a key of `["variant-by-barcode", barcode, tenantId]` and a query function that fetches `GET /api/catalog/products/by-barcode/?sku={barcode}&tenant_id={tenantId}`. Configure `staleTime` to five minutes and `cacheTime` to ten minutes. The cache-first behaviour of `fetchQuery` means that if the same barcode has been scanned in the last five minutes, no network request is made — the cached result is returned immediately. For a retail environment where popular products are scanned repeatedly throughout the day, this results in zero extra network traffic for the vast majority of scan events.

On a successful response where a variant is found: check `variant.stock_quantity > 0` (or whether the tenant's `allow_negative_stock` setting is true — this can be passed as a hook parameter or read from a tenant context). If stock is available, call `useCartStore.getState().addItem(...)` with all required fields: `variantId`, `productNameSnapshot` from the product name, `variantDescriptionSnapshot` from the variant's attribute description, `sku`, `unitPrice` as a `Decimal`, and a `quantity` of 1 (barcode scans always add 1 unit at a time). Call the `onAdd(variantId, productName)` callback. If stock is zero and `allow_negative_stock` is false, trigger a warning amber (#F59E0B) notification: "Out of stock: [Product Name] [Variant Descriptor]."

On a successful response where no variant is found (HTTP 404 from the barcode lookup): trigger a danger (#EF4444) notification: "Unknown barcode: [scannedCode]."

On a network error: trigger a danger notification: "Could not look up barcode — check connection."

---

## Step 6 — Integrate the Hook into the POS Page

In `frontend/app/dashboard/[tenantSlug]/pos/page.tsx`, call `useBarcodeScanner` at the top level of the component. Pass `tenantId` from the layout context, an `onAdd` callback that triggers the flash notification strip with the added item's name, and the `enabled` prop derived from the modal open states: `enabled={!isVariantModalOpen && !isPinModalOpen && !isShiftCloseModalOpen}`. Disable the hook whenever any modal that captures keyboard input is open to prevent modal input fields from being intercepted by the scanner buffer logic.

---

## Step 7 — Build the Flash Notification Strip

In the POS terminal's left panel, directly below the search input and above the `CategoryTabs` strip, render a fixed-height notification strip of approximately 28px. The strip is hidden when no notification is active — use a CSS transition to slide the strip down from height 0 with `overflow: hidden` and 150ms ease-in-out for a smooth appearance.

When `onAdd` is called with a successful scan: apply a success green (#22C55E) background to the strip. Display "Added: [Product Name] — [Variant Descriptor]" in white Inter 13px centred in the strip. The strip auto-dismisses after 2.5 seconds by clearing the notification state, which collapses the strip with the reverse CSS transition.

For an out-of-stock scan: apply warning amber (#F59E0B) background and the appropriate out-of-stock message. For an unknown barcode: apply danger (#EF4444) background with the unknown barcode message.

Only one notification is active at a time. If a new scan occurs while a notification is still visible, replace the current notification immediately with the new one — do not queue them.

---

## Expected Output

After this task, `frontend/hooks/useBarcodeScanner.ts` is implemented and integrated into the POS page. USB HID barcode scanners that emit characters at 50ms or faster intervals are correctly detected. The scanned barcode is resolved against the backend catalog using cache-first TanStack Query lookups. Successful scans add the item to the cart and trigger the flash notification strip. Out-of-stock and unknown barcode scans show appropriate notifications. The hook is disabled when modals are open and does not interfere with manual text input fields.

---

## Notes

The 50ms timing threshold is empirically derived from typical USB HID barcode scanner hardware. Some very fast scanners emit characters at intervals as low as 5ms. Some slower or older scanners may have inter-keystroke intervals up to 30ms. The 50ms threshold provides a comfortable margin for the range of hardware typically encountered in a retail environment. If integration testing with a specific physical scanner model reveals issues, the constant in `pos.config.ts` can be tuned without any logic changes.

Cache-first lookups for barcode resolution are critical for high-volume retail use. In a busy boutique, popular SKUs may be scanned dozens of times per day. Issuing a fresh network request on every scan of the same product would be wasteful and would degrade performance on slower connections or when the backend is under load. The five-minute cache window means only the first scan of any given barcode in a five-minute window hits the network.

The `window`-level keydown listener approach is more robust than the commonly used alternative of a hidden `<input>` element that receives scanner focus. The hidden input approach requires complex focus management that conflicts with the many other interactive elements on the POS terminal (search box, quantity steppers, PIN pad, etc.). The `window`-level listener with `activeElement` checking is simpler to reason about, handles all edge cases correctly, and does not require any focus manipulation.
