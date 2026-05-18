from django.urls import path

from .views import (
    BarcodeVariantView,
    BrandDetailView,
    BrandListCreateView,
    CategoryDetailView,
    CategoryListCreateView,
    ProductDetailView,
    ProductImageUploadView,
    ProductListCreateView,
    VariantDetailView,
)

urlpatterns = [
    # Categories
    path("categories/", CategoryListCreateView.as_view(), name="category-list"),
    path("categories/<uuid:category_id>/", CategoryDetailView.as_view(), name="category-detail"),

    # Brands
    path("brands/", BrandListCreateView.as_view(), name="brand-list"),
    path("brands/<uuid:brand_id>/", BrandDetailView.as_view(), name="brand-detail"),

    # Products
    path("products/", ProductListCreateView.as_view(), name="product-list"),
    path("products/<uuid:product_id>/", ProductDetailView.as_view(), name="product-detail"),
    path("products/<uuid:product_id>/upload-image/", ProductImageUploadView.as_view(), name="product-upload-image"),

    # Variants — barcode lookup MUST come before the UUID variant detail pattern
    path("variants/barcode/<str:barcode>/", BarcodeVariantView.as_view(), name="variant-barcode"),
    path("variants/<uuid:variant_id>/", VariantDetailView.as_view(), name="variant-detail"),
]
