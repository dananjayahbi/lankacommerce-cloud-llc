"""
0003_payhere_and_shipping

Add PayHere payment gateway fields and shipping methods configuration
to the TenantWebstore model.

Security note: payhere_merchant_secret is sensitive and must NEVER be
exposed in any API response. The serializer layer must explicitly exclude it.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("webstore", "0002_tracking_and_payment_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenantwebstore",
            name="payhere_merchant_id",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="tenantwebstore",
            name="payhere_merchant_secret",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="tenantwebstore",
            name="shipping_methods",
            field=models.JSONField(
                default=list,
                help_text=(
                    "Flat-rate shipping options. "
                    "Format: [{id, name, description, price, estimated_days}]"
                ),
            ),
        ),
    ]
