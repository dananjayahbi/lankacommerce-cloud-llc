from datetime import datetime, timedelta, timezone
from decimal import Decimal

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.db.models import Sum
from django.utils.text import slugify
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import CustomUser
from apps.accounts.serializers import CustomTokenObtainPairSerializer
from apps.accounts.throttling import RegistrationRateThrottle
from apps.tenants.models import Plan, Subscription, SubscriptionStatus, Tenant, TenantStatus
from apps.tenants.serializers import (
    PlanSerializer,
    TenantDetailSerializer,
    TenantListSerializer,
    TenantProvisionSerializer,
    TenantSelfRegisterSerializer,
)
from apps.tenants.services import tenant_service


# ─── Public: Plan listing ────────────────────────────────────────────────────


class PlanListView(APIView):
    """Public — no authentication required."""

    permission_classes = [AllowAny]

    def get(self, request):
        plans = Plan.objects.filter(is_active=True).order_by("sort_order")
        return Response(PlanSerializer(plans, many=True).data)


# ─── Public: Tenant slug availability check ──────────────────────────────────


class TenantSlugAvailabilityView(APIView):
    """
    GET /api/tenants/check-slug/?slug=<slug>
    Public — used by the registration form to validate slug availability in real-time.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        slug = request.query_params.get("slug", "").strip()
        if not slug:
            return Response({"available": False, "detail": "Slug is required."}, status=status.HTTP_400_BAD_REQUEST)
        available = not Tenant.objects.filter(slug=slug).exists()
        return Response({"available": available, "slug": slug})


# ─── Public: Tenant self-registration ────────────────────────────────────────

def _try_update_hosts_file(slug: str) -> str | None:
    """
    Dev-only helper: attempt to add '<slug>.localhost 127.0.0.1' to the system
    hosts file. Returns a human-readable hint string regardless of success.
    Silently swallows all errors so registration never fails because of this.
    """
    import platform
    from pathlib import Path

    hosts_path = (
        Path("C:/Windows/System32/drivers/etc/hosts")
        if platform.system() == "Windows"
        else Path("/etc/hosts")
    )
    entry = f"127.0.0.1 {slug}.localhost"

    try:
        content = hosts_path.read_text(encoding="utf-8")
        if entry in content:
            return f"Subdomain '{slug}.localhost' is already in your hosts file."
        with hosts_path.open("a", encoding="utf-8") as f:
            f.write(f"\n{entry}\n")
        return f"Added '{entry}' to {hosts_path}. You can now visit http://{slug}.localhost:3000"
    except PermissionError:
        return (
            f"Could not auto-update hosts file (permission denied). "
            f"Run as administrator:\n"
            f'  echo "{entry}" >> {hosts_path}'
        )
    except Exception as exc:  # pragma: no cover
        return f"Could not auto-update hosts file: {exc}"


class TenantSelfRegisterView(APIView):
    """
    POST /api/tenants/register/

    Public self-service endpoint — lets a new business create their own tenant
    without superadmin involvement. Creates the tenant, owner account, and a
    30-day trial subscription in a single atomic transaction.

    In development mode (DEBUG=True), automatically attempts to add the
    subdomain entry to the local hosts file for convenient local testing.
    """

    permission_classes = [AllowAny]
    throttle_classes = [RegistrationRateThrottle]

    def post(self, request):
        serializer = TenantSelfRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        d = serializer.validated_data

        # ── Slug generation ───────────────────────────────────────────────────
        raw_slug = d.get("slug") or slugify(d["store_name"])
        slug = raw_slug
        counter = 1
        while Tenant.objects.filter(slug=slug).exists():
            slug = f"{raw_slug}-{counter}"
            counter += 1

        # ── Find the first available active plan (trial) ──────────────────────
        plan = Plan.objects.filter(is_active=True).order_by("sort_order").first()
        if plan is None:
            return Response(
                {"detail": "No plans are available right now. Please try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # ── Create tenant + owner + subscription atomically ───────────────────
        try:
            tenant = tenant_service.create_tenant(
                store_name=d["store_name"],
                slug=slug,
                owner_email=d["owner_email"],
                hashed_password=make_password(d["owner_password"]),
                timezone_name=d.get("timezone", "Asia/Colombo"),
                currency=d.get("currency", "LKR"),
                vat_rate=Decimal("18.00"),
                sscl_rate=Decimal("2.50"),
                plan_id=plan.id,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        # ── Issue JWT tokens for immediate login ──────────────────────────────
        try:
            owner = CustomUser.objects.get(email=d["owner_email"])
            refresh = CustomTokenObtainPairSerializer.get_token(owner)
            tokens = {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }
        except Exception:
            tokens = None  # Registration succeeded; user must log in manually

        # ── Dev: attempt to update the hosts file ─────────────────────────────
        dev_hint = _try_update_hosts_file(slug) if settings.DEBUG else None

        return Response(
            {
                "tenant": {
                    "id": str(tenant.id),
                    "name": tenant.name,
                    "slug": tenant.slug,
                },
                "tokens": tokens,
                "store_url": f"http://{slug}.localhost:3000",
                "dev_hint": dev_hint,
            },
            status=status.HTTP_201_CREATED,
        )


# ─── Public: Tenant info by slug (for branded login page) ────────────────────


class TenantPublicInfoView(APIView):
    """
    GET /api/tenants/<slug>/public/

    Returns non-sensitive tenant metadata needed to render the branded
    login page on a tenant subdomain. No authentication required.
    """

    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            tenant = Tenant.objects.get(slug=slug, deleted_at__isnull=True)
        except Tenant.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {
                "id": str(tenant.id),
                "name": tenant.name,
                "slug": tenant.slug,
                "logo_url": tenant.logo_url,
                "status": tenant.status,
            }
        )





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
