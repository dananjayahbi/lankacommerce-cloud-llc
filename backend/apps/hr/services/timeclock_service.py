"""
Time clock service: clock-in and clock-out for staff.
"""

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.hr.models import TimeClock

User = get_user_model()


class AlreadyClockedInError(Exception):
    pass


class NotClockedInError(Exception):
    pass


def clock_in_for_user(tenant_id, user_id, shift_id=None):
    """
    Clock in a staff member. Creates a TimeClock record and sets User.clocked_in_at.
    Raises AlreadyClockedInError if the user is already clocked in.
    """
    with transaction.atomic():
        user = User.objects.select_for_update().get(id=user_id, tenant_id=tenant_id)

        if user.clocked_in_at is not None:
            raise AlreadyClockedInError(
                f"User is already clocked in since {user.clocked_in_at.isoformat()}"
            )

        now = timezone.now()
        time_clock = TimeClock.objects.create(
            tenant_id=tenant_id,
            user_id=user_id,
            clocked_in_at=now,
            shift_id=shift_id,
        )
        User.objects.filter(id=user_id).update(clocked_in_at=now)

    return time_clock


def clock_out_for_user(tenant_id, user_id, notes=""):
    """
    Clock out a staff member. Updates the open TimeClock record and clears User.clocked_in_at.
    Raises NotClockedInError if the user is not clocked in.
    Returns (time_clock, duration_minutes).
    """
    with transaction.atomic():
        user = User.objects.select_for_update().get(id=user_id, tenant_id=tenant_id)

        if user.clocked_in_at is None:
            raise NotClockedInError("User is not currently clocked in.")

        time_clock = (
            TimeClock.objects.filter(user_id=user_id, clocked_out_at__isnull=True)
            .order_by("-clocked_in_at")
            .select_for_update()
            .first()
        )

        if time_clock is None:
            # Inconsistent state — clear denormalised field anyway
            User.objects.filter(id=user_id).update(clocked_in_at=None)
            raise NotClockedInError("No open time clock session found.")

        now = timezone.now()
        TimeClock.objects.filter(id=time_clock.id).update(
            clocked_out_at=now, notes=notes
        )
        User.objects.filter(id=user_id).update(clocked_in_at=None)

        duration_minutes = int((now - time_clock.clocked_in_at).total_seconds() / 60)

    time_clock.refresh_from_db()
    return time_clock, duration_minutes
