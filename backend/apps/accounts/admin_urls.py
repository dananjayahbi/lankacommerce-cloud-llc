from django.urls import path

from .views import ForceLogoutView

# Admin-level user management endpoints
urlpatterns = [
    path(
        "users/<str:user_id>/force-logout/",
        ForceLogoutView.as_view(),
        name="force_logout",
    ),
]
