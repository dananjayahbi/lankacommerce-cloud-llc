"""
Extra accounts endpoints — hardware settings PATCH/GET.

Registered under ``api/accounts/`` via ``apps.accounts.extra_urls``.
"""
from django.urls import path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsManagerOrAbove
from apps.tenants.models import Tenant


def _ok(data, status_code=200):
    return Response({"success": True, "data": data}, status=status_code)


def _error(code: str, message: str, status_code: int = 400):
    return Response(
        {"success": False, "error": {"code": code, "message": message}},
        status=status_code,
    )


class HardwareSettingsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return current hardware settings sub-object."""
        tenant = Tenant.objects.filter(id=request.user.tenant_id).first()
        if tenant is None:
            return _error("NOT_FOUND", "Tenant not found.", 404)
        hardware = (tenant.settings or {}).get("hardware", {})
        return _ok({"hardware": hardware})

    def patch(self, request):
        if not IsManagerOrAbove().has_permission(request, self):
            return _error("FORBIDDEN", "Only managers and owners may update hardware settings.", 403)

        tenant = Tenant.objects.filter(id=request.user.tenant_id).first()
        if tenant is None:
            return _error("NOT_FOUND", "Tenant not found.", 404)

        incoming: dict = request.data if isinstance(request.data, dict) else {}

        # Validate: NETWORK printer requires a host
        printer_type = incoming.get("printer_type")
        if printer_type == "NETWORK" and not incoming.get("host", "").strip():
            return _error(
                "VALIDATION_ERROR",
                "IP address is required for network printers.",
                400,
            )

        # Validate port range
        port = incoming.get("port")
        if port is not None:
            try:
                port_int = int(port)
                if not (1 <= port_int <= 65535):
                    raise ValueError
                incoming["port"] = port_int
            except (ValueError, TypeError):
                return _error("VALIDATION_ERROR", "Port must be between 1 and 65535.", 400)

        # Read-then-write merge
        current_settings: dict = dict(tenant.settings or {})
        existing_hardware: dict = current_settings.get("hardware", {})
        merged_hardware = {**existing_hardware, **incoming}
        current_settings["hardware"] = merged_hardware
        Tenant.objects.filter(id=tenant.id).update(settings=current_settings)

        return _ok({"hardware": merged_hardware})


urlpatterns = [
    path("settings/hardware/", HardwareSettingsView.as_view(), name="hardware-settings"),
]

