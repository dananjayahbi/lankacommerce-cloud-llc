# Task 03.02.11 — Implement Offline Mode Cart Persistence

## Metadata

| Field | Value |
|---|---|
| Task | 03.02.11 |
| Name | Implement Offline Mode Cart Persistence |
| Sub-Phase | 03.02 — Payments, Receipts & Offline Mode |
| Complexity | High |
| Depends On | Task 03.02.06 (Sale API Routes), SubPhase 03.01 complete |
| Produces | `frontend/lib/idb-store.ts`, `frontend/hooks/usePersistCartEffect.ts`, `frontend/hooks/useOfflineSync.ts` |

## Objective

Implement two complementary React hooks that together ensure the POS terminal operates gracefully during network disruptions: `usePersistCartEffect` continuously snapshots the cashier's in-progress cart to IndexedDB so it survives page refreshes, and `useOfflineSync` detects loss of connectivity, holds any pending sale submission in IndexedDB, and automatically replays it when the network recovers.

## Instructions

### Step 1: Install the idb Library

Install the `idb` library — a Promise-based TypeScript-typed wrapper around the browser's IndexedDB API. From the `frontend/` directory, run `npm install idb` (or `pnpm add idb` depending on the project's package manager). Confirm that `idb` appears in `frontend/package.json` under `dependencies`.

Do not use the raw `indexedDB` browser API directly — always go through the `idb` wrapper. The raw API is callback-based and error-prone; `idb` translates it into `async/await`-compatible Promises with TypeScript generics.

### Step 2: Create the IndexedDB Store Module

Create `frontend/lib/idb-store.ts`. This module is the single place in the frontend that opens the IndexedDB database and manages schema upgrades. Define the database name constant as `"lankacommerce_offline_db"`. Define two object store name constants: `"cart_persist"` and `"sale_queue"`.

Implement and export the function `getOfflineDB`. It calls `openDB` from `idb` with the database name, version `1`, and an `upgrade` callback. Inside the upgrade callback, create the `"cart_persist"` store (with `keyPath: "storeKey"`) and the `"sale_queue"` store (with `autoIncrement: true` and `keyPath: "id"`) using existence checks before creation — creating an already-existing store throws in IndexedDB, making the existence check mandatory.

Implement and export six helper functions:
- `saveCartSnapshot(storeKey, cartData)` — puts `{ storeKey, data: cartData, savedAt: Date.toISOString() }` into `"cart_persist"`.
- `loadCartSnapshot(storeKey)` — gets the record by `storeKey`, returns `record.data` or `null`.
- `clearCartSnapshot(storeKey)` — deletes the record by `storeKey` from `"cart_persist"`.
- `enqueueOfflineSale(payload)` — adds `{ payload, queuedAt: Date.toISOString() }` to `"sale_queue"` and returns the generated numeric key.
- `getQueuedSale()` — reads all keys from `"sale_queue"`, retrieves the first (oldest) record, and returns it or `null`.
- `dequeueOfflineSale(key)` — deletes the record by numeric key from `"sale_queue"`.

### Step 3: Implement usePersistCartEffect

Create `frontend/hooks/usePersistCartEffect.ts`. The hook accepts `cartState` (the current cart state from the Zustand cart store) and `tenantSlug` (string). The IndexedDB key is `"lankacommerce_cart_" + tenantSlug` — this namespacing ensures independent per-tenant cart storage.

The hook contains two `useEffect` calls. The first runs whenever `cartState` or `tenantSlug` changes. If the cart items array is empty, call `clearCartSnapshot` (an empty cart is not worth restoring). If non-empty, call `saveCartSnapshot`. Both calls use async IIFEs (`(async () => { await ... })()`). Errors are caught and logged to `console.warn` — a cart persistence failure should never crash the terminal or show an error modal.

The second `useEffect` runs once on mount (empty dependency array). It calls `loadCartSnapshot` and, if a non-null result is returned, calls the Zustand cart store's `restoreCart` action with the loaded snapshot. Errors are caught and logged to `console.warn`.

The hook returns nothing.

### Step 4: Implement useOfflineSync

Create `frontend/hooks/useOfflineSync.ts`. The hook accepts `tenantSlug` (string). It returns an object with four fields: `isOnline` (boolean), `isSyncing` (boolean), `hasPendingSale` (boolean), and `syncError` (string or null).

Initialise `isOnline` from `navigator.onLine`. The first `useEffect` registers `window` `online` and `offline` event listeners — the `online` handler sets `isOnline` to true, the `offline` handler sets it to false. Clean up both listeners in the effect's return function.

The second `useEffect` depends on `[isOnline]`. When `isOnline` becomes true: call `getQueuedSale()`. If null, return. If a sale is found: set `isSyncing` to true and `syncError` to null. Inject `queued_at` into the payload from the record's `queuedAt` field. Call `POST /api/pos/sales/` with the enriched payload.

If the API call succeeds (2xx): call `dequeueOfflineSale`, set `isSyncing` to false, and dispatch a `CustomEvent` on `window` with the event type `"lankacommerce:offlineSaleSynced"` and the response sale as the event `detail`. The terminal page listens for this event and opens `ReceiptPreviewDialog`. This decoupled event pattern avoids passing callbacks deep into the hook.

If the API call returns HTTP 410 (stale): call `dequeueOfflineSale`, set `isSyncing` to false, set `syncError` to "Offline sale was too old to process and has been discarded. Please re-enter the sale." Show a warning toast.

For any other error: set `isSyncing` to false, do NOT dequeue. Set `syncError` to a human-readable message. The failed sale remains in IndexedDB for retry on the next `online` event. If a `retryCount` field in the payload exceeds 3, auto-discard and set `syncError` to "Offline sale failed to sync after 3 attempts and has been discarded."

### Step 5: The Queue Limit and One-Sale Rule

The `useOfflineSync` hook enforces a limit of exactly one pending sale in the queue. When the `offline` event fires and the cashier attempts to submit a sale, the terminal component checks `hasPendingSale` before allowing a submission. If `hasPendingSale` is true, the terminal shows a blocking warning: "You have an unsynced sale from when the terminal was offline. Please wait for it to sync before starting another sale." The cashier cannot proceed until the sync completes or they manually discard via a "Discard" option.

This one-sale limit is a deliberate constraint. Multiple queued offline sales create exponential complexity in sync ordering and stock deduction sequencing.

### Step 6: Offline Status Badge

In `frontend/app/[tenantSlug]/terminal/page.tsx`, import `useOfflineSync` and render an offline status badge in the terminal header. When `isOnline` is false: an amber pill (`bg-yellow-500`) with white text "Offline". When `isSyncing` is true and `isOnline` is true: a blue info pill with "Syncing…" and a small spinner. When both are normal: render nothing — the absence of the badge is the normal state. Use `transition-opacity duration-300` to avoid layout shifts.

### Step 7: Wire the Hooks into the Terminal Page

In `frontend/app/[tenantSlug]/terminal/page.tsx`: import both hooks. Obtain `cartState` from the Zustand cart store selector. Call `usePersistCartEffect(cartState, params.tenantSlug)` unconditionally. Call `useOfflineSync(params.tenantSlug)` and destructure the returned fields. Add an event listener for `"lankacommerce:offlineSaleSynced"` that opens `ReceiptPreviewDialog` with the synced sale data.

## Expected Output

- `frontend/lib/idb-store.ts` created with `getOfflineDB` and six helper functions.
- `frontend/hooks/usePersistCartEffect.ts` created with two `useEffect` calls.
- `frontend/hooks/useOfflineSync.ts` created with `isOnline`, `isSyncing`, `hasPendingSale`, and `syncError` state.
- Both hooks wired into `frontend/app/[tenantSlug]/terminal/page.tsx`.

## Validation

- Add items to the cart and refresh the page — confirm the cart is restored from IndexedDB.
- Clear the cart and refresh — confirm an empty cart is not restored (stale data was cleared).
- Disconnect from the network and attempt to submit a sale — confirm the payload is queued in IndexedDB and the "Offline" badge appears in the header.
- Reconnect — confirm the queued sale is submitted automatically and `ReceiptPreviewDialog` opens.
- Queue a stale sale (by manually adjusting `queuedAt` in IndexedDB devtools to over 4 hours ago) and reconnect — confirm it is discarded with the appropriate `syncError` message.

## Notes

- The IndexedDB database name `"lankacommerce_offline_db"` is specific to the LankaCommerce platform. If the same browser is used for multiple platforms, the namespacing prevents cross-platform data collisions.
- The custom event name `"lankacommerce:offlineSaleSynced"` follows the same platform namespacing convention.
- Offline mode is a best-effort enhancement — a failed cart restoration means the cashier starts with an empty cart, which is acceptable and non-catastrophic.
