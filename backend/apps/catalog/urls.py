from django.urls import path

from .views import (
    BarcodeVariantView,
    BrandDetailView,
    BrandListCreateView,
    BulkStockAdjustView,
    CategoryDetailView,
    CategoryListCreateView,
    LowStockVariantsView,
    ProductDetailView,
    ProductImageUploadView,
    ProductListCreateView,
    StockAdjustView,
    StockMovementListView,
    StockTakeApproveView,
    StockTakeCompleteView,
    StockTakeItemUpdateView,
    StockTakeRejectView,
    StockTakeSessionDetailView,
    StockTakeSessionListView,
    StockValuationView,
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

    # Stock adjustment
    path("stock/adjust/", StockAdjustView.as_view(), name="stock-adjust"),
    path("stock/bulk-adjust/", BulkStockAdjustView.as_view(), name="stock-bulk-adjust"),

    # Stock movements
    path("stock/movements/", StockMovementListView.as_view(), name="stock-movements"),

    # Stock valuation
    path("stock/valuation/", StockValuationView.as_view(), name="stock-valuation"),

    # Low stock
    path("stock/low-stock/", LowStockVariantsView.as_view(), name="low-stock"),

    # Stock take sessions
    path("stock-takes/", StockTakeSessionListView.as_view(), name="stock-take-list"),
    path("stock-takes/<uuid:session_id>/", StockTakeSessionDetailView.as_view(), name="stock-take-detail"),
    path("stock-takes/<uuid:session_id>/items/<uuid:item_id>/", StockTakeItemUpdateView.as_view(), name="stock-take-item-update"),
    path("stock-takes/<uuid:session_id>/complete/", StockTakeCompleteView.as_view(), name="stock-take-complete"),
    path("stock-takes/<uuid:session_id>/approve/", StockTakeApproveView.as_view(), name="stock-take-approve"),
    path("stock-takes/<uuid:session_id>/reject/", StockTakeRejectView.as_view(), name="stock-take-reject"),
]


