import json
import queue as queue_module

from django.http import StreamingHttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers, status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsManagerOrAbove
from apps.hardware.services import cfd_emitter


def _ok(data, status_code=200):
    return Response({"success": True, "data": data}, status=status_code)


def _error(code: str, message: str, status_code: int = 400):
    return Response(
        {"success": False, "error": {"code": code, "message": message}},
        status=status_code,
    )


# ── Serializer ────────────────────────────────────────────────────────────────

class CfdUpdateSerializer(serializers.Serializer):
    tenant_id = serializers.CharField()
    items = serializers.ListField(child=serializers.DictField(), allow_empty=True)
    subtotal = serializers.CharField()
    discount = serializers.CharField(required=False, default="0.00")
    total = serializers.CharField()
    applied_promotions = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    customer_name = serializers.CharField(
        allow_null=True, required=False, default=None
    )
    status = serializers.ChoiceField(choices=["IDLE", "SCANNING", "COMPLETE"])
    change = serializers.CharField(allow_null=True, required=False, default=None)
    store_name = serializers.CharField(required=False, default="")


# ── SSE Stream View ───────────────────────────────────────────────────────────

class CfdStreamView(APIView):
    """
    GET /api/hardware/cfd/stream/?tenant_id=<id>

    Opens an SSE stream for the Customer Facing Display.
    No authentication required — designed for open LAN access.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        tenant_id = request.GET.get("tenant_id", "").strip()
        if not tenant_id:
            return _error(
                "MISSING_PARAMETER",
                "tenant_id query parameter is required.",
                400,
            )

        def event_stream(tid: str):
            q = cfd_emitter.subscribe(tid)
            try:
                while True:
                    try:
                        payload = q.get(timeout=20)
                        yield f"data: {json.dumps(payload)}\n\n"
                    except queue_module.Empty:
                        # Keepalive comment — keeps connection alive
                        yield ": keepalive\n\n"
            except GeneratorExit:
                pass
            finally:
                cfd_emitter.unsubscribe(tid, q)

        response = StreamingHttpResponse(
            streaming_content=event_stream(tenant_id),
            content_type="text/event-stream",
        )
        response["Cache-Control"] = "no-cache, no-store"
        response["X-Accel-Buffering"] = "no"
        response["Connection"] = "keep-alive"
        return response


# ── Cart Update View ──────────────────────────────────────────────────────────

class CfdUpdateView(APIView):
    """
    POST /api/hardware/cfd/update/

    Receives cart state from the POS terminal and broadcasts to all
    CFD subscribers for the tenant.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CfdUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), 400)

        data = serializer.validated_data
        incoming_tenant_id = data["tenant_id"]

        # Validate tenant ownership
        if str(request.user.tenant_id) != str(incoming_tenant_id):
            return _error(
                "TENANT_MISMATCH",
                "tenant_id does not match your session.",
                403,
            )

        payload = {
            "type": "cart_update",
            "status": data["status"],
            "items": data["items"],
            "subtotal": data["subtotal"],
            "discount_amount": data["discount"],
            "total": data["total"],
            "promotions": [{"name": p} for p in data["applied_promotions"]],
            "customer_name": data["customer_name"],
            "change_due": data["change"],
            "store_name": data["store_name"],
        }

        cfd_emitter.broadcast(incoming_tenant_id, payload)
        return _ok({"ok": True})
