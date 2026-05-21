from django.urls import path

from apps.promotions.views.evaluate_views import PromotionEvaluateView
from apps.promotions.views.promotion_views import PromotionDetailView, PromotionListCreateView
from apps.promotions.views.validate_code_views import ValidateCodeView

app_name = "promotions"

urlpatterns = [
    path("", PromotionListCreateView.as_view(), name="list-create"),
    path("evaluate/", PromotionEvaluateView.as_view(), name="evaluate"),
    path("validate-code/", ValidateCodeView.as_view(), name="validate-code"),
    path("<uuid:id>/", PromotionDetailView.as_view(), name="detail"),
]
