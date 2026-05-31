"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("api/health/", include("apps.health.urls")),
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls", namespace="accounts")),
    path("api/admin/", include("apps.accounts.admin_urls")),
    path("api/", include("apps.tenants.urls", namespace="tenants")),
    path("api/", include("apps.core.urls", namespace="core")),
    path("api/catalog/", include("apps.catalog.urls")),
    path("api/notifications/", include("apps.notifications.urls", namespace="notifications")),
    path("api/pos/", include("apps.pos.urls")),
    path("api/crm/", include("apps.crm.urls")),
    path("api/hr/", include("apps.hr.urls", namespace="hr")),
    path("api/promotions/", include("apps.promotions.urls", namespace="promotions")),
    path("api/audit/", include("apps.audit.urls")),
    path("api/hardware/", include("apps.hardware.urls")),
    path("api/accounts/", include("apps.accounts.extra_urls")),
    path("api/reports/", include("apps.reports.urls")),
    path("api/billing/", include("apps.billing.urls")),
    path("api/webhooks/", include("apps.webhooks.urls")),
]
