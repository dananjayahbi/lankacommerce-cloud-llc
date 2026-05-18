# Task 04.03.11 — Build Shift Petty Cash and Cash Movements

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.03.11 |
| SubPhase | 04.03 — Hardware Integrations and Audit |
| Complexity | Medium |
| Estimated Effort | 1.5 days |
| Dependencies | CashMovement model (Phase 03, POS models), Shift model (Phase 03), Z-Report page (Phase 03) |
| Produces | `backend/apps/pos/views/cash_movement_views.py`, `frontend/components/shift/RecordCashMovementForm.tsx`, updated Z-Report page with cash movements table and reconciliation |
| Blocked By | Phase 03 POS core (Shift and CashMovement models) |

---

## Objective

During a retail shift, cashiers frequently need to take money out of the register for small expenses (buying packing materials, cleaning supplies, customer change shortages) or add money back in (cash top-ups from the office safe, customer payments received after tendering). These cash movements must be recorded with a reason and amount to maintain accurate cash reconciliation at the end of the shift. Without structured cash movement tracking, the Z-Report variance is impossible to explain — the expected cash in drawer never matches the counted cash, and discrepancies accumulate over time.

LankaCommerce's cash movement system provides two distinct transaction types: `PETTY_CASH_OUT` (money removed from the register for minor expenses) and `MANUAL_IN` (money added to the register from external sources). Each movement is tied to the current shift, recording who performed it and why. The Z-Report aggregates all movements into a "Net Petty Cash" summary and factors them into the cash reconciliation formula: `Opening Float + Cash Sales - Cash Refunds + MANUAL_IN - PETTY_CASH_OUT = Expected Cash`. This gives the manager or owner a complete, auditable trail of every cash movement during the shift.

---

## Instructions

### Step 1: Create the Cash Movement Views

Create `backend/apps/pos/views/cash_movement_views.py`.

**Helper: CashMovementSerializer** (inline or in serializers.py):

```python
class CashMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashMovement
        fields = ['id', 'shift_id', 'type', 'amount', 'reason', 'created_at', 'user_id']
        read_only_fields = ['id', 'shift_id', 'created_at', 'user_id']
```

**`GET /api/pos/shifts/{id}/cash-movements/` — `CashMovementListView`**:

Decorate with `@api_view(["GET"])`, `@authentication_classes([JWTAuthentication])`, `@permission_classes([HasTenantPermission])`.

```python
@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@permission_classes([HasTenantPermission])
def cash_movement_list_view(request, id):
    try:
        shift = Shift.objects.get(id=id, tenant_id=request.user.tenant_id, deleted_at__isnull=True)
    except Shift.DoesNotExist:
        return JsonResponse({"success": False, "error": {"code": "NOT_FOUND", "message": "Shift not found."}}, status=404)

    movements = CashMovement.objects.filter(shift_id=id).order_by('created_at')
    serializer = CashMovementSerializer(movements, many=True)
    return JsonResponse({"success": True, "data": serializer.data})
```

**`POST /api/pos/shifts/{id}/cash-movements/` — `CreateCashMovementView`**:

Decorate with `@api_view(["POST"])`, `@authentication_classes([JWTAuthentication])`, `@permission_classes([HasTenantPermission])`.

```python
@api_view(["POST"])
@authentication_classes([JWTAuthentication])
@permission_classes([HasTenantPermission])
def create_cash_movement_view(request, id):
    try:
        shift = Shift.objects.get(id=id, tenant_id=request.user.tenant_id, deleted_at__isnull=True)
    except Shift.DoesNotExist:
        return JsonResponse({"success": False, "error": {"code": "NOT_FOUND", "message": "Shift not found."}}, status=404)

    # Validate shift is OPEN
    if shift.status != 'OPEN':
        return JsonResponse({
            "success": False,
            "error": {"code": "SHIFT_CLOSED", "message": "Cannot create cash movements on a closed shift."}
        }, status=409)

    serializer = CashMovementSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse({"success": False, "error": {"code": "VALIDATION_ERROR", "message": serializer.errors}}, status=400)

    # Validate amount > 0 and <= 10000
    amount = serializer.validated_data.get('amount')
    if amount <= Decimal('0'):
        return JsonResponse({"success": False, "error": {"code": "INVALID_AMOUNT", "message": "Amount must be greater than zero."}}, status=400)
    if amount > Decimal('10000'):
        return JsonResponse({"success": False, "error": {"code": "AMOUNT_EXCEEDS_LIMIT", "message": "Amount cannot exceed Rs. 10,000."}}, status=400)

    # Validate reason length (max 200 chars)
    reason = serializer.validated_data.get('reason', '')
    if len(reason) > 200:
        return JsonResponse({"success": False, "error": {"code": "REASON_TOO_LONG", "message": "Reason must be 200 characters or fewer."}}, status=400)

    movement = CashMovement.objects.create(
        shift=shift,
        type=serializer.validated_data['type'],
        amount=amount,
        reason=reason,
        user_id=request.user.user_id,
    )

    result_serializer = CashMovementSerializer(movement)
    return JsonResponse({"success": True, "data": result_serializer.data}, status=201)
```

**Important**: The `CashMovement` model should already have a `type` field with choices `PETTY_CASH_OUT` and `MANUAL_IN`. If not, add the choice set in the existing model migration referenced in Phase 03 and confirm both choices are present. The `CASHIER` role and above must be allowed to create cash movements — this is enforced at the UI level (role guard in the component) rather than the backend, to keep the API flexible for future client types.

### Step 2: Build the RecordCashMovementForm Component

Create `frontend/components/shift/RecordCashMovementForm.tsx` as a Client Component.

Props: `shiftId: number`, `onSuccess: () => void`, `onError: (msg: string) => void`.

**State**:

- `type: 'PETTY_CASH_OUT' | 'MANUAL_IN'` (default `PETTY_CASH_OUT`).
- `amount: string` (empty by default).
- `reason: string` (empty by default).
- `isSubmitting: boolean`.

**Layout**:

**Type selector**:

Two tile-style radio buttons in a horizontal row:

- "Petty Cash Out" tile: left, icon of a cash with arrow out, border `#EF4444` when selected, `#E2E8F0` when unselected. Background `#FEF2F2` when selected.
- "Cash In" tile: right, icon of a cash with arrow in, border `#22C55E` when selected, `#E2E8F0` when unselected. Background `#F0FDF4` when selected.

Style each tile as a `button` with `onClick={() => setType('PETTY_CASH_OUT'|'MANUAL_IN')}`. Use `ring-2 ring-offset-2` for the selected state with the appropriate ring colour. Tiles are 50% width each.

**Amount input**:

ShadCN `Input` with `type="number"`, `min="0"`, `step="0.01"`, `max="10000"`. Label: "Amount (Rs.)". Placeholder: "0.00". JetBrains Mono font.

**Reason input**:

ShadCN `Textarea` with `maxLength={200}`. Label: "Reason". Placeholder: "e.g., Bought paper cups and straws". Live character counter below: `{reason.length}/200`. Counter turns red when `> 190`.

**Submit button**:

ShadCN `Button` with full width. Label: "Record [Type]" where Type is "Petty Cash" or "Cash In". Disabled when `isSubmitting === true` or `amount === ''` or `reason.trim() === ''`.

**Submission handler**:

```typescript
const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
        const response = await fetch(`/api/pos/shifts/${shiftId}/cash-movements/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: type,
                amount: amount,
                reason: reason,
            }),
        });
        const body = await response.json();
        if (body.success) {
            setType('PETTY_CASH_OUT');
            setAmount('');
            setReason('');
            onSuccess();
        } else {
            onError(body.error?.message || 'Failed to record cash movement.');
        }
    } catch (err) {
        onError('Network error. Please try again.');
    } finally {
        setIsSubmitting(false);
    }
};
```

### Step 3: Update the Z-Report Page

Edit `frontend/app/[tenantSlug]/reports/z-report/page.tsx`.

**Add a `cashMovements` query**:

```typescript
const { data: cashMovements, isLoading: isMovementsLoading } = useQuery({
    queryKey: ['cash-movements', shiftId],
    queryFn: () => fetch(`/api/pos/shifts/${shiftId}/cash-movements/`).then(r => r.json()),
    enabled: !!shiftId,
});
```

**Petty Cash Movements Table** (render a new card section on the Z-Report page):

1. Card header: "Petty Cash Movements" with an Inter heading.
2. If `isMovementsLoading`, show a ShadCN `Skeleton` component mimicking 3 table rows.
3. If `cashMovements?.data.length === 0`, show "No cash movements recorded for this shift." in `text-muted` (#64748B).
4. Table with columns: Time, Type, Reason, Recorded By, Amount.

**Column details**:

- **Time**: Formatted from `created_at` using `toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })`.
- **Type**: ShadCN `Badge`. If `type === 'PETTY_CASH_OUT'`: `{ variant: 'destructive', label: 'Out' }` with `#EF4444` background. If `type === 'MANUAL_IN'`: `{ variant: 'success', label: 'In' }` with `#22C55E` background.
- **Reason**: Inter body text, max 60 chars with `Tooltip` for full text.
- **Recorded By**: Resolve user name via `/api/users/${movement.user_id}/` (optional — if not available, display "Staff #[user_id]").
- **Amount**: JetBrains Mono. For `PETTY_CASH_OUT`: `-Rs. X.XX` in `#EF4444`. For `MANUAL_IN`: `+Rs. X.XX` in `#22C55E`.

**Summary row below the table**:

```typescript
const netPettyCash = cashMovements?.data.reduce((acc, m) => {
    return m.type === 'MANUAL_IN' ? acc + parseFloat(m.amount) : acc - parseFloat(m.amount);
}, 0) || 0;
```

Display: "Net Petty Cash: Rs. [netPettyCash.toFixed(2)]". Colour: `#22C55E` if positive, `#EF4444` if negative.

**+ Record Petty Cash button**:

- Top-right of the card, or right below the table.
- ShadCN `Button` with label "+ Record Petty Cash", `variant="outline"`.
- Disabled when `shiftStatus !== 'OPEN'`.
- Opens a ShadCN `Dialog` containing the `RecordCashMovementForm`.
- On success: close the dialog, show `toast({ description: "Cash movement recorded successfully." })`, invalidate the `['cash-movements', shiftId]` query.

### Step 4: Update Cash Reconciliation Calculation

On the Z-Report page, find the cash reconciliation section. Update the displayed formula.

**Component breakdown rows**:

```
Opening Float:         Rs. X.XX
Cash Sales:            Rs. X.XX
Cash Refunds:          Rs. X.XX
Manual Cash In:        Rs. X.XX    (sum of all MANUAL_IN movements)
Petty Cash Out:        Rs. X.XX    (sum of all PETTY_CASH_OUT movements)
─────────────────────────────────
Expected Cash:         Rs. X.XX    (calculated)
Actual Cash Counted:   Rs. X.XX    (from shift closure data)
Variance:              Rs. X.XX    (Expected − Actual)
```

**Computation**:

```typescript
const manualInTotal = cashMovements?.data
    .filter(m => m.type === 'MANUAL_IN')
    .reduce((sum, m) => sum + parseFloat(m.amount), 0) || 0;

const pettyCashOutTotal = cashMovements?.data
    .filter(m => m.type === 'PETTY_CASH_OUT')
    .reduce((sum, m) => sum + parseFloat(m.amount), 0) || 0;

const expectedCash = openingFloat + cashSales - cashRefunds + manualInTotal - pettyCashOutTotal;
const variance = expectedCash - actualCashCounted;
```

**Display**:

- Variance value rendered with JetBrains Mono.
- If `variance === 0` or positive: colour `#22C55E` (success), text "In balance" or "+Rs. X.XX".
- If `variance < 0`: colour `#EF4444` (danger), text "-Rs. X.XX", and a subtle warning icon.
- If `variance > 0`: colour `#22C55E` (success), text "+Rs. X.XX".

**Additionally**: Highlight each component row with a small icon or label clarifying the direction:

- Sales: "+" prefix, `#22C55E` colour.
- Refunds: "−" prefix, `#EF4444` colour.
- Manual Cash In: "+" prefix, `#22C55E` colour.
- Petty Cash Out: "−" prefix, `#EF4444` colour.

---

## Expected Output

- `backend/apps/pos/views/cash_movement_views.py` — `GET` list and `POST` create endpoints for shift-specific cash movements.
- `frontend/components/shift/RecordCashMovementForm.tsx` — form with type tiles, amount, reason, character counter, and submission.
- Updated Z-Report page — Petty Cash Movements table with badges and summary, updated cash reconciliation formula.

---

## Validation

- **List movements for a shift**: `GET /api/pos/shifts/1/cash-movements/` returns all movements ordered by `created_at`. Returns empty array if none exist.
- **Create movement on OPEN shift**: `POST` with valid data returns 201 with the created record. The table refreshes and shows the new entry.
- **Create movement on CLOSED shift**: Returns 409 with `SHIFT_CLOSED` code. The + Record Petty Cash button on the frontend is disabled.
- **Amount exceeds limit**: POST with `amount=50000` returns 400 with `AMOUNT_EXCEEDS_LIMIT`.
- **Amount is zero or negative**: POST with `amount=0` returns 400 with `INVALID_AMOUNT` code.
- **Reason exceeds 200 characters**: A direct API call with a 250-char reason returns 400 with `REASON_TOO_LONG` code.
- **Type tile toggle**: Click "Cash In" tile — it becomes selected with green highlight and the previously selected "Petty Cash Out" deselects.
- **Form reset on success**: After successfully submitting a PETTY_CASH_OUT, the form resets to defaults.
- **Reconciliation calculation**: With opening float 5000, cash sales 15000, cash refunds 500, manual cash in 0, petty cash out 150: expected cash = 5000 + 15000 - 500 + 0 - 150 = 19350. Variance shows correct difference.
- **Multiple cash movements**: Create 3 PETTY_CASH_OUT entries. The summary correctly sums all three.

---

## Notes

The cash reconciliation formula `Opening Float + Cash Sales - Cash Refunds + MANUAL_IN - PETTY_CASH_OUT = Expected Cash` matches standard retail accounting practices. The `MANUAL_IN` type covers scenarios like "cash top-up from safe" (when the register runs out of small change) and "customer payment correction" (when a sale was incorrectly tendered as non-cash but later paid in cash). The `PETTY_CASH_OUT` type covers small operational expenses that are too minor to go through the formal expense system. For larger expenses (over Rs. 10,000), the expense logging feature in SubPhase 04.02 should be used instead.

The `CASHIER` role has access to record cash movements, which is a deliberate design choice. In small retail operations, the cashier is often the only staff member present. Recording petty cash outs at the moment they occur prevents "I forgot" disputes at end-of-shift reconciliation. The reason field acts as the audit trail — managers should review cash movement reasons during the shift closure approval process.

The amount cap of Rs. 10,000 per movement is a soft limit enforced at the API level. It prevents accidental large entries while still allowing reasonable petty cash transactions. If a store needs to move larger amounts, they should use multiple transactions or the formal expense system. This cap can be made configurable via Tenant settings in a future iteration, allowing different limits for different store tiers.

## Objective

Record petty cash disbursements and manual deposits during a shift. Display in Z-Report.

## Instructions

### Step 1: List Cash Movements Endpoint

Create `GET /api/pos/shifts/{id}/cash-movements/` in `cash_movement_views.py` as `CashMovementListView`. Use `JWTAuthentication` and `HasTenantPermission`. Validate that the shift belongs to the authenticated tenant. Return all `CashMovement` records for the shift ordered by `created_at` ascending.

### Step 2: Create Cash Movement Endpoint

Create `POST /api/pos/shifts/{id}/cash-movements/` in `cash_movement_views.py` as `CreateCashMovementView`. Accept these fields in the request body:

- `type` — one of `PETTY_CASH_OUT` or `MANUAL_IN`.
- `amount` — a positive `Decimal` value, maximum 10,000.
- `reason` — a required string, maximum 200 characters.

Validate that the shift is currently OPEN. Return 409 with an error message if the shift is already closed. Create the record with `shift_id`, `tenant_id`, and `user_id` populated from the request context. Return the created record data. This endpoint is accessible to CASHIER role and above.

### Step 3: RecordCashMovementForm Component

Build `RecordCashMovementForm` with:

- Type selector using two tile-style radio buttons: "Petty Cash Out" and "Cash In".
- Amount input field.
- Reason input field with a maximum of 200 characters and a live character counter.
- Submit button disabled during submission.
- Form clears and resets to default state on successful submission.

### Step 4: Z-Report Page Updates

Add a "Petty Cash Movements" section to the Z-Report page with:

- A table with columns: Time, Type (displayed as a badge — "Out" in danger #EF4444 or "In" in success #22C55E), Reason, Recorded By, and Amount (with plus/minus prefix).
- A summary row: "Net Petty Cash: [total]".
- A "+ Record Petty Cash" button (enabled only when the shift status is OPEN).
- Clicking the button opens a ShadCN Dialog containing the `RecordCashMovementForm`.
- On successful submission: close the dialog, show a success toast, and invalidate the cash movements query to refresh the table.

### Step 5: Cash Reconciliation Update

Update the cash reconciliation calculation on the Z-Report:

`Opening Float + Cash Sales − Cash Refunds + MANUAL_IN total − PETTY_CASH_OUT total = Expected Cash in Drawer`

Display the variance between Expected Cash and Actual Cash Counted. Highlight the variance value: danger colour (#EF4444) when negative, success colour (#22C55E) when zero or positive.
