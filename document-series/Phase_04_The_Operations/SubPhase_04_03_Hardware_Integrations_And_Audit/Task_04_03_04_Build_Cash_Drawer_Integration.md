# Task 04.03.04 — Build Cash Drawer Integration

## Metadata

| Field | Value |
|-------|-------|
| Task ID | 04.03.04 |
| SubPhase | 04.03 — Hardware Integrations and Audit |
| Complexity | Medium |
| Estimated Effort | 1 day |
| Dependencies | Task 04.03.03 (printer service `get_printer` and `python-escpos` available); printer config stored in `Tenant.settings.hardware` |
| Produces | `backend/apps/hardware/services/cash_drawer_service.py`, `backend/apps/hardware/views/drawer_views.py`, updated `backend/apps/pos/views/sale_views.py`, updated `backend/apps/pos/views/return_views.py` |
| Blocked By | Task 04.03.03 |

---

## Objective

Automatically kick the cash drawer whenever a cash transaction completes — whether a CASH sale or a CASH refund. The cash drawer is physically connected to the thermal printer via its RJ-11 drawer port, so the kick command is sent as an ESC/POS instruction through the same `python-escpos` printer connection used for receipts.

The kick is fire-and-forget: if the drawer fails to open (printer is busy, drawer is unplugged, or the solenoid is jammed), the error is logged and swallowed. The sale transaction must never be blocked or rolled back by a drawer failure. This design prioritises sale throughput over drawer reliability — staff can always open the drawer manually with a key.

---

## Instructions

### Step 1: Implement kick_cash_drawer

Create `backend/apps/hardware/services/cash_drawer_service.py`.

Define:

```
def kick_cash_drawer(printer_config):
```

1. Import `get_printer` from `backend.apps.hardware.services.printer_service`.
2. Import `logging; logger = logging.getLogger(__name__)`.
3. Function body:
   - Call `printer = get_printer(printer_config)`.
   - Call `printer.cashdraw(2)` which activates the standard cash drawer solenoid on pin 2 of the RJ-11 port.
   - In a `finally` block, call `printer.close()`.
4. Wrap the entire body (except the function definition) in a `try/except Exception:`:
   - `logger.warning(f"[CashDrawer] Failed to kick drawer: {e}", exc_info=True)`
5. The function always returns silently — it never raises.

**Pin selection detail**: The `cashdraw` method accepts pin 0 (RJ-11 pin 2, the standard) or pin 1 (RJ-11 pin 5, used by some drawer models as a fallback). Pin 2 is the default for most standard POS cash drawers. If a particular drawer does not respond, try pin 1 and document the override in the tenant's hardware settings for future use.

**Timing detail**: The ESC/POS command sends a pulse of approximately 120ms duration (60 on-time units, 0 off-time). This is sufficient for all standard POS cash drawers. The `cashdraw(pin, on_time=60, off_time=60)` signature allows tuning if needed.

### Step 2: Implement test_drawer

Define:

```
def test_drawer(printer_config):
```

1. Call `get_printer(printer_config)`.
2. Call `printer.cashdraw(2)`.
3. `finally: printer.close()`.
4. This function does NOT swallow errors. If the drawer is unreachable, the exception propagates to the caller.

### Step 3: Wire Cash Drawer Kick into Sale Completion

In `backend/apps/pos/views/sale_views.py`:

1. Import `kick_cash_drawer` from `backend.apps.hardware.services.cash_drawer_service`.
2. After the sale transaction completes successfully and the response has been sent (or at the end of the view method, after the response), check:
   ```
   if sale.payment_method == 'CASH':
       config = request.tenant.settings.get('hardware', {})
       if config.get('printer_type'):
           kick_cash_drawer(config)
   ```
3. The call is intentionally not wrapped in a try/except here — `kick_cash_drawer` already swallows all exceptions internally.
4. The drawer kick is a fire-and-forget side effect. The sale response is returned to the frontend immediately without waiting for the drawer.

**Important**: Fetch the printer config from the `Tenant` object at the start of the view method (or from `request.tenant` if available via middleware) and pass it to `kick_cash_drawer`. Do not query the database again just for the hardware config — read it once from the request context.

### Step 4: Wire Cash Drawer Kick into Return Completion

In `backend/apps/pos/views/return_views.py`:

1. Import `kick_cash_drawer` from the same module.
2. After the return transaction completes successfully, check:
   ```
   if return.refund_method == 'CASH':
       config = request.tenant.settings.get('hardware', {})
       if config.get('printer_type'):
           kick_cash_drawer(config)
   ```
3. Same fire-and-forget pattern.

### Step 5: Build the Test Drawer DRF View

Create `backend/apps/hardware/views/drawer_views.py`.

Define `TestDrawerView` extending `APIView`:

- Authentication: `JWTAuthentication`
- Permission: `HasTenantPermission`
- Role check: `MANAGER` or `OWNER` only.

**`post` method**:

1. Fetch tenant: `tenant = Tenant.objects.get(id=user.tenant_id)`.
2. Read `config = tenant.settings.get('hardware')`.
3. If config is None or missing `printer_type`: return 400 with `{"success": False, "error": {"code": "MISCONFIGURED", "message": "Printer is not configured. The drawer is connected via the printer."}}`.
4. Call `test_drawer(config)`.
5. On success: return 200 with `{"success": True, "data": {"message": "Drawer test successful."}}`.
6. On `escpos.exceptions.NoDeviceError` as e: return 500 with `{"success": False, "error": {"code": "NO_DEVICE", "message": str(e)}}`.
7. On `ConnectionError` as e: return 500 with `{"success": False, "error": {"code": "CONNECTION_ERROR", "message": str(e)}}`.
8. On any other exception: return 500 with a generic error.

Set `Cache-Control: no-store` on the response.

Map to `POST /api/hardware/test-drawer/` in `backend/apps/hardware/urls.py`.

---

## Expected Output

- `backend/apps/hardware/services/cash_drawer_service.py` with `kick_cash_drawer` and `test_drawer`.
- `backend/apps/hardware/views/drawer_views.py` with `TestDrawerView`.
- Updated `backend/apps/pos/views/sale_views.py` — cash drawer kick after CASH sale.
- Updated `backend/apps/pos/views/return_views.py` — cash drawer kick after CASH refund.
- Updated `backend/apps/hardware/urls.py` — add `POST /api/hardware/test-drawer/`.

---

## Validation

- Complete a CASH sale: the cash drawer opens (hear the solenoid click).
- Complete a CARD sale: the cash drawer does NOT open.
- Complete a CASH return (refund): the cash drawer opens.
- Complete a CARD return: the cash drawer does NOT open.
- Simulate a drawer failure (unplug the printer while kicking): the sale transaction completes successfully and returns 201. The error is logged with `[CashDrawer] Failed to kick drawer:` prefix.
- `POST /api/hardware/test-drawer/` with a configured printer: returns 200 with success message and drawer opens.
- `POST /api/hardware/test-drawer/` with no printer config: returns 400 with MISCONFIGURED.
- `POST /api/hardware/test-drawer/` with unreachable printer: returns 500.
- Response headers include `Cache-Control: no-store`.

---

## Notes

The cash drawer does not have its own network connection — it connects to the printer via a standard RJ-11 telephone cable, and the printer receives the ESC/POS `cashdraw` command over the same TCP/IP or USB connection used for receipts. This means the drawer is only as available as the printer. If the printer is offline, the drawer cannot be kicked electronically, and staff must use the manual key override on the drawer itself.

Fetch the `PrinterConfig` from the sale service's existing `Tenant` object to avoid an extra database query. In `sale_views.py`, the `Tenant` is typically available as `request.tenant` (via middleware) or can be fetched once at the start of the view method and passed down. The `kick_cash_drawer` function accepts the config dict directly — it does not fetch it internally — so the caller controls the source of truth.

The fire-and-forget pattern means that if the cash drawer is unplugged, the sale still completes. This is intentional: POS terminals must not become unusable because of peripheral failures. The warning log entry provides an audit trail for managers to investigate later. If a store wants to enforce drawer availability, that should be implemented as a separate shift-open preflight check, not as a blocker on individual sales.

The `cashdraw` command sends an electrical pulse to the solenoid that releases the drawer latch. The pulse duration defaults to approximately 120ms, which is sufficient for all common POS drawers. Some drawers may require a longer pulse — this can be controlled via the optional `on_time` and `off_time` parameters to `cashdraw()` if needed.