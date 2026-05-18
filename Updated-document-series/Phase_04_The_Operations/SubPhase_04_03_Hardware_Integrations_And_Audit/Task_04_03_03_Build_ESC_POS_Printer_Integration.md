# Task 04.03.03 — Build ESC/POS Printer Integration

## Metadata

| Field | Value |
|-------|-------|
| Task ID | 04.03.03 |
| SubPhase | 04.03 — Hardware Integrations and Audit |
| Complexity | High |
| Estimated Effort | 2 days |
| Dependencies | `python-escpos` library installed in the backend environment; printer configuration stored in `Tenant.settings.hardware` |
| Produces | `backend/apps/hardware/services/printer_service.py`, `backend/apps/hardware/views/printer_views.py` |
| Blocked By | Hardware settings UI (Task 04.03.05) for configuration input; until then, use Django shell or direct DB update |

---

## Objective

Integrate ESC/POS thermal printers into LankaCommerce so that every completed sale produces a paper receipt and every closed shift produces a Z-Report. The printer service uses the `python-escpos` library to communicate with printers over Network (TCP/IP) and USB transport modes. A test print function lets staff verify connectivity before putting the printer into production use.

Printer configuration lives in `Tenant.settings.hardware` as a JSON sub-object, shared with the cash drawer and CFD subsystems. This design keeps all hardware configuration in one predictable location, avoids adding new database tables, and supports a simple read-then-write merge pattern in the settings PATCH endpoint.

---

## Instructions

### Step 1: Install python-escpos and Verify Prerequisites

In the backend virtual environment, run `pip install python-escpos`. This is a pure Python library with no native compilation step on most platforms.

**On Windows for USB mode**: the `libusb` driver must be installed for the USB printer device using the Zadig tool. Without this step, the `Usb` class will not detect the printer. Network mode has no such requirement.

**On Linux**: run `apt install libusb-1.0-0-0-dev` and ensure the user running the Django process has read/write permissions on the USB device node (typically `/dev/bus/usb/...`).

After installation, test the import in a Python shell: `from escpos.printer import Network, Usb`. If this raises no errors, the environment is ready.

### Step 2: Define the PrinterConfig Structure (Documentation Only)

The printer configuration is stored as a JSON sub-object within `Tenant.settings`, under the key `hardware`. The expected structure:

- `printer_type` — string, either `"NETWORK"` or `"USB"`.
- `host` — string, required when `printer_type === "NETWORK"` (the printer's IP address).
- `port` — integer, default `9100`, used only in NETWORK mode.
- `paper_width` — string, either `"58mm"` (default) or `"80mm"`. Determines the maximum line character count: 32 characters for 58mm, 48 characters for 80mm.

The validation logic for this config is handled in Task 04.03.05. In the service layer, simply destructure what is provided and fall back to defaults.

### Step 3: Implement get_printer Helper

In `backend/apps/hardware/services/printer_service.py`, define:

```
def get_printer(config):
```

Implementation:
1. Import `Network` and `Usb` from `escpos.printer` inside the function (lazy import — the library may not be installed in all environments).
2. Inspect `config['printer_type']`:
   - If `"NETWORK"`: `printer = Network(config['host'], port=config.get('port', 9100), timeout=5.0)`
   - If `"USB"`: `printer = Usb(idVendor=config.get('usb_vendor', 0x0416), idProduct=config.get('usb_product', 0x5011))`
3. Return the configured printer instance.

The `get_printer` function is a private helper used by the other service functions. It does not handle errors — callers are responsible for catching `escpos.exceptions.NoDeviceError` and `ConnectionError`.

### Step 4: Implement print_sale_receipt

Define:

```
def print_sale_receipt(sale_id):
```

1. Fetch the Sale with selected related fields:
   ```
   sale = Sale.objects.select_related(
       'customer', 'shift__tenant'
   ).prefetch_related(
       'items__variant__product'
   ).get(id=sale_id)
   ```
2. Load printer config from `sale.shift.tenant.settings.get('hardware', {})`.
3. Call `printer = get_printer(config)`.
4. Determine `line_width = 32 if config.get('paper_width', '58mm') == '58mm' else 48`.
5. Build the receipt text section by section:

   **a. Initialization**: Call `printer.init()` to reset the printer to default state.

   **b. Header section**:
   - `printer.set(align='center', bold=True)`
   - Print store name (`sale.shift.tenant.name`) in bold, centred.
   - `printer.set(bold=False)`
   - Print address line if available.
   - Print a divider: line of `-` characters, `line_width` long.

   **c. Sale info section**:
   - Print receipt number: `"Receipt: {sale.receipt_number}"`.
   - Print date/time of sale formatted as "DD MMM YYYY, HH:mm".

   **d. Items section**:
   - `printer.set(align='left')`.
   - For each item in `sale.items.all()`:
     - Format: `"{qty} x {product_name}"` left-justified, `"{line_total}"` right-justified. Pad with spaces to fill `line_width`.
     - If variant name differs from product name, print variant name on a second line with 2-space indent.
   - Divider line.

   **e. Subtotals and discounts**:
   - Print subtotal.
   - If `sale.discount_amount > 0`: print `"Discount: -{discount}"`.
   - If `sale.tax_amount > 0`: print `"Tax: {tax}"`.
   - Print `"TOTAL"` in bold right-aligned with the total amount in bold.

   **f. Payment section**:
   - Print `"Paid via {sale.payment_method}"`.
   - If `sale.payment_method == 'CASH'`: print amount tendered and change due.

   **g. Footer**:
   - `printer.set(align='center')`.
   - Print "Thank you for your purchase!".
   - Print "LankaCommerce POS".

6. Call `printer.cut()` to trigger the paper cut.
7. Wrap the entire sequence in `try/finally: printer.close()`.

### Step 5: Implement print_z_report

Define:

```
def print_z_report(shift_id):
```

1. Fetch the Shift with aggregated totals:
   ```
   shift = Shift.objects.select_related(
       'tenant', 'opened_by'
   ).prefetch_related(
       'sales', 'cash_movements'
   ).get(id=shift_id)
   ```
2. Load printer config from `shift.tenant.settings.get('hardware', {})`.
3. Call `printer = get_printer(config)`.
4. `line_width = 32 or 48` based on paper width.

5. Build Z-Report layout:

   **a. Header**:
   - `printer.set(align='center', bold=True)`.
   - Print `"Z — REPORT"`.
   - `printer.set(bold=False)`.
   - Print store name.
   - Divider.

   **b. Shift info**:
   - Print "Opened: {shift.opened_at}".
   - Print "Closed: {shift.closed_at}".
   - Print "Cashier: {shift.opened_by.name}".
   - Divider.

   **c. Totals section**:
   - `"Sales Total"` right-aligned with the computed sale total.
   - `"Returns Total"` right-aligned with the return amount.
   - `"Net Revenue"` = Sales - Returns in bold.
   - Divider.

   **d. Cash movements**:
   - For each cash movement record: description, amount signed (positive for cash in, negative for cash out).

   **e. Cash reconciliation**:
   - `"Expected Cash"` — computed from net revenue + opening float.
   - `"Actual Cash"` — from shift.actual_cash.
   - `"Variance"` — Actual - Expected, in bold.
   - If variance is non-zero, print a warning.

6. Call `printer.cut()`.
7. `finally: printer.close()`.

### Step 6: Implement test_print

Define:

```
def test_print(printer_config):
```

1. Call `printer = get_printer(printer_config)`.
2. `printer.init()`.
3. Print `"LankaCommerce — Printer OK"`.
4. Print the current ISO timestamp.
5. Call `printer.cut()`.
6. `finally: printer.close()`.
7. This function does NOT swallow errors — exceptions propagate to the caller.

### Step 7: Build the Test Print DRF View

Create `backend/apps/hardware/views/printer_views.py`.

Define `TestPrintView` extending `APIView`:

- Authentication: `JWTAuthentication`
- Permission: `HasTenantPermission`
- Role check: `MANAGER` or `OWNER` only.

**`post` method** (POST because test print mutates state — it consumes paper):

1. Fetch tenant: `tenant = Tenant.objects.get(id=user.tenant_id)`.
2. Read `config = tenant.settings.get('hardware')`.
3. If config is None or missing `printer_type`: return 400 with `{"success": False, "error": {"code": "MISCONFIGURED", "message": "Printer is not configured. Go to Settings > Hardware to configure."}}`.
4. Call `test_print(config)`.
5. On success: return 200 with `{"success": True, "data": {"message": "Print successful."}}`.
6. On `escpos.exceptions.NoDeviceError` as e: return 500 with `{"success": False, "error": {"code": "NO_DEVICE", "message": str(e)}}`.
7. On `ConnectionError` as e: return 500 with `{"success": False, "error": {"code": "CONNECTION_ERROR", "message": str(e)}}`.
8. On any other exception: return 500 with `{"success": False, "error": {"code": "PRINTER_ERROR", "message": "An unexpected printer error occurred."}}`.

Set `Cache-Control: no-store` on the response because test results must never be cached.

Map to `POST /api/hardware/test-print/` in `backend/apps/hardware/urls.py` (create this file if it does not exist).

---

## Expected Output

- `backend/apps/hardware/services/printer_service.py` with `get_printer`, `print_sale_receipt`, `print_z_report`, and `test_print`.
- `backend/apps/hardware/views/printer_views.py` with `TestPrintView`.
- `backend/apps/hardware/urls.py` with `POST /api/hardware/test-print/`.

---

## Validation

- Call `test_print` with a valid printer config against a real network printer: the printer outputs "LankaCommerce — Printer OK" and a timestamp, then cuts.
- Call `print_sale_receipt` with a valid sale ID: the printer outputs a correctly formatted receipt with store name, items, totals, payment info, and cuts.
- Call `print_z_report` with a valid shift ID: the printer outputs a Z-Report with date range, sales total, returns, net revenue, cash movements, and variance.
- Call `test_print` with an unreachable host: the function raises `ConnectionError` (not swallowed).
- `POST /api/hardware/test-print/` with a configured printer: returns 200 with `success: True`.
- `POST /api/hardware/test-print/` with no printer config: returns 400 with MISCONFIGURED error.
- `POST /api/hardware/test-print/` with an invalid IP address: returns 500 with NO_DEVICE error.
- Response headers include `Cache-Control: no-store`.

---

## Notes

The `python-escpos` library uses a synchronous blocking API. Each call to `printer.text(...)` blocks until the data is buffered. For Network printers, configure a socket timeout of 5.0 seconds when constructing the `Network` object to avoid hanging the POS sale endpoint if the printer is unreachable: `Network(host, port, timeout=5.0)`.

Paper width handling is critical: 58mm paper supports approximately 32 monospace characters per line, while 80mm paper supports 48 characters. All receipt text must be formatted within these limits. Text exceeding the line width will either wrap (breaking layout) or be silently truncated — neither is acceptable. Use string truncation routines that append ellipsis when a field name or product name exceeds available space.

Never import `python-escpos` at module level in any Django module that may be imported at startup. Since the library may not be installed in all environments, use lazy imports inside function bodies. If the library is not installed, any printer function call will raise `ModuleNotFoundError`, which should be caught and converted to a friendly error message.

For USB printers on Windows, the libusb driver installation via Zadig is mandatory. Without it, the `Usb` class cannot claim the USB interface. Linux users may need to configure udev rules to grant the Django process user access to the USB device node.