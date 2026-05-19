import secrets
import uuid as _uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import CustomUser, PasswordResetToken, UserRole
from .permissions import HasPermission, IsOwnerOrAbove  # noqa: F401 — available for later use
from .serializers import (
    CustomTokenObtainPairSerializer,
    ForgotPasswordSerializer,
    ForceLogoutSerializer,
    LogoutSerializer,
    PINLoginSerializer,
    ResetPasswordSerializer,
    SetPINSerializer,
)
from .services.audit_service import audit_service
from .throttling import ForgotPasswordRateThrottle, LoginRateThrottle, PINRateThrottle


class LoginView(TokenObtainPairView):
    """
    POST /api/auth/login/

    Accepts { email, password } and returns JWT access + refresh tokens
    with LankaCommerce custom claims embedded.
    """

    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        email = request.data.get("email", "").lower().strip()

        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            audit_service.log_login_failed(email=email, request=request)
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            user = CustomUser.objects.get(email=email)
            user.last_login_at = timezone.now()
            user.save(update_fields=["last_login_at"])
            audit_service.log_login_success(user=user, request=request)
        except CustomUser.DoesNotExist:
            pass

        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/auth/logout/

    Blacklists the provided refresh token, effectively logging the user out.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = LogoutSerializer

    def post(self, request, *args, **kwargs):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            token.blacklist()
        except TokenError:
            return Response(
                {"detail": "Token is invalid or already blacklisted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        audit_service.log_logout(user=request.user, request=request)

        return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    """
    GET /api/auth/me/

    Returns the current authenticated user's profile information.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        return Response(
            {
                "id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "tenant_id": str(user.tenant_id) if user.tenant_id else None,
                "permissions": user.permissions_list,
                "session_version": user.session_version,
            }
        )


class PINLoginView(APIView):
    """
    POST /api/auth/pin/

    Accepts { email, pin } and returns a JWT if the PIN is valid.
    """

    permission_classes = [AllowAny]
    throttle_classes = [PINRateThrottle]

    def post(self, request, *args, **kwargs):
        serializer = PINLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"].lower()
        pin = serializer.validated_data["pin"]

        try:
            user = CustomUser.objects.get(email=email, is_active=True)
        except CustomUser.DoesNotExist:
            return Response(
                {"detail": "Invalid email or PIN."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.pin_hash:
            return Response(
                {"detail": "PIN login is not configured for this account."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not check_password(pin, user.pin_hash):
            audit_service.log_pin_login_failed(email=email, request=request)
            return Response(
                {"detail": "Invalid email or PIN."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        refresh["email"] = user.email
        refresh["role"] = user.role
        refresh["permissions"] = user.permissions_list
        refresh["tenant_id"] = str(user.tenant_id) if user.tenant_id else None
        refresh["session_version"] = user.session_version

        user.last_login_at = timezone.now()
        user.save(update_fields=["last_login_at"])

        audit_service.log_pin_login_success(user=user, request=request)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "role": user.role,
                    "tenant_id": str(user.tenant_id) if user.tenant_id else None,
                },
            },
            status=status.HTTP_200_OK,
        )


class SetPINView(APIView):
    """
    POST /api/auth/pin/set/

    Allows an authenticated user to set or update their PIN.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = SetPINSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        user.pin_hash = make_password(serializer.validated_data["pin"])
        user.save(update_fields=["pin_hash"])

        return Response(
            {"detail": "PIN updated successfully."},
            status=status.HTTP_200_OK,
        )


class VerifyPINView(APIView):
    """
    POST /api/auth/pin/verify/

    Verifies a 4-digit manager PIN on behalf of an already-authenticated cashier.
    Used by the POS terminal to authorise above-threshold discounts.

    Request body: { "pin": "1234" }

    Returns HTTP 200 with manager user_id and role on success.
    Returns HTTP 401 for invalid or CASHIER-role PINs (indistinguishable to caller).
    Returns HTTP 400 for malformed input.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [PINRateThrottle]

    def post(self, request, *args, **kwargs):
        pin = request.data.get("pin", "")

        # Validate: must be exactly 4 numeric digits
        if not isinstance(pin, str) or len(pin) != 4 or not pin.isdigit():
            return Response(
                {"detail": "PIN must be a 4-digit numeric string."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tenant_id = request.user.tenant_id

        # Retrieve all users in the same tenant who have a PIN set
        candidates = CustomUser.objects.filter(
            tenant_id=tenant_id,
            is_active=True,
        ).exclude(pin_hash="")

        matching_user = None
        for candidate in candidates:
            if check_password(pin, candidate.pin_hash):
                matching_user = candidate
                break

        # Treat CASHIER match same as no match (no role enumeration)
        if matching_user is None or matching_user.role == UserRole.CASHIER:
            return Response(
                {
                    "success": False,
                    "error": {"code": "INVALID_PIN", "message": "Invalid PIN"},
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(
            {
                "success": True,
                "data": {
                    "user_id": str(matching_user.id),
                    "role": matching_user.role,
                },
            },
            status=status.HTTP_200_OK,
        )


class ForgotPasswordView(APIView):
    """
    POST /api/auth/forgot-password/

    Accepts { email } and sends a password reset email.
    ALWAYS returns 200 regardless of whether the email exists,
    preventing user enumeration attacks.
    """

    permission_classes = [AllowAny]
    throttle_classes = [ForgotPasswordRateThrottle]

    def post(self, request, *args, **kwargs):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower()

        # Always return success to prevent email enumeration
        success_response = Response(
            {
                "detail": (
                    "If an account with that email exists, "
                    "a password reset link has been sent."
                )
            },
            status=status.HTTP_200_OK,
        )

        try:
            user = CustomUser.objects.get(email=email, is_active=True)
        except CustomUser.DoesNotExist:
            return success_response

        # Invalidate any existing unused tokens for this user
        PasswordResetToken.objects.filter(user=user, used=False).delete()

        # Generate a new token
        raw_token = secrets.token_hex(32)  # 64 hex chars = 256 bits of entropy
        expires_at = timezone.now() + timedelta(
            hours=getattr(settings, "PASSWORD_RESET_TIMEOUT_HOURS", 1)
        )

        PasswordResetToken.objects.create(
            user=user,
            token=raw_token,
            expires_at=expires_at,
        )

        audit_service.log_password_reset_requested(user=user, request=request)

        # Build the reset URL (frontend URL)
        frontend_base_url = getattr(
            settings, "FRONTEND_BASE_URL", "http://localhost:3000"
        )
        reset_url = f"{frontend_base_url}/reset-password?token={raw_token}"

        # Send reset email
        send_mail(
            subject="LankaCommerce — Reset Your Password",
            message=(
                f"Hi,\n\n"
                f"You requested a password reset for your LankaCommerce account.\n\n"
                f"Click the link below to reset your password:\n{reset_url}\n\n"
                f"This link expires in "
                f"{getattr(settings, 'PASSWORD_RESET_TIMEOUT_HOURS', 1)} hour(s).\n\n"
                f"If you did not request this, please ignore this email.\n\n"
                f"— LankaCommerce Team"
            ),
            from_email=getattr(settings, "EMAIL_FROM", "noreply@lankacommerce.dev"),
            recipient_list=[user.email],
            fail_silently=True,
        )

        return success_response


class ResetPasswordView(APIView):
    """
    POST /api/auth/reset-password/

    Accepts { token, new_password, confirm_password } and resets the user's password.
    Increments session_version to invalidate all existing sessions.
    """

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_value = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        # Find the token
        try:
            reset_token = PasswordResetToken.objects.select_related("user").get(
                token=token_value,
                used=False,
            )
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"detail": "This reset link is invalid or has already been used."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check expiry
        if not reset_token.is_valid:
            return Response(
                {"detail": "This reset link has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = reset_token.user

        # Update password and invalidate all sessions
        user.set_password(new_password)
        user.session_version += 1
        user.save(update_fields=["password", "session_version", "updated_at"])

        # Delete the used token
        reset_token.delete()

        audit_service.log_password_reset_success(user=user, request=request)

        return Response(
            {"detail": "Your password has been reset successfully. You can now log in."},
            status=status.HTTP_200_OK,
        )


class ForceLogoutView(APIView):
    """
    POST /api/admin/users/{user_id}/force-logout/

    Forces logout for the specified user by:
    1. Incrementing their session_version (embeds in future JWT tokens)
    2. Blacklisting all outstanding refresh tokens for that user

    Required role: OWNER or SUPER_ADMIN.
    """

    permission_classes = [IsAuthenticated, IsOwnerOrAbove]

    def post(self, request, user_id: str, *args, **kwargs):
        serializer = ForceLogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Fetch the target user
        try:
            target_user = CustomUser.objects.get(id=_uuid.UUID(user_id))
        except (CustomUser.DoesNotExist, ValueError):
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Prevent self-force-logout
        if target_user.id == request.user.id:
            return Response(
                {"detail": "You cannot force-logout yourself via this endpoint."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent OWNER from forcing out SUPER_ADMIN or another OWNER
        if request.user.role == "OWNER" and target_user.role in ("SUPER_ADMIN", "OWNER"):
            return Response(
                {"detail": "You do not have permission to force-logout this user."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 1. Increment session_version to invalidate future tokens
        target_user.session_version += 1
        target_user.save(update_fields=["session_version", "updated_at"])

        # 2. Blacklist all outstanding refresh tokens for this user
        outstanding_tokens = OutstandingToken.objects.filter(user=target_user)
        blacklisted_count = 0

        for outstanding_token in outstanding_tokens:
            if not BlacklistedToken.objects.filter(token=outstanding_token).exists():
                BlacklistedToken.objects.create(token=outstanding_token)
                blacklisted_count += 1

        audit_service.log_force_logout(
            actor=request.user,
            target_user=target_user,
            request=request,
            reason=serializer.validated_data.get("reason", ""),
        )

        return Response(
            {
                "detail": f"User {target_user.email} has been forcefully logged out.",
                "user_id": str(target_user.id),
                "tokens_blacklisted": blacklisted_count,
                "new_session_version": target_user.session_version,
            },
            status=status.HTTP_200_OK,
        )