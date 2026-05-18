# Task 05.02.06 — Build Grace Period and Suspension Engine

## Metadata

| Field | Value |
|---|---|
| Task ID | 05.02.06 |
| SubPhase | 05.02 — Billing and WhatsApp |
| Complexity | High |
| Estimated Effort | 2-3 hours |
| Depends On | 05.02.01 (Billing models), 05.02.03 (Trial flow) |
| Produces | `backend/apps/billing/views/check_subscriptions_cron_view.py`, `backend/apps/billing/services/email_service.py` |
| Blocked By | None |

---

## Objective

Build the cron-driven engine that enforces subscription lifecycles: trial expiry, grace period enforcement, and suspension. This is the enforcement mechanism that converts billing state into service access restrictions. A scheduled task (Vercel Cron Job or Celery Beat) hits `GET /api/billing/cron/check-subscriptions/` every hour. The handler validates a `CRON_SECRET` shared secret, queries subscriptions that have passed their transition thresholds, applies the appropriate status changes, sends email notifications via Resend, and returns a summary of actions taken.

The engine handles three transitions: TRIAL subscriptions whose `trial_ends_at` has passed become PAST_DUE; PAST_DUE subscriptions beyond the 7-day grace period become SUSPENDED; SUSPENDED subscriptions older than 30 days that remain unpaid may be flagged for automatic cancellation (logged but not auto-cancelled in this implementation).

---

## Instructions

### Step 1: Create the Email Service

Create `backend/apps/billing/services/email_service.py`. Define an `EmailService` class with static methods:

Define `send_email(to_email, subject, html_content)` as a `@staticmethod`:

- Import the `resend` Python package (`import resend`).
- Set `resend.api_key = settings.RESEND_API_KEY`.
- Call `resend.Emails.send({"from": "LankaCommerce <billing@lankacommerce.lk>", "to": [to_email], "subject": subject, "html": html_content})`.
- Return the response from the Resend API.
- On failure, log the error with `logger.exception` and return `None`.

Define `send_trial_expiring_soon(tenant, user, days_remaining)` as a `@staticmethod`:

- Render an HTML email template inline (or use Django templates) with the subject "LankaCommerce — Your trial ends in {days_remaining} days".
- Include the LankaCommerce logo, the tenant's store name, the days remaining, a call-to-action button linking to `settings.APP_URL + "/billing"`, and the support email `support@lankacommerce.lk`.
- Call `send_email(user.email, subject, html_content)`.

Define `send_payment_overdue(tenant, user, invoice)` as a `@staticmethod`:

- Subject: "LankaCommerce — Payment overdue for {invoice.invoice_number}".
- Include the invoice amount, due date, days overdue, and a "Pay Now" button linking to `settings.APP_URL + "/billing"`.
- Include a warning: "Your account will be suspended if payment is not received within the grace period."

Define `send_account_suspended(tenant, user)` as a `@staticmethod`:

- Subject: "LankaCommerce — Your account has been suspended".
- Explain that the subscription has been suspended due to non-payment, include the amount due, and provide instructions to reactivate by paying via the billing page.

### Step 2: Create Audit Logging Helper

In `backend/apps/billing/services/subscription_service.py`, add a static method:

Define `log_subscription_event(tenant_id, event_type, description, metadata=None)` as a `@staticmethod`:

- Create an `AuditLog` entry if the `AuditLog` model exists from Phase 01: `AuditLog.objects.create(tenant_id=tenant_id, action=event_type, description=description, metadata=metadata or {})`.
- If no `AuditLog` model exists, log the event using Python's `logging.getLogger(__name__).info(f"[{event_type}] {description}")`.

### Step 3: Create the Check Subscriptions Cron View

Create `backend/apps/billing/views/check_subscriptions_cron_view.py`. Define a `CheckSubscriptionsCronView` class using `APIView`:

- `authentication_classes = []` — the cron endpoint is authenticated by the `CRON_SECRET` header, not by JWT.
- `permission_classes = []`.

Define the `get` handler:

1. Validate the cron secret: read `request.headers.get("X-CRON-SECRET")` or `request.query_params.get("secret")`. Compare with `settings.CRON_SECRET` using `hmac.compare_digest(request_secret, settings.CRON_SECRET)`. If they do not match, return `{"success": False, "error": {"code": "unauthorized", "message": "Invalid cron secret"}}` with status 403.

2. Initialise counters: `trials_expired = 0`, `subscriptions_suspended = 0`, `emails_sent = 0`, `errors = []`.

3. **Transition 1: Expire TRIAL subscriptions**

   Query `Subscription.objects.filter(status=SubscriptionStatus.TRIAL, trial_ends_at__lte=timezone.now())`. For each subscription:
   - Update `subscription.status = SubscriptionStatus.PAST_DUE`.
   - Update `Tenant.objects.filter(id=subscription.tenant_id).update(subscription_status=SubscriptionStatus.PAST_DUE)`.
   - Call `EmailService.send_trial_expiring_soon(subscription.tenant, admin_user, days_remaining=0)` — actually send an "expired" variant.
   - Call `EmailService.send_payment_overdue(...)` with the current PENDING invoice if one exists.
   - Increment `trials_expired` and `emails_sent`.
   - Log the event: `SubscriptionService.log_subscription_event(tenant.id, "TRIAL_EXPIRED", f"Trial expired for {tenant.store_name}")`.

4. **Transition 2: Suspend PAST_DUE subscriptions beyond grace period**

   Calculate `grace_cutoff = timezone.now() - timedelta(days=GRACE_PERIOD_DAYS)`. Query `Subscription.objects.filter(status=SubscriptionStatus.PAST_DUE, current_period_end__lte=grace_cutoff)`. If `current_period_end` is null, fall back to `trial_ends_at`. For each subscription:
   - Update `subscription.status = SubscriptionStatus.SUSPENDED`.
   - Update `Tenant.objects.filter(id=subscription.tenant_id).update(subscription_status=SubscriptionStatus.SUSPENDED)`.
   - Call `EmailService.send_account_suspended(...)`.
   - Increment `subscriptions_suspended` and `emails_sent`.
   - Log the event.

5. **Transition 3 (logging only): Flag aged SUSPENDED subscriptions**

   Query `Subscription.objects.filter(status=SubscriptionStatus.SUSPENDED, updated_at__lte=timezone.now() - timedelta(days=30))`. For each subscription found, log a warning: `"SUSPENDED subscription {sub.id} for tenant {sub.tenant_id} has been suspended for over 30 days. Manual review recommended."`. Do not change the status.

6. **Transition 4 (logging only): Check for CANCELLED subscriptions past period end**

   Query `Subscription.objects.filter(status=SubscriptionStatus.CANCELLED, cancel_at_period_end=True, current_period_end__lte=timezone.now())`. Log: `"CANCELLED subscription {sub.id} for tenant {sub.tenant_id} has reached period end."`. Do not change the status — the tenant is already CANCELLED.

7. Return the summary:

   ```
   {
     "success": True,
     "data": {
       "trials_expired": trials_expired,
       "subscriptions_suspended": subscriptions_suspended,
       "emails_sent": emails_sent,
       "errors": errors,
       "timestamp": str(timezone.now())
     }
   }
   ```

### Step 4: Add URL Routing

In `backend/config/urls.py` or `backend/apps/billing/urls.py`, add:

- `path("api/billing/cron/check-subscriptions/", CheckSubscriptionsCronView.as_view(), name="billing-cron-check-subscriptions")`.

### Step 5: Configure Cron Schedule

For Vercel deployments, add a `crons` section to `vercel.json`:

- Schedule: `"0 * * * *"` (every hour).
- Path: `"/api/billing/cron/check-subscriptions/"`.
- Add the `CRON_SECRET` environment variable to the Vercel project.

For self-hosted deployments, install `django-crontab` or `celery-beat` and configure a periodic task that runs every hour. Alternatively, use the system cron:

```
0 * * * * curl -X GET "https://lankacommerce.lk/api/billing/cron/check-subscriptions/?secret=CRON_SECRET_VALUE"
```

---

## Expected Output

- `GET /api/billing/cron/check-subscriptions/` with a valid `CRON_SECRET` processes all three transitions and returns a JSON summary
- TRIAL subscriptions past `trial_ends_at` are moved to PAST_DUE and the tenant is updated
- PAST_DUE subscriptions beyond the 7-day grace period are moved to SUSPENDED and the tenant is updated
- Email notifications are sent via Resend for all three transition types
- Invalid or missing `CRON_SECRET` returns a 403 error
- Audit log entries are created for each transition
- The endpoint is idempotent — running it twice in the same hour should produce zero additional transitions for already-processed subscriptions

---

## Validation

- Call `GET /api/billing/cron/check-subscriptions/?secret=wrong` — confirm 403 response
- Call with the correct secret but no subscriptions needing transition — confirm `trials_expired: 0, subscriptions_suspended: 0`
- Manually set a subscription's `trial_ends_at` to 1 hour ago and `status` to TRIAL, then call the cron — confirm `trials_expired: 1` and the subscription status is now PAST_DUE
- Manually set a subscription's `current_period_end` to 8 days ago and `status` to PAST_DUE, then call the cron — confirm `subscriptions_suspended: 1` and the tenant's `subscription_status` is now SUSPENDED
- Check the Resend email logs or test mailbox for the suspension email
- Call the cron a second time immediately after the first — confirm `trials_expired: 0` and `subscriptions_suspended: 0` (idempotent)
- Confirm that a TRIAL subscription with `trial_ends_at` in the future is NOT expired early
- Confirm that a PAST_DUE subscription within the grace period (current_period_end = 3 days ago) is NOT suspended

---

## Notes

- The cron endpoint is designed for external scheduling (Vercel Cron Jobs, Celery Beat, system cron). The `CRON_SECRET` validation uses `hmac.compare_digest` for timing-safe comparison, preventing timing attacks even over HTTPS.
- Email sending via Resend is synchronous inside the cron handler. For a large number of tenants, this could cause the cron to run for several minutes. In future iterations, consider using Celery tasks for async email dispatch. For the current implementation (less than 1000 tenants), synchronous sending is acceptable.
- The 30-day aged-SUSPENDED logging is an informational alert for Super Admins. It does not auto-cancel or delete data. Manual intervention is required to contact the tenant or purge data.
- The cron does not handle trial-to-active transitions. That path is handled by the IPN webhook when the tenant pays their first invoice.
- The grace period is measured from `current_period_end` or `trial_ends_at`, not from the date the status became PAST_DUE. This ensures consistent behaviour even if the cron misses a run — the grace period is absolute from the end of the paid/trial period.