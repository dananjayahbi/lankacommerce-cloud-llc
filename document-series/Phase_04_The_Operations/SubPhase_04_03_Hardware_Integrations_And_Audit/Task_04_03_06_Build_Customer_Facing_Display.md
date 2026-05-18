# Task 04.03.06 — Build Customer Facing Display

## Metadata

| Field | Value |
|-------|-------|
| Task ID | 04.03.06 |
| SubPhase | 04.03 — Hardware Integrations and Audit |
| Complexity | Medium |
| Estimated Effort | 1.5 days |
| Dependencies | Task 04.03.07 (CFD SSE endpoint — the page needs the stream to receive data) |
| Produces | `frontend/app/[tenantSlug]/cfd/page.tsx` |
| Blocked By | Task 04.03.07 (without the SSE stream, the page can only show the Idle state) |

---

## Objective

Create a full-screen Customer Facing Display (CFD) page that shows live cart contents to customers on a separate monitor. The CFD connects to a Server-Sent Events (SSE) endpoint and cycles through three visual states: Idle (waiting for a transaction), Active (showing cart items and totals), and Complete (thank-you screen with auto-reset). The page is intentionally unauthorised — it is designed for a local-network display that any browser on the same network can access.

The CFD is a pure display client: it never sends data to the server. All state transitions are driven by SSE messages from the backend, which are emitted by the cart store when items are scanned, removed, or the transaction is completed. This one-way data flow ensures the CFD cannot accidentally mutate backend state.

---

## Instructions

### Step 1: Route Setup and Layout Isolation

Create `frontend/app/[tenantSlug]/cfd/page.tsx` as a Client Component.

**Important Layout Consideration**: The CFD route MUST NOT inherit the standard dashboard layout (sidebar, header, navigation chrome). There are two approaches:

1. **Route Group** — place the CFD page in a route group that uses a separate layout file:
   - `frontend/app/[tenantSlug]/(cfd)/cfd/page.tsx` with `frontend/app/[tenantSlug]/(cfd)/layout.tsx` that renders only `{children}` without any chrome.
2. **Inline styles override** — If no separate layout group, override the dashboard layout by setting the parent container styles. The preferred approach is the route group.

**Page styling**:
- Full viewport: `min-h-screen`, `w-screen`, `overflow-hidden`.
- Background: `#F1F5F9` (Tailwind bg-slate-100).
- Zero margin: `m-0`, `p-0`.
- Centre content vertically and horizontally using `flex` and `items-center justify-center`.
- No scrollbars: `overflow-hidden`.

**No authentication guard**: The CFD page does not call `useAuth()`, does not check session cookies, and does not redirect unauthenticated users. It renders for anyone who navigates to the URL. The only prerequisite is that the SSE endpoint (`/api/hardware/cfd/stream/`) must accept requests without authentication — this is handled in Task 04.03.07.

### Step 2: SSE Subscription and State Management

**State variable**:
```
const [cartState, setCartState] = useState(null);
```

**EFfect setup**:
```
useEffect(() => {
    const eventSource = new EventSource(
        `${process.env.NEXT_PUBLIC_API_URL}/api/hardware/cfd/stream/?tenant_slug=${tenantSlug}`
    );

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            setCartState(data);
        } catch (e) {
            console.error('[CFD] Failed to parse SSE message:', e);
        }
    };

    eventSource.onerror = () => {
        console.warn('[CFD] SSE connection error — will auto-reconnect');
        // EventSource automatically attempts to reconnect
    };

    return () => {
        eventSource.close();
    };
}, [tenantSlug]);
```

**State derivation**:
- `isIdle`: `cartState === null` OR `cartState.status === 'IDLE'` OR (`cartState.items` is an empty array AND `cartState.status` is not `'COMPLETE'`).
- `isActive`: `cartState !== null` AND `cartState.status !== 'COMPLETE'` AND `cartState.items?.length > 0`.
- `isComplete`: `cartState !== null` AND `cartState.status === 'COMPLETE'`.

**Transition opacity**: Use CSS transitions to prevent flashing when switching between states:
- Set a 200ms `opacity` transition on the state container: `style={{ transition: 'opacity 200ms ease-in-out' }}`.
- On state change, briefly set opacity to 0, then back to 1 after 50ms (to allow the browser to render the new content before fading in).

### Step 3: Idle State

Render when `isIdle` is true. The screen is divided vertically:

**Upper area (flex-grow, centred)**:
- Store name in Inter font, `text-5xl` (48px), `font-bold`, colour navy `#1B2B3A`. Centred.
- Below it: tagline "Welcome" in Inter font, `text-xl` (20px), colour orange `#F97316`. Centred.

**Middle area**:
- Current time rendered in JetBrains Mono, `text-6xl` (60px), colour navy `#1B2B3A`. Centred. Updates every 1 second using a `useEffect` with `setInterval`:
  ```
  const [timeString, setTimeString] = useState(new Date().toLocaleTimeString());
  useEffect(() => {
      const interval = setInterval(() => {
          setTimeString(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }, 1000);
      return () => clearInterval(interval);
  }, []);
  ```
- Below the clock: the date line in Inter, `text-base`, colour text-muted `#64748B`.

**Lower area (fixed footer)**:
- A full-width bar, 6px height, background colour navy `#1B2B3A`, positioned at the bottom using `absolute bottom-0 left-0 right-0`.

### Step 4: Active State

Render when `isActive` is true. The screen is split into two panels:

**Left / Items Panel (approximately 65% width)**:
- `div` with `flex-1`, `overflow-y-auto`, padding 24px.
- A heading "Items" in Inter 14px text-muted `#64748B` at the top.
- For each item in `cartState.items`:
  - A row with `flex justify-between items-center`, `py-3`, `border-b` border colour `#E2E8F0`.
  - **Left side**: product name in Inter 18px navy `#1B2B3A`. If a variant name is present (differs from product name), show it below in Inter 14px text-muted `#64748B`.
  - **Right side**: quantity in JetBrains Mono 18px navy, then line total in JetBrains Mono 18px navy right-aligned with `text-right`, with `ml-auto`.
  - Format line total as currency: `LKR {amount.toFixed(2)}` (or the tenant's configured currency symbol).

**Right / Totals Panel (approximately 35% width)**:
- `div` with `w-[35%]`, `bg-white`, padding 32px, centred vertically.
- Subtotal: label "Subtotal" in Inter 16px text-muted, value in JetBrains Mono 20px navy, right-aligned.
- Discounts (if `cartState.discount_amount > 0`): label "Discount" in Inter 16px, value in JetBrains Mono 20px in orange `#F97316`, prefixed with minus sign.
- Promotion badges (if `cartState.promotions` is an array with items): render each as a small ShadCN `Badge` with warning `#F59E0B` background, displaying the promotion name.
- Total: label "Total" in Inter 18px bold, value in JetBrains Mono `text-4xl` (36px) navy `#1B2B3A`. Use a top border `border-t` border `#E2E8F0` above with `pt-4`.
- Customer name (if `cartState.customer_name` is present): display "Customer: {name}" in Inter 14px text-muted, below the total.

### Step 5: Complete State

Render when `isComplete` is true. Full-screen centred content:

- Lucide `CheckCircle2` icon, size 80px, colour orange `#F97316`.
- "Thank You!" in Inter `text-5xl` (48px), `font-bold`, colour navy `#1B2B3A`.
- Total amount in JetBrains Mono `text-4xl` (36px), navy `#1B2B3A`, with currency formatting.
- If `cartState.change_due > 0` (cash payment): "Change due: LKR {change_due.toFixed(2)}" in Inter 20px text-muted `#64748B`.
- Subtagline "Have a wonderful day!" in Inter 18px, orange `#F97316`.

**Auto-reset to Idle**:
```
useEffect(() => {
    if (isComplete) {
        const timeout = setTimeout(() => {
            setCartState(null);
        }, 8000);
        return () => clearTimeout(timeout);
    }
}, [isComplete]);
```

The 8-second timeout should be cleared in cleanup to avoid resetting if the component unmounts or if a new transaction starts before the timeout fires.

### Step 6: CSS Transition Handling

Wrap the entire page content in a container div with:

- `style={{ transition: 'opacity 200ms ease-in-out', opacity: contentVisible ? 1 : 0 }}`
- `contentVisible` is a local boolean state that toggles briefly when `cartState` changes.

Implement:

```
const [contentVisible, setContentVisible] = useState(true);
const prevCartState = useRef(cartState);

useEffect(() => {
    if (prevCartState.current !== cartState) {
        setContentVisible(false);
        const timer = setTimeout(() => setContentVisible(true), 50);
        prevCartState.current = cartState;
        return () => clearTimeout(timer);
    }
}, [cartState]);
```

This creates a smooth 200ms fade transition between Idle, Active, and Complete states, preventing visual flashing.

---

## Expected Output

- `frontend/app/[tenantSlug]/cfd/page.tsx` — full-screen CFD page with SSE subscription, three-state rendering, CSS transitions, and auto-reset timer.

---

## Validation

- Open the CFD page in a browser without logging in: the page loads, shows Idle state with store name, Welcome tagline, and live clock.
- The clock updates every second — verify by watching the seconds change.
- Start a sale on the POS: the CFD page transitions to Active state showing items and totals within 1 second.
- Add an item to the cart: the items list updates dynamically.
- Remove an item: the items list and total update dynamically.
- Apply a promotion: the discount line and promotion badge appear in the Active state.
- Complete the sale with CASH payment: the CFD transitions to Complete state with total, change due, and "Thank You!".
- Complete the sale with CARD payment: the CFD shows Complete state without change due.
- After 8 seconds in Complete state: the CFD auto-resets to Idle state.
- Close the SSE connection (stop the backend): the CFD displays the last known state and shows a console warning on reconnect attempts.
- Resize the browser window: the CFD layout remains full-screen and responsive.
- Open the CFD in two browsers simultaneously: both display the same data (the SSE stream broadcasts to all connected clients).

---

## Notes

The `EventSource` API automatically reconnects when the connection drops. The `onerror` handler fires on connection failures, but `EventSource` will repeatedly attempt to reconnect with an exponential backoff (starting at ~3 seconds). There is no need to manually implement reconnection logic. The `close()` cleanup in the `useEffect` return prevents stale connections when the component unmounts.

The CFD page must not include the dashboard layout. If the Next.js route structure uses a shared layout that includes the sidebar and header, create a separate layout group. The simplest approach is to create a `(cfd)` route group folder at the same level as the existing route structure. The layout file for this group should be minimal:

```
export default function CfdLayout({ children }) {
    return <>{children}</>;
}
```

No authentication guard is intentional. The CFD is designed to run on a local-network machine (e.g., a tablet or second monitor) that is physically inside the store. Adding authentication would require a staff member to log in every time the CFD browser is refreshed, which defeats the purpose of a passive customer-facing display. The SSE endpoint itself also has no authentication (handled in Task 04.03.07).

The 200ms opacity transition prevents the jarring hard cut between states. A brief 50ms hidden state gives the browser time to render the new content before fading in. Without this transition, the CFD would flash white or show partial content during React re-renders. The 8-second auto-reset timer is tuned for a typical POS transaction — long enough for the customer to read the total and see the thank-you message, but short enough that the display is ready for the next customer quickly.
