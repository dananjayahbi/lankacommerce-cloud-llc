"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const REQUIRED_FIELDS = ["Product Name", "Retail Price"];
const OPTIONAL_FIELDS = [
  "Category", "Brand", "Gender", "Description", "Tags",
  "SKU", "Barcode", "Size", "Colour", "Cost Price",
  "Wholesale Price", "Low Stock Threshold",
];
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

interface ColumnMappingTableProps {
  csvHeaders: string[];
  csvRows: Record<string, string>[];
  onConfirm: (mapping: Record<string, string>) => void;
}

function autoDetect(headers: string[], field: string): string {
  const normalized = field.toLowerCase().replace(/\s+/g, "");
  return (
    headers.find((h) => h.toLowerCase().replace(/\s+/g, "") === normalized) ?? ""
  );
}

export function ColumnMappingTable({ csvHeaders, csvRows, onConfirm }: ColumnMappingTableProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    ALL_FIELDS.forEach((f) => {
      m[f] = autoDetect(csvHeaders, f);
    });
    return m;
  });

  const unmappedRequired = REQUIRED_FIELDS.filter((f) => !mapping[f]);

  const getPreview = (field: string): string => {
    const col = mapping[field];
    if (!col) return "";
    return csvRows
      .slice(0, 3)
      .map((r) => r[col])
      .filter(Boolean)
      .join(", ");
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background text-xs font-semibold text-[var(--color-navy)]">
              <th className="px-4 py-3 text-left">LankaCommerce Field</th>
              <th className="px-4 py-3 text-left">CSV Column</th>
              <th className="px-4 py-3 text-left">Preview</th>
            </tr>
          </thead>
          <tbody>
            {ALL_FIELDS.map((field) => {
              const isRequired = REQUIRED_FIELDS.includes(field);
              return (
                <tr key={field} className="border-b border-border">
                  <td className="px-4 py-2">
                    <span className="font-medium">{field}</span>
                    {isRequired && (
                      <span className="ml-1 text-xs text-destructive">(Required)</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Select
                      value={mapping[field]}
                      onValueChange={(v) => setMapping((prev) => ({ ...prev, [field]: v ?? '' }))}
                    >
                      <SelectTrigger className="h-8 w-48">
                        <SelectValue placeholder="— Not mapped —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— Not mapped —</SelectItem>
                        {csvHeaders.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2 max-w-xs truncate text-xs italic text-muted-foreground">
                    {getPreview(field)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Validation bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="text-green-600 font-medium">
            {REQUIRED_FIELDS.length - unmappedRequired.length} required fields mapped
          </span>
          {unmappedRequired.length > 0 && (
            <span className="ml-2 text-destructive font-medium">
              · {unmappedRequired.length} not mapped
            </span>
          )}
        </div>
        <Button
          onClick={() => onConfirm(mapping)}
          disabled={unmappedRequired.length > 0}
          className="bg-[var(--color-navy)] text-white"
        >
          Preview Import →
        </Button>
      </div>
    </div>
  );
}
