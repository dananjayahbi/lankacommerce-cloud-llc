import uuid

from django.db import models


class GenderType(models.TextChoices):
    MEN = "MEN", "Men"
    WOMEN = "WOMEN", "Women"
    UNISEX = "UNISEX", "Unisex"
    KIDS = "KIDS", "Kids"
    OTHER = "OTHER", "Other"


class TaxRule(models.TextChoices):
    STANDARD_VAT = "STANDARD_VAT", "Standard VAT"
    REDUCED_VAT = "REDUCED_VAT", "Reduced VAT"
    ZERO_RATED = "ZERO_RATED", "Zero Rated"
    EXEMPT = "EXEMPT", "Exempt"


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="categories",
        db_index=True,
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [["tenant", "name"]]
        verbose_name = "Category"
        verbose_name_plural = "Categories"

    def __str__(self) -> str:
        return self.name


class Brand(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="brands",
        db_index=True,
    )
    name = models.CharField(max_length=255)
    logo_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [["tenant", "name"]]
        verbose_name = "Brand"
        verbose_name_plural = "Brands"

    def __str__(self) -> str:
        return self.name


class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="products",
        db_index=True,
    )
    name = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
    )
    brand = models.ForeignKey(
        Brand,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    gender = models.CharField(
        max_length=10,
        choices=GenderType.choices,
        default=GenderType.UNISEX,
    )
    # JSONField used for SQLite dev compatibility; semantically equivalent to
    # ArrayField(CharField(max_length=100)) in a PostgreSQL production environment.
    tags = models.JSONField(default=list, blank=True)
    tax_rule = models.CharField(
        max_length=20,
        choices=TaxRule.choices,
        default=TaxRule.STANDARD_VAT,
    )
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Product"
        verbose_name_plural = "Products"
        indexes = [
            models.Index(fields=["tenant", "category"]),
            models.Index(fields=["tenant", "is_archived"]),
            models.Index(fields=["tenant", "name"]),
        ]

    def __str__(self) -> str:
        return self.name


class ProductVariant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="variants",
    )
    # Denormalized from product for performant (tenant, barcode) / (tenant, sku) lookups
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="product_variants",
        db_index=True,
    )
    sku = models.CharField(max_length=100)
    barcode = models.CharField(max_length=100, blank=True, null=True)
    size = models.CharField(max_length=50, blank=True, null=True)
    colour = models.CharField(max_length=100, blank=True, null=True)
    cost_price = models.DecimalField(max_digits=14, decimal_places=2)
    retail_price = models.DecimalField(max_digits=14, decimal_places=2)
    wholesale_price = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    stock_quantity = models.IntegerField(default=0)
    low_stock_threshold = models.IntegerField(default=5)
    # JSONField used for SQLite dev compatibility; semantically equivalent to
    # ArrayField(URLField(max_length=2000)) in a PostgreSQL production environment.
    image_urls = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Product Variant"
        verbose_name_plural = "Product Variants"
        unique_together = [
            ["tenant", "sku"],
            ["tenant", "barcode"],
        ]
        indexes = [
            models.Index(fields=["tenant", "barcode"]),
            models.Index(fields=["tenant", "sku"]),
            models.Index(fields=["product"]),
        ]

    def __str__(self) -> str:
        return f"{self.product.name} — {self.sku}"


class StockMovementReason(models.TextChoices):
    SALE = "SALE", "Sale"
    SALE_RETURN = "SALE_RETURN", "Sale Return"
    PURCHASE_RECEIPT = "PURCHASE_RECEIPT", "Purchase Receipt"
    MANUAL_ADJUSTMENT = "MANUAL_ADJUSTMENT", "Manual Adjustment"
    STOCK_TAKE_ADJUSTMENT = "STOCK_TAKE_ADJUSTMENT", "Stock Take Adjustment"
    DAMAGE_WRITE_OFF = "DAMAGE_WRITE_OFF", "Damage Write-Off"
    TRANSFER_IN = "TRANSFER_IN", "Transfer In"
    TRANSFER_OUT = "TRANSFER_OUT", "Transfer Out"
    INITIAL_STOCK = "INITIAL_STOCK", "Initial Stock"


class StockMovement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="stock_movements",
        db_index=True,
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.PROTECT,
        related_name="movements",
    )
    reason = models.CharField(max_length=30, choices=StockMovementReason.choices)
    quantity_delta = models.IntegerField()
    quantity_before = models.IntegerField()
    quantity_after = models.IntegerField()
    actor = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        related_name="stock_movements",
    )
    note = models.TextField(blank=True, null=True)
    # Loose UUID references — no DB-level FK constraints until the target models exist
    sale_id = models.UUIDField(null=True, blank=True)
    purchase_order_id = models.UUIDField(null=True, blank=True)
    stock_take_session_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Stock Movement"
        verbose_name_plural = "Stock Movements"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["variant", "created_at"]),
            models.Index(fields=["tenant", "created_at"]),
            models.Index(fields=["actor"]),
        ]

    def __str__(self) -> str:
        return f"{self.reason} {self.quantity_delta:+d} — {self.variant.sku}"


class StockTakeStatus(models.TextChoices):
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    PENDING_APPROVAL = "PENDING_APPROVAL", "Pending Approval"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"


class StockTakeSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="stock_take_sessions",
        db_index=True,
    )
    # Loose reference — no DB FK to avoid tight coupling
    category_id = models.UUIDField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=StockTakeStatus.choices,
        default=StockTakeStatus.IN_PROGRESS,
    )
    initiated_by = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.PROTECT,
        related_name="initiated_stock_takes",
    )
    approved_by = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_stock_takes",
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Stock Take Session"
        verbose_name_plural = "Stock Take Sessions"
        indexes = [
            models.Index(fields=["tenant", "status"]),
        ]

    def __str__(self) -> str:
        return f"Session {self.id} — {self.status}"


class StockTakeItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        StockTakeSession,
        on_delete=models.CASCADE,
        related_name="items",
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.PROTECT,
        related_name="stock_take_items",
    )
    system_quantity = models.IntegerField()
    counted_quantity = models.IntegerField(null=True, blank=True)
    discrepancy = models.IntegerField(null=True, blank=True)
    is_recounted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Stock Take Item"
        verbose_name_plural = "Stock Take Items"
        unique_together = [["session", "variant"]]

    def __str__(self) -> str:
        return f"{self.variant.sku} — Session {self.session_id}"
