"""Staff CRUD DRF views for the HR app."""
from __future__ import annotations

from rest_framework import serializers as drf_serializers
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from django.conf import settings

from apps.accounts.constants.permissions import PERMISSIONS
from apps.accounts.models import CustomUser, UserRole
from apps.accounts.permissions import HasPermission


def _ok(data, status_code: int = status.HTTP_200_OK) -> Response:
    return Response({"success": True, "data": data}, status=status_code)


def _error(code: str, message: str, status_code: int) -> Response:
    return Response(
        {"success": False, "error": {"code": code, "message": message}},
        status=status_code,
    )


# ---------------------------------------------------------------------------
# Serializers (inline — scoped to this view module only)
# ---------------------------------------------------------------------------

_ALLOWED_ROLES = [
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.STOCK_CLERK,
]


class CreateStaffSerializer(drf_serializers.Serializer):
    name = drf_serializers.CharField(max_length=300)
    email = drf_serializers.EmailField()
    role = drf_serializers.ChoiceField(choices=[r.value for r in _ALLOWED_ROLES])
    commission_rate = drf_serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=0,
        max_value=100,
    )

    def validate_email(self, value: str) -> str:
        tenant_id = self.context.get("tenant_id")
        if CustomUser.objects.filter(tenant_id=tenant_id, email=value).exists():
            raise drf_serializers.ValidationError(
                "A staff member with this email already exists in your store."
            )
        return value.lower()


class UpdateStaffSerializer(drf_serializers.Serializer):
    name = drf_serializers.CharField(max_length=300, required=False)
    email = drf_serializers.EmailField(required=False)
    role = drf_serializers.ChoiceField(
        choices=[r.value for r in _ALLOWED_ROLES], required=False
    )
    is_active = drf_serializers.BooleanField(required=False)
    commission_rate = drf_serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=0,
        max_value=100,
    )
    clear_pin = drf_serializers.BooleanField(required=False, default=False)


def _serialize_user(user: CustomUser, include_has_pin: bool = False) -> dict:
    """Return a safe dict for a staff member — no credentials included."""
    name = f"{user.first_name} {user.last_name}".strip() or user.email
    data: dict = {
        "id": str(user.id),
        "name": name,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "commission_rate": (
            str(user.commission_rate) if user.commission_rate is not None else None
        ),
        "clocked_in_at": (
            user.clocked_in_at.isoformat() if user.clocked_in_at else None
        ),
        "created_at": user.created_at.isoformat(),
    }
    if include_has_pin:
        data["has_pin"] = bool(user.pin_hash)
    return data


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------


class StaffListCreateView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.STAFF_CREATE)]
        return [IsAuthenticated(), HasPermission(PERMISSIONS.STAFF_VIEW)]

    def get(self, request: Request) -> Response:
        users = (
            CustomUser.objects.filter(tenant_id=request.user.tenant_id)
            .exclude(role=UserRole.SUPER_ADMIN)
            .order_by("-created_at")
        )
        return _ok([_serialize_user(u) for u in users])

    def post(self, request: Request) -> Response:
        if request.user.role not in (UserRole.MANAGER, UserRole.OWNER):
            return _error("FORBIDDEN", "Only managers and owners may create staff.", status.HTTP_403_FORBIDDEN)

        serializer = CreateStaffSerializer(
            data=request.data, context={"tenant_id": request.user.tenant_id}
        )
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        # Split name into first/last for the model
        parts = data["name"].split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

        user = CustomUser.objects.create(
            tenant_id=request.user.tenant_id,
            email=data["email"],
            first_name=first_name,
            last_name=last_name,
            role=data["role"],
            commission_rate=data.get("commission_rate"),
            is_active=True,
        )
        # Ensure unusable password — user sets PIN via separate flow
        user.set_unusable_password()
        user.save(update_fields=["password"])

        return _ok(_serialize_user(user, include_has_pin=True), status.HTTP_201_CREATED)


class StaffDetailView(APIView):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.request.method == "PATCH":
            return [IsAuthenticated(), HasPermission(PERMISSIONS.STAFF_EDIT)]
        return [IsAuthenticated(), HasPermission(PERMISSIONS.STAFF_VIEW)]

    def _get_member(self, pk: str, tenant_id: str) -> CustomUser | None:
        try:
            return CustomUser.objects.get(id=pk, tenant_id=tenant_id)
        except CustomUser.DoesNotExist:
            return None

    def get(self, request: Request, id: str) -> Response:
        member = self._get_member(id, request.user.tenant_id)
        if member is None:
            return _error("NOT_FOUND", "Staff member not found.", status.HTTP_404_NOT_FOUND)
        return _ok(_serialize_user(member, include_has_pin=True))

    def patch(self, request: Request, id: str) -> Response:
        if request.user.role not in (UserRole.MANAGER, UserRole.OWNER):
            return _error("FORBIDDEN", "Only managers and owners may edit staff.", status.HTTP_403_FORBIDDEN)

        member = self._get_member(id, request.user.tenant_id)
        if member is None:
            return _error("NOT_FOUND", "Staff member not found.", status.HTTP_404_NOT_FOUND)

        serializer = UpdateStaffSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return _error("VALIDATION_ERROR", str(serializer.errors), status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        clear_pin: bool = data.pop("clear_pin", False)

        update_fields: dict = {}
        if "name" in data:
            parts = data["name"].split(" ", 1)
            update_fields["first_name"] = parts[0]
            update_fields["last_name"] = parts[1] if len(parts) > 1 else ""
        for field in ("email", "role", "is_active", "commission_rate"):
            if field in data:
                update_fields[field] = data[field]

        if clear_pin and data.get("is_active") is False:
            update_fields["pin_hash"] = ""

        CustomUser.objects.filter(id=id, tenant_id=request.user.tenant_id).update(
            **update_fields
        )
        member.refresh_from_db()

        # ── Audit side-effect ──────────────────────────────────────
        if "role" in update_fields:
            try:
                from apps.audit.services.audit_service import create_audit_log, AUDIT_ACTIONS
                create_audit_log(
                    tenant_id=request.user.tenant_id,
                    user_id=request.user.id,
                    action=AUDIT_ACTIONS["STAFF_ROLE_CHANGED"],
                    entity_type="staff",
                    entity_id=str(id),
                    new_values={"role": update_fields["role"]},
                    ip_address=request.META.get("REMOTE_ADDR"),
                    user_agent=request.META.get("HTTP_USER_AGENT", "")[:255],
                    actor_role=getattr(request.user, "role", ""),
                )
            except Exception:
                pass

        return _ok(_serialize_user(member, include_has_pin=True))
