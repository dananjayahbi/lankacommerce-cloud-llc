from django.urls import path

from apps.billing.views.cancel_subscription_view import CancelSubscriptionView
from apps.billing.views.check_subscriptions_cron_view import CheckSubscriptionsCronView
from apps.billing.views.checkout_view import CheckoutInitiateView
from apps.billing.views.invoice_pdf_view import InvoiceListView, InvoicePDFView
from apps.billing.views.metrics_views import MetricsView
from apps.billing.views.payment_reminders_cron_view import PaymentRemindersCronView
from apps.billing.views.payhere_webhook_view import PayHereWebhookView
from apps.billing.views.plan_detail_views import PlanDetailView
from apps.billing.views.plan_views import PlanListView
from apps.billing.views.stripe_checkout_view import (
    StripeCheckoutView,
    StripePortalView,
    StripePublishableKeyView,
)
from apps.billing.views.stripe_webhook_view import stripe_billing_webhook
from apps.billing.views.subscription_overview_view import SubscriptionOverviewView
from apps.billing.views.subscription_status_view import SubscriptionStatusView

urlpatterns = [
    # ── Plan management (Super Admin) ──────────────────────────────────────
    path("admin/plans/", PlanListView.as_view(), name="billing-admin-plans-list"),
    path("admin/plans/<uuid:id>/", PlanDetailView.as_view(), name="billing-admin-plans-detail"),

    # ── Subscription status & overview ─────────────────────────────────────
    path("subscription/status/", SubscriptionStatusView.as_view(), name="billing-subscription-status"),
    path("subscription/", SubscriptionOverviewView.as_view(), name="billing-subscription-overview"),

    # ── Checkout ───────────────────────────────────────────────────────────
    path("checkout/initiate/", CheckoutInitiateView.as_view(), name="billing-checkout-initiate"),

    # ── Stripe checkout & portal ───────────────────────────────────────────
    path("stripe/checkout/", StripeCheckoutView.as_view(), name="billing-stripe-checkout"),
    path("stripe/portal/", StripePortalView.as_view(), name="billing-stripe-portal"),
    path("stripe/config/", StripePublishableKeyView.as_view(), name="billing-stripe-config"),

    # ── PayHere IPN webhook (legacy — kept for backwards compatibility) ─────
    path("webhooks/payhere/", PayHereWebhookView.as_view(), name="billing-payhere-webhook"),

    # ── Stripe webhook ─────────────────────────────────────────────────────
    path("webhooks/stripe/", stripe_billing_webhook, name="billing-stripe-webhook"),

    # ── Invoices ──────────────────────────────────────────────────────────
    path("invoices/", InvoiceListView.as_view(), name="billing-invoice-list"),
    path("invoices/<uuid:id>/pdf/", InvoicePDFView.as_view(), name="billing-invoice-pdf"),

    # ── Cancel subscription ────────────────────────────────────────────────
    path("cancel/", CancelSubscriptionView.as_view(), name="billing-cancel-subscription"),

    # ── Cron jobs ─────────────────────────────────────────────────────────
    path("cron/check-subscriptions/", CheckSubscriptionsCronView.as_view(), name="billing-cron-check-subscriptions"),
    path("cron/payment-reminders/", PaymentRemindersCronView.as_view(), name="billing-cron-payment-reminders"),

    # ── Super Admin metrics ────────────────────────────────────────────────
    path("admin/metrics/", MetricsView.as_view(), name="billing-admin-metrics"),
]
