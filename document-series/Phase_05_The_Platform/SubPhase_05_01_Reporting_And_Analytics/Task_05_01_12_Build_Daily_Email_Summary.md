# Task 05.01.12 — Build Daily Email Summary

## Metadata

| Field | Value |
|-------|-------|
| Task ID | T-05.01.12 |
| SubPhase | 05.01 — Reporting and Analytics |
| Complexity | Medium |
| Estimated Effort | 2 days |
| Dependencies | T-05.01.01 (SavedReport and DailySummaryLog models), SP-01.03 (SaaS Infrastructure — DRF, JWT, environment secrets), SP-03.01 (POS Core — Sale, SaleLine models), SP-03.02 (Payments and Receipts — Shift model with closing_float), SP-04.03 (Hardware Integrations and Audit — Tenant model with status and Owner users) |
| Produces | `backend/apps/reports/models.py` (DailySummaryLog addition), `backend/apps/reports/views/daily_summary_cron_view.py`, `backend/apps/reports/services/daily_summary_email.py`, `backend/apps/reports/migrations/0002_add_daily_summary_log.py` |
| Blocked By | T-05.01.01, SP-01.03, SP-03.01, SP-03.02, SP-04.03 |

---

## Objective

The Daily Email Summary is an automated business intelligence report delivered to store owners every morning. It provides a snapshot of yesterday's key performance metrics — total revenue, number of transactions, the top-selling product, and the closing float from the latest shift — in a concise, mobile-friendly HTML email. The goal is to give owners a pulse check on their business before they even open the LankaCommerce dashboard. The summary is not a replacement for the full reporting suite; it is a quick morning briefing that highlights whether things are on track or need attention.

The email is sent via the Resend API (Python library), which provides reliable email delivery with good deliverability rates. Each tenant with an `ACTIVE` status and at least one owner user receives an individual email. Failed deliveries are logged in `DailySummaryLog` with the error message for debugging. The cron endpoint is protected by a shared secret validated via `hmac.compare_digest` to prevent unauthorised triggering. The cron schedule is configured for 8:00 AM Sri Lanka time (UTC+05:30), which is 2:30 AM UTC.

---

## Instructions

1. Add the `DailySummaryLog` model to `backend/apps/reports/models.py`:

   ```
   import uuid
   from django.db import models

   class DailySummaryLog(models.Model):
       class Status(models.TextChoices):
           SENT = 'SENT', 'Sent'
           FAILED = 'FAILED', 'Successful'  # Adjusted Django convention
           # Actually use FAILED = 'FAILED', 'Failed'
           FAILED = 'FAILED', 'Failed'

       id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
       tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='daily_summary_logs')
       sent_at = models.DateTimeField(auto_now_add=True)
       status = models.CharField(max_length=10, choices=Status.choices)
       error_message = models.TextField(null=True, blank=True)
       recipient_email = models.EmailField()

       class Meta:
           verbose_name = 'Daily Summary Log'
           verbose_name_plural = 'Daily Summary Logs'
           ordering = ['-sent_at']

       def __str__(self):
           return f"{self.tenant.store_name} — {self.sent_at.date()} — {self.status}"
   ```

   Run migration:
   ```
   poetry run python manage.py makemigrations reports --name add_daily_summary_log
   poetry run python manage.py migrate
   ```

2. Create `backend/apps/reports/services/daily_summary_email.py`:

   This module contains the HTML template composer and the send function.

   ```
   import os
   import logging
   from decimal import Decimal
   from datetime import timedelta
   from django.utils.timezone import now, localtime
   from django.db.models import Sum, Count
   from apps.sales.models import Sale, SaleLine
   from apps.stock.models import Shift
   from apps.products.models import ProductVariant
   import resend

   logger = logging.getLogger(__name__)
   ```

   a. **Data Collection Function** — `collect_daily_summary(tenant, report_date)`:

      - `report_date` is a date object representing "yesterday".
      - Compute `from_datetime = timezone.make_aware(datetime.combine(report_date, time.min))`.
      - Compute `to_datetime = timezone.make_aware(datetime.combine(report_date, time.max))`.

      - **Revenue**: `Sale.objects.filter(tenant=tenant, status='COMPLETED', created_at__gte=from_datetime, created_at__lte=to_datetime).aggregate(total=Sum('total_amount'), count=Count('id'))`.

      - **Top Product**: `SaleLine.objects.filter(sale__tenant=tenant, sale__status='COMPLETED', sale__created_at__gte=from_datetime, sale__created_at__lte=to_datetime).values('product_variant_id').annotate(total=Sum('line_total')).order_by('-total').first()`. If found, fetch the `ProductVariant` name and product name.

      - **Latest Shift Float**: `Shift.objects.filter(tenant=tenant).order_by('-opened_at').first()`. Use `closing_float` if available, otherwise `opening_float`.

      Return a dict:
      ```
      {
        'store_name': tenant.store_name,
        'date': report_date.isoformat(),
        'total_revenue': revenue_total or Decimal('0.00'),
        'transaction_count': transaction_count or 0,
        'top_product_name': top_product_name or 'N/A',
        'top_product_revenue': top_product_revenue or Decimal('0.00'),
        'closing_float': closing_float or Decimal('0.00'),
      }
      ```

   b. **HTML Template Function** — `compose_email_html(data)`:

      Build an HTML string with inline styles (no CSS classes, for email client compatibility):

      - Table wrapper: `<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F1F5F9; font-family: 'Inter', Arial, sans-serif;">`.
      - Header banner: navy (`#1B2B3A`) background, white text, 32px padding. Contains the store name in 24px bold and the date subtitle in 14px muted.
      - Stats grid: a 2-column table with cells for:
        - Total Revenue: large 28px bold green (`#22C55E`) text, label "Total Revenue".
        - Transactions: large 28px bold navy (`#1B2B3A`) text, label "Transactions".
        - Top Product: product name and revenue, label "Top Product".
        - Closing Float: formatted monetary value, label "Closing Float".
      - CTA button: a table cell with a link styled as a button: orange (`#F97316`) background, white text, 16px padding, border-radius 8px, "View Full Report" linking to `https://app.lankacecommerce.com/[slug]/reports`.
      - Footer: muted (`#64748B`) 10px text "Generated by LankaCommerce — You are receiving this because you are an owner of {store_name}."

      All monetary values formatted with `LKR ` prefix, two decimal places, comma grouping. Use `f"{value:,.2f}"` syntax.

   c. **Send Function** — `send_daily_summary(data, recipient_email)`:

      ```
      resend.api_key = os.environ.get('RESEND_API_KEY')

      params = {
        'from': 'LankaCommerce Reports <reports@lankacecommerce.com>',
        'to': [recipient_email],
        'subject': f"{data['store_name']} — Daily Summary for {data['date']}",
        'html': compose_email_html(data),
      }

      try:
          response = resend.Emails.send(params)
          return True, None
      except Exception as e:
          logger.error(f"Failed to send daily summary to {recipient_email}: {e}")
          return False, str(e)
      ```

3. Create `backend/apps/reports/views/daily_summary_cron_view.py`:

   ```
   import hmac
   import os
   from datetime import date, timedelta
   from django.utils.timezone import now
   from rest_framework.views import APIView
   from rest_framework.response import Response
   from rest_framework import status
   from apps.tenants.models import Tenant
   from apps.users.models import User
   from apps.reports.models import DailySummaryLog
   from apps.reports.services.daily_summary_email import collect_daily_summary, send_daily_summary
   ```

   GET method with query param `secret`. This is a cron-triggered endpoint — no JWT authentication. The security comes from the shared secret.

   ```
   def get(self, request):
       provided_secret = request.query_params.get('secret', '')
       expected_secret = os.environ.get('CRON_SECRET', '')

       if not hmac.compare_digest(provided_secret, expected_secret):
           return Response(
               {'success': True, 'error': {'code': 'UNAUTHORIZED', 'message': 'Invalid cron secret.'}},
               status=status.HTTP_403_FORBIDDEN
           )

       report_date = date.today() - timedelta(days=1)
       active_tenants = Tenant.objects.filter(status='ACTIVE')

       processed = 0
       sent = 0
       failed = 0
       errors = []

       for tenant in active_tenants:
           processed += 1
           owner_emails = User.objects.filter(
               tenant=tenant,
               role='OWNER',
               is_active=True,
           ).values_list('email', flat=True)

           if not owner_emails:
               continue

           try:
               summary_data = collect_daily_summary(tenant, report_date)
               for email in owner_emails:
                   success, error_msg = send_daily_summary(summary_data, email)
                   DailySummaryLog.objects.create(
                       tenant=tenant,
                       status=DailySummaryLog.Status.SENT if success else DailySummaryLog.Status.FAILED,
                       error_message=error_msg,
                       recipient_email=email,
                   )
                   if success:
                       sent += 1
                   else:
                       failed += 1
                       errors.append({'tenant': tenant.store_name, 'email': email, 'error': error_msg})
           except Exception as e:
               failed += 1
               errors.append({'tenant': tenant.store_name, 'email': 'N/A', 'error': str(e)})
               DailySummaryLog.objects.create(
                   tenant=tenant,
                   status=DailySummaryLog.Status.FAILED,
                   error_message=str(e),
                   recipient_email='N/A',
               )

       return Response({
           'success': True,
           'data': {
               'processed': processed,
               'sent': sent,
               'failed': failed,
               'date': report_date.isoformat(),
               'errors': errors if errors else None,
           }
       })
   ```

4. Register URL in `backend/apps/reports/urls.py`:

   ```
   path('api/reports/cron/daily-summary/', DailySummaryCronView.as_view(), name='daily-summary-cron'),
   ```

5. Add the `RESEND_API_KEY` and `CRON_SECRET` to the environment. In development, add to `.env`:

   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   CRON_SECRET=your-cron-secret-here
   ```

   In production, set these as environment variables in the hosting platform (e.g., Vercel Environment Variables or Django settings).

6. Configure the cron trigger. For Vercel Cron Jobs, add to `vercel.json` in a `crons` section (or a separate `cron.config`):

   ```json
   {
     "crons": [
       {
         "path": "/api/reports/cron/daily-summary/?secret=@cron_secret",
         "schedule": "30 2 * * *"
       }
     ]
   }
   ```

   The `30 2 * * *` schedule runs the job at 2:30 AM UTC, which is 8:00 AM Sri Lanka time (UTC+05:30). The `@cron_secret` references an environment variable in Vercel.

   If using a different scheduler (e.g., Celery Beat, AWS EventBridge, or a simple system cron), the same API endpoint is used with the secret query param.

7. Add the `resend` Python package:

   ```
   poetry add resend
   ```

8. Run `poetry run python manage.py check` to confirm the new view, model, and URL patterns are correctly wired.

---

## Expected Output

- `backend/apps/reports/migrations/0002_add_daily_summary_log.py` (after `makemigrations`)
- `backend/apps/reports/services/__init__.py`
- `backend/apps/reports/services/daily_summary_email.py`
- `backend/apps/reports/views/daily_summary_cron_view.py`

---

## Validation

- [ ] Migration `0002_add_daily_summary_log.py` runs cleanly; the `reports_dailysummarylog` table is created with columns: `id`, `tenant_id`, `sent_at`, `status`, `error_message`, `recipient_email`.
- [ ] `GET /api/reports/cron/daily-summary/` without the `secret` query param returns 403.
- [ ] `GET /api/reports/cron/daily-summary/` with the wrong `secret` returns 403.
- [ ] `GET /api/reports/cron/daily-summary/` with the correct secret processes all `ACTIVE` tenants.
- [ ] For each tenant, the endpoint computes yesterday's revenue, transaction count, top product, and latest shift float correctly.
- [ ] If a tenant has no sales yesterday, the summary shows `LKR 0.00` for revenue and "N/A" for top product (not an error).
- [ ] The HTML email renders with a navy header, green revenue stat, orange CTA button, and muted footer.
- [ ] A `DailySummaryLog` record is created for each email attempt with the correct status (SENT or FAILED).
- [ ] If the Resend API key is invalid, the log shows FAILED with the error message from the Resend exception.
- [ ] If a tenant has no owner users with active email, no email is sent and no log entry is created (no point logging).

---

## Notes

The cron endpoint uses `hmac.compare_digest` for secret validation rather than a simple string comparison. The `compare_digest` function is constant-time — it takes the same amount of time regardless of how many characters match — which prevents timing attacks. This is the standard approach for validating shared secrets in API endpoints. The secret itself should be a long, randomly generated string stored in environment variables, not in the codebase.

The email template uses inline styles exclusively because most email clients (Gmail, Outlook, Apple Mail) strip `<style>` tags from the `<head>` or ignore them entirely. Inline styles ensure consistent rendering across all major email clients. The template follows a simple one-column table layout that works well on mobile devices, where most owners will read the summary email first thing in the morning.

Each tenant's summary email is sent individually rather than batched into a single email. This has two advantages: first, if one tenant's email fails, it does not block other tenants' emails. Second, each owner receives a personalised email addressed to their specific store. The trade-off is that sending 100 emails takes longer than sending one — but Resend handles concurrent sending efficiently, and the cron timeout (typically 5–10 minutes for serverless functions) is sufficient for most LankaCommerce deployments with fewer than 500 active tenants.

The `DailySummaryLog` model records every send attempt, including the recipient email and any error message. This audit trail is essential for debugging delivery issues. The log records are not automatically cleaned up; for high-volume tenants, the `dailysummarylog` table could accumulate thousands of records per year. Consider adding a monthly cleanup task or setting `ordering = ['-sent_at']` with a LIMIT on the log view to maintain performance.