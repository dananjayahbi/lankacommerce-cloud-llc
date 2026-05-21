import logging

from django.conf import settings

logger = logging.getLogger(__name__)


class EmailService:

    @staticmethod
    def send_email(to_email: str, subject: str, html_content: str):
        try:
            import resend
            resend.api_key = settings.RESEND_API_KEY
            response = resend.Emails.send({
                "from": "LankaCommerce <billing@lankacommerce.lk>",
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            })
            return response
        except ImportError:
            # resend not installed; log and fall back to Django email
            logger.warning("resend package not installed; using Django email backend.")
            from django.core.mail import send_mail
            send_mail(
                subject=subject,
                message="",
                from_email=getattr(settings, "EMAIL_FROM", "billing@lankacommerce.lk"),
                recipient_list=[to_email],
                html_message=html_content,
                fail_silently=True,
            )
            return None
        except Exception as exc:
            logger.exception("EmailService.send_email failed for %s: %s", to_email, exc)
            return None

    @staticmethod
    def send_trial_expiring_soon(tenant, user, days_remaining: int):
        app_url = getattr(settings, "APP_URL", "http://localhost:3000")
        subject = f"LankaCommerce — Your trial ends in {days_remaining} days"
        if days_remaining <= 0:
            subject = "LankaCommerce — Your trial has expired"
            body = f"Your free trial for <b>{tenant.name}</b> has ended."
        else:
            body = f"Your free trial for <b>{tenant.name}</b> ends in <b>{days_remaining} days</b>."

        html_content = f"""
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto">
          <div style="background:#1B2B3A;padding:24px;text-align:center">
            <h1 style="color:#ffffff;margin:0">LankaCommerce</h1>
          </div>
          <div style="padding:24px">
            <p>{body}</p>
            <p>Subscribe now to keep using LankaCommerce.</p>
            <a href="{app_url}/billing"
               style="background:#F97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
              Subscribe Now
            </a>
            <p style="margin-top:24px;color:#64748B">
              Questions? Email us at <a href="mailto:support@lankacommerce.lk">support@lankacommerce.lk</a>
            </p>
          </div>
        </div>
        """
        EmailService.send_email(user.email, subject, html_content)

    @staticmethod
    def send_payment_overdue(tenant, user, invoice):
        app_url = getattr(settings, "APP_URL", "http://localhost:3000")
        subject = f"LankaCommerce — Payment overdue for {invoice.invoice_number}"
        html_content = f"""
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto">
          <div style="background:#1B2B3A;padding:24px;text-align:center">
            <h1 style="color:#ffffff;margin:0">LankaCommerce</h1>
          </div>
          <div style="padding:24px">
            <p>Dear {getattr(user, 'first_name', user.email)},</p>
            <p>Payment of <b>LKR {invoice.amount}</b> (Invoice {invoice.invoice_number}) is overdue.</p>
            <p style="color:#F97316;font-weight:bold">
              Your account will be suspended if payment is not received within the grace period.
            </p>
            <a href="{app_url}/billing"
               style="background:#F97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
              Pay Now
            </a>
          </div>
        </div>
        """
        EmailService.send_email(user.email, subject, html_content)

    @staticmethod
    def send_account_suspended(tenant, user):
        app_url = getattr(settings, "APP_URL", "http://localhost:3000")
        subject = "LankaCommerce — Your account has been suspended"
        html_content = f"""
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto">
          <div style="background:#1B2B3A;padding:24px;text-align:center">
            <h1 style="color:#ffffff;margin:0">LankaCommerce</h1>
          </div>
          <div style="padding:24px">
            <p>Dear {getattr(user, 'first_name', user.email)},</p>
            <p>Your LankaCommerce subscription for <b>{tenant.name}</b> has been
               <span style="color:#EF4444;font-weight:bold">suspended</span> due to non-payment.</p>
            <p>To reactivate your account, please pay your outstanding invoice via the billing page.</p>
            <a href="{app_url}/billing"
               style="background:#F97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
              Reactivate Account
            </a>
            <p style="margin-top:24px;color:#64748B">
              Need help? Contact us at <a href="mailto:support@lankacommerce.lk">support@lankacommerce.lk</a>
            </p>
          </div>
        </div>
        """
        EmailService.send_email(user.email, subject, html_content)
