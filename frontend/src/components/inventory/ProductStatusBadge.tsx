import type { Product, ProductVariant } from "@/types/catalog";
import { cn } from "@/lib/utils";

interface ProductStatusBadgeProps {
  product: Pick<Product, "status"> & {
    variants?: Pick<
      ProductVariant,
      "stock_quantity" | "low_stock_threshold" | "deleted_at"
    >[];
  };
  className?: string;
}

type StatusInfo = {
  label: string;
  bgColor: string;
  textColor: string;
};

function getStatusInfo(props: ProductStatusBadgeProps["product"]): StatusInfo {
  if (props.status === "ARCHIVED") {
    return { label: "Archived", bgColor: "bg-muted", textColor: "text-[var(--color-navy)]" };
  }

  const activeVariants = (props.variants ?? []).filter((v) => !v.deleted_at);

  if (activeVariants.length === 0) {
    return { label: "Active", bgColor: "bg-[var(--color-success)]", textColor: "text-white" };
  }

  const hasOutOfStock = activeVariants.some((v) => v.stock_quantity === 0);
  if (hasOutOfStock) {
    return { label: "Out of Stock", bgColor: "bg-[var(--color-danger)]", textColor: "text-white" };
  }

  const hasLowStock = activeVariants.some(
    (v) => v.stock_quantity <= v.low_stock_threshold,
  );
  if (hasLowStock) {
    return { label: "Low Stock", bgColor: "bg-[var(--color-warning)]", textColor: "text-white" };
  }

  return { label: "Active", bgColor: "bg-[var(--color-success)]", textColor: "text-white" };
}

export function ProductStatusBadge({
  product,
  className,
}: ProductStatusBadgeProps) {
  const { label, bgColor, textColor } = getStatusInfo(product);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        bgColor,
        textColor,
        className,
      )}
    >
      {label}
    </span>
  );
}
