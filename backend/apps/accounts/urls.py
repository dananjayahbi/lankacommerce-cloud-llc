from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from .views import (
    CurrentUserView,
    ForgotPasswordView,
    LoginView,
    LogoutView,
    PINLoginView,
    ResetPasswordView,
    SetPINView,
)

app_name = "accounts"

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("me/", CurrentUserView.as_view(), name="current_user"),
    path("pin/", PINLoginView.as_view(), name="pin_login"),
    path("pin/set/", SetPINView.as_view(), name="pin_set"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot_password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset_password"),
]
