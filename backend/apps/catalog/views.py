"""
Catalog API views — Category and Brand endpoints.

All views enforce JWT authentication. Tenant ID is always sourced from
request.user.tenant_id (decoded from the verified JWT) — never from request data.
"""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.accounts.constants.permissions import PERMISSIONS
from apps.accounts.permissions import HasPermission
from apps.catalog.exceptions import ConflictError, NotFoundError
from apps.catalog.serializers import (
    BrandSerializer,
    CategorySerializer,
    CreateBrandSerializer,
    CreateCategorySerializer,
    UpdateBrandSerializer,
    UpdateCategorySerializer,
)
from apps.catalog.services import product_service


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
