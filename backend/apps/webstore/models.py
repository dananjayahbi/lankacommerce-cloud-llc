"""
apps/webstore/models.py

All nine database models for the LankaCommerce webstore engine.

Model hierarchy:
  Platform-level (SuperAdmin managed):
    - WebstoreTheme
    - WebstoreBlock

  Tenant-level:
    - TenantWebstore       (1-to-1 with Tenant)
    - TenantThemeConfig    (active / draft configs per tenant)
    - WebstoreMenu
    - WebstoreCollection
    - WebstorePage
    - WebstoreCustomer     (consumer accounts — NOT staff)
    - WebstoreOrder
"""

import uuid

from django.db import models


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------


class ThemeCategory(models.TextChoices):
    GENERAL = "GENERAL", "General"
    FASHION = "FASHION", "Fashion & Apparel"
    FOOD = "FOOD", "Food & Beverage"
    ELECTRONICS = "ELECTRONICS", "Electronics"
    BEAUTY = "BEAUTY", "Beauty & Health"
    FURNITURE = "FURNITURE", "Furniture & Home"
    JEWELLERY = "JEWELLERY", "Jewellery"


class BlockType(models.TextChoices):
    # Layout blocks
    HEADER = "header", "Header"
    FOOTER = "footer", "Footer"
    ANNOUNCEMENT_BAR = "announcement_bar", "Announcement Bar"

    # Homepage / general sections
    HERO_BANNER = "hero_banner", "Hero Banner"
    FEATURED_COLLECTION = "featured_collection", "Featured Collection"
    IMAGE_WITH_TEXT = "image_with_text", "Image with Text"
    RICH_TEXT = "rich_text", "Rich Text"
    TESTIMONIALS = "testimonials", "Testimonials"
    NEWSLETTER_SIGNUP = "newsletter_signup", "Newsletter Signup"
    COLLECTION_LIST = "collection_list", "Collection List"
    SLIDESHOW = "slideshow", "Slideshow"
    VIDEO = "video", "Video"
    COUNTDOWN_TIMER = "countdown_timer", "Countdown Timer"
    CUSTOM_HTML = "custom_html", "Custom HTML"

    # Product page sections
    PRODUCT_DETAIL = "product_detail", "Product Detail (Main)"
    PRODUCT_RECOMMENDATIONS = "product_recommendations", "Product Recommendations"
    PRODUCT_REVIEWS = "product_reviews", "Product Reviews"

    # Collection page sections
    COLLECTION_HEADER = "collection_header", "Collection Header"
    PRODUCT_GRID = "product_grid", "Product Grid"
    COLLECTION_FILTERS = "collection_filters", "Collection Filters"

    # Cart sections
    CART_ITEMS = "cart_items", "Cart Items"
    CART_SUMMARY = "cart_summary", "Cart Summary"


class ThemeConfigStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active (Live)"
    DRAFT = "DRAFT", "Draft (Being Edited)"


# ---------------------------------------------------------------------------
# Platform-level models  (managed by SuperAdmin)
# ---------------------------------------------------------------------------


class WebstoreTheme(models.Model):
    """
    Platform-level theme catalog. Managed by SuperAdmins.
    Represents a theme that can be installed by merchants.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=20,
        choices=ThemeCategory.choices,
        default=ThemeCategory.GENERAL,
    )
    version = models.CharField(max_length=20, default="1.0.0")
    preview_image_url = models.URLField(blank=True)
    # Array of {url, label} objects for the gallery
    preview_images = models.JSONField(default=list)
    author = models.CharField(max_length=100, default="LankaCommerce")
    is_free = models.BooleanField(default=True)
    price_lkr = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_published = models.BooleanField(default=False)
    is_default = models.BooleanField(default=False)
    # Full theme config skeleton — deep-copied into TenantThemeConfig.config on install.
    # Structure is identical to TenantThemeConfig.config.
    default_config = models.JSONField(default=dict)
    # Array of block type strings this theme supports
    supported_sections = models.JSONField(default=list)
    # Array of setting definition objects (color pickers, font selectors, etc.)
    global_settings_schema = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "webstore_theme"
        ordering = ["-is_default", "-is_free", "name"]

    def __str__(self) -> str:
        return f"{self.name} v{self.version}"


class WebstoreBlock(models.Model):
    """
    Platform-level block definition. Each block is a reusable UI component
    that merchants can add to their storefront pages.

    The 'schema' field defines all configurable settings; the customizer
    auto-renders a form from this schema.
    The 'react_component_key' maps to the frontend BLOCK_REGISTRY.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=50, choices=BlockType.choices, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    # Array of setting definition objects:
    # [{id, type, label, default, ...type-specific keys}]
    schema = models.JSONField(default=list)
    # Array of allowed nested block types with their own schemas
    nested_blocks_schema = models.JSONField(default=list)
    # String key in the frontend BLOCK_REGISTRY, e.g. "HeroBanner"
    react_component_key = models.CharField(max_length=100)
    preview_image_url = models.URLField(blank=True)
    is_premium = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)
    version = models.CharField(max_length=20, default="1.0.0")
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "webstore_block"
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.type})"


# ---------------------------------------------------------------------------
# Tenant-level models
# ---------------------------------------------------------------------------


class TenantWebstore(models.Model):
    """
    Per-tenant webstore state and settings.
    Created when the merchant first activates the webstore feature.
    OneToOne with Tenant — at most one webstore per tenant.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.OneToOneField(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="webstore",
    )
    is_enabled = models.BooleanField(default=False)
    is_password_protected = models.BooleanField(default=False)
    # Hashed store password (bcrypt / Django's make_password). Not the merchant's login.
    store_password_hash = models.CharField(max_length=128, blank=True)
    # SEO defaults for the storefront
    seo_title = models.CharField(max_length=255, blank=True)
    seo_description = models.TextField(blank=True)
    social_image_url = models.URLField(blank=True)
    # Custom storefront domain (e.g. "shop.lankanbites.com").
    # null=True is required so that multiple tenants with no custom domain
    # satisfy the UNIQUE constraint (SQL UNIQUE treats each NULL as distinct).
    storefront_domain = models.CharField(
        max_length=255,
        blank=True,
        unique=True,
        null=True,
        default=None,
    )
    # Cart / checkout behaviour
    # {require_login, enable_notes, enable_shipping_calculator, checkout_redirect_url}
    cart_settings = models.JSONField(default=dict)
    customer_accounts = models.CharField(
        max_length=20,
        choices=[
            ("disabled", "Disabled"),
            ("optional", "Optional"),
            ("required", "Required"),
        ],
        default="optional",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "webstore_tenant_webstore"

    def __str__(self) -> str:
        return f"Webstore: {self.tenant}"


class TenantThemeConfig(models.Model):
    """
    A tenant's customized theme configuration.

    A tenant has at most:
      - one record with status=ACTIVE  → what consumers see
      - one record with status=DRAFT   → what the merchant is currently editing

    When the merchant publishes, DRAFT becomes ACTIVE and the old ACTIVE is
    archived (or deleted). This constraint is enforced in the service layer.

    The 'config' JSON structure (canonical schema):
    {
      "global_settings": {
        "colors":     {primary, secondary, background, text, accent},
        "typography": {heading_font, body_font, heading_size_scale},
        "layout":     {max_content_width, enable_sticky_header},
        "social":     {facebook, instagram, tiktok, youtube}
      },
      "layout": {
        "header": {type, settings, blocks, block_order},
        "footer": {type, settings, blocks, block_order}
      },
      "templates": {
        "<template_name>": {
          "sections": {
            "<section_uuid>": {
              "type": "<block_type>",
              "disabled": false,
              "settings": {<setting_id>: <value>},
              "blocks":   {<block_id>: {type, settings}},
              "block_order": [<block_id>, ...]
            }
          },
          "order": [<section_uuid>, ...]
        }
      }
    }
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="theme_configs",
    )
    # PROTECT prevents deleting a theme that has active tenant installs
    theme = models.ForeignKey(
        WebstoreTheme,
        on_delete=models.PROTECT,
        related_name="tenant_configs",
    )
    status = models.CharField(
        max_length=10,
        choices=ThemeConfigStatus.choices,
        default=ThemeConfigStatus.DRAFT,
    )
    config = models.JSONField(default=dict)
    # Maps block_type → {purchased_at, invoice_id} for premium blocks
    purchased_blocks = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "webstore_tenant_theme_config"

    def __str__(self) -> str:
        return f"{self.tenant} — {self.theme} ({self.status})"


class WebstoreMenu(models.Model):
    """
    Navigation menus displayed in the storefront header and footer.
    Header/footer blocks reference menus by their 'handle'.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="webstore_menus",
    )
    title = models.CharField(max_length=100)
    handle = models.SlugField(max_length=100)
    # Tree-structured array of menu items.
    # Each item: {id, title, type, resource_id, url, children: [...]}
    items = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "webstore_menu"
        unique_together = [["tenant", "handle"]]

    def __str__(self) -> str:
        return f"{self.tenant}: {self.title}"


class WebstoreCollection(models.Model):
    """
    A curated grouping of products for the consumer-facing storefront.
    Distinct from catalog.Category (internal inventory) — these are
    consumer-facing merchandise groupings (e.g. "New Arrivals", "Sale Items").

    Supports manual (explicit product selection) and automated (rule-based)
    collection types.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="webstore_collections",
    )
    title = models.CharField(max_length=255)
    handle = models.SlugField(max_length=255)
    description = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    collection_type = models.CharField(
        max_length=10,
        choices=[("manual", "Manual"), ("automated", "Automated")],
        default="manual",
    )
    # For automated collections: [{field, relation, value}]
    filter_rules = models.JSONField(default=list)
    filter_conjunction = models.CharField(
        max_length=3,
        choices=[("AND", "All conditions"), ("OR", "Any condition")],
        default="AND",
    )
    # For manual collections: ordered array of product UUID strings
    manual_product_ids = models.JSONField(default=list)
    sort_order_type = models.CharField(
        max_length=30,
        choices=[
            ("manual", "Manually"),
            ("best_selling", "Best Selling"),
            ("alpha_asc", "A–Z"),
            ("alpha_desc", "Z–A"),
            ("price_asc", "Price: Low to High"),
            ("price_desc", "Price: High to Low"),
            ("newest", "Newest"),
        ],
        default="manual",
    )
    seo_title = models.CharField(max_length=255, blank=True)
    seo_description = models.TextField(blank=True)
    is_published = models.BooleanField(default=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "webstore_collection"
        unique_together = [["tenant", "handle"]]

    def __str__(self) -> str:
        return f"{self.tenant}: {self.title}"


class WebstorePage(models.Model):
    """
    Merchant-created static content pages (About Us, FAQ, Contact, etc.).
    Served at /pages/<handle> on the storefront.

    SECURITY: body_html must be sanitized with bleach before saving to
    prevent stored XSS. This is enforced in the service layer.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="webstore_pages",
    )
    title = models.CharField(max_length=255)
    handle = models.SlugField(max_length=255)
    # Rich-text content stored as sanitized HTML (bleach-sanitized before save)
    body_html = models.TextField(blank=True)
    seo_title = models.CharField(max_length=255, blank=True)
    seo_description = models.TextField(blank=True)
    is_published = models.BooleanField(default=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "webstore_page"
        unique_together = [["tenant", "handle"]]

    def __str__(self) -> str:
        return f"{self.tenant}: {self.title}"


class WebstoreCustomer(models.Model):
    """
    Consumer accounts created on the storefront.
    Completely separate from CustomUser (staff accounts).
    Consumers can only access their own order history and account details.

    Auth: consumer JWTs include sub=customer_uuid, role="CONSUMER",
    tenant_slug. They are never accepted by staff-only endpoints.
    JWT issuance is implemented in Phase 8.

    Soft-delete: deleted_at is present; deleted consumers cannot log in
    and are hidden from admin lists, but their order history is retained.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="webstore_customers",
    )
    email = models.EmailField()
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    # Use Django's make_password() / check_password() for all hash operations
    password_hash = models.CharField(max_length=128)
    # Saved delivery addresses:
    # [{id, first_name, last_name, address1, address2, city, province,
    #   postal_code, country, is_default}]
    addresses = models.JSONField(default=list)
    # UUID of the default address within the addresses array
    default_address_id = models.CharField(max_length=36, blank=True)
    accepts_marketing = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    # Optional link to a CRM Customer record for CRM integration
    crm_contact = models.ForeignKey(
        "crm.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="webstore_account",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    # Soft delete — deleted accounts are hidden but order history is retained
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "webstore_customer"
        unique_together = [["tenant", "email"]]

    def __str__(self) -> str:
        return f"{self.email} ({self.tenant})"


class WebstoreOrder(models.Model):
    """
    An order placed by a consumer on the storefront.

    After payment confirmation, a pos.Sale record is created to deduct
    inventory — tying the webstore into the existing inventory system.

    Line items are denormalized snapshots so order history remains accurate
    even if products are later edited or deleted.

    Soft-delete: deleted_at is present for data retention / audit purposes.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="webstore_orders",
    )
    # Human-readable tenant-scoped sequential number, e.g. "WS-1001"
    order_number = models.CharField(max_length=20)
    # Null for guest checkout
    customer = models.ForeignKey(
        WebstoreCustomer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    # Stored separately to support guest orders and order lookup
    customer_email = models.EmailField()
    # Financials
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    shipping_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="LKR")
    # Status fields
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("confirmed", "Confirmed"),
            ("processing", "Processing"),
            ("shipped", "Shipped"),
            ("delivered", "Delivered"),
            ("cancelled", "Cancelled"),
            ("refunded", "Refunded"),
        ],
        default="pending",
    )
    payment_status = models.CharField(
        max_length=20,
        choices=[
            ("unpaid", "Unpaid"),
            ("paid", "Paid"),
            ("refunded", "Refunded"),
        ],
        default="unpaid",
    )
    fulfillment_status = models.CharField(
        max_length=20,
        choices=[
            ("unfulfilled", "Unfulfilled"),
            ("partial", "Partial"),
            ("fulfilled", "Fulfilled"),
        ],
        default="unfulfilled",
    )
    # Denormalized snapshot of purchased items (preserves order history integrity)
    # [{product_id, variant_id, title, variant_title, sku, quantity,
    #   unit_price, total, image_url, requires_shipping}]
    line_items = models.JSONField(default=list)
    # Address snapshots at time of order
    shipping_address = models.JSONField(default=dict)
    billing_address = models.JSONField(default=dict)
    notes = models.TextField(blank=True)
    discount_code = models.CharField(max_length=50, blank=True)
    # Created after payment confirmation + inventory deduction
    pos_sale = models.ForeignKey(
        "pos.Sale",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="webstore_order",
    )
    # Payment gateway fields
    payment_reference = models.CharField(max_length=255, blank=True)
    payment_gateway = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Soft delete
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "webstore_order"
        unique_together = [["tenant", "order_number"]]

    def __str__(self) -> str:
        return f"{self.order_number} ({self.tenant})"
