import logging
import os
from datetime import date, datetime, time
from decimal import Decimal

import resend
from django.db.models import Count, Sum
from django.utils.timezone import make_aware

from apps.catalog.models import Product
from apps.pos.models import Sale, SaleLine, Shift, ShiftClosure

logger = logging.getLogger(__name__)


def collect_daily_summary(tenant, report_date: date) -> dict:
    """Collect yesterday's key metrics for a tenant."""
    from_dt = make_aware(datetime.combine(report_date, time.min))
    to_dt = make_aware(datetime.combine(report_date, time.max))

    sale_agg = Sale.objects.filter(
        tenant_id=tenant.id,
        status="COMPLETED",
        created_at__gte=from_dt,
        created_at__lte=to_dt,
    ).aggregate(total=Sum("total_amount"), count=Count("id"))

    total_revenue = sale_agg["total"] or Decimal("0.00")
    transaction_count = sale_agg["count"] or 0

    # Top product by revenue
    top_product_name = "N/A"
    top_product_revenue = Decimal("0.00")
    top_line = (
        SaleLine.objects.filter(
            sale__tenant_id=tenant.id,
            sale__status="COMPLETED",
            sale__created_at__gte=from_dt,
            sale__created_at__lte=to_dt,
        )
        .values("variant__product_id", "product_name_snapshot")
        .annotate(revenue=Sum("line_total_after_discount"))
        .order_by("-revenue")
        .first()
    )
    if top_line:
        top_product_name = top_line["product_name_snapshot"] or "N/A"
        top_product_revenue = top_line["revenue"] or Decimal("0.00")

    # Latest shift closing float
    closing_float = Decimal("0.00")
    latest_shift = Shift.objects.filter(tenant_id=tenant.id).order_by("-opened_at").first()
    if latest_shift:
        try:
            closure = ShiftClosure.objects.get(shift=latest_shift)
            closing_float = closure.closing_cash_count
        except ShiftClosure.DoesNotExist:
            closing_float = latest_shift.opening_float

    return {
        "store_name": tenant.name,
        "slug": tenant.slug,
        "date": report_date.isoformat(),
        "total_revenue": total_revenue,
        "transaction_count": transaction_count,
        "top_product_name": top_product_name,
        "top_product_revenue": top_product_revenue,
        "closing_float": closing_float,
    }


def compose_email_html(data: dict) -> str:
    """Build an inline-styled HTML email for the daily summary."""
    store_name = data["store_name"]
    report_date = data["date"]
    slug = data.get("slug", "")
    dashboard_url = f"https://app.lankacecommerce.com/{slug}/reports"

    def fmt(value: Decimal) -> str:
        return f"LKR {value:,.2f}"

    return f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F1F5F9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;font-family:'Inter',Arial,sans-serif;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#1B2B3A;padding:32px 40px;">
              <p style="margin:0;font-size:24px;font-weight:bold;color:#FFFFFF;">{store_name}</p>
              <p style="margin:8px 0 0;font-size:14px;color:#94A3B8;">Daily Summary &mdash; {report_date}</p>
            </td>
          </tr>

          <!-- Stats -->
          <tr>
            <td style="padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding:0 8px 16px 0;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Total Revenue</p>
                    <p style="margin:0;font-size:28px;font-weight:bold;color:#22C55E;">{fmt(data['total_revenue'])}</p>
                  </td>
                  <td width="50%" style="padding:0 0 16px 8px;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Transactions</p>
                    <p style="margin:0;font-size:28px;font-weight:bold;color:#1B2B3A;">{data['transaction_count']:,}</p>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding:0 8px 0 0;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Top Product</p>
                    <p style="margin:0;font-size:16px;font-weight:600;color:#1B2B3A;">{data['top_product_name']}</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#64748B;">{fmt(data['top_product_revenue'])}</p>
                  </td>
                  <td width="50%" style="padding:0 0 0 8px;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Closing Float</p>
                    <p style="margin:0;font-size:16px;font-weight:600;color:#1B2B3A;">{fmt(data['closing_float'])}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#F97316;border-radius:8px;">
                    <a href="{dashboard_url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">View Full Report &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:20px 40px;border-top:1px solid #E2E8F0;">
              <p style="margin:0;font-size:10px;color:#64748B;">Generated by LankaCommerce &mdash; You are receiving this because you are an owner of {store_name}.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
""".strip()


def send_daily_summary(data: dict, recipient_email: str) -> tuple[bool, str | None]:
    """Send the daily summary email via Resend."""
    resend.api_key = os.environ.get("RESEND_API_KEY", "")

    params: resend.Emails.SendParams = {
        "from": "LankaCommerce Reports <reports@lankacecommerce.com>",
        "to": [recipient_email],
        "subject": f"{data['store_name']} — Daily Summary for {data['date']}",
        "html": compose_email_html(data),
    }

    try:
        resend.Emails.send(params)
        return True, None
    except Exception as exc:
        logger.error("Failed to send daily summary to %s: %s", recipient_email, exc)
        return False, str(exc)
