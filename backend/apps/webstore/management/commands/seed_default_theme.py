"""
apps/webstore/management/commands/seed_default_theme.py

Idempotent seed command that bootstraps the platform default theme,
all block definitions and a ready-to-use TenantWebstore + TenantThemeConfig
for the "test-business" tenant (used for local development / Phase 7).

Usage:
    python manage.py seed_default_theme

Safe to run multiple times — uses get_or_create / update_or_create throughout.
"""

from django.core.management.base import BaseCommand

from apps.webstore.models import (
    BlockType,
    TenantThemeConfig,
    TenantWebstore,
    ThemeCategory,
    ThemeConfigStatus,
    WebstoreBlock,
    WebstoreTheme,
)


# ---------------------------------------------------------------------------
# Default theme config skeleton
# Matches the TenantThemeConfig.config schema defined in Phase 1.
# Includes "index" template with hero_banner + featured_collection sections.
# ---------------------------------------------------------------------------

DEFAULT_THEME_CONFIG = {
    "global_settings": {
        "colors": {
            "primary": "#2563EB",
            "secondary": "#7C3AED",
            "background": "#FFFFFF",
            "text": "#111827",
            "accent": "#F59E0B",
        },
        "typography": {
            "heading_font": "Inter",
            "body_font": "Inter",
            "heading_size_scale": 1.0,
        },
        "layout": {
            "max_content_width": "1280px",
            "enable_sticky_header": True,
        },
        "social": {
            "facebook": "",
            "instagram": "",
            "tiktok": "",
            "youtube": "",
        },
    },
    "layout": {
        "header": {
            "type": "header",
            "settings": {
                "show_announcement_bar": False,
                "announcement_text": "",
                "announcement_link": "",
                "show_search": True,
                "logo_width": 120,
            },
            "blocks": {},
            "block_order": [],
        },
        "footer": {
            "type": "footer",
            "settings": {
                "show_payment_icons": True,
                "copyright_text": "© {year} {store_name}. All rights reserved.",
            },
            "blocks": {},
            "block_order": [],
        },
    },
    "templates": {
        "index": {
            "sections": {
                "hero-main": {
                    "type": "hero_banner",
                    "disabled": False,
                    "settings": {
                        "heading": "Welcome to Our Store",
                        "subheading": "Discover our latest collection",
                        "button_text": "Shop Now",
                        "button_url": "/collections/all",
                        "image_url": "",
                        "overlay_opacity": 0.3,
                        "text_alignment": "center",
                        "full_width": True,
                        "min_height": 500,
                    },
                    "blocks": {},
                    "block_order": [],
                },
                "featured-collection-1": {
                    "type": "featured_collection",
                    "disabled": False,
                    "settings": {
                        "title": "Featured Products",
                        "collection": "",
                        "products_to_show": 4,
                        "columns_desktop": 4,
                        "columns_mobile": 2,
                        "show_view_all": True,
                        "view_all_text": "View All",
                    },
                    "blocks": {},
                    "block_order": [],
                },
            },
            "order": ["hero-main", "featured-collection-1"],
        },
        "product": {
            "sections": {
                "product-main": {
                    "type": "product_detail",
                    "disabled": False,
                    "settings": {
                        "show_vendor": True,
                        "show_quantity_selector": True,
                        "show_share_buttons": False,
                    },
                    "blocks": {},
                    "block_order": [],
                },
                "product-recommendations": {
                    "type": "product_recommendations",
                    "disabled": False,
                    "settings": {
                        "heading": "You may also like",
                        "products_to_show": 4,
                    },
                    "blocks": {},
                    "block_order": [],
                },
            },
            "order": ["product-main", "product-recommendations"],
        },
        "collection": {
            "sections": {
                "collection-header": {
                    "type": "collection_header",
                    "disabled": False,
                    "settings": {
                        "show_collection_image": True,
                        "show_collection_description": True,
                    },
                    "blocks": {},
                    "block_order": [],
                },
                "collection-products": {
                    "type": "product_grid",
                    "disabled": False,
                    "settings": {
                        "columns_desktop": 4,
                        "columns_mobile": 2,
                        "enable_filtering": True,
                        "enable_sorting": True,
                        "products_per_page": 24,
                    },
                    "blocks": {},
                    "block_order": [],
                },
            },
            "order": ["collection-header", "collection-products"],
        },
    },
}

# ---------------------------------------------------------------------------
# Global settings schema — rendered as a settings form in the customizer
# ---------------------------------------------------------------------------

GLOBAL_SETTINGS_SCHEMA = [
    {
        "type": "header",
        "content": "Colours",
    },
    {
        "id": "primary",
        "type": "color",
        "label": "Primary Colour",
        "default": "#2563EB",
        "info": "Used for buttons and key interactive elements.",
    },
    {
        "id": "secondary",
        "type": "color",
        "label": "Secondary Colour",
        "default": "#7C3AED",
    },
    {
        "id": "background",
        "type": "color",
        "label": "Background Colour",
        "default": "#FFFFFF",
    },
    {
        "id": "text",
        "type": "color",
        "label": "Body Text Colour",
        "default": "#111827",
    },
    {
        "id": "accent",
        "type": "color",
        "label": "Accent Colour",
        "default": "#F59E0B",
    },
    {
        "type": "header",
        "content": "Typography",
    },
    {
        "id": "heading_font",
        "type": "font_picker",
        "label": "Heading Font",
        "default": "Inter",
    },
    {
        "id": "body_font",
        "type": "font_picker",
        "label": "Body Font",
        "default": "Inter",
    },
]

# ---------------------------------------------------------------------------
# Block definitions — schema is intentionally empty for Phase 2.
# Full schemas are added in Phase 6 (Core Block Library).
# react_component_key maps to the frontend BLOCK_REGISTRY.
# ---------------------------------------------------------------------------

BLOCK_DEFINITIONS = {
    BlockType.HEADER: {
        "name": "Header",
        "react_component_key": "Header",
        "description": "Site-wide header with logo, navigation and cart icon.",
        "sort_order": 0,
    },
    BlockType.FOOTER: {
        "name": "Footer",
        "react_component_key": "Footer",
        "description": "Site-wide footer with links and legal text.",
        "sort_order": 1,
    },
    BlockType.ANNOUNCEMENT_BAR: {
        "name": "Announcement Bar",
        "react_component_key": "AnnouncementBar",
        "description": "Slim banner for promotions and announcements.",
        "sort_order": 2,
    },
    BlockType.HERO_BANNER: {
        "name": "Hero Banner",
        "react_component_key": "HeroBanner",
        "description": "Full-width hero image with headline and CTA button.",
        "sort_order": 10,
    },
    BlockType.FEATURED_COLLECTION: {
        "name": "Featured Collection",
        "react_component_key": "FeaturedCollection",
        "description": "Product grid pulled from a specific collection.",
        "sort_order": 11,
    },
    BlockType.IMAGE_WITH_TEXT: {
        "name": "Image with Text",
        "react_component_key": "ImageWithText",
        "description": "Side-by-side image and text block.",
        "sort_order": 12,
    },
    BlockType.RICH_TEXT: {
        "name": "Rich Text",
        "react_component_key": "RichText",
        "description": "Full-width rich text section.",
        "sort_order": 13,
    },
    BlockType.TESTIMONIALS: {
        "name": "Testimonials",
        "react_component_key": "Testimonials",
        "description": "Customer reviews and testimonials carousel.",
        "sort_order": 14,
    },
    BlockType.NEWSLETTER_SIGNUP: {
        "name": "Newsletter Signup",
        "react_component_key": "NewsletterSignup",
        "description": "Email capture form for newsletter subscriptions.",
        "sort_order": 15,
    },
    BlockType.COLLECTION_LIST: {
        "name": "Collection List",
        "react_component_key": "CollectionList",
        "description": "Grid of collection cards.",
        "sort_order": 16,
    },
    BlockType.SLIDESHOW: {
        "name": "Slideshow",
        "react_component_key": "Slideshow",
        "description": "Auto-advancing image carousel.",
        "sort_order": 17,
    },
    BlockType.VIDEO: {
        "name": "Video",
        "react_component_key": "Video",
        "description": "Embedded video section (YouTube / Vimeo).",
        "sort_order": 18,
    },
    BlockType.COUNTDOWN_TIMER: {
        "name": "Countdown Timer",
        "react_component_key": "CountdownTimer",
        "description": "Deadline countdown for time-limited promotions.",
        "sort_order": 19,
    },
    BlockType.CUSTOM_HTML: {
        "name": "Custom HTML",
        "react_component_key": "CustomHtml",
        "description": "Raw HTML block for advanced customisation.",
        "sort_order": 20,
    },
    BlockType.PRODUCT_DETAIL: {
        "name": "Product Detail",
        "react_component_key": "ProductDetail",
        "description": "Main product page section with images and variant picker.",
        "sort_order": 30,
    },
    BlockType.PRODUCT_RECOMMENDATIONS: {
        "name": "Product Recommendations",
        "react_component_key": "ProductRecommendations",
        "description": "Related products grid shown on the product page.",
        "sort_order": 31,
    },
    BlockType.PRODUCT_REVIEWS: {
        "name": "Product Reviews",
        "react_component_key": "ProductReviews",
        "description": "User-submitted product review list.",
        "sort_order": 32,
    },
    BlockType.COLLECTION_HEADER: {
        "name": "Collection Header",
        "react_component_key": "CollectionHeader",
        "description": "Banner header for collection pages.",
        "sort_order": 40,
    },
    BlockType.PRODUCT_GRID: {
        "name": "Product Grid",
        "react_component_key": "ProductGrid",
        "description": "Filterable, sortable product grid for collection pages.",
        "sort_order": 41,
    },
    BlockType.COLLECTION_FILTERS: {
        "name": "Collection Filters",
        "react_component_key": "CollectionFilters",
        "description": "Sidebar or drawer filter panel for collections.",
        "sort_order": 42,
    },
    BlockType.CART_ITEMS: {
        "name": "Cart Items",
        "react_component_key": "CartItems",
        "description": "Line items list in the cart drawer / page.",
        "sort_order": 50,
    },
    BlockType.CART_SUMMARY: {
        "name": "Cart Summary",
        "react_component_key": "CartSummary",
        "description": "Subtotal, discount codes and checkout button.",
        "sort_order": 51,
    },
}


class Command(BaseCommand):
    help = (
        "Idempotent seed: creates the default WebstoreTheme, all WebstoreBlock "
        "definitions and a test-business TenantWebstore + active TenantThemeConfig."
    )

    def handle(self, *args, **options):
        self._seed_default_theme()
        self._seed_blocks()
        self._seed_test_business()
        self.stdout.write(self.style.SUCCESS("seed_default_theme completed successfully."))

    # ------------------------------------------------------------------
    # Step 1: Default theme
    # ------------------------------------------------------------------

    def _seed_default_theme(self) -> WebstoreTheme:
        supported_sections = list(BlockType.values)

        theme, created = WebstoreTheme.objects.update_or_create(
            slug="default",
            defaults={
                "name": "Default Theme",
                "description": "The LankaCommerce platform default theme. Clean, fast and fully customisable.",
                "category": ThemeCategory.GENERAL,
                "version": "1.0.0",
                "is_free": True,
                "is_published": True,
                "is_default": True,
                "author": "LankaCommerce",
                "supported_sections": supported_sections,
                "default_config": DEFAULT_THEME_CONFIG,
                "global_settings_schema": GLOBAL_SETTINGS_SCHEMA,
            },
        )

        action = "Created" if created else "Updated"
        self.stdout.write(f"  {action} WebstoreTheme: '{theme.name}' (slug=default)")
        return theme

    # ------------------------------------------------------------------
    # Step 2: Block definitions
    # ------------------------------------------------------------------

    def _seed_blocks(self) -> None:
        for block_type, meta in BLOCK_DEFINITIONS.items():
            block, created = WebstoreBlock.objects.update_or_create(
                type=block_type,
                defaults={
                    "name": meta["name"],
                    "description": meta.get("description", ""),
                    "react_component_key": meta["react_component_key"],
                    "sort_order": meta.get("sort_order", 0),
                    # schema is intentionally empty for Phase 2; filled in Phase 6
                    "schema": [],
                    "nested_blocks_schema": [],
                    "is_published": True,
                    "is_premium": False,
                    "version": "1.0.0",
                },
            )
            action = "Created" if created else "Updated"
            self.stdout.write(f"  {action} WebstoreBlock: {block_type}")

    # ------------------------------------------------------------------
    # Step 3: test-business tenant setup
    # ------------------------------------------------------------------

    def _seed_test_business(self) -> None:
        from apps.tenants.models import Tenant

        try:
            tenant = Tenant.objects.get(slug="test-business")
        except Tenant.DoesNotExist:
            self.stdout.write(
                self.style.WARNING(
                    "  Tenant 'test-business' not found — skipping TenantWebstore seed. "
                    "Run the tenant seed command first."
                )
            )
            return

        theme = WebstoreTheme.objects.get(slug="default")

        # TenantWebstore
        webstore, created = TenantWebstore.objects.update_or_create(
            tenant=tenant,
            defaults={
                "is_enabled": True,
                "is_password_protected": False,
                "seo_title": "Test Business Store",
                "seo_description": "The test business storefront for LankaCommerce development.",
                "customer_accounts": "optional",
                "cart_settings": {
                    "require_login": False,
                    "enable_notes": True,
                    "enable_shipping_calculator": False,
                    "checkout_redirect_url": "",
                },
            },
        )
        action = "Created" if created else "Updated"
        self.stdout.write(f"  {action} TenantWebstore for '{tenant.slug}' (is_enabled=True)")

        # Ensure exactly one ACTIVE TenantThemeConfig
        existing_active = TenantThemeConfig.objects.filter(
            tenant=tenant, status=ThemeConfigStatus.ACTIVE
        ).first()

        if existing_active is None:
            TenantThemeConfig.objects.create(
                tenant=tenant,
                theme=theme,
                status=ThemeConfigStatus.ACTIVE,
                config=DEFAULT_THEME_CONFIG,
            )
            self.stdout.write(
                f"  Created TenantThemeConfig (ACTIVE) for '{tenant.slug}'"
            )
        else:
            self.stdout.write(
                f"  TenantThemeConfig (ACTIVE) already exists for '{tenant.slug}' — skipped"
            )
