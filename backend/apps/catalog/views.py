"""
Catalog API views — Category and Brand endpoints.

All views enforce JWT authentication. Tenant ID is always sourced from
request.user.tenant_id (decoded from the verified JWT) — never from request data.
"""

import csv
import io
import uuid
from datetime import datetime, timezone as dt_timezone
from decimal import Decimal

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.http import HttpResponse
from django.db.models import F, Sum, Q
from django.utils import timezone

from apps.accounts.constants.permissions import PERMISSIONS
from apps.accounts.permissions import HasPermission
from apps.catalog.exceptions import ConflictError, NotFoundError, InsufficientStockError
from apps.catalog.serializers import (
    BrandSerializer,
    CategorySerializer,
    CreateBrandSerializer,
    CreateCategorySerializer,
    UpdateBrandSerializer,
    UpdateCategorySerializer,
)
from apps.catalog.services import product_service
from apps.catalog.services import inventory_service


def _ok(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _error(code: str, message: str, status_code: int):
    return Response(
        {"success": False, "error": {"code": code, "message": message}},
        status=status_code,
    )


# ═════════════════════════════════════════════════════════════════
# Category views
# ═════════════════════════════════════════════════════════════════

class CategoryListCreateView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.CATEGORIES_VIEW)]
        return [IsAuthenticated(), HasPermission(PERMISSIONS.CATEGORIES_CREATE)]

    def get(self, request):
        tenant_id = request.user.tenant_id
        use_tree = request.query_params.get("tree", "").lower() == "true"
        if use_tree:
            qs = product_service.get_category_tree(tenant_id)
        else:
            qs = product_service.get_all_categories(tenant_id)
        data = CategorySerializer(qs, many=True).data
        return _ok(data)

    def post(self, request):
        tenant_id = request.user.tenant_id
        actor_id = request.user.id
        serializer = CreateCategorySerializer(data=request.data)
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), status.HTTP_400_BAD_REQUEST)
        try:
            category = product_service.create_category(tenant_id, actor_id, serializer.validated_data)
        except ConflictError as exc:
            return _error("DUPLICATE_CATEGORY", str(exc), status.HTTP_409_CONFLICT)
        return _ok(CategorySerializer(category).data, status.HTTP_201_CREATED)


class CategoryDetailView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.CATEGORIES_VIEW)]
        if self.request.method == "PATCH":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.CATEGORIES_EDIT)]
        return [IsAuthenticated(), HasPermission(PERMISSIONS.CATEGORIES_DELETE)]

    def get(self, request, category_id):
        tenant_id = request.user.tenant_id
        try:
            category = product_service.get_category_by_id(tenant_id, category_id)
        except NotFoundError:
            return _error("NOT_FOUND", "Category not found.", status.HTTP_404_NOT_FOUND)
        return _ok(CategorySerializer(category).data)

    def patch(self, request, category_id):
        tenant_id = request.user.tenant_id
        actor_id = request.user.id
        serializer = UpdateCategorySerializer(data=request.data)
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), status.HTTP_400_BAD_REQUEST)
        try:
            category = product_service.update_category(
                tenant_id, category_id, actor_id, serializer.validated_data
            )
        except NotFoundError:
            return _error("NOT_FOUND", "Category not found.", status.HTTP_404_NOT_FOUND)
        return _ok(CategorySerializer(category).data)

    def delete(self, request, category_id):
        tenant_id = request.user.tenant_id
        actor_id = request.user.id
        try:
            product_service.soft_delete_category(tenant_id, category_id, actor_id)
        except NotFoundError:
            return _error("NOT_FOUND", "Category not found.", status.HTTP_404_NOT_FOUND)
        except ConflictError as exc:
            return _error("CONFLICT", str(exc), status.HTTP_409_CONFLICT)
        return _ok({"message": "Category deleted successfully."})


# ═════════════════════════════════════════════════════════════════
# Brand views
# ═════════════════════════════════════════════════════════════════

class BrandListCreateView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.PRODUCTS_VIEW)]
        return [IsAuthenticated(), HasPermission(PERMISSIONS.PRODUCTS_CREATE)]

    def get(self, request):
        tenant_id = request.user.tenant_id
        qs = product_service.get_all_brands(tenant_id)
        return _ok(BrandSerializer(qs, many=True).data)

    def post(self, request):
        tenant_id = request.user.tenant_id
        actor_id = request.user.id
        serializer = CreateBrandSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), status.HTTP_400_BAD_REQUEST)
        try:
            brand = product_service.create_brand(tenant_id, actor_id, serializer.validated_data)
        except ConflictError as exc:
            return _error("DUPLICATE_BRAND", str(exc), status.HTTP_409_CONFLICT)
        return _ok(BrandSerializer(brand).data, status.HTTP_201_CREATED)


class BrandDetailView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.PRODUCTS_VIEW)]
        if self.request.method == "PATCH":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.PRODUCTS_EDIT)]
        return [IsAuthenticated(), HasPermission(PERMISSIONS.PRODUCTS_DELETE)]

    def get(self, request, brand_id):
        tenant_id = request.user.tenant_id
        try:
            brand = product_service.get_brand_by_id(tenant_id, brand_id)
        except NotFoundError:
            return _error("NOT_FOUND", "Brand not found.", status.HTTP_404_NOT_FOUND)
        return _ok(BrandSerializer(brand).data)

    def patch(self, request, brand_id):
        tenant_id = request.user.tenant_id
        actor_id = request.user.id
        serializer = UpdateBrandSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), status.HTTP_400_BAD_REQUEST)
        try:
            brand = product_service.update_brand(
                tenant_id, brand_id, actor_id, serializer.validated_data
            )
        except NotFoundError:
            return _error("NOT_FOUND", "Brand not found.", status.HTTP_404_NOT_FOUND)
        return _ok(BrandSerializer(brand).data)

    def delete(self, request, brand_id):
        tenant_id = request.user.tenant_id
        actor_id = request.user.id
        try:
            product_service.soft_delete_brand(tenant_id, brand_id, actor_id)
        except NotFoundError:
            return _error("NOT_FOUND", "Brand not found.", status.HTTP_404_NOT_FOUND)
        except ConflictError as exc:
            return _error("CONFLICT", str(exc), status.HTTP_409_CONFLICT)
        return _ok({"message": "Brand deleted successfully."})


import re
from django.db import transaction

from apps.catalog.exceptions import InsufficientStockError
from apps.catalog.serializers import (
    CreateProductSerializer,
    ProductListQuerySerializer,
    ProductListSerializer,
    ProductSerializer,
    ProductVariantSerializer,
    UpdateProductSerializer,
    UpdateProductVariantSerializer,
)
from apps.catalog.models import ProductVariant


# ═════════════════════════════════════════════════════════════════
# Product views
# ═════════════════════════════════════════════════════════════════

class ProductListCreateView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.PRODUCTS_VIEW)]
        return [IsAuthenticated(), HasPermission(PERMISSIONS.PRODUCTS_CREATE)]

    def get(self, request):
        tenant_id = request.user.tenant_id
        q_serializer = ProductListQuerySerializer(data=request.query_params)
        if not q_serializer.is_valid():
            return _error("VALIDATION_ERROR", str(q_serializer.errors), status.HTTP_400_BAD_REQUEST)

        validated = q_serializer.validated_data
        page = validated.get("page", 1)
        page_size = validated.get("page_size", 20)
        filter_keys = ("category_id", "brand_id", "gender", "is_archived", "search")
        filters = {k: validated[k] for k in filter_keys if k in validated}

        qs = product_service.get_all_products(tenant_id, filters=filters)
        total = qs.count()
        offset = (page - 1) * page_size
        products = qs[offset : offset + page_size]

        data = ProductListSerializer(products, many=True, context={"request": request}).data
        return Response({
            "success": True,
            "data": data,
            "meta": {"total": total, "page": page, "page_size": page_size},
        })

    def post(self, request):
        tenant_id = request.user.tenant_id
        actor_id = request.user.id
        serializer = CreateProductSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), status.HTTP_400_BAD_REQUEST)

        validated = serializer.validated_data
        variant_definitions = validated.pop("variant_definitions", [])
        try:
            with transaction.atomic():
                product = product_service.create_product(tenant_id, actor_id, validated)
                if variant_definitions:
                    product_service.create_product_variants(tenant_id, product.id, variant_definitions)
        except (NotFoundError,) as exc:
            return _error("NOT_FOUND", str(exc), status.HTTP_404_NOT_FOUND)
        except ConflictError as exc:
            return _error("CONFLICT", str(exc), status.HTTP_409_CONFLICT)

        product_full = product_service.get_product_by_id(tenant_id, product.id)
        return _ok(ProductSerializer(product_full, context={"request": request}).data, status.HTTP_201_CREATED)


class ProductDetailView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.PRODUCTS_VIEW)]
        if self.request.method == "PATCH":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.PRODUCTS_EDIT)]
        return [IsAuthenticated(), HasPermission(PERMISSIONS.PRODUCTS_DELETE)]

    def get(self, request, product_id):
        tenant_id = request.user.tenant_id
        try:
            product = product_service.get_product_by_id(tenant_id, product_id)
        except NotFoundError:
            return _error("NOT_FOUND", "Product not found.", status.HTTP_404_NOT_FOUND)
        return _ok(ProductSerializer(product, context={"request": request}).data)

    def patch(self, request, product_id):
        tenant_id = request.user.tenant_id
        actor_id = request.user.id
        serializer = UpdateProductSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), status.HTTP_400_BAD_REQUEST)
        try:
            product = product_service.update_product(
                tenant_id, product_id, actor_id, serializer.validated_data
            )
        except NotFoundError:
            return _error("NOT_FOUND", "Product not found.", status.HTTP_404_NOT_FOUND)
        return _ok(ProductSerializer(product, context={"request": request}).data)

    def delete(self, request, product_id):
        tenant_id = request.user.tenant_id
        actor_id = request.user.id
        try:
            product_service.soft_delete_product(tenant_id, product_id, actor_id)
        except NotFoundError:
            return _error("NOT_FOUND", "Product not found.", status.HTTP_404_NOT_FOUND)
        return _ok({"message": "Product deleted successfully."})


# ═════════════════════════════════════════════════════════════════
# Variant views
# ═════════════════════════════════════════════════════════════════

class VariantDetailView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.PRODUCTS_VIEW)]
        if self.request.method == "PATCH":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.PRODUCTS_EDIT)]
        return [IsAuthenticated(), HasPermission(PERMISSIONS.PRODUCTS_DELETE)]

    def _get_variant(self, tenant_id, variant_id):
        try:
            return ProductVariant.objects.get(
                pk=variant_id, tenant_id=tenant_id, deleted_at__isnull=True
            )
        except ProductVariant.DoesNotExist:
            return None

    def get(self, request, variant_id):
        tenant_id = request.user.tenant_id
        variant = self._get_variant(tenant_id, variant_id)
        if variant is None:
            return _error("NOT_FOUND", "Variant not found.", status.HTTP_404_NOT_FOUND)
        return _ok(ProductVariantSerializer(variant, context={"request": request}).data)

    def patch(self, request, variant_id):
        tenant_id = request.user.tenant_id
        actor_id = request.user.id
        serializer = UpdateProductVariantSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), status.HTTP_400_BAD_REQUEST)
        try:
            variant = product_service.update_product_variant(
                tenant_id, variant_id, actor_id, serializer.validated_data
            )
        except NotFoundError:
            return _error("NOT_FOUND", "Variant not found.", status.HTTP_404_NOT_FOUND)
        return _ok(ProductVariantSerializer(variant, context={"request": request}).data)

    def delete(self, request, variant_id):
        tenant_id = request.user.tenant_id
        variant = self._get_variant(tenant_id, variant_id)
        if variant is None:
            return _error("NOT_FOUND", "Variant not found.", status.HTTP_404_NOT_FOUND)
        from django.utils import timezone as tz
        variant.deleted_at = tz.now()
        variant.save(update_fields=["deleted_at"])
        return _ok({"message": "Variant deleted successfully."})


# Barcode lookup — URL must be registered BEFORE the <uuid:variant_id> pattern
_BARCODE_PATTERN = re.compile(r'^[A-Za-z0-9\-]{8,20}$')

class BarcodeVariantView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasPermission(PERMISSIONS.PRODUCTS_VIEW)]

    def get(self, request, barcode):
        if not _BARCODE_PATTERN.match(barcode):
            return _error("INVALID_BARCODE", "Barcode must be 8–20 alphanumeric characters.", status.HTTP_400_BAD_REQUEST)
        tenant_id = request.user.tenant_id
        try:
            variant = (
                ProductVariant.objects
                .filter(tenant_id=tenant_id, barcode=barcode, deleted_at__isnull=True)
                .select_related("product")
                .get()
            )
        except ProductVariant.DoesNotExist:
            return _error("NOT_FOUND", "No variant found for this barcode.", status.HTTP_404_NOT_FOUND)
        return _ok(ProductVariantSerializer(variant, context={"request": request}).data)


# ═════════════════════════════════════════════════════════════════
# Product image upload (stub — storage wired in Task 02.01.11)
# ═════════════════════════════════════════════════════════════════

class ProductImageUploadView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasPermission(PERMISSIONS.PRODUCTS_EDIT)]

    def post(self, request, product_id):
        tenant_id = request.user.tenant_id
        try:
            product = product_service.get_product_by_id(tenant_id, product_id)
        except NotFoundError:
            return _error("NOT_FOUND", "Product not found.", status.HTTP_404_NOT_FOUND)

        image_file = request.FILES.get("image")
        if not image_file:
            return _error("NO_FILE", "No image file provided.", status.HTTP_400_BAD_REQUEST)

        allowed_types = {"image/jpeg", "image/png", "image/webp"}
        if image_file.content_type not in allowed_types:
            return _error("INVALID_TYPE", "Only JPEG, PNG, and WebP images are accepted.", status.HTTP_400_BAD_REQUEST)

        from django.conf import settings
        max_size = getattr(settings, "CATALOG_MAX_IMAGE_UPLOAD_SIZE_BYTES", 5_000_000)
        if image_file.size > max_size:
            return _error("FILE_TOO_LARGE", f"Maximum upload size is {max_size // 1_000_000} MB.", status.HTTP_400_BAD_REQUEST)

        # Storage upload delegated to apps.catalog.storage (configured in Task 02.01.11)
        try:
            from apps.catalog.storage import upload_file, UploadOptions
        except ImportError:
            return _error("STORAGE_NOT_CONFIGURED", "File storage is not yet configured.", status.HTTP_503_SERVICE_UNAVAILABLE)

        file_bytes = image_file.read()
        storage_path = f"products/{product_id}/{image_file.name}"
        options = UploadOptions(content_type=image_file.content_type)
        public_url = upload_file(file_bytes, storage_path, options)

        variant_id = request.data.get("variant_id")
        if variant_id:
            try:
                variant = ProductVariant.objects.get(pk=variant_id, tenant_id=tenant_id, deleted_at__isnull=True)
            except ProductVariant.DoesNotExist:
                return _error("NOT_FOUND", "Variant not found.", status.HTTP_404_NOT_FOUND)
        else:
            variant = product.variants.filter(deleted_at__isnull=True).first()
            if variant is None:
                return _error("NO_VARIANT", "Product has no active variants.", status.HTTP_400_BAD_REQUEST)

        if not isinstance(variant.image_urls, list):
            variant.image_urls = []
        variant.image_urls.append(public_url)
        variant.save(update_fields=["image_urls", "updated_at"])

        return _ok({"url": public_url})


# ═════════════════════════════════════════════════════════════════
# Stock Adjustment views  (Task 02.03.08)
# ═════════════════════════════════════════════════════════════════

def _serialize_movement(m) -> dict:
    variant = m.variant
    product = variant.product
    return {
        "id": str(m.id),
        "variant_id": str(variant.id),
        "variant_sku": variant.sku,
        "variant_size": variant.size,
        "variant_colour": variant.colour,
        "variant_barcode": variant.barcode,
        "product_name": product.name,
        "category_name": product.category.name if product.category else None,
        "reason": m.reason,
        "quantity_delta": m.quantity_delta,
        "quantity_before": m.quantity_before,
        "quantity_after": m.quantity_after,
        "actor_name": m.actor.get_full_name() if m.actor else None,
        "note": m.note,
        "sale_id": str(m.sale_id) if m.sale_id else None,
        "purchase_order_id": str(m.purchase_order_id) if m.purchase_order_id else None,
        "stock_take_session_id": str(m.stock_take_session_id) if m.stock_take_session_id else None,
        "created_at": m.created_at.isoformat(),
    }


class StockAdjustView(APIView):
    """POST /api/catalog/stock/adjust/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasPermission(PERMISSIONS.STOCK_ADJUST)]

    def post(self, request):
        from apps.catalog.models import ProductVariant

        tenant_id = request.user.tenant_id
        data = request.data

        # Validate required fields
        variant_id = data.get("variant_id")
        quantity_delta = data.get("quantity_delta")
        reason = data.get("reason")

        if not variant_id:
            return _error("MISSING_VARIANT", "variant_id is required.", status.HTTP_400_BAD_REQUEST)
        if quantity_delta is None or quantity_delta == 0:
            return _error("INVALID_DELTA", "quantity_delta must be a non-zero integer.", status.HTTP_400_BAD_REQUEST)
        if not reason:
            return _error("MISSING_REASON", "reason is required.", status.HTTP_400_BAD_REQUEST)

        note = data.get("note")
        if note and len(note) > 500:
            return _error("NOTE_TOO_LONG", "Note must not exceed 500 characters.", status.HTTP_400_BAD_REQUEST)

        try:
            variant, movement, low_stock_triggered = inventory_service.adjust_stock(
                tenant_id=tenant_id,
                variant_id=variant_id,
                actor_id=request.user.id,
                quantity_delta=int(quantity_delta),
                reason=reason,
                note=note or None,
            )
        except NotFoundError as e:
            return _error("NOT_FOUND", str(e), status.HTTP_404_NOT_FOUND)
        except InsufficientStockError as e:
            return _error("BELOW_ZERO_STOCK", str(e), status.HTTP_422_UNPROCESSABLE_ENTITY)

        return _ok({
            "movement": {
                "id": str(movement.id),
                "quantity_before": movement.quantity_before,
                "quantity_after": movement.quantity_after,
                "quantity_delta": movement.quantity_delta,
                "reason": movement.reason,
                "created_at": movement.created_at.isoformat(),
            },
            "variant": {
                "id": str(variant.id),
                "sku": variant.sku,
                "stock_quantity": variant.stock_quantity,
            },
            "low_stock_triggered": low_stock_triggered,
        })


class BulkStockAdjustView(APIView):
    """POST /api/catalog/stock/bulk-adjust/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasPermission(PERMISSIONS.STOCK_ADJUST)]

    def post(self, request):
        tenant_id = request.user.tenant_id
        adjustments = request.data

        if not isinstance(adjustments, list) or len(adjustments) == 0:
            return _error("INVALID_PAYLOAD", "Request body must be a non-empty array.", status.HTTP_400_BAD_REQUEST)
        if len(adjustments) > 50:
            return _error("TOO_MANY", "Maximum 50 adjustments per request.", status.HTTP_400_BAD_REQUEST)

        movements_out = []
        low_stock_variant_ids = []

        try:
            for adj in adjustments:
                variant, movement, low_stock = inventory_service.adjust_stock(
                    tenant_id=tenant_id,
                    variant_id=adj["variant_id"],
                    actor_id=request.user.id,
                    quantity_delta=int(adj["quantity_delta"]),
                    reason=adj["reason"],
                    note=adj.get("note"),
                )
                movements_out.append({
                    "id": str(movement.id),
                    "variant_id": str(variant.id),
                    "quantity_delta": movement.quantity_delta,
                    "quantity_after": movement.quantity_after,
                })
                if low_stock:
                    low_stock_variant_ids.append(str(variant.id))
        except NotFoundError as e:
            return _error("NOT_FOUND", str(e), status.HTTP_404_NOT_FOUND)
        except InsufficientStockError as e:
            return _error("BELOW_ZERO_STOCK", str(e), status.HTTP_422_UNPROCESSABLE_ENTITY)

        return _ok({
            "adjusted_count": len(movements_out),
            "movements": movements_out,
            "low_stock_triggered_variant_ids": low_stock_variant_ids,
        })


class StockMovementListView(APIView):
    """GET /api/catalog/stock/movements/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasPermission(PERMISSIONS.STOCK_VIEW)]

    def get(self, request):
        from apps.catalog.models import StockMovement

        tenant_id = request.user.tenant_id
        params = request.query_params
        fmt = params.get("format")
        page = int(params.get("page", 1))
        limit = min(int(params.get("limit", 25)), 100)

        qs = StockMovement.objects.filter(tenant_id=tenant_id).select_related(
            "variant__product__category", "actor"
        )

        if params.get("from"):
            qs = qs.filter(created_at__gte=params["from"])
        if params.get("to"):
            qs = qs.filter(created_at__lte=params["to"])
        if params.get("reason"):
            reasons = [r.strip() for r in params["reason"].split(",") if r.strip()]
            qs = qs.filter(reason__in=reasons)
        if params.get("variant_id"):
            qs = qs.filter(variant_id=params["variant_id"])
        if params.get("product_id"):
            qs = qs.filter(variant__product_id=params["product_id"])
        if params.get("actor_id"):
            qs = qs.filter(actor_id=params["actor_id"])
        if params.get("search"):
            q = params["search"]
            qs = qs.filter(
                Q(variant__sku__icontains=q) | Q(variant__product__name__icontains=q)
            )

        ordering = params.get("ordering", "-created_at")
        qs = qs.order_by(ordering)

        if fmt == "csv":
            buffer = io.StringIO()
            writer = csv.writer(buffer)
            writer.writerow([
                "Date", "Product", "Category", "SKU", "Size", "Colour",
                "Reason", "Delta", "Before", "After", "Actor", "Note",
            ])
            for m in qs.iterator():
                writer.writerow([
                    m.created_at.isoformat(),
                    m.variant.product.name,
                    m.variant.product.category.name if m.variant.product.category else "",
                    m.variant.sku,
                    m.variant.size or "",
                    m.variant.colour or "",
                    m.reason,
                    m.quantity_delta,
                    m.quantity_before,
                    m.quantity_after,
                    m.actor.get_full_name() if m.actor else "",
                    m.note or "",
                ])
            response = HttpResponse(buffer.getvalue(), content_type="text/csv")
            response["Content-Disposition"] = 'attachment; filename="movements.csv"'
            return response

        total = qs.count()
        offset = (page - 1) * limit
        items = [_serialize_movement(m) for m in qs[offset: offset + limit]]
        return _ok({
            "movements": items,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": max(1, (total + limit - 1) // limit),
        })


class StockValuationView(APIView):
    """GET /api/catalog/stock/valuation/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasPermission(PERMISSIONS.PRODUCTS_VIEW_COST)]

    def get(self, request):
        from apps.catalog.models import ProductVariant, Category

        tenant_id = request.user.tenant_id
        fmt = request.query_params.get("format")

        qs = ProductVariant.objects.filter(
            tenant_id=tenant_id,
            deleted_at__isnull=True,
            stock_quantity__gt=0,
        ).select_related("product__category")

        totals = qs.aggregate(
            retail=Sum(F("price") * F("stock_quantity")),
            cost=Sum(F("cost_price") * F("stock_quantity")),
            count=Sum("stock_quantity"),
        )
        retail_value = totals["retail"] or Decimal("0.00")
        cost_value = totals["cost"] or Decimal("0.00")
        variant_count = qs.count()
        margin = retail_value - cost_value
        margin_pct = (
            (margin / retail_value * 100).quantize(Decimal("0.01"))
            if retail_value > 0
            else Decimal("0.00")
        )

        # Category breakdown
        from django.db.models import Count
        cat_qs = (
            qs.values("product__category_id", "product__category__name")
            .annotate(
                retail=Sum(F("price") * F("stock_quantity")),
                cost=Sum(F("cost_price") * F("stock_quantity")),
                variant_count=Count("id"),
            )
            .order_by("-retail")
        )
        breakdown = [
            {
                "category_id": str(row["product__category_id"]) if row["product__category_id"] else None,
                "category_name": row["product__category__name"] or "Uncategorised",
                "variant_count": row["variant_count"],
                "retail_value": str(row["retail"] or Decimal("0.00")),
                "cost_value": str(row["cost"] or Decimal("0.00")),
            }
            for row in cat_qs
        ]

        if fmt == "csv":
            buffer = io.StringIO()
            writer = csv.writer(buffer)
            writer.writerow(["Category", "Variants", "Retail Value", "Cost Value"])
            for row in breakdown:
                writer.writerow([row["category_name"], row["variant_count"], row["retail_value"], row["cost_value"]])
            response = HttpResponse(buffer.getvalue(), content_type="text/csv")
            response["Content-Disposition"] = 'attachment; filename="stock-valuation.csv"'
            return response

        return _ok({
            "retail_value": str(retail_value),
            "cost_value": str(cost_value),
            "estimated_margin": str(margin),
            "estimated_margin_percent": str(margin_pct),
            "variant_count": variant_count,
            "calculated_at": timezone.now().isoformat(),
            "category_breakdown": breakdown,
        })


class LowStockVariantsView(APIView):
    """GET /api/catalog/stock/low-stock/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasPermission(PERMISSIONS.STOCK_VIEW)]

    def get(self, request):
        from apps.catalog.models import ProductVariant

        tenant_id = request.user.tenant_id
        params = request.query_params
        count_only = params.get("count_only", "false").lower() == "true"
        fmt = params.get("format")
        threshold_override = params.get("threshold_override")

        qs = ProductVariant.objects.filter(
            tenant_id=tenant_id,
            deleted_at__isnull=True,
        ).select_related("product__category")

        if threshold_override is not None:
            try:
                t = int(threshold_override)
            except ValueError:
                t = 0
            qs = qs.filter(stock_quantity__lte=t)
        else:
            qs = qs.filter(stock_quantity__lte=F("low_stock_threshold"), low_stock_threshold__gt=0)

        qs = qs.order_by("stock_quantity", "sku")

        if count_only:
            return _ok({"count": qs.count()})

        if fmt == "csv":
            buffer = io.StringIO()
            writer = csv.writer(buffer)
            writer.writerow(["SKU", "Product", "Category", "Size", "Colour", "Stock", "Threshold", "Shortfall"])
            for v in qs.iterator():
                threshold = int(threshold_override or v.low_stock_threshold)
                writer.writerow([
                    v.sku, v.product.name,
                    v.product.category.name if v.product.category else "",
                    v.size or "", v.colour or "",
                    v.stock_quantity, threshold,
                    max(0, threshold - v.stock_quantity),
                ])
            response = HttpResponse(buffer.getvalue(), content_type="text/csv")
            response["Content-Disposition"] = 'attachment; filename="low-stock.csv"'
            return response

        variants = []
        for v in qs:
            effective_threshold = int(threshold_override) if threshold_override else v.low_stock_threshold
            variants.append({
                "id": str(v.id),
                "sku": v.sku,
                "stock_quantity": v.stock_quantity,
                "low_stock_threshold": effective_threshold,
                "shortfall": max(0, effective_threshold - v.stock_quantity),
                "product_name": v.product.name,
                "category_name": v.product.category.name if v.product.category else None,
                "size": v.size,
                "colour": v.colour,
            })

        return _ok({"variants": variants, "total": len(variants)})



# ═════════════════════════════════════════════════════════════════
# Stock Take Session views  (Task 02.03.09)
# ═════════════════════════════════════════════════════════════════

def _serialize_session(session, category_name=None) -> dict:
    item_count = session.items.count() if hasattr(session, '_item_count_resolved') else session.items.count()
    discrepancy_count = None
    if session.status != "IN_PROGRESS":
        discrepancy_count = session.items.filter(discrepancy__isnull=False).exclude(discrepancy=0).count()
    return {
        "id": str(session.id),
        "status": session.status,
        "category_id": str(session.category_id) if session.category_id else None,
        "category_name": category_name,
        "initiated_by_name": session.initiated_by.get_full_name() if session.initiated_by else None,
        "approved_by_name": session.approved_by.get_full_name() if session.approved_by else None,
        "started_at": session.started_at.isoformat(),
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "approved_at": session.approved_at.isoformat() if session.approved_at else None,
        "rejection_reason": session.notes if session.status == "REJECTED" else None,
        "item_count": item_count,
        "discrepancy_count": discrepancy_count,
    }


def _serialize_item(item) -> dict:
    variant = item.variant
    product = variant.product
    return {
        "id": str(item.id),
        "session_id": str(item.session_id),
        "variant_id": str(variant.id),
        "variant_sku": variant.sku,
        "variant_size": variant.size,
        "variant_colour": variant.colour,
        "variant_barcode": variant.barcode,
        "product_name": product.name,
        "category_name": product.category.name if product.category else None,
        "system_quantity": item.system_quantity,
        "counted_quantity": item.counted_quantity,
        "discrepancy": item.discrepancy,
        "needs_recount": item.is_recounted,
    }


class StockTakeSessionListView(APIView):
    """GET+POST /api/catalog/stock-takes/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.catalog.models import StockTakeSession
        from apps.accounts.permissions import HasPermission as _HP

        if not (
            HasPermission(PERMISSIONS.STOCK_TAKE_MANAGE).has_permission(request, self)
            or HasPermission(PERMISSIONS.STOCK_TAKE_APPROVE).has_permission(request, self)
        ):
            return _error("PERMISSION_DENIED", "Insufficient permissions.", status.HTTP_403_FORBIDDEN)

        tenant_id = request.user.tenant_id
        sessions = (
            StockTakeSession.objects.filter(tenant_id=tenant_id)
            .select_related("initiated_by", "approved_by")
            .prefetch_related("items")
            .order_by("-started_at")
        )

        from apps.catalog.models import Category
        category_map = {}
        cat_ids = [s.category_id for s in sessions if s.category_id]
        if cat_ids:
            for cat in Category.objects.filter(id__in=cat_ids):
                category_map[cat.id] = cat.name

        data = [_serialize_session(s, category_map.get(s.category_id)) for s in sessions]
        return _ok({"sessions": data, "total": len(data)})

    def post(self, request):
        if not HasPermission(PERMISSIONS.STOCK_TAKE_MANAGE).has_permission(request, self):
            return _error("PERMISSION_DENIED", "Insufficient permissions.", status.HTTP_403_FORBIDDEN)

        from apps.catalog.models import (
            StockTakeSession, StockTakeStatus, StockTakeItem, ProductVariant, Category
        )

        tenant_id = request.user.tenant_id
        category_id = request.data.get("category_id") or None

        # Check for existing IN_PROGRESS
        existing = StockTakeSession.objects.filter(
            tenant_id=tenant_id, status=StockTakeStatus.IN_PROGRESS
        ).first()
        if existing:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "SESSION_ALREADY_IN_PROGRESS",
                        "message": "A stock take session is already in progress.",
                        "existing_session_id": str(existing.id),
                    },
                },
                status=status.HTTP_409_CONFLICT,
            )

        session = StockTakeSession.objects.create(
            tenant_id=tenant_id,
            initiated_by=request.user,
            category_id=category_id,
            status=StockTakeStatus.IN_PROGRESS,
        )

        # Pre-populate items from current variants
        qs = ProductVariant.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)
        if category_id:
            qs = qs.filter(product__category_id=category_id)

        StockTakeItem.objects.bulk_create([
            StockTakeItem(
                session=session,
                variant=v,
                system_quantity=v.stock_quantity,
                counted_quantity=None,
                discrepancy=None,
            )
            for v in qs
        ])

        category_name = None
        if category_id:
            try:
                category_name = Category.objects.get(pk=category_id).name
            except Category.DoesNotExist:
                pass

        return _ok(_serialize_session(session, category_name), status_code=status.HTTP_201_CREATED)


class StockTakeSessionDetailView(APIView):
    """GET /api/catalog/stock-takes/<id>/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        from apps.catalog.models import StockTakeSession, Category

        tenant_id = request.user.tenant_id
        try:
            session = StockTakeSession.objects.select_related(
                "initiated_by", "approved_by"
            ).get(pk=session_id, tenant_id=tenant_id)
        except StockTakeSession.DoesNotExist:
            return _error("NOT_FOUND", "Session not found.", status.HTTP_404_NOT_FOUND)

        items = session.items.select_related("variant__product__category").all()

        category_name = None
        if session.category_id:
            try:
                category_name = Category.objects.get(pk=session.category_id).name
            except Category.DoesNotExist:
                pass

        return _ok({
            "session": _serialize_session(session, category_name),
            "items": [_serialize_item(i) for i in items],
        })


class StockTakeItemUpdateView(APIView):
    """PATCH /api/catalog/stock-takes/<session_id>/items/<item_id>/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasPermission(PERMISSIONS.STOCK_TAKE_MANAGE)]

    def patch(self, request, session_id, item_id):
        from apps.catalog.models import StockTakeItem, StockTakeStatus

        tenant_id = request.user.tenant_id
        data = request.data

        if "counted_quantity" not in data and "needs_recount" not in data:
            return _error("MISSING_FIELDS", "At least one of counted_quantity or needs_recount is required.", status.HTTP_400_BAD_REQUEST)

        try:
            item = StockTakeItem.objects.select_related("session").get(
                pk=item_id, session_id=session_id
            )
        except StockTakeItem.DoesNotExist:
            return _error("NOT_FOUND", "Item not found.", status.HTTP_404_NOT_FOUND)

        if item.session.tenant_id != tenant_id:
            return _error("NOT_FOUND", "Item not found.", status.HTTP_404_NOT_FOUND)

        if item.session.status != StockTakeStatus.IN_PROGRESS:
            return _error("WRONG_STATUS", "Items can only be updated in an IN_PROGRESS session.", status.HTTP_400_BAD_REQUEST)

        update_fields = ["updated_at"]

        if "counted_quantity" in data:
            cq = data["counted_quantity"]
            if cq is None:
                item.counted_quantity = None
                item.discrepancy = None
            else:
                cq = int(cq)
                if cq < 0:
                    return _error("INVALID_QTY", "counted_quantity must be non-negative.", status.HTTP_400_BAD_REQUEST)
                item.counted_quantity = cq
                item.discrepancy = cq - item.system_quantity
            update_fields += ["counted_quantity", "discrepancy"]

        if "needs_recount" in data:
            item.is_recounted = bool(data["needs_recount"])
            update_fields.append("is_recounted")

        item.save(update_fields=update_fields)
        return _ok(_serialize_item(item))


class StockTakeCompleteView(APIView):
    """POST /api/catalog/stock-takes/<session_id>/complete/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasPermission(PERMISSIONS.STOCK_TAKE_MANAGE)]

    def post(self, request, session_id):
        from apps.catalog.models import StockTakeSession, StockTakeStatus
        from django.core.exceptions import ValidationError as DjValidationError

        tenant_id = request.user.tenant_id
        try:
            session = StockTakeSession.objects.get(pk=session_id, tenant_id=tenant_id)
        except StockTakeSession.DoesNotExist:
            return _error("NOT_FOUND", "Session not found.", status.HTTP_404_NOT_FOUND)

        if session.status != StockTakeStatus.IN_PROGRESS:
            return _error("WRONG_STATUS", "Only IN_PROGRESS sessions can be completed.", status.HTTP_400_BAD_REQUEST)

        # Auto-fill uncounted items with system_quantity
        uncounted = session.items.filter(counted_quantity__isnull=True)
        for item in uncounted:
            item.counted_quantity = item.system_quantity
            item.discrepancy = 0
        if uncounted:
            from apps.catalog.models import StockTakeItem
            StockTakeItem.objects.bulk_update(uncounted, ["counted_quantity", "discrepancy"])

        if session.items.count() == 0:
            return _error("NO_ITEMS", "Cannot complete a session with no items.", status.HTTP_400_BAD_REQUEST)

        session.status = StockTakeStatus.PENDING_APPROVAL
        session.completed_at = timezone.now()
        session.save(update_fields=["status", "completed_at"])

        return _ok({"session_id": str(session.id), "status": session.status})


class StockTakeApproveView(APIView):
    """POST /api/catalog/stock-takes/<session_id>/approve/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasPermission(PERMISSIONS.STOCK_TAKE_APPROVE)]

    def post(self, request, session_id):
        from apps.catalog.models import StockTakeSession, StockTakeStatus, StockMovementReason

        tenant_id = request.user.tenant_id
        try:
            session = StockTakeSession.objects.select_for_update().get(
                pk=session_id, tenant_id=tenant_id
            )
        except StockTakeSession.DoesNotExist:
            return _error("NOT_FOUND", "Session not found.", status.HTTP_404_NOT_FOUND)

        if session.status != StockTakeStatus.PENDING_APPROVAL:
            return _error("WRONG_STATUS", "Only PENDING_APPROVAL sessions can be approved.", status.HTTP_400_BAD_REQUEST)

        discrepancy_items = session.items.filter(discrepancy__isnull=False).exclude(discrepancy=0)

        try:
            from django.db import transaction as _tx
            with _tx.atomic():
                for item in discrepancy_items:
                    inventory_service.adjust_stock(
                        tenant_id=tenant_id,
                        variant_id=item.variant_id,
                        actor_id=request.user.id,
                        quantity_delta=item.discrepancy,
                        reason=StockMovementReason.STOCK_TAKE_ADJUSTMENT,
                        reference_id=session.id,
                    )
                session.status = StockTakeStatus.APPROVED
                session.approved_by = request.user
                session.approved_at = timezone.now()
                session.save(update_fields=["status", "approved_by_id", "approved_at"])
        except (NotFoundError, InsufficientStockError) as e:
            return _error("ADJUSTMENT_FAILED", str(e), status.HTTP_422_UNPROCESSABLE_ENTITY)

        return _ok({"session_id": str(session.id), "status": session.status})


class StockTakeRejectView(APIView):
    """POST /api/catalog/stock-takes/<session_id>/reject/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, HasPermission(PERMISSIONS.STOCK_TAKE_APPROVE)]

    def post(self, request, session_id):
        from apps.catalog.models import StockTakeSession, StockTakeStatus

        tenant_id = request.user.tenant_id
        rejection_reason = request.data.get("rejection_reason", "").strip()

        if len(rejection_reason) < 10:
            return _error("REASON_TOO_SHORT", "rejection_reason must be at least 10 characters.", status.HTTP_400_BAD_REQUEST)

        try:
            session = StockTakeSession.objects.get(pk=session_id, tenant_id=tenant_id)
        except StockTakeSession.DoesNotExist:
            return _error("NOT_FOUND", "Session not found.", status.HTTP_404_NOT_FOUND)

        if session.status != StockTakeStatus.PENDING_APPROVAL:
            return _error("WRONG_STATUS", "Only PENDING_APPROVAL sessions can be rejected.", status.HTTP_400_BAD_REQUEST)

        session.status = StockTakeStatus.REJECTED
        session.approved_by = request.user
        session.approved_at = timezone.now()
        session.notes = rejection_reason
        session.save(update_fields=["status", "approved_by_id", "approved_at", "notes"])

        return _ok({"session_id": str(session.id), "status": session.status})
