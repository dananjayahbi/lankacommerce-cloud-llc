from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.reports.models import SavedReport
from apps.reports.serializers import SavedReportSerializer


def _ok(data, status_code=200):
    return Response({"success": True, "data": data}, status=status_code)


def _error(message, status_code=400, code=None):
    payload: dict = {"success": False, "error": {"message": message}}
    if code:
        payload["error"]["code"] = code
    return Response(payload, status=status_code)


class SavedReportListCreateView(APIView):
    """GET/POST /api/reports/saved/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reports = SavedReport.objects.filter(
            tenant_id=request.user.tenant_id,
            user_id=request.user.id,
        ).order_by("-created_at")
        serializer = SavedReportSerializer(reports, many=True)
        return _ok(serializer.data)

    def post(self, request):
        serializer = SavedReportSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(
                serializer.errors, status.HTTP_400_BAD_REQUEST, "VALIDATION_ERROR"
            )
        saved_report = SavedReport.objects.create(
            tenant_id=request.user.tenant_id,
            user=request.user,
            name=serializer.validated_data["name"],
            report_type=serializer.validated_data["report_type"],
            filters=serializer.validated_data.get("filters"),
        )
        return _ok(SavedReportSerializer(saved_report).data, status.HTTP_201_CREATED)


class SavedReportDetailView(APIView):
    """DELETE /api/reports/saved/<uuid:id>/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def _get(self, request, report_id):
        try:
            return SavedReport.objects.get(
                id=report_id,
                tenant_id=request.user.tenant_id,
                user_id=request.user.id,
            )
        except SavedReport.DoesNotExist:
            return None

    def delete(self, request, id):
        report = self._get(request, id)
        if report is None:
            return _error("Saved report not found.", 404, "NOT_FOUND")
        report.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
