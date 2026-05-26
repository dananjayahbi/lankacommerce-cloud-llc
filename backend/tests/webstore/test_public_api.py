"""
tests/webstore/test_public_api.py

Test suite for Phase 2: Public Storefront API.

All tests are unauthenticated (no JWT required) and use DRF's APIClient.

Coverage targets (per spec section 9):
  9.1  Config endpoint
  9.2  Products endpoint
  9.3  Product detail endpoint
  9.4  Collection endpoint
  9.5  Search endpoint
"""

import uuid

from django.test import TestCase
from rest_framework.test import APIClient

from apps.catalog.models import Brand, Category, Product, ProductVariant
from apps.tenants.models import Tenant, TenantStatus
from apps.webstore.models import (
    TenantThemeConfig,
    TenantWebstore,
    ThemeConfigStatus,
    WebstoreCollection,
    WebstoreTheme,
)


# ---------------------------------------------------------------------------
# Shared test fixtures
# ---------------------------------------------------------------------------


def _make_tenant(slug="test-store", status=TenantStatus.ACTIVE) -> Tenant:
    return Tenant.objects.create(
        name="Test Store",
        slug=slug,
        status=status,
    )


def _make_webstore(tenant: Tenant, is_enabled=True) -> TenantWebstore:
    return TenantWebstore.objects.create(
        tenant=tenant,
        is_enabled=is_enabled,
        is_password_protected=False,
    )


def _make_theme() -> WebstoreTheme:
    theme, _ = WebstoreTheme.objects.get_or_create(
        slug="test-theme",
        defaults={
            "name": "Test Theme",
            "is_default": True,
            "is_free": True,
            "is_published": True,
            "default_config": {"global_settings": {}, "templates": {}, "layout": {}},
        },
    )
    return theme


def _make_active_config(tenant: Tenant, theme: WebstoreTheme) -> TenantThemeConfig:
    return TenantThemeConfig.objects.create(
        tenant=tenant,
        theme=theme,
        status=ThemeConfigStatus.ACTIVE,
        config=theme.default_config,
    )


def _make_category(tenant: Tenant, name="Shirts") -> Category:
    return Category.objects.create(tenant=tenant, name=name)


def _make_product(
    tenant: Tenant,
    category: Category,
    name="Basic T-Shirt",
    is_archived=False,
    deleted_at=None,
) -> Product:
    return Product.objects.create(
        tenant=tenant,
        name=name,
        category=category,
        is_archived=is_archived,
        deleted_at=deleted_at,
    )


def _make_variant(
    product: Product,
    sku: str | None = None,
    retail_price="29.99",
    stock_quantity=10,
    deleted_at=None,
) -> ProductVariant:
    if sku is None:
        sku = f"SKU-{uuid.uuid4().hex[:8].upper()}"
    return ProductVariant.objects.create(
        product=product,
        tenant=product.tenant,
        sku=sku,
        retail_price=retail_price,
        cost_price="10.00",
        stock_quantity=stock_quantity,
        deleted_at=deleted_at,
    )


# ---------------------------------------------------------------------------
# 9.1  Config endpoint
# ---------------------------------------------------------------------------


class StoreConfigViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant = _make_tenant()
        self.theme = _make_theme()
        self.webstore = _make_webstore(self.tenant, is_enabled=True)
        self.config = _make_active_config(self.tenant, self.theme)

    def _url(self, slug=None):
        slug = slug or self.tenant.slug
        return f"/api/webstore/public/{slug}/config/"

    def test_returns_200_with_is_enabled_true_for_active_store(self):
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["is_enabled"])
        self.assertIn("theme_config", data)
        self.assertIn("store_settings", data)

    def test_returns_200_with_is_enabled_false_when_webstore_disabled(self):
        self.webstore.is_enabled = False
        self.webstore.save()
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.json()["is_enabled"])

    def test_returns_404_for_nonexistent_slug(self):
        resp = self.client.get(self._url("no-such-store-xyz"))
        self.assertEqual(resp.status_code, 404)
        self.assertIn("Store not found", resp.json()["detail"])

    def test_cache_control_header_present(self):
        resp = self.client.get(self._url())
        self.assertIn("Cache-Control", resp)
        self.assertIn("max-age=60", resp["Cache-Control"])

    def test_returns_theme_info(self):
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 200)
        theme_data = resp.json()["theme"]
        self.assertIsNotNone(theme_data)
        self.assertEqual(theme_data["name"], self.theme.name)

    def test_suspended_tenant_returns_404(self):
        suspended = _make_tenant(slug="suspended-biz", status=TenantStatus.SUSPENDED)
        _make_webstore(suspended)
        resp = self.client.get(self._url("suspended-biz"))
        self.assertEqual(resp.status_code, 404)

    def test_no_active_config_falls_back_to_default_theme(self):
        # Delete the active config so there is none
        self.config.delete()
        resp = self.client.get(self._url())
        # Should still succeed (falls back to default theme)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["is_enabled"])


# ---------------------------------------------------------------------------
# 9.2  Products endpoint
# ---------------------------------------------------------------------------


class ProductListViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant = _make_tenant(slug="product-store")
        self.webstore = _make_webstore(self.tenant)
        self.category = _make_category(self.tenant, "Clothing")

        # Active products
        self.p1 = _make_product(self.tenant, self.category, name="Red Shirt")
        self.v1 = _make_variant(self.p1, sku="RED-S", retail_price="25.00")

        self.p2 = _make_product(self.tenant, self.category, name="Blue Jeans")
        self.v2 = _make_variant(self.p2, sku="BLUE-M", retail_price="50.00")

        # Archived product (should NOT appear)
        self.p_archived = _make_product(
            self.tenant, self.category, name="Old Product", is_archived=True
        )
        _make_variant(self.p_archived, sku="OLD-1")

    def _url(self, slug=None):
        return f"/api/webstore/public/{slug or self.tenant.slug}/products/"

    def test_returns_paginated_products(self):
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("products", data)
        self.assertIn("meta", data)
        self.assertIn("total", data["meta"])

    def test_does_not_return_archived_products(self):
        resp = self.client.get(self._url())
        titles = [p["title"] for p in resp.json()["products"]]
        self.assertNotIn("Old Product", titles)

    def test_returns_active_products(self):
        resp = self.client.get(self._url())
        titles = [p["title"] for p in resp.json()["products"]]
        self.assertIn("Red Shirt", titles)
        self.assertIn("Blue Jeans", titles)

    def test_sort_price_asc(self):
        resp = self.client.get(self._url() + "?sort=price_asc")
        self.assertEqual(resp.status_code, 200)
        products = resp.json()["products"]
        if len(products) >= 2:
            prices = [float(p["price_range"]["min"]) for p in products]
            self.assertEqual(prices, sorted(prices))

    def test_search_param_filters_results(self):
        resp = self.client.get(self._url() + "?search=Red")
        self.assertEqual(resp.status_code, 200)
        titles = [p["title"] for p in resp.json()["products"]]
        self.assertIn("Red Shirt", titles)
        self.assertNotIn("Blue Jeans", titles)

    def test_collection_filter_param(self):
        collection = WebstoreCollection.objects.create(
            tenant=self.tenant,
            title="Summer Sale",
            handle="summer-sale",
            collection_type="manual",
            manual_product_ids=[str(self.p1.id)],
            is_published=True,
        )
        resp = self.client.get(self._url() + f"?collection={collection.handle}")
        self.assertEqual(resp.status_code, 200)
        products = resp.json()["products"]
        self.assertEqual(len(products), 1)
        self.assertEqual(products[0]["title"], "Red Shirt")

    def test_returns_404_for_nonexistent_tenant(self):
        resp = self.client.get(self._url("ghost-tenant-xyz"))
        self.assertEqual(resp.status_code, 404)

    def test_returns_404_when_store_disabled(self):
        self.webstore.is_enabled = False
        self.webstore.save()
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 404)

    def test_meta_has_required_fields(self):
        resp = self.client.get(self._url())
        meta = resp.json()["meta"]
        for field in ("total", "page", "page_size", "total_pages", "has_next", "has_prev"):
            self.assertIn(field, meta)

    def test_product_summary_has_required_fields(self):
        resp = self.client.get(self._url())
        products = resp.json()["products"]
        self.assertTrue(len(products) > 0)
        product = products[0]
        for field in ("id", "title", "handle", "price_range", "available", "variant_count"):
            self.assertIn(field, product)

    def test_available_false_for_out_of_stock(self):
        p_oos = _make_product(self.tenant, self.category, name="Out Of Stock Item")
        _make_variant(p_oos, sku="OOS-1", stock_quantity=0)
        resp = self.client.get(self._url())
        products = {p["title"]: p for p in resp.json()["products"]}
        self.assertFalse(products["Out Of Stock Item"]["available"])

    def test_page_size_clamped_to_48(self):
        resp = self.client.get(self._url() + "?page_size=999")
        self.assertEqual(resp.json()["meta"]["page_size"], 48)


# ---------------------------------------------------------------------------
# 9.3  Product detail endpoint
# ---------------------------------------------------------------------------


class ProductDetailViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant = _make_tenant(slug="detail-store")
        self.webstore = _make_webstore(self.tenant)
        self.category = _make_category(self.tenant, "Tops")
        self.product = _make_product(self.tenant, self.category, name="Green Hoodie")
        self.variant = _make_variant(
            self.product, sku="GH-L", retail_price="79.99", stock_quantity=5
        )

    def _url(self, handle=None, slug=None):
        handle = handle or str(self.product.id)
        return f"/api/webstore/public/{slug or self.tenant.slug}/products/{handle}/"

    def test_returns_full_product_detail(self):
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["title"], "Green Hoodie")
        self.assertIn("variants", data)
        self.assertIn("options", data)
        self.assertIn("images", data)

    def test_variants_have_required_fields(self):
        resp = self.client.get(self._url())
        variants = resp.json()["variants"]
        self.assertTrue(len(variants) > 0)
        variant = variants[0]
        for field in ("id", "sku", "price", "stock_quantity", "is_available"):
            self.assertIn(field, variant)

    def test_seo_fields_present(self):
        resp = self.client.get(self._url())
        data = resp.json()
        self.assertIn("seo_title", data)
        self.assertIn("seo_description", data)

    def test_returns_404_for_nonexistent_handle(self):
        fake_id = str(uuid.uuid4())
        resp = self.client.get(self._url(handle=fake_id))
        self.assertEqual(resp.status_code, 404)

    def test_returns_404_for_archived_product(self):
        import datetime
        self.product.is_archived = True
        self.product.save()
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 404)

    def test_returns_404_for_deleted_product(self):
        from django.utils import timezone
        self.product.deleted_at = timezone.now()
        self.product.save()
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 404)

    def test_returns_404_for_product_from_different_tenant(self):
        other_tenant = _make_tenant(slug="other-store")
        _make_webstore(other_tenant)
        other_cat = _make_category(other_tenant, "Other Cat")
        other_product = _make_product(other_tenant, other_cat, name="Other Product")
        _make_variant(other_product, sku="OTH-1")

        # Request other tenant's product through our tenant's slug
        resp = self.client.get(self._url(handle=str(other_product.id)))
        self.assertEqual(resp.status_code, 404)

    def test_related_products_present(self):
        # Create a second product in the same category
        p2 = _make_product(self.tenant, self.category, name="Blue Hoodie")
        _make_variant(p2, sku="BH-M")
        resp = self.client.get(self._url())
        data = resp.json()
        self.assertIn("related_products", data)

    def test_is_available_true_when_in_stock(self):
        resp = self.client.get(self._url())
        variants = resp.json()["variants"]
        self.assertTrue(any(v["is_available"] for v in variants))

    def test_is_available_false_when_out_of_stock(self):
        self.variant.stock_quantity = 0
        self.variant.save()
        resp = self.client.get(self._url())
        variants = resp.json()["variants"]
        self.assertFalse(any(v["is_available"] for v in variants))


# ---------------------------------------------------------------------------
# 9.4  Collection endpoint
# ---------------------------------------------------------------------------


class CollectionViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant = _make_tenant(slug="col-store")
        self.webstore = _make_webstore(self.tenant)
        self.category = _make_category(self.tenant, "Summer")

        self.p1 = _make_product(self.tenant, self.category, name="Sunhat")
        self.v1 = _make_variant(self.p1, sku="SH-1", retail_price="15.00")

        self.p2 = _make_product(self.tenant, self.category, name="Sunglasses")
        self.v2 = _make_variant(self.p2, sku="SG-1", retail_price="35.00")

    def _list_url(self, slug=None):
        return f"/api/webstore/public/{slug or self.tenant.slug}/collections/"

    def _detail_url(self, handle, slug=None):
        return f"/api/webstore/public/{slug or self.tenant.slug}/collections/{handle}/"

    def test_collection_list_returns_published_only(self):
        WebstoreCollection.objects.create(
            tenant=self.tenant, title="Published", handle="published",
            collection_type="manual", is_published=True,
        )
        WebstoreCollection.objects.create(
            tenant=self.tenant, title="Draft", handle="draft",
            collection_type="manual", is_published=False,
        )
        resp = self.client.get(self._list_url())
        self.assertEqual(resp.status_code, 200)
        titles = [c["title"] for c in resp.json()]
        self.assertIn("Published", titles)
        self.assertNotIn("Draft", titles)

    def test_manual_collection_returns_products_in_order(self):
        # Explicit order: p2 first, p1 second
        collection = WebstoreCollection.objects.create(
            tenant=self.tenant,
            title="Manual Order",
            handle="manual-order",
            collection_type="manual",
            sort_order_type="manual",
            manual_product_ids=[str(self.p2.id), str(self.p1.id)],
            is_published=True,
        )
        resp = self.client.get(self._detail_url("manual-order"))
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        products = data["products"]
        self.assertEqual(len(products), 2)
        # First product should be p2 (Sunglasses)
        self.assertEqual(products[0]["title"], "Sunglasses")
        self.assertEqual(products[1]["title"], "Sunhat")

    def test_automated_collection_tag_rule(self):
        # Tag the product and create an automated collection
        self.p1.tags = ["summer", "hat"]
        self.p1.save()
        self.p2.tags = ["winter"]
        self.p2.save()

        collection = WebstoreCollection.objects.create(
            tenant=self.tenant,
            title="Summer Items",
            handle="summer-items",
            collection_type="automated",
            filter_conjunction="AND",
            filter_rules=[{"field": "tag", "relation": "contains", "value": "summer"}],
            is_published=True,
        )
        resp = self.client.get(self._detail_url("summer-items"))
        self.assertEqual(resp.status_code, 200)
        products = resp.json()["products"]
        titles = [p["title"] for p in products]
        self.assertIn("Sunhat", titles)
        self.assertNotIn("Sunglasses", titles)

    def test_collection_detail_404_for_nonexistent_handle(self):
        resp = self.client.get(self._detail_url("no-such-collection"))
        self.assertEqual(resp.status_code, 404)

    def test_collection_detail_404_for_unpublished(self):
        WebstoreCollection.objects.create(
            tenant=self.tenant, title="Hidden", handle="hidden",
            collection_type="manual", is_published=False,
        )
        resp = self.client.get(self._detail_url("hidden"))
        self.assertEqual(resp.status_code, 404)

    def test_collection_detail_includes_collection_and_meta(self):
        WebstoreCollection.objects.create(
            tenant=self.tenant, title="Full Test", handle="full-test",
            collection_type="manual",
            manual_product_ids=[str(self.p1.id)],
            is_published=True,
        )
        resp = self.client.get(self._detail_url("full-test"))
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("collection", data)
        self.assertIn("products", data)
        self.assertIn("meta", data)

    def test_automated_collection_product_count(self):
        self.p1.tags = ["promo"]
        self.p1.save()
        self.p2.tags = ["promo"]
        self.p2.save()
        collection = WebstoreCollection.objects.create(
            tenant=self.tenant,
            title="Promo",
            handle="promo",
            collection_type="automated",
            filter_conjunction="AND",
            filter_rules=[{"field": "tag", "relation": "contains", "value": "promo"}],
            is_published=True,
        )
        resp = self.client.get(self._list_url())
        col_data = next(c for c in resp.json() if c["handle"] == "promo")
        # Should be 2 (not 0) for automated collection
        self.assertEqual(col_data["product_count"], 2)


# ---------------------------------------------------------------------------
# 9.5  Search endpoint
# ---------------------------------------------------------------------------


class SearchViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant = _make_tenant(slug="search-store")
        self.webstore = _make_webstore(self.tenant)
        self.category = _make_category(self.tenant, "Electronics")

        self.p1 = _make_product(self.tenant, self.category, name="Wireless Headphones")
        self.v1 = _make_variant(self.p1, sku="WH-100")

        self.p2 = _make_product(self.tenant, self.category, name="USB Keyboard")
        self.v2 = _make_variant(self.p2, sku="KB-200")

    def _url(self, slug=None):
        return f"/api/webstore/public/{slug or self.tenant.slug}/search/"

    def test_returns_400_when_q_is_missing(self):
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 400)
        self.assertIn("detail", resp.json())

    def test_returns_400_when_q_is_empty(self):
        resp = self.client.get(self._url() + "?q=")
        self.assertEqual(resp.status_code, 400)

    def test_returns_matching_products(self):
        resp = self.client.get(self._url() + "?q=Headphones")
        self.assertEqual(resp.status_code, 200)
        titles = [p["title"] for p in resp.json()["products"]]
        self.assertIn("Wireless Headphones", titles)
        self.assertNotIn("USB Keyboard", titles)

    def test_returns_empty_results_for_no_match(self):
        resp = self.client.get(self._url() + "?q=zyxwvutsrqponmlkjihgfedcba")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["products"]), 0)
        self.assertEqual(data["meta"]["total"], 0)

    def test_search_by_sku(self):
        resp = self.client.get(self._url() + "?q=WH-100")
        self.assertEqual(resp.status_code, 200)
        titles = [p["title"] for p in resp.json()["products"]]
        self.assertIn("Wireless Headphones", titles)

    def test_returns_paginated_response(self):
        resp = self.client.get(self._url() + "?q=e")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("meta", resp.json())

    def test_does_not_return_archived_products(self):
        archived = _make_product(
            self.tenant, self.category, name="Archived Headphone", is_archived=True
        )
        _make_variant(archived, sku="ARH-1")
        resp = self.client.get(self._url() + "?q=Headphone")
        titles = [p["title"] for p in resp.json()["products"]]
        self.assertNotIn("Archived Headphone", titles)

    def test_returns_404_when_store_disabled(self):
        self.webstore.is_enabled = False
        self.webstore.save()
        resp = self.client.get(self._url() + "?q=headphones")
        self.assertEqual(resp.status_code, 404)
