from rest_framework import serializers

from apps.hr.models import CommissionPayout, CommissionRecord, TimeClock


class CommissionRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommissionRecord
        fields = "__all__"


class CommissionPayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommissionPayout
        fields = "__all__"


class TimeClockSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeClock
        fields = "__all__"
