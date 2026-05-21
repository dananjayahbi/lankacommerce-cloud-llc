from rest_framework import serializers

from apps.reports.models import SavedReport


class SavedReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedReport
        fields = ["id", "name", "report_type", "filters", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Report name must not be empty.")
        if len(value) > 100:
            raise serializers.ValidationError(
                "Report name must not exceed 100 characters."
            )
        return value.strip()

    def validate_report_type(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Report type must not be empty.")
        return value.strip()
