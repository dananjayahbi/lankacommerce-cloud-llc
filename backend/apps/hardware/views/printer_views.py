from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
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


class TestPrintView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not IsManagerOrAbove().has_permission(request, self):
            return _error("FORBIDDEN", "Only managers and owners may trigger a test print.", 403)

        tenant = Tenant.objects.filter(id=request.user.tenant_id).first()
        if tenant is None:
            return _error("NOT_FOUND", "Tenant not found.", 404)

        config = tenant.settings.get("hardware") if tenant.settings else None
        if not config or not config.get("printer_type"):
            return _error(
                "MISCONFIGURED",
                "Printer is not configured. Go to Settings > Hardware to configure.",
                400,
            )

        try:
            from apps.hardware.services.printer_service import test_print
            test_print(config)
        except ImportError:
            return _error(
                "PRINTER_ERROR",
                "The python-escpos library is not installed on this server.",
                500,
            )
        except ConnectionError as exc:
            return _error("CONNECTION_ERROR", str(exc), 500)
        except Exception:
            # Check for NoDeviceError by name to avoid hard import dependency
            import sys
            exc_type = sys.exc_info()[0]
            if exc_type and exc_type.__name__ == "NoDeviceError":
                return _error("NO_DEVICE", "Printer device not found.", 500)
            return _error("PRINTER_ERROR", "An unexpected printer error occurred.", 500)

        response = _ok({"message": "Print successful."})
        response["Cache-Control"] = "no-store"
        return response
