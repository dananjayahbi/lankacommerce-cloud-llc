from django.contrib.auth.hashers import check_password, make_password  # noqa: F401
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomUser


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default SimpleJWT serializer to embed LankaCommerce-specific
    claims into the access token payload.
    """

    @classmethod
    def get_token(cls, user: CustomUser) -> RefreshToken:
        token = super().get_token(user)

        token["email"] = user.email
        token["role"] = user.role
        token["permissions"] = user.permissions_list
        token["tenant_id"] = str(user.tenant_id) if user.tenant_id else None
        token["session_version"] = user.session_version
        if user.tenant_id:
            try:
                token["subscription_status"] = user.tenant.subscription_status
            except Exception:
                token["subscription_status"] = "TRIAL"
        else:
            token["subscription_status"] = "ACTIVE"

        return token

    def validate(self, attrs: dict) -> dict:
        data = super().validate(attrs)

        data["user"] = {
            "id": str(self.user.id),
            "email": self.user.email,
            "role": self.user.role,
            "tenant_id": str(self.user.tenant_id) if self.user.tenant_id else None,
        }

        return data


class LogoutSerializer(serializers.Serializer):
    """Accepts the refresh token for blacklisting on logout."""

    refresh = serializers.CharField(
        help_text="The refresh token to blacklist. Required for logout."
    )


class PINLoginSerializer(serializers.Serializer):
    """Accepts email + pin for PIN-based authentication."""

    email = serializers.EmailField(help_text="The user's email address.")
    pin = serializers.CharField(
        min_length=4,
        max_length=8,
        help_text="The user's numeric PIN (4–8 digits).",
    )

    def validate_pin(self, value: str) -> str:
        if not value.isdigit():
            raise serializers.ValidationError("PIN must contain only digits.")
        return value


class SetPINSerializer(serializers.Serializer):
    """Accepts a new PIN to set for the authenticated user."""

    pin = serializers.CharField(min_length=4, max_length=8, help_text="New PIN (4–8 digits).")
    confirm_pin = serializers.CharField(
        min_length=4, max_length=8, help_text="Confirm the new PIN."
    )

    def validate_pin(self, value: str) -> str:
        if not value.isdigit():
            raise serializers.ValidationError("PIN must contain only digits.")
        return value

    def validate(self, attrs: dict) -> dict:
        if attrs["pin"] != attrs["confirm_pin"]:
            raise serializers.ValidationError({"confirm_pin": "PINs do not match."})
        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    """Accepts an email address to initiate the password reset flow."""

    email = serializers.EmailField(
        help_text="The email address associated with the account."
    )


class ResetPasswordSerializer(serializers.Serializer):
    """Accepts the reset token + new password to complete the reset."""

    token = serializers.CharField(
        max_length=64,
        help_text="The password reset token from the email link.",
    )
    new_password = serializers.CharField(
        min_length=8,
        write_only=True,
        help_text="The new password (minimum 8 characters).",
    )
    confirm_password = serializers.CharField(
        min_length=8,
        write_only=True,
        help_text="Must match new_password.",
    )

    def validate(self, attrs: dict) -> dict:
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return attrs


class ForceLogoutSerializer(serializers.Serializer):
    """Request body for the force-logout endpoint."""

    reason = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        default="",
        help_text="Optional reason for the forced logout (stored in AuditLog).",
    )
