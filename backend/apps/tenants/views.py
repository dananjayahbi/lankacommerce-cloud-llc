from datetime import datetime, timedelta, timezone

from django.contrib.auth.hashers import make_password
from django.db.models import Sum
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import CustomUser
from apps.tenants.models import Plan, Subscription, SubscriptionStatus, Tenant, TenantStatus
from apps.tenants.serializers import (
    PlanSerializer,
    TenantDetailSerializer,
    TenantListSerializer,
    TenantProvisionSerializer,
)
from apps.tenants.services import tenant_service


# ─── Public: Plan listing ────────────────────────────────────────────────────


class PlanListView(APIView):
    """Public — no authentication required."""

    permission_classes = [AllowAny]

    def get(self, request):
        plans = Plan.objects.filter(is_active=True).order_by("sort_order")
        return Response(PlanSerializer(plans, many=True).data)


# ─── Tenant management (SUPER_ADMIN only) ────────────────────────────────────


class IsSuperAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and getattr(request.user, "role", None) == "SUPER_ADMIN"


class TenantListCreateView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        search = request.query_params.get("search")
        status_filter = request.query_params.get("status")
        try:
            page = int(request.query_params.get("page", 1))
            limit = int(request.query_params.get("limit", 20))
        except ValueError:
            page, limit = 1, 20

        tenants, total = tenant_service.get_all_tenants(
            search=search, status=status_filter, page=page, limit=limit
        )
        return Response(
            {
                "count": total,
                "page": page,
                "limit": limit,
                "results": TenantListSerializer(tenants, many=True).data,
            }
        )

    def post(self, request):
        serializer = TenantProvisionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        d = serializer.validated_data
        try:
            tenant = tenant_service.create_tenant(
                store_name=d["store_name"],
                slug=d["slug"],
                owner_email=d["owner_email"],
                hashed_password=make_password(d["owner_password"]),
                timezone_name=d["timezone"],
                currency=d["currency"],
                vat_rate=d["vat_rate"],
                sscl_rate=d["sscl_rate"],
                plan_id=d["plan_id"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            TenantDetailSerializer(tenant).data, status=status.HTTP_201_CREATED
        )


class TenantDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, pk):
        tenant = tenant_service.get_tenant_by_id(pk)
        if tenant is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(TenantDetailSerializer(tenant).data)


class TenantSlugCheckView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        slug = request.query_params.get("slug", "")
        available = not Tenant.objects.filter(slug=slug).exists()
        return Response({"available": available})


class TenantSuspendView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, pk):
        try:
            tenant = tenant_service.suspend_tenant(pk, request.user.id)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(TenantDetailSerializer(tenant).data)


class TenantReactivateView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, pk):
        try:
            tenant = tenant_service.reactivate_tenant(pk, request.user.id)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(TenantDetailSerializer(tenant).data)


class TenantGracePeriodView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, pk):
        grace_days = int(request.data.get("grace_days", 14))
        try:
            tenant = tenant_service.trigger_grace_period(pk, request.user.id, grace_days=grace_days)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(TenantDetailSerializer(tenant).data)


class TenantStatusView(APIView):
    """Fast endpoint used by Next.js middleware — no auth to avoid cookie overhead."""

    permission_classes = [AllowAny]

    def get(self, request, pk):
        result = tenant_service.get_active_tenant_by_slug(str(pk))
        if result is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(result)


# ─── Super Admin Dashboard ───────────────────────────────────────────────────


class SuperAdminDashboardView(APIView):
    """
    Returns aggregate platform metrics for the super-admin dashboard.
    All metrics computed server-side in a single request.
    NOTE: MRR is a simplified sum of active plan list prices,
    not actual billed amounts — will be updated in Phase 5 with PayHere data.
    """

    permission_classes = [IsSuperAdmin]

    def get(self, request):
        now = datetime.now(tz=timezone.utc)

        active_tenant_count = Tenant.objects.filter(
            status=TenantStatus.ACTIVE, deleted_at__isnull=True
        ).count()

        grace_period_count = Tenant.objects.filter(
            status=TenantStatus.GRACE_PERIOD, deleted_at__isnull=True
        ).count()

        # MRR: sum plan prices for active subscriptions on non-deleted active tenants
        mrr_result = Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            tenant__status=TenantStatus.ACTIVE,
            tenant__deleted_at__isnull=True,
        ).aggregate(total=Sum("plan__price_monthly"))
        mrr_lkr = str(mrr_result["total"] or "0.00")

        upcoming_renewals_count = Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            tenant__deleted_at__isnull=True,
            next_billing_date__gte=now,
            next_billing_date__lte=now + timedelta(days=7),
        ).count()

        recent_tenants = list(
            Tenant.objects.filter(deleted_at__isnull=True)
            .order_by("-created_at")[:5]
            .values("id", "name", "slug", "status", "created_at")
        )
        # UUID fields need string conversion for JSON serialisation
        for t in recent_tenants:
            t["id"] = str(t["id"])

        upcoming_renewals = list(
            Subscription.objects.filter(
                status=SubscriptionStatus.ACTIVE,
                tenant__deleted_at__isnull=True,
                next_billing_date__gte=now,
                next_billing_date__lte=now + timedelta(days=30),
            )
            .select_related("tenant", "plan")
            .order_by("next_billing_date")[:5]
            .values(
                "id",
                "tenant__name",
                "plan__name",
                "next_billing_date",
                "status",
            )
        )
        for r in upcoming_renewals:
            r["id"] = str(r["id"])

        return Response(
            {
                "active_tenant_count": active_tenant_count,
                "grace_period_count": grace_period_count,
                "mrr_lkr": mrr_lkr,
                "upcoming_renewals_count": upcoming_renewals_count,
                "recent_tenants": recent_tenants,
                "upcoming_renewals": upcoming_renewals,
            }
        )
