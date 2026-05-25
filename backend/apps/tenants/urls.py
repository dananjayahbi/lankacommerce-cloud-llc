from django.urls import path

from apps.tenants import views

app_name = "tenants"

urlpatterns = [
    # ── Public endpoints (no auth required) ────────────────────────────────
    path("plans/", views.PlanListView.as_view(), name="plan-list"),
    # Self-service registration for new businesses
    path("tenants/register/", views.TenantSelfRegisterView.as_view(), name="tenant-register"),
    # Slug availability check (used by registration form)
    path("tenants/check-slug/", views.TenantSlugAvailabilityView.as_view(), name="tenant-check-slug-public"),
    # Public tenant info for branded login pages on subdomains
    path("tenants/<slug:slug>/public/", views.TenantPublicInfoView.as_view(), name="tenant-public-info"),

    # ── Tenant management (SUPER_ADMIN only) ───────────────────────────────
    path("tenants/", views.TenantListCreateView.as_view(), name="tenant-list-create"),
    path("tenants/admin/check-slug/", views.TenantSlugCheckView.as_view(), name="tenant-check-slug"),
    path("tenants/<uuid:pk>/", views.TenantDetailView.as_view(), name="tenant-detail"),
    path("tenants/<uuid:pk>/suspend/", views.TenantSuspendView.as_view(), name="tenant-suspend"),
    path("tenants/<uuid:pk>/reactivate/", views.TenantReactivateView.as_view(), name="tenant-reactivate"),
    path("tenants/<uuid:pk>/grace-period/", views.TenantGracePeriodView.as_view(), name="tenant-grace-period"),
    path("tenants/<uuid:pk>/status/", views.TenantStatusView.as_view(), name="tenant-status"),

    # ── Super admin dashboard ───────────────────────────────────────────────
    path("superadmin/dashboard/", views.SuperAdminDashboardView.as_view(), name="superadmin-dashboard"),
]
