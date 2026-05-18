"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductDetailsCard } from "./ProductDetailsCard";
import { VariantsTab } from "./VariantsTab";
import { StockHistoryTab } from "./StockHistoryTab";
import type { Product } from "@/types/catalog";
import { mergeSearchParams } from "@/lib/urlUtils";

interface ProductDetailTabsProps {
  product: Product;
}

export function ProductDetailTabs({ product }: ProductDetailTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") ?? "details";

  const handleTabChange = (value: string) => {
    router.push("?" + mergeSearchParams(searchParams, { tab: value }));
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="w-full justify-start rounded-none border-b border-border bg-[var(--color-navy)] px-4">
        {["details", "variants", "stock-history"].map((tab) => (
          <TabsTrigger
            key={tab}
            value={tab}
            className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-white/70 data-[state=active]:border-[var(--color-orange)] data-[state=active]:text-[var(--color-orange)]"
          >
            {tab === "details" ? "Details" : tab === "variants" ? "Variants" : "Stock History"}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="details" className="mt-0 p-4 md:p-6">
        <ProductDetailsCard product={product} />
      </TabsContent>

      <TabsContent value="variants" className="mt-0 p-4 md:p-6">
        <VariantsTab product={product} />
      </TabsContent>

      <TabsContent value="stock-history" className="mt-0 p-4 md:p-6">
        <StockHistoryTab productId={product.id} />
      </TabsContent>
    </Tabs>
  );
}
