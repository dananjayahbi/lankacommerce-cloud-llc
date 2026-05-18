import type { ProductVariant } from "@/types/catalog";
import { cn } from "@/lib/utils";

interface BarcodeLabelProps {
  variant: ProductVariant & { productName?: string; brandName?: string };
  productName?: string;
  brandName?: string;
  paperSize?: "THERMAL" | "A4";
  isPreview?: boolean;
}

export function BarcodeLabel({
  variant,
  productName,
  brandName,
  paperSize = "THERMAL",
  isPreview = false,
}: BarcodeLabelProps) {
  const barcodeValue = variant.barcode ?? variant.sku;
  const stock = variant.stock_quantity ?? 0;
  const threshold = variant.low_stock_threshold ?? 5;
  const isLowStock = stock <= threshold;

  return (
    <div
      className={cn(
        "border border-[var(--color-navy)] bg-white font-sans",
        isPreview
          ? "h-[240px] w-[160px] p-2 text-[1.5em]"
          : "h-[6cm] w-[4cm] p-1",
        !isPreview && paperSize === "A4" && "h-auto w-auto",
      )}
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Brand */}
      {brandName && (
        <div
          style={{
            fontSize: isPreview ? 8 : 7,
            color: "#1B2B3A",
            lineHeight: 1.2,
          }}
        >
          {brandName}
        </div>
      )}

      <hr style={{ borderColor: "#E2E8F0", margin: "2px 0" }} />

      {/* Product name */}
      <div
        style={{
          fontSize: isPreview ? 11 : 10,
          color: "#1B2B3A",
          fontWeight: 600,
          lineHeight: 1.3,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {productName ?? ""}
      </div>

      {/* SKU */}
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: isPreview ? 9 : 8,
          color: "#1B2B3A",
          lineHeight: 1.4,
        }}
      >
        <span style={{ color: "#64748B" }}>SKU: </span>
        {variant.sku}
      </div>

      {/* Size + Colour */}
      <div style={{ fontSize: isPreview ? 8 : 7, color: "#64748B", lineHeight: 1.4 }}>
        Size: {variant.size ?? "—"} · Colour: {variant.colour ?? "—"}
      </div>

      {/* Barcode placeholder */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2px 4px",
          minHeight: isPreview ? 40 : 30,
        }}
      >
        <div
          style={{
            width: "100%",
            height: isPreview ? 32 : 24,
            background: "repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px)",
            borderRadius: 1,
          }}
          title={barcodeValue}
        />
      </div>

      <div
        style={{
          fontSize: isPreview ? 7 : 6,
          color: "#64748B",
          textAlign: "center",
          fontFamily: "monospace",
          marginBottom: 2,
        }}
      >
        {barcodeValue}
      </div>

      {/* Price row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
        {isLowStock && (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#F59E0B",
              flexShrink: 0,
            }}
          />
        )}
        <div
          style={{
            fontSize: isPreview ? 14 : 12,
            color: "#1B2B3A",
            fontWeight: 700,
            textAlign: "right",
          }}
        >
          Rs.{" "}
          {parseFloat(variant.retail_price).toLocaleString("en-LK", {
            minimumFractionDigits: 2,
          })}
        </div>
      </div>
    </div>
  );
}
