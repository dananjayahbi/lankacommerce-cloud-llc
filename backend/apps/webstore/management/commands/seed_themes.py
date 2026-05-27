"""
apps/webstore/management/commands/seed_themes.py

Seeds a curated set of platform themes into WebstoreTheme.
Safe to run multiple times — uses update_or_create throughout.

Usage:
    python manage.py seed_themes
"""

from django.core.management.base import BaseCommand

from apps.webstore.models import BlockType, ThemeCategory, WebstoreTheme


# ---------------------------------------------------------------------------
# Shared global settings schema (same for all themes)
# ---------------------------------------------------------------------------
GLOBAL_SETTINGS_SCHEMA = [
    {"type": "header", "content": "Colours"},
    {"id": "primary",    "type": "color", "label": "Primary Colour",    "default": "#2563EB"},
    {"id": "secondary",  "type": "color", "label": "Secondary Colour",  "default": "#7C3AED"},
    {"id": "background", "type": "color", "label": "Background Colour", "default": "#FFFFFF"},
    {"id": "text",       "type": "color", "label": "Body Text Colour",  "default": "#111827"},
    {"id": "accent",     "type": "color", "label": "Accent Colour",     "default": "#F59E0B"},
    {"type": "header", "content": "Typography"},
    {"id": "heading_font", "type": "font_picker", "label": "Heading Font", "default": "Inter"},
    {"id": "body_font",    "type": "font_picker", "label": "Body Font",    "default": "Inter"},
]


def _make_config(colors: dict, heading_font: str = "Inter", body_font: str = "Inter") -> dict:
    """Build a theme config dict with the given colour palette."""
    return {
        "global_settings": {
            "colors": colors,
            "typography": {
                "heading_font": heading_font,
                "body_font": body_font,
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
# Theme catalogue
# ---------------------------------------------------------------------------
THEMES = [
    {
        "slug": "classic",
        "name": "Classic",
        "description": (
            "Timeless warm earth tones with serif headings — perfect for boutique, "
            "lifestyle and artisan stores."
        ),
        "category": ThemeCategory.GENERAL,
        "version": "1.0.0",
        "author": "LankaCommerce",
        "is_free": True,
        "is_published": True,
        "is_default": False,
        "colors": {
            "primary": "#92400E",
            "secondary": "#B45309",
            "background": "#FFFBF5",
            "text": "#1C1917",
            "accent": "#D97706",
        },
        "heading_font": "Playfair Display",
        "body_font": "Georgia",
    },
    {
        "slug": "minimal",
        "name": "Minimal",
        "description": (
            "Ultra-clean white canvas with charcoal accents. "
            "Let your products speak for themselves."
        ),
        "category": ThemeCategory.GENERAL,
        "version": "1.0.0",
        "author": "LankaCommerce",
        "is_free": True,
        "is_published": True,
        "is_default": False,
        "colors": {
            "primary": "#171717",
            "secondary": "#404040",
            "background": "#FAFAFA",
            "text": "#171717",
            "accent": "#737373",
        },
        "heading_font": "DM Sans",
        "body_font": "DM Sans",
    },
    {
        "slug": "bold",
        "name": "Bold",
        "description": (
            "High-contrast modern layout with vibrant coral and indigo. "
            "Designed to grab attention and drive conversions."
        ),
        "category": ThemeCategory.GENERAL,
        "version": "1.0.0",
        "author": "LankaCommerce",
        "is_free": True,
        "is_published": True,
        "is_default": False,
        "colors": {
            "primary": "#EF4444",
            "secondary": "#4338CA",
            "background": "#FFFFFF",
            "text": "#111827",
            "accent": "#FBBF24",
        },
        "heading_font": "Poppins",
        "body_font": "Poppins",
    },
    {
        "slug": "natural",
        "name": "Natural",
        "description": (
            "Fresh green palette with earthy warmth — ideal for organic, food, "
            "health and eco-friendly stores."
        ),
        "category": ThemeCategory.GENERAL,
        "version": "1.0.0",
        "author": "LankaCommerce",
        "is_free": True,
        "is_published": True,
        "is_default": False,
        "colors": {
            "primary": "#16A34A",
            "secondary": "#15803D",
            "background": "#F0FDF4",
            "text": "#14532D",
            "accent": "#CA8A04",
        },
        "heading_font": "Lato",
        "body_font": "Lato",
    },
    {
        "slug": "luxe",
        "name": "Luxe",
        "description": (
            "Dark mode luxury with gold accents and deep backgrounds. "
            "Made for premium fashion, jewellery and high-end products."
        ),
        "category": ThemeCategory.FASHION,
        "version": "1.0.0",
        "author": "LankaCommerce",
        "is_free": False,
        "is_published": True,
        "is_default": False,
        "colors": {
            "primary": "#CA8A04",
            "secondary": "#A16207",
            "background": "#0F0F0F",
            "text": "#F5F5F5",
            "accent": "#FBBF24",
        },
        "heading_font": "Cormorant Garamond",
        "body_font": "Inter",
    },
    {
        "slug": "fresh",
        "name": "Fresh",
        "description": (
            "Bright, airy layout with sky blue and lime accents. "
            "Great for food delivery, beverages and lifestyle brands."
        ),
        "category": ThemeCategory.FOOD,
        "version": "1.0.0",
        "author": "LankaCommerce",
        "is_free": True,
        "is_published": True,
        "is_default": False,
        "colors": {
            "primary": "#0EA5E9",
            "secondary": "#22C55E",
            "background": "#F0F9FF",
            "text": "#0C4A6E",
            "accent": "#84CC16",
        },
        "heading_font": "Nunito",
        "body_font": "Nunito",
    },
]


class Command(BaseCommand):
    help = (
        "Idempotent seed: creates / updates a curated catalogue of WebstoreThemes. "
        "Run after seed_default_theme so block types are available."
    )

    def handle(self, *args, **options):
        supported_sections = list(BlockType.values)
        created_count = 0
        updated_count = 0

        for spec in THEMES:
            config = _make_config(
                colors=spec["colors"],
                heading_font=spec.get("heading_font", "Inter"),
                body_font=spec.get("body_font", "Inter"),
            )

            _, created = WebstoreTheme.objects.update_or_create(
                slug=spec["slug"],
                defaults={
                    "name": spec["name"],
                    "description": spec["description"],
                    "category": spec["category"],
                    "version": spec["version"],
                    "author": spec["author"],
                    "is_free": spec["is_free"],
                    "is_published": spec["is_published"],
                    "is_default": spec["is_default"],
                    "supported_sections": supported_sections,
                    "default_config": config,
                    "global_settings_schema": GLOBAL_SETTINGS_SCHEMA,
                    "preview_image_url": "",
                },
            )

            if created:
                created_count += 1
                self.stdout.write(f"  Created theme: '{spec['name']}' (slug={spec['slug']})")
            else:
                updated_count += 1
                self.stdout.write(f"  Updated theme: '{spec['name']}' (slug={spec['slug']})")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nseed_themes completed: {created_count} created, {updated_count} updated."
            )
        )
