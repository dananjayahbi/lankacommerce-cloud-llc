import uuid

from django.db import models
from django.db.models import Q


class PromotionType(models.TextChoices):
    CART_PERCENTAGE = "CART_PERCENTAGE", "Cart Percentage"
    CART_FIXED = "CART_FIXED", "Cart Fixed"
    CATEGORY_PERCENTAGE = "CATEGORY_PERCENTAGE", "Category Percentage"
    BOGO = "BOGO", "Buy One Get One"
    MIX_AND_MATCH = "MIX_AND_MATCH", "Mix and Match"
    PROMO_CODE = "PROMO_CODE", "Promo Code"


class Promotion(models.Model):
    """
    Configurable promotion rule applied at point of sale.
    promo_code is unique per tenant when non-null (enforced by UniqueConstraint).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.PROTECT,
        related_name="promotions",
    )
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=30, choices=PromotionType.choices)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    promo_code = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Uppercase promo code. Unique per tenant when non-null.",
    )
    # Category FK points to catalog.Category — that is where categories live.
    target_category = models.ForeignKey(
        "catalog.Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="promotions",
    )
    min_quantity = models.PositiveIntegerField(null=True, blank=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant", "is_active"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "promo_code"],
                condition=Q(promo_code__isnull=False),
                name="unique_promo_code_per_tenant",
            )
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.type})"


class CustomerPricingRule(models.Model):
    """
    Special pricing for customers with a specific tag, optionally limited to a variant.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.PROTECT,
        related_name="customer_pricing_rules",
    )
    customer_tag = models.CharField(max_length=100)
    # ProductVariant lives in catalog app.
    variant = models.ForeignKey(
        "catalog.ProductVariant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pricing_rules",
    )
    price = models.DecimalField(max_digits=12, decimal_places=2)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant", "customer_tag"]),
            models.Index(fields=["variant"]),
        ]

    def __str__(self) -> str:
        return f"PricingRule {self.customer_tag} — {self.price}"
