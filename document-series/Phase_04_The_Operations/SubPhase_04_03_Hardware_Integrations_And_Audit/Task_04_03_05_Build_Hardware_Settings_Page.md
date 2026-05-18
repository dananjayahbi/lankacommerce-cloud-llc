# Task 04.03.05 — Build Hardware Settings Page

## Metadata

| Field | Value |
|-------|-------|
| Task ID | 04.03.05 |
| SubPhase | 04.03 — Hardware Integrations and Audit |
| Complexity | Medium |
| Estimated Effort | 1.5 days |
| Dependencies | Task 04.03.03 (printer service functions exist), Task 04.03.04 (drawer service functions exist), Task 04.03.07 (CFD SSE endpoint for the CFD toggle) |
| Produces | `frontend/app/[tenantSlug]/settings/hardware/page.tsx`, `frontend/components/settings/HardwareSettingsForm.tsx`, `backend/apps/accounts/views/settings_views.py` (PATCH `/api/accounts/settings/hardware/`) |
| Blocked By | Tasks 04.03.03 and 04.03.04 for test functionality; CFD toggle depends on Task 04.03.07 but the form can be built before |

---

## Objective

Provide a single settings page where managers can configure the thermal printer (Network or USB), enable the cash drawer, and enable the Customer Facing Display. The page has a form section for configuration and a test connections section for verifying hardware connectivity. All hardware settings are stored in the existing `Tenant.settings` JSON under the `hardware` sub-object, avoiding a new database table.

The page uses a read-then-write JSON merge pattern to avoid overwriting other settings keys. Test buttons are disabled when there are unsaved changes to prevent testing with stale configuration. Success and destructive toasts provide immediate feedback for test operations.

---

## Instructions

### Step 1: Page Setup

Create `frontend/app/[tenantSlug]/settings/hardware/page.tsx` as a Client Component.

1. Import `useAuth()`. Check `user.role in ['MANAGER', 'OWNER']`. If not, render a ShadCN `Alert` with `variant="destructive"` and message "You do not have permission to configure hardware settings."
2. Extract `params.tenantSlug`.
3. Breadcrumb: Dashboard → Settings → Hardware.
4. Heading "Hardware Settings" in Inter 24px navy `#1B2B3A`.
5. Fetch the current hardware config from `GET /api/accounts/settings/hardware/` (or use the existing `GET /api/accounts/settings/` endpoint and extract `.settings.hardware`). Use TanStack Query with key `['hardware-settings', tenantSlug]`.
6. Pass the fetched `hardware` object and `tenantSlug` as props to `HardwareSettingsForm`.
7. Track the last saved config in a `savedConfig` state variable. Compare against the current form state to determine if there are unsaved changes.
8. Render `HardwareSettingsForm` and a separate test connections section.

### Step 2: Build the HardwareSettingsForm Component

Create `frontend/components/settings/HardwareSettingsForm.tsx` as a Client Component.

**Props**: `initialConfig` (the hardware sub-object from settings), `tenantSlug`, `onSavedConfigChange` (callback that receives the new saved config after successful save).

**Form State** (use `useState` for each field, or a single reducer):
- `printer_type`: `"NETWORK"` or `"USB"`, default `"NETWORK"`.
- `host`: string, default `""`, visible only when `printer_type === "NETWORK"`.
- `port`: number, default `9100`, visible only when `printer_type === "NETWORK"`.
- `paper_width`: `"58mm"` or `"80mm"`, default `"58mm"`.
- `cash_drawer_enabled`: boolean, default `false` (backed by ShadCN `Switch`).
- `cfd_enabled`: boolean, default `false` (backed by ShadCN `Switch`).

**Layout**:

- **Printer Configuration Card** (ShadCN `Card` with `CardHeader`, `CardContent`):
  - `CardTitle`: "Printer Configuration" in Inter 16px navy `#1B2B3A`.
  - `CardDescription`: "Configure the thermal receipt printer for this register."
  - Inside the card:
    - **Printer Type**: ShadCN `RadioGroup` with two options:
      - Value `"NETWORK"` with label "Network (TCP/IP)" — visible icon using `Wifi` (Lucide).
      - Value `"USB"` with label "USB" — visible icon using `Cable` (Lucide).
    - **IP Address**: ShadCN `Input` with `type="text"`, placeholder "192.168.1.100", visible only when `printer_type === "NETWORK"`. Use CSS (`className="block"` / `className="hidden"`) to show/hide rather than conditional mounting. This preserves field values when toggling between modes.
    - **Port**: ShadCN `Input` with `type="number"`, default 9100, visible only when `printer_type === "NETWORK"`.
    - **Paper Width**: ShadCN `Select` with options "58mm" and "80mm".

- **Peripheral Toggles Card**:
  - `CardTitle`: "Peripherals".
  - ShadCN `Switch` with label "Enable Cash Drawer" — mapped to `cash_drawer_enabled`. Below the label, subtle help text: "Automatically opens when a cash payment is completed."
  - ShadCN `Switch` with label "Enable Customer Facing Display" — mapped to `cfd_enabled`. Below the label, subtle help text: "Show cart contents on a second screen via browser."

- **Save Button**:
  - ShadCN `Button` with `variant="default"`, navy `#1B2B3A` background, white text.
  - Label: "Save Settings".
  - Disabled when form values match `savedConfig` (no changes).
  - On click: `useMutation` to `PATCH /api/accounts/settings/hardware/` with JSON body containing the form fields.
  - On success: call `onSavedConfigChange(data.hardware)` and `toast({ description: "Hardware settings saved." })`.
  - On error: `toast({ variant: "destructive", description: "Failed to save settings." })`.

**Validation**:
- If `printer_type === "NETWORK"` and `host` is empty or invalid: show inline error "IP address is required for network printers." and disable Save.
- `port` must be between 1 and 65535.
- Validation runs on every render and blocks save.

### Step 3: Build the Save Settings PATCH Endpoint

In `backend/apps/accounts/views/settings_views.py`, add `HardwareSettingsView`:

- Authentication: `JWTAuthentication`
- Permission: `HasTenantPermission`
- Role: `MANAGER` or `OWNER` only.

**`patch` method** on `PATCH /api/accounts/settings/hardware/`:

1. Fetch tenant: `tenant = Tenant.objects.get(id=user.tenant_id)`.
2. Read the current settings: `current_settings = tenant.settings or {}`.
3. Create a copy: `new_settings = dict(current_settings)`.
4. Read the existing hardware sub-object or default to empty: `existing_hardware = new_settings.get('hardware', {})`.
5. Parse the incoming request data.
6. Merge only the hardware fields: `merged_hardware = {**existing_hardware, **incoming_data}`.
   - This preserves any hardware fields that exist in the DB but were not sent by the client.
7. `new_settings['hardware'] = merged_hardware`.
8. Use `.filter(id=tenant.id).update(settings=new_settings)` to write the updated settings. This avoids triggering full model save signals and preserves concurrent writes to other settings keys.
9. Return response:
   ```
   {
       "success": True,
       "data": {
           "hardware": merged_hardware
       }
   }
   ```
10. On validation error (e.g., missing host for NETWORK): return 400 with `{"success": False, "error": {"code": "VALIDATION_ERROR", "message": "IP address is required for network printers."}}`.

### Step 4: Build the Test Connections Card

Below the HardwareSettingsForm in the page, render a second ShadCN `Card` titled "Test Connections".

**State management**:
- `testingPrinter`: boolean, loading state for printer test.
- `testingDrawer`: boolean, loading state for drawer test.
- `hasUnsavedChanges`: computed by deep comparing current form values vs `savedConfig`.

**Buttons**:
- "Test Printer" — ShadCN `Button` variant="outline":
  - Disabled when `hasUnsavedChanges` is true.
  - Shows a `Loader` spinner when `testingPrinter` is true.
  - On click: set `testingPrinter = true`. `POST /api/hardware/test-print/`.
    - On success: `toast({ title: "Printer Test", description: "Print successful!" })`.
    - On error: `toast({ variant: "destructive", title: "Printer Test Failed", description: error.message })`.
    - Finally: `testingPrinter = false`.

- "Test Drawer" — ShadCN `Button` variant="outline":
  - Disabled when `hasUnsavedChanges` is true.
  - Shows a `Loader` spinner when `testingDrawer` is true.
  - On click: `POST /api/hardware/test-drawer/`.
    - On success: `toast({ title: "Drawer Test", description: "Drawer opened successfully!" })`.
    - On error: `toast({ variant: "destructive", title: "Drawer Test Failed", description: error.message })`.
    - Finally: `testingDrawer = false`.

**Help text for unsaved state**: If `hasUnsavedChanges`, show a small italic hint below the buttons: "Save changes before testing."

### Step 5: Add USB Driver Help Text

Below the test buttons, add a ShadCN `Alert` with `variant="info"`:

- Title: "USB Printer Requirements" in Inter 12px bold.
- Body text: "For USB printers on Windows, the libusb driver must be installed via Zadig before USB printer detection will work. For network printers, assign a static IP address reachable from the server host."
- Icon: `Info` from Lucide.

---

## Expected Output

- `frontend/app/[tenantSlug]/settings/hardware/page.tsx` — page layout, role guard, breadcrumb, test connections card, alert.
- `frontend/components/settings/HardwareSettingsForm.tsx` — form with printer type radio, IP/port fields, paper width, peripheral toggles, save button.
- Updated `backend/apps/accounts/views/settings_views.py` — `HardwareSettingsView` with PATCH method.

---

## Validation

- Open the hardware settings page as MANAGER: form loads with current config, all fields populated.
- Change printer_type to USB: IP and Port fields hide, Paper Width and toggles remain visible.
- Change printer_type back to NETWORK: IP and Port fields reappear with their previous values preserved.
- Submit empty IP with NETWORK selected: Save button is disabled with validation error.
- Fill valid values and save: success toast appears, `savedConfig` updates.
- Click "Test Printer" before saving: button is disabled, hint "Save changes before testing" appears.
- Save first, then click "Test Printer": loading spinner appears, success toast on completion.
- Open as CASHIER: role guard alert is displayed, form is not rendered.
- Verify the PATCH endpoint returns the merged hardware object in the response.
- Verify the PATCH endpoint does not overwrite other settings keys (e.g., `tenant.settings.name` should remain unchanged after the PATCH).

---

## Notes

The PATCH endpoint must use a read-then-write merge pattern rather than directly assigning the incoming object to `settings['hardware']`. The two-step read-then-write ensures that concurrent updates to different settings keys (e.g., WhatsApp settings in Task 04.03.08) do not overwrite each other. Specifically: `current_settings = tenant.settings; current_settings['hardware'] = {**current_settings.get('hardware', {}), **incoming_data}; Tenant.objects.filter(id=tenant.id).update(settings=current_settings)`. This is not a full fix for race conditions (two simultaneous PATCH requests to the same tenant could still conflict), but it is sufficient for the expected usage pattern where hardware settings are configured once and rarely changed.

The `cfd_enabled` field is stored in the hardware settings for frontend convenience but the actual CFD enable/disable logic is enforced by the SSE endpoint (Task 04.03.07) which checks `Tenant.settings['hardware']['cfd_enabled']` before streaming. The toggle on this page is the single control point for CFD activation.

Show/hide for IP/Port fields uses CSS classes (`hidden`/`block`) rather than conditional mounting to preserve field state when toggling between NETWORK and USB. If the fields are unmounted when USB is selected, their values (e.g., a valid IP address) would be lost when switching back to NETWORK. Using CSS to hide them preserves the DOM state.

The test endpoints (`/api/hardware/test-print/` and `/api/hardware/test-drawer/`) must set `Cache-Control: no-store` on their responses. Without this, some browsers or CDNs may cache the successful response and return it from cache on subsequent test requests, preventing the user from seeing genuine test failures.
