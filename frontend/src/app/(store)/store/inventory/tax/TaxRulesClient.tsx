"use client";

import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

interface TaxRuleInfo {
  code: string;
  label: string;
  rate: string;
  description: string;
  examples: string[];
}

const TAX_RULES: TaxRuleInfo[] = [
  {
    code: "STANDARD_VAT",
    label: "Standard VAT",
    rate: "15%",
    description:
      "Standard Value Added Tax applied to most goods and services. This is the default tax rule for new products.",
    examples: ["Electronics", "Clothing", "Furniture", "General merchandise"],
  },
  {
    code: "REDUCED_VAT",
    label: "Reduced VAT",
    rate: "2.5%",
    description:
      "Reduced rate applied to certain categories of goods. Equivalent to the Social Security Contribution Levy (SSCL) rate.",
    examples: ["Essential food items", "Medicines", "Agricultural supplies"],
  },
  {
    code: "ZERO_RATED",
    label: "Zero Rated",
    rate: "0%",
    description:
      "Zero-rated supplies are taxable at 0%. Unlike exempt supplies, input tax can be reclaimed by VAT-registered businesses.",
    examples: ["Exports", "Certain food staples", "Books and educational materials"],
  },
  {
    code: "EXEMPT",
    label: "Exempt",
    rate: "0%",
    description:
      "Exempt supplies are not subject to VAT. No VAT is charged on exempt goods or services.",
    examples: ["Financial services", "Insurance", "Postal services", "Healthcare"],
  },
];

const RATE_COLORS: Record<string, string> = {
  "15%": "bg-red-100 text-red-700 border-red-200",
  "2.5%": "bg-amber-100 text-amber-700 border-amber-200",
  "0%": "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export function TaxRulesClient() {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-navy)]">Tax Rules</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tax rules are configured per product and applied automatically at the point of sale.
          </p>
        </div>

        {/* Info banner */}
        <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Tax rules are assigned per product when creating or editing a product. The applicable
            rate is automatically calculated during checkout based on each item&apos;s assigned rule.
          </p>
        </div>

        {/* Tax rules grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {TAX_RULES.map((rule) => (
            <div
              key={rule.code}
              className="rounded-lg border border-border bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[var(--color-navy)]">{rule.label}</h2>
                  <code className="mt-0.5 block text-xs text-muted-foreground">{rule.code}</code>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${RATE_COLORS[rule.rate] ?? "bg-gray-100 text-gray-700"}`}
                >
                  {rule.rate}
                </span>
              </div>

              <p className="mb-3 text-sm text-muted-foreground">{rule.description}</p>

              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Typical examples
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {rule.examples.map((ex) => (
                    <Badge key={ex} variant="secondary" className="text-xs font-normal">
                      {ex}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground">
          Tax rates shown are indicative. Always consult your accountant or tax advisor for
          compliance with local tax regulations.
        </p>
      </div>
    </div>
  );
}
