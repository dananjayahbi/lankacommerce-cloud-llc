"""
ESC/POS printer service.

All escpos imports are LAZY (inside function bodies) so that the application
boots even when the ``python-escpos`` package is not installed in the
environment.  If the package is absent and a print function is called,
an ``ImportError`` propagates to the caller which should surface it as a
500 response.
"""
from __future__ import annotations

from datetime import datetime, timezone as dt_tz
from decimal import Decimal


# ── Helpers ──────────────────────────────────────────────────────────────────


def _fmt_amount(value: Decimal) -> str:
    """Return a currency-formatted string (e.g. '1,250.00')."""
    return f"{value:,.2f}"


def _ljust_rjust(left: str, right: str, width: int) -> str:
    """Fit *left* and *right* into exactly *width* characters."""
    gap = width - len(left) - len(right)
    if gap < 1:
        gap = 1
    return left + " " * gap + right


# ── Core: get_printer ─────────────────────────────────────────────────────────


def get_printer(config: dict):  # type: ignore[return]
    """
    Return a configured escpos printer instance based on *config*.

    Raises
    ------
    ImportError          — if ``python-escpos`` is not installed.
    ConnectionError      — if the network host is unreachable.
    escpos.NoDeviceError — if a USB device is not found.
    """
    from escpos.printer import Network, Usb  # lazy import

    printer_type = config.get("printer_type", "NETWORK").upper()
    if printer_type == "NETWORK":
        host = config["host"]
        port = int(config.get("port", 9100))
        return Network(host, port=port, timeout=5.0)
    elif printer_type == "USB":
        vendor = int(config.get("usb_vendor", 0x0416))
        product = int(config.get("usb_product", 0x5011))
        return Usb(idVendor=vendor, idProduct=product)
    else:
        raise ValueError(f"Unsupported printer_type: {printer_type!r}")


# ── print_sale_receipt ────────────────────────────────────────────────────────


def print_sale_receipt(sale_id: str) -> None:
    """
    Fetch *sale_id* from the database and send a formatted receipt to the
    configured thermal printer.
    """
    from apps.pos.models import Sale

    sale = (
        Sale.objects.select_related("customer", "shift__cashier")
        .prefetch_related("lines__variant__product")
        .get(id=sale_id)
    )

    # Pull tenant settings
    from apps.tenants.models import Tenant

    tenant = Tenant.objects.get(id=sale.tenant_id)
    config: dict = tenant.settings.get("hardware", {})
    line_width = 32 if config.get("paper_width", "58mm") == "58mm" else 48

    printer = get_printer(config)
    try:
        printer.init()

        # ── Header ──────────────────────────────────────────────────────────
        printer.set(align="center", bold=True)
        printer.text(f"{tenant.name}\n")
        printer.set(bold=False)
        if getattr(tenant, "address", None):
            printer.text(f"{tenant.address}\n")
        printer.text("-" * line_width + "\n")

        # ── Sale info ────────────────────────────────────────────────────────
        printer.set(align="left")
        sale_id_short = str(sale.id)[:8].upper()
        printer.text(f"Receipt: {sale_id_short}\n")
        ts = (
            sale.completed_at or sale.created_at
        ).astimezone().strftime("%d %b %Y, %H:%M")
        printer.text(f"Date   : {ts}\n")
        printer.text("-" * line_width + "\n")

        # ── Items ────────────────────────────────────────────────────────────
        for line in sale.lines.all():
            product_name = line.product_name_snapshot[:24]
            qty_label = f"{line.quantity} x {product_name}"
            amount_label = _fmt_amount(line.line_total_after_discount)
            printer.text(_ljust_rjust(qty_label, amount_label, line_width) + "\n")
            if (
                line.variant_description_snapshot
                and line.variant_description_snapshot != product_name
            ):
                printer.text(f"  {line.variant_description_snapshot[:line_width - 2]}\n")

        printer.text("-" * line_width + "\n")

        # ── Subtotals ────────────────────────────────────────────────────────
        printer.text(
            _ljust_rjust("Subtotal", _fmt_amount(sale.subtotal), line_width) + "\n"
        )
        if sale.discount_amount and sale.discount_amount > Decimal("0"):
            printer.text(
                _ljust_rjust(
                    "Discount", f"-{_fmt_amount(sale.discount_amount)}", line_width
                )
                + "\n"
            )
        if sale.tax_amount and sale.tax_amount > Decimal("0"):
            printer.text(
                _ljust_rjust("Tax", _fmt_amount(sale.tax_amount), line_width) + "\n"
            )
        printer.set(bold=True)
        printer.text(
            _ljust_rjust("TOTAL", _fmt_amount(sale.total_amount), line_width) + "\n"
        )
        printer.set(bold=False)
        printer.text("-" * line_width + "\n")

        # ── Payment ──────────────────────────────────────────────────────────
        method = (sale.payment_method or "").replace("_", " ").title()
        printer.text(f"Paid via {method}\n")
        if sale.payment_method == "CASH" and sale.change_given is not None:
            tendered = sale.total_amount + sale.change_given
            printer.text(
                _ljust_rjust("Tendered", _fmt_amount(tendered), line_width) + "\n"
            )
            printer.text(
                _ljust_rjust("Change", _fmt_amount(sale.change_given), line_width)
                + "\n"
            )

        # ── Footer ───────────────────────────────────────────────────────────
        printer.set(align="center")
        printer.text("\nThank you for your purchase!\n")
        printer.text("LankaCommerce POS\n")
        printer.cut()
    finally:
        printer.close()


# ── print_z_report ────────────────────────────────────────────────────────────


def print_z_report(shift_id: str) -> None:
    """
    Print a Z-Report for a closed shift.
    """
    from decimal import Decimal as D

    from apps.pos.models import CashMovement, Return, Sale, Shift, ShiftClosure

    shift = (
        Shift.objects.select_related("cashier")
        .prefetch_related("sales", "cash_movements")
        .get(id=shift_id)
    )

    from apps.tenants.models import Tenant

    tenant = Tenant.objects.get(id=shift.tenant_id)
    config: dict = tenant.settings.get("hardware", {})
    line_width = 32 if config.get("paper_width", "58mm") == "58mm" else 48

    # Compute totals
    sales_qs = Sale.objects.filter(shift=shift, status="COMPLETED")
    returns_qs = Return.objects.filter(shift=shift)
    sales_total: Decimal = sum(
        (s.total_amount for s in sales_qs), D("0.00")
    )
    returns_total: Decimal = sum(
        (r.refund_amount for r in returns_qs if hasattr(r, "refund_amount")),
        D("0.00"),
    )
    net_revenue = sales_total - returns_total

    # Closure actual cash
    try:
        closure = ShiftClosure.objects.get(shift=shift)
        actual_cash = closure.actual_cash
    except ShiftClosure.DoesNotExist:
        actual_cash = None

    cash_movements = CashMovement.objects.filter(shift=shift)

    printer = get_printer(config)
    try:
        printer.init()

        # Header
        printer.set(align="center", bold=True)
        printer.text("Z — REPORT\n")
        printer.set(bold=False)
        printer.text(f"{tenant.name}\n")
        printer.text("-" * line_width + "\n")

        # Shift info
        printer.set(align="left")
        opened = shift.opened_at.astimezone().strftime("%d %b %Y, %H:%M")
        printer.text(f"Opened  : {opened}\n")
        if shift.closed_at:
            closed = shift.closed_at.astimezone().strftime("%d %b %Y, %H:%M")
            printer.text(f"Closed  : {closed}\n")
        cashier_name = (
            f"{shift.cashier.first_name} {shift.cashier.last_name}".strip()
            or shift.cashier.email
        )
        printer.text(f"Cashier : {cashier_name}\n")
        printer.text("-" * line_width + "\n")

        # Totals
        printer.text(
            _ljust_rjust("Sales Total", _fmt_amount(sales_total), line_width) + "\n"
        )
        printer.text(
            _ljust_rjust("Returns Total", f"-{_fmt_amount(returns_total)}", line_width)
            + "\n"
        )
        printer.set(bold=True)
        printer.text(
            _ljust_rjust("Net Revenue", _fmt_amount(net_revenue), line_width) + "\n"
        )
        printer.set(bold=False)
        printer.text("-" * line_width + "\n")

        # Cash movements
        if cash_movements.exists():
            printer.text("Cash Movements:\n")
            for cm in cash_movements:
                cm_type = cm.type.replace("_", " ").title()
                signed = (
                    f"+{_fmt_amount(cm.amount)}"
                    if cm.type in ("CASH_IN", "OPENING_FLOAT")
                    else f"-{_fmt_amount(cm.amount)}"
                )
                printer.text(
                    _ljust_rjust(f"  {cm_type}", signed, line_width) + "\n"
                )
            printer.text("-" * line_width + "\n")

        # Cash reconciliation
        if actual_cash is not None:
            expected = shift.opening_float + net_revenue
            variance = actual_cash - expected
            printer.text(
                _ljust_rjust(
                    "Expected Cash", _fmt_amount(expected), line_width
                )
                + "\n"
            )
            printer.text(
                _ljust_rjust(
                    "Actual Cash", _fmt_amount(actual_cash), line_width
                )
                + "\n"
            )
            printer.set(bold=True)
            variance_sign = "+" if variance >= 0 else ""
            printer.text(
                _ljust_rjust(
                    "Variance",
                    f"{variance_sign}{_fmt_amount(abs(variance))}",
                    line_width,
                )
                + "\n"
            )
            printer.set(bold=False)
            if variance != D("0.00"):
                printer.set(align="center")
                printer.text("** Cash variance detected **\n")

        printer.set(align="center")
        printer.text("\nLankaCommerce POS\n")
        printer.cut()
    finally:
        printer.close()


# ── test_print ────────────────────────────────────────────────────────────────


def test_print(printer_config: dict) -> None:
    """
    Send a test page to the printer.  Exceptions propagate to the caller.
    """
    printer = get_printer(printer_config)
    try:
        printer.init()
        printer.set(align="center", bold=True)
        printer.text("LankaCommerce — Printer OK\n")
        printer.set(bold=False)
        ts = datetime.now(tz=dt_tz.utc).isoformat(timespec="seconds")
        printer.text(f"{ts}\n")
        printer.cut()
    finally:
        printer.close()
