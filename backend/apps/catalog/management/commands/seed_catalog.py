"""Management command: seed_catalog

Populates the development database with a representative sample product
catalog: 5 categories, 4 brands, 30 products, and multiple variants per
product.  The command is fully idempotent — running it more than once has no
effect and exits cleanly.

Usage:
    python manage.py seed_catalog
    make seed-catalog          (from the backend/ directory)

Prerequisites:
    The development tenant with subdomain='dev' must exist before running.
    Run ``python manage.py seed_sample_tenant`` first if needed.
"""

from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import (
    Brand,
    Category,
    GenderType,
    Product,
    ProductVariant,
    TaxRule,
)


# ─────────────────────────────────────────────────────────────────────────────
# Seed data constants
# ─────────────────────────────────────────────────────────────────────────────

_CATEGORIES = [
    {"name": "Men's Shirts", "description": "Formal, casual, and polo shirts for men.", "sort_order": 1},
    {"name": "Women's Blouses", "description": "Light-fabric tops and blouses for women.", "sort_order": 2},
    {"name": "Kids' Wear", "description": "Clothing for children aged 2 to 12.", "sort_order": 3},
    {"name": "Footwear", "description": "Shoes, sandals, and boots for all genders.", "sort_order": 4},
    {"name": "Accessories", "description": "Bags, belts, hats, and miscellaneous accessories.", "sort_order": 5},
]

_BRANDS = [
    {"name": "SriThread", "logo_url": None},
    {"name": "TropicWear", "logo_url": None},
    {"name": "PearlLine", "logo_url": None},
    {"name": "ActiveStep", "logo_url": None},
]

# 30 products — 6 per category; brand assigned by round-robin (0→3)
_PRODUCTS = [
    # ── Men's Shirts (cat_idx=0) ───────────────────────────────────────────
    {"name": "Classic White Oxford Shirt", "description": "A timeless white Oxford button-down shirt.", "cat": 0, "brand": 0, "gender": GenderType.MEN, "tags": ["oxford", "formal", "cotton"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Slim Fit Blue Dress Shirt", "description": "Slim-cut formal shirt in royal blue.", "cat": 0, "brand": 1, "gender": GenderType.MEN, "tags": ["slim-fit", "formal", "blue"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Casual Linen Shirt", "description": "Breathable linen shirt for casual occasions.", "cat": 0, "brand": 2, "gender": GenderType.MEN, "tags": ["linen", "casual", "summer"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Striped Polo Shirt", "description": "Classic striped polo with collar.", "cat": 0, "brand": 3, "gender": GenderType.MEN, "tags": ["polo", "striped", "sporty"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Mandarin Collar Batik Shirt", "description": "Traditional batik-print shirt with mandarin collar.", "cat": 0, "brand": 0, "gender": GenderType.MEN, "tags": ["batik", "traditional", "mandarin"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Slim-Fit Checked Shirt", "description": "Modern checked pattern in a slim cut.", "cat": 0, "brand": 1, "gender": GenderType.MEN, "tags": ["checked", "slim-fit", "casual"], "tax_rule": TaxRule.STANDARD_VAT},
    # ── Women's Blouses (cat_idx=1) ────────────────────────────────────────
    {"name": "Floral Chiffon Blouse", "description": "Lightweight chiffon blouse with floral print.", "cat": 1, "brand": 2, "gender": GenderType.WOMEN, "tags": ["chiffon", "floral", "summer"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Peplum Satin Blouse", "description": "Elegant satin blouse with peplum hem.", "cat": 1, "brand": 3, "gender": GenderType.WOMEN, "tags": ["satin", "peplum", "formal"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Ruffle Sleeve Blouse", "description": "Romantic ruffle sleeve blouse for everyday wear.", "cat": 1, "brand": 0, "gender": GenderType.WOMEN, "tags": ["ruffle", "romantic", "everyday"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Embroidered Collar Blouse", "description": "White blouse with hand-embroidered collar detail.", "cat": 1, "brand": 1, "gender": GenderType.WOMEN, "tags": ["embroidered", "white", "detail"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Wrap-Style Printed Blouse", "description": "Wrap-front blouse in a tropical print.", "cat": 1, "brand": 2, "gender": GenderType.WOMEN, "tags": ["wrap", "printed", "tropical"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Silk Tie-Neck Blouse", "description": "Premium silk blouse with self-tie neck.", "cat": 1, "brand": 3, "gender": GenderType.WOMEN, "tags": ["silk", "tie-neck", "premium"], "tax_rule": TaxRule.STANDARD_VAT},
    # ── Kids' Wear (cat_idx=2) ─────────────────────────────────────────────
    {"name": "Cartoon Print T-Shirt", "description": "Fun cartoon-print tee for boys and girls.", "cat": 2, "brand": 0, "gender": GenderType.KIDS, "tags": ["cartoon", "fun", "tee"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Denim Dungarees", "description": "Classic denim dungarees with adjustable straps.", "cat": 2, "brand": 1, "gender": GenderType.KIDS, "tags": ["denim", "dungarees", "classic"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Floral Summer Dress", "description": "Light floral dress perfect for warm weather.", "cat": 2, "brand": 2, "gender": GenderType.KIDS, "tags": ["floral", "summer", "dress"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Striped Cotton Shorts", "description": "Comfortable cotton shorts with elastic waist.", "cat": 2, "brand": 3, "gender": GenderType.KIDS, "tags": ["cotton", "shorts", "comfortable"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Hooded Fleece Jacket", "description": "Warm fleece jacket with hood for cool evenings.", "cat": 2, "brand": 0, "gender": GenderType.KIDS, "tags": ["fleece", "jacket", "hoodie"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "School Uniform Shirt", "description": "White cotton school uniform shirt.", "cat": 2, "brand": 1, "gender": GenderType.KIDS, "tags": ["uniform", "school", "white"], "tax_rule": TaxRule.STANDARD_VAT},
    # ── Footwear (cat_idx=3) ───────────────────────────────────────────────
    {"name": "Leather Oxford Shoes", "description": "Classic black leather Oxford shoes.", "cat": 3, "brand": 2, "gender": GenderType.UNISEX, "tags": ["leather", "oxford", "formal"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Canvas Slip-On Sneakers", "description": "Lightweight canvas slip-on for casual wear.", "cat": 3, "brand": 3, "gender": GenderType.UNISEX, "tags": ["canvas", "slip-on", "casual"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Sport Running Shoes", "description": "Cushioned running shoes with mesh upper.", "cat": 3, "brand": 0, "gender": GenderType.UNISEX, "tags": ["running", "sport", "cushioned"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Leather Sandals", "description": "Comfortable flat leather sandals.", "cat": 3, "brand": 1, "gender": GenderType.UNISEX, "tags": ["sandals", "leather", "flat"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Ankle Boot", "description": "Stylish ankle boot with block heel.", "cat": 3, "brand": 2, "gender": GenderType.UNISEX, "tags": ["ankle", "boot", "heel"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Flip Flops", "description": "Beach-ready rubber flip flops.", "cat": 3, "brand": 3, "gender": GenderType.UNISEX, "tags": ["flip-flops", "beach", "rubber"], "tax_rule": TaxRule.STANDARD_VAT},
    # ── Accessories (cat_idx=4) ────────────────────────────────────────────
    {"name": "Canvas Tote Bag", "description": "Durable canvas tote with inner pocket.", "cat": 4, "brand": 0, "gender": GenderType.UNISEX, "tags": ["tote", "canvas", "bag"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Genuine Leather Belt", "description": "Classic reversible genuine leather belt.", "cat": 4, "brand": 1, "gender": GenderType.UNISEX, "tags": ["belt", "leather", "reversible"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Wide Brim Sun Hat", "description": "UV-protective wide brim summer hat.", "cat": 4, "brand": 2, "gender": GenderType.UNISEX, "tags": ["hat", "sun", "UV"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Crossbody Sling Bag", "description": "Compact crossbody bag for everyday carry.", "cat": 4, "brand": 3, "gender": GenderType.UNISEX, "tags": ["crossbody", "compact", "everyday"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Knit Winter Scarf", "description": "Soft knit scarf for cold evenings.", "cat": 4, "brand": 0, "gender": GenderType.UNISEX, "tags": ["scarf", "knit", "winter"], "tax_rule": TaxRule.STANDARD_VAT},
    {"name": "Printed Silk Scrunchie Set", "description": "Set of five printed silk hair scrunchies.", "cat": 4, "brand": 1, "gender": GenderType.UNISEX, "tags": ["scrunchie", "silk", "set"], "tax_rule": TaxRule.STANDARD_VAT},
]

# Variant definitions per category index
_APPAREL_SIZES = ["S", "M", "L", "XL"]
_APPAREL_COLOURS = ["White", "Blue"]
_KIDS_SIZES = ["2-4Y", "4-6Y", "6-8Y", "8-10Y", "10-12Y"]
_SHOE_SIZES = [str(s) for s in range(5, 13)]  # UK 5–12


def _make_variants(
    product: "Product",
    tenant,
    product_idx: int,
    cat_idx: int,
) -> list["ProductVariant"]:
    """Return unsaved ProductVariant instances for *product*."""
    cost = Decimal("500") + Decimal(product_idx) * Decimal("100")
    retail = (cost * Decimal("1.60")).quantize(Decimal("0.01"))
    wholesale = (cost * Decimal("1.20")).quantize(Decimal("0.01"))

    variants = []
    var_idx = 0

    if cat_idx in (0, 1):  # Men's Shirts, Women's Blouses
        for size in _APPAREL_SIZES:
            for colour in _APPAREL_COLOURS:
                variants.append(
                    ProductVariant(
                        product=product,
                        tenant=tenant,
                        sku=f"SEED-{product_idx:02d}-{var_idx:02d}",
                        size=size,
                        colour=colour,
                        cost_price=cost,
                        retail_price=retail,
                        wholesale_price=wholesale,
                        stock_quantity=50,
                        low_stock_threshold=5,
                    )
                )
                var_idx += 1

    elif cat_idx == 2:  # Kids' Wear
        for size in _KIDS_SIZES:
            variants.append(
                ProductVariant(
                    product=product,
                    tenant=tenant,
                    sku=f"SEED-{product_idx:02d}-{var_idx:02d}",
                    size=size,
                    colour="Multicolor",
                    cost_price=cost,
                    retail_price=retail,
                    wholesale_price=wholesale,
                    stock_quantity=50,
                    low_stock_threshold=5,
                )
            )
            var_idx += 1

    elif cat_idx == 3:  # Footwear
        for size in _SHOE_SIZES:
            variants.append(
                ProductVariant(
                    product=product,
                    tenant=tenant,
                    sku=f"SEED-{product_idx:02d}-{var_idx:02d}",
                    size=f"UK {size}",
                    colour="Black",
                    cost_price=cost,
                    retail_price=retail,
                    wholesale_price=wholesale,
                    stock_quantity=50,
                    low_stock_threshold=5,
                )
            )
            var_idx += 1

    else:  # Accessories (cat_idx == 4)
        variants.append(
            ProductVariant(
                product=product,
                tenant=tenant,
                sku=f"SEED-{product_idx:02d}-{var_idx:02d}",
                size="One Size",
                colour="Assorted",
                cost_price=cost,
                retail_price=retail,
                wholesale_price=wholesale,
                stock_quantity=50,
                low_stock_threshold=5,
            )
        )

    return variants


class Command(BaseCommand):
    help = "Seed the development database with a representative sample product catalog."

    def handle(self, *args, **options):
        # Import here to avoid issues at module load time
        from apps.tenants.models import Tenant

        # Locate the development tenant
        dev_tenant = Tenant.objects.filter(slug="dilani").first()
        if dev_tenant is None:
            self.stderr.write(
                self.style.ERROR(
                    "No development tenant found with slug='dilani'. "
                    "Run 'python manage.py seed_sample_tenant' first."
                )
            )
            return

        # Idempotency guard — sentinel: first seed category
        if Category.objects.filter(name="Men's Shirts", tenant=dev_tenant).exists():
            self.stdout.write(
                self.style.WARNING("Catalog seed data already exists. Skipping.")
            )
            return

        cat_count = brand_count = product_count = variant_count = 0

        with transaction.atomic():
            # ── Categories ────────────────────────────────────────────────
            created_categories = Category.objects.bulk_create([
                Category(
                    tenant=dev_tenant,
                    name=c["name"],
                    description=c.get("description", ""),
                    sort_order=c["sort_order"],
                )
                for c in _CATEGORIES
            ])
            cat_count = len(created_categories)

            # ── Brands ────────────────────────────────────────────────────
            created_brands = Brand.objects.bulk_create([
                Brand(
                    tenant=dev_tenant,
                    name=b["name"],
                    logo_url=b.get("logo_url"),
                )
                for b in _BRANDS
            ])
            brand_count = len(created_brands)

            # ── Products & Variants ───────────────────────────────────────
            all_variants: list[ProductVariant] = []
            for product_idx, pdata in enumerate(_PRODUCTS):
                cat_idx: int = pdata["cat"]
                product = Product.objects.create(
                    tenant=dev_tenant,
                    name=pdata["name"],
                    description=pdata.get("description", ""),
                    category=created_categories[cat_idx],
                    brand=created_brands[pdata["brand"]],
                    gender=pdata["gender"],
                    tags=pdata.get("tags", []),
                    tax_rule=pdata["tax_rule"],
                )
                product_count += 1

                variants = _make_variants(product, dev_tenant, product_idx, cat_idx)
                all_variants.extend(variants)

            ProductVariant.objects.bulk_create(all_variants)
            variant_count = len(all_variants)

        # --- BEGIN: Stock Movement Seeding (added by Task 02.03.12) ---
        from datetime import timedelta
        from django.utils import timezone as _tz
        from apps.catalog.models import StockMovement, StockMovementReason

        base_time = _tz.now() - timedelta(days=30)
        movements_to_create: list[StockMovement] = []

        all_persisted_variants = ProductVariant.objects.filter(
            tenant=dev_tenant, deleted_at__isnull=True
        ).values_list("id", "stock_quantity")

        existing_initial_variant_ids = set(
            StockMovement.objects.filter(
                tenant=dev_tenant,
                reason=StockMovementReason.INITIAL_STOCK,
            ).values_list("variant_id", flat=True)
        )

        for idx, (variant_id, stock_quantity) in enumerate(all_persisted_variants):
            if stock_quantity == 0:
                continue
            if variant_id in existing_initial_variant_ids:
                continue
            created_at = base_time + timedelta(minutes=idx * 4)
            movements_to_create.append(
                StockMovement(
                    tenant=dev_tenant,
                    variant_id=variant_id,
                    reason=StockMovementReason.INITIAL_STOCK,
                    quantity_before=0,
                    quantity_after=stock_quantity,
                    quantity_delta=stock_quantity,
                    note="Initial stock seeded for development environment.",
                    created_at=created_at,
                )
            )

        if movements_to_create:
            StockMovement.objects.bulk_create(movements_to_create)

        self.stdout.write(self.style.SUCCESS(f"Stock movements seeded: {len(movements_to_create)}"))
        # --- END: Stock Movement Seeding ---

        self.stdout.write(self.style.SUCCESS(f"Tenant:     {dev_tenant.subdomain}"))
        self.stdout.write(self.style.SUCCESS(f"Categories: {cat_count}"))
        self.stdout.write(self.style.SUCCESS(f"Brands:     {brand_count}"))
        self.stdout.write(self.style.SUCCESS(f"Products:   {product_count}"))
        self.stdout.write(self.style.SUCCESS(f"Variants:   {variant_count}"))
        self.stdout.write(self.style.SUCCESS("Catalog seed complete."))
