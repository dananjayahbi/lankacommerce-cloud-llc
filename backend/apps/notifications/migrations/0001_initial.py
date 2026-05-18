from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("accounts", "0001_initial"),
        ("tenants", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Notification",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notifications",
                        to="tenants.tenant",
                    ),
                ),
                (
                    "recipient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notifications",
                        to="accounts.customuser",
                    ),
                ),
                (
                    "notification_type",
                    models.CharField(
                        choices=[
                            ("LOW_STOCK_ALERT", "Low Stock Alert"),
                            ("STOCK_TAKE_SUBMITTED", "Stock Take Submitted"),
                            ("STOCK_TAKE_APPROVED", "Stock Take Approved"),
                            ("STOCK_TAKE_REJECTED", "Stock Take Rejected"),
                            ("SYSTEM_ALERT", "System Alert"),
                        ],
                        max_length=50,
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                ("body", models.TextField()),
                ("related_entity_type", models.CharField(blank=True, max_length=100, null=True)),
                ("related_entity_id", models.CharField(blank=True, max_length=100, null=True)),
                ("is_read", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(fields=["tenant_id", "recipient_id", "is_read"], name="notif_tenant_recip_read_idx"),
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(fields=["tenant_id", "recipient_id", "created_at"], name="notif_tenant_recip_created_idx"),
        ),
    ]
