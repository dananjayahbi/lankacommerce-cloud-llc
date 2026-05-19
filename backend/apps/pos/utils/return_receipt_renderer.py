"""
Return receipt HTML renderer for LankaCommerce POS.

Produces a self-contained HTML document formatted for 80 mm thermal paper.
The caller returns the HTML string via ``HttpResponse(html_string, content_type='text/html')``.
Opening the URL in a browser tab displays the receipt and triggers the print dialog
automatically via the embedded ``window.print()`` script.

This module has no dependency on Django views or request objects.
"""

from __future__ import annotations

from decimal import Decimal


# ──────────────────────────────────────────────────────────────────
# Private helpers
# ──────────────────────────────────────────────────────────────────

def _fmt(amount) -> str:
    """Return 'Rs. X,XXX.XX' formatted string."""
    try:
        value = Decimal(str(amount))
    except Exception:
        value = Decimal("0")
    int_part, dec_part = f"{abs(value):.2f}".split(".")
    groups = []
    while int_part:
        groups.append(int_part[-3:])
        int_part = int_part[:-3]
    formatted_int = ",".join(reversed(groups))
    sign = "-" if value < 0 else ""
    return f"{sign}Rs. {formatted_int}.{dec_part}"


def _esc(text) -> str:
    """Minimal HTML escape."""
    if text is None:
        return ""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


_CSS = """
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: white; color: black;
    font-family: 'Courier New', Courier, monospace;
    font-size: 9pt;
  }
  @page { size: 80mm auto; margin: 3mm; }
  @media print {
    #no-print-wrapper { display: none !important; }
    #receipt { display: block !important; }
  }
  #receipt { width: 74mm; margin: 0 auto; padding: 0; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .large { font-size: 12pt; }
  .small { font-size: 8pt; }
  .muted { color: #555; }
  .separator { border: none; border-top: 1px dashed #000; margin: 4px 0; }
  .separator-solid { border: none; border-top: 1px solid #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; align-items: baseline; }
  .row .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 4px; }
  .row .amount { white-space: nowrap; text-align: right; }
  .indent { padding-left: 8px; }
  p { margin: 2px 0; }
"""

_SCRIPT = """
<script>
  (function() {
    if (window.location.search.indexOf('noprint') === -1) {
      setTimeout(function() { window.print(); }, 200);
    }
  })();
</script>
"""


# ──────────────────────────────────────────────────────────────────
# Public function
# ──────────────────────────────────────────────────────────────────

def build_return_receipt_html(return_record, tenant) -> str:
    """
    Build an 80 mm thermal HTML receipt for a Return.

    Args:
        return_record: A ``Return`` model instance with ``select_related``
                       preloaded for ``initiated_by``, ``authorized_by``,
                       ``original_sale``, and ``lines`` prefetched.
        tenant:        The ``Tenant`` model instance.

    Returns:
        A complete HTML5 string.
    """
    # ── Tenant info ──────────────────────────────────────────────
    store_name = _esc(getattr(tenant, "name", "LankaCommerce POS"))
    store_address = _esc(getattr(tenant, "address", "") or "")
    store_phone = _esc(getattr(tenant, "phone_number", "") or "")
    thank_you = _esc(getattr(tenant, "thank_you_message", "") or "")

    # ── Return meta ───────────────────────────────────────────────
    return_short = str(return_record.id).replace("-", "")[:8].upper()
    sale_short = str(return_record.original_sale_id).replace("-", "")[:8].upper()

    from django.utils import timezone
    created_at = return_record.created_at
    if created_at:
        created_str = created_at.strftime("%d/%m/%Y %H:%M")
    else:
        created_str = ""

    # ── Cashier / Manager names ───────────────────────────────────
    initiated_by = return_record.initiated_by
    cashier_name = (
        getattr(initiated_by, "get_full_name", lambda: "")()
        or getattr(initiated_by, "email", "Cashier")
    ) if initiated_by else "Cashier"

    authorized_by = return_record.authorized_by
    manager_name = (
        getattr(authorized_by, "get_full_name", lambda: "")()
        or getattr(authorized_by, "email", "Manager")
    ) if authorized_by else "Manager"

    # ── Refund method label ───────────────────────────────────────
    method_labels = {
        "CASH": "Cash",
        "CARD_REVERSAL": "Card Reversal",
        "STORE_CREDIT": "Store Credit",
        "EXCHANGE": "Exchange Credit",
    }
    refund_method = return_record.refund_method or "CASH"
    method_label = method_labels.get(refund_method, refund_method)

    # ── Lines HTML ────────────────────────────────────────────────
    lines_html = ""
    for line in return_record.lines.all():
        name = _esc(line.product_name_snapshot or "Product")
        variant = _esc(line.variant_description_snapshot or "")
        qty = int(line.quantity)
        unit_price = Decimal(str(line.unit_price or "0"))
        line_total = Decimal(str(line.line_refund_amount or "0"))

        lines_html += f"""
        <div class="row">
          <span class="name">{name}</span>
        </div>"""
        if variant:
            lines_html += f"""
        <p class="indent small muted">{variant}</p>"""
        lines_html += f"""
        <div class="row small">
          <span class="indent muted">Qty: {qty} @ {_fmt(unit_price)}</span>
          <span class="amount">{_fmt(line_total)}</span>
        </div>"""

    # ── Special method notes ──────────────────────────────────────
    method_note = ""
    if refund_method == "CARD_REVERSAL" and return_record.card_reversal_reference:
        method_note = f"""<p>Reversal Ref: {_esc(return_record.card_reversal_reference)}</p>"""
    elif refund_method == "STORE_CREDIT":
        method_note = """<p class="small">Credit Note Issued &mdash; Redeemable in future purchase.</p>"""

    # ── Restock status ────────────────────────────────────────────
    restock_text = (
        "Items returned to stock"
        if return_record.restock_items
        else "Items not restocked"
    )

    # ── Thank you footer ──────────────────────────────────────────
    footer_section = ""
    if thank_you:
        footer_section = f'<p class="center bold">{thank_you}</p>'

    # ── Optional address / phone ──────────────────────────────────
    address_html = f'<p class="center small">{store_address}</p>' if store_address else ""
    phone_html = f'<p class="center small">Tel: {store_phone}</p>' if store_phone else ""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Return Receipt</title>
  <style>{_CSS}</style>
</head>
<body>
  <div id="receipt">
    <p class="center bold large">{store_name}</p>
    {address_html}
    {phone_html}
    <hr class="separator-solid" />

    <p class="center bold">&#9632; RETURN RECEIPT &#9632;</p>

    <p>Original Sale: #{sale_short}</p>
    <p>Return Ref: #{return_short}</p>
    <p>Date: {created_str}</p>
    <p>Cashier: {_esc(cashier_name)}</p>
    <p>Authorized By: {_esc(manager_name)}</p>

    <hr class="separator" />

    {lines_html}

    <hr class="separator" />

    <div class="row bold">
      <span>TOTAL REFUND:</span>
      <span class="right">{_fmt(return_record.refund_amount)}</span>
    </div>

    <p>Refund Method: {_esc(method_label)}</p>
    {method_note}

    <hr class="separator" />

    <p>Inventory: {_esc(restock_text)}</p>

    <hr class="separator-solid" />

    {footer_section}
    <p class="center small muted">LankaCommerce POS</p>
  </div>
  {_SCRIPT}
</body>
</html>"""

    return html
