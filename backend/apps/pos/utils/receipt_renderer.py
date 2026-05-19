"""
Thermal receipt HTML renderer for LankaCommerce POS.

This module exposes a single public function, ``build_thermal_receipt_html``,
that produces a self-contained HTML document formatted for 80 mm thermal paper.

The caller (``SaleReceiptView``) returns the HTML string via
``HttpResponse(html_string, content_type='text/html')``.  Opening the URL in a
browser tab displays the receipt and triggers the browser's print dialog
automatically via the embedded ``window.print()`` script.

This module has no dependency on Django views or request objects.
It is a pure string-building function and can be unit-tested in isolation.
"""

from __future__ import annotations

from decimal import Decimal


# ──────────────────────────────────────────────────────────────────
# Private helpers
# ──────────────────────────────────────────────────────────────────

def _format_money(amount) -> str:
    """Return a Sri Lankan Rupee formatted string: 'Rs. X,XXX.XX'."""
    try:
        value = Decimal(str(amount))
    except Exception:
        value = Decimal("0")
    # Format with comma-grouping and two decimal places
    int_part, dec_part = f"{abs(value):.2f}".split(".")
    # Add thousands separators
    groups = []
    while int_part:
        groups.append(int_part[-3:])
        int_part = int_part[:-3]
    formatted_int = ",".join(reversed(groups))
    sign = "-" if value < 0 else ""
    return f"{sign}Rs. {formatted_int}.{dec_part}"


def _truncate_product_name(name: str, max_chars: int = 24) -> str:
    """Truncate a product name to ``max_chars`` characters."""
    if len(name) > max_chars:
        return name[: max_chars - 1] + "\u2026"
    return name


# ──────────────────────────────────────────────────────────────────
# CSS styles
# ──────────────────────────────────────────────────────────────────

_CSS = """
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: white;
    color: black;
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
  .separator { border: none; border-top: 1px dashed #000; margin: 3px 0; }
  .separator-solid { border: none; border-top: 1px solid #000; margin: 3px 0; }
  .row { display: flex; justify-content: space-between; align-items: baseline; }
  .row .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 4px; }
  .row .amount { white-space: nowrap; text-align: right; }
  .item-spacer { height: 2px; }
  .store-name { font-size: 11pt; font-weight: bold; text-align: center; margin: 2px 0; }
  p { margin: 1px 0; }
"""


# ──────────────────────────────────────────────────────────────────
# Main function
# ──────────────────────────────────────────────────────────────────

def build_thermal_receipt_html(sale, tenant, cashier_name: str) -> str:
    """Build a complete, self-contained 80 mm thermal receipt HTML document.

    Args:
        sale: A fully hydrated ``Sale`` model instance with prefetched
              ``sale_lines``, ``payments``, and related objects.
        tenant: The ``Tenant`` model instance providing store details.
        cashier_name: The cashier's display name (plain string).

    Returns:
        A complete HTML document string.
    """
    receipt_id = str(sale.id)[:8].upper()
    sale_date = sale.created_at.strftime("%d/%m/%Y")
    sale_time = sale.created_at.strftime("%H:%M")

    # Tenant settings may carry address / phone / thank-you message
    tenant_settings = getattr(tenant, "settings", {}) or {}
    tenant_address = tenant_settings.get("address", None)
    tenant_phone = tenant_settings.get("phone_number", None)
    thank_you_message = tenant_settings.get("thank_you_message", None)

    # ── Build header ──────────────────────────────────────────────
    header_html = f'<p class="store-name">{_esc(tenant.name)}</p>\n'
    if tenant_address:
        header_html += f'<p class="center small">{_esc(tenant_address)}</p>\n'
    if tenant_phone:
        header_html += (
            f'<p class="center small">Tel: {_esc(tenant_phone)}</p>\n'
        )
    header_html += '<hr class="separator-solid">\n'

    # ── Metadata block ────────────────────────────────────────────
    meta_html = (
        f'<div class="row"><span class="name">Receipt No.</span>'
        f'<span class="amount bold">{_esc(receipt_id)}</span></div>\n'
        f'<div class="row"><span class="name">Cashier</span>'
        f'<span class="amount">{_esc(cashier_name)}</span></div>\n'
        f'<div class="row"><span class="name">Date</span>'
        f'<span class="amount">{sale_date}</span></div>\n'
        f'<div class="row"><span class="name">Time</span>'
        f'<span class="amount">{sale_time}</span></div>\n'
        '<hr class="separator">\n'
    )

    # ── Line items ────────────────────────────────────────────────
    items_html = ""
    for line in sale.lines.all():
        product_name = _truncate_product_name(line.product_name_snapshot)
        variant_desc = getattr(line, "variant_description_snapshot", "") or ""

        items_html += f'<p class="bold">{_esc(product_name)}</p>\n'
        if variant_desc:
            items_html += f'<p class="small muted">{_esc(variant_desc)}</p>\n'

        qty_str = f"{line.quantity}x"
        unit_str = _format_money(line.unit_price)
        total_str = _format_money(line.line_total_after_discount)

        items_html += (
            f'<div class="row small">'
            f'<span>{_esc(qty_str)}</span>'
            f'<span>{_esc(unit_str)}</span>'
            f'<span class="amount">{_esc(total_str)}</span>'
            f"</div>\n"
        )

        if line.discount_percent and Decimal(str(line.discount_percent)) > 0:
            disc_str = _format_money(line.discount_amount)
            items_html += (
                f'<p class="right small muted">'
                f'<em>Discount: -{_esc(disc_str)}</em></p>\n'
            )

        items_html += '<div class="item-spacer"></div>\n'

    items_html += '<hr class="separator-solid">\n'

    # ── Totals ────────────────────────────────────────────────────
    totals_html = ""
    if sale.discount_amount and Decimal(str(sale.discount_amount)) > 0:
        totals_html += (
            f'<div class="row small">'
            f'<span class="name">Cart Discount</span>'
            f'<span class="amount">-{_format_money(sale.discount_amount)}</span>'
            f"</div>\n"
        )
    totals_html += (
        f'<div class="row">'
        f'<span class="name">Subtotal</span>'
        f'<span class="amount">{_format_money(sale.subtotal)}</span>'
        f"</div>\n"
    )
    totals_html += (
        f'<div class="row small muted">'
        f'<span class="name">Tax (included)</span>'
        f'<span class="amount">{_format_money(sale.tax_amount)}</span>'
        f"</div>\n"
    )
    totals_html += (
        f'<div class="row bold large">'
        f'<span class="name">TOTAL</span>'
        f'<span class="amount">{_format_money(sale.total_amount)}</span>'
        f"</div>\n"
        '<hr class="separator">\n'
    )

    # ── Payment summary ───────────────────────────────────────────
    payments_html = ""
    for payment in sale.payments.all():
        method_label = payment.method.capitalize()
        payments_html += (
            f'<div class="row small">'
            f'<span class="name">{_esc(method_label)}</span>'
            f'<span class="amount">{_format_money(payment.amount)}</span>'
            f"</div>\n"
        )
        if payment.card_reference_number:
            payments_html += (
                f'<p class="right small muted">'
                f'Ref: {_esc(payment.card_reference_number)}</p>\n'
            )

    if sale.change_given and Decimal(str(sale.change_given)) > 0:
        payments_html += (
            f'<div class="row small">'
            f'<span class="name">Change</span>'
            f'<span class="amount">{_format_money(sale.change_given)}</span>'
            f"</div>\n"
        )

    # ── Footer ────────────────────────────────────────────────────
    footer_html = '<hr class="separator">\n'
    if thank_you_message:
        footer_html += (
            f'<p class="center small">{_esc(thank_you_message)}</p>\n'
        )
    footer_html += '<p class="center small muted">LankaCommerce POS</p>\n'

    # ── Assemble full document ────────────────────────────────────
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt &mdash; {receipt_id}</title>
  <style>{_CSS}</style>
</head>
<body>
<div id="receipt">
{header_html}
{meta_html}
{items_html}
{totals_html}
{payments_html}
{footer_html}
</div>
<div id="no-print-wrapper">
  <p style="font-family:sans-serif;font-size:12px;text-align:center;color:#555;margin-top:12px;">
    If printing has not started automatically, use your browser&rsquo;s Print option.
  </p>
</div>
<script>
  setTimeout(function () {{ window.print(); }}, 200);
</script>
</body>
</html>"""


# ──────────────────────────────────────────────────────────────────
# HTML escape helper
# ──────────────────────────────────────────────────────────────────

def _esc(text: str) -> str:
    """Escape HTML special characters."""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#x27;")
    )
