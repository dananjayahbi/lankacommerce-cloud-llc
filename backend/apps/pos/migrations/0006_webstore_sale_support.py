"""
0006_webstore_sale_support

Make Sale.shift and Sale.cashier nullable so that webstore orders can
create Sale records without a physical POS shift or staff cashier.

Add sale_source field to distinguish between POS ('pos') and
online storefront ('webstore') sales.
"""

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("pos", "0005_add_applied_promotions_to_sale"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="sale",
            name="shift",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="sales",
                to="pos.shift",
            ),
        ),
        migrations.AlterField(
            model_name="sale",
            name="cashier",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="cashier_sales",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="sale",
            name="sale_source",
            field=models.CharField(
                choices=[("pos", "POS"), ("webstore", "Webstore")],
                default="pos",
                max_length=20,
            ),
        ),
    ]
