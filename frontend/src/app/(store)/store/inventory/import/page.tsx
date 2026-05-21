"use client";

import { useState } from "react";
import { WizardProgressBar } from "@/components/wizard/WizardProgressBar";
import { CsvUploadZone } from "@/components/csv/CsvUploadZone";
import { ColumnMappingTable } from "@/components/csv/ColumnMappingTable";
import { ImportPreviewTable } from "@/components/csv/ImportPreviewTable";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const STEPS = ["Upload File", "Map Columns", "Review & Import"] as const;

export default function ImportPage() {
  const { can } = usePermissions();

  if (!can(PERMISSIONS.PRODUCTS_IMPORT)) {
    redirect("/store/inventory");
  }

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            <Link href="/store/inventory" className="hover:underline">Inventory</Link> / Import Products
          </p>
          <h1 className="text-2xl font-bold text-[var(--color-navy)]">Import Products</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bulk import products and variants from a CSV file.{" "}
            <a
              href={`${API_BASE}/api/catalog/csv-template/`}
              className="text-[var(--color-orange)] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download template →
            </a>
          </p>
        </div>

        <WizardProgressBar currentStep={step} />

        <div className="rounded-xl bg-white border border-border p-6">
          {step === 1 && (
            <CsvUploadZone
              onParsed={(result) => {
                setCsvData({ headers: result.headers, rows: result.rows });
                setStep(2);
              }}
            />
          )}

          {step === 2 && csvData && (
            <ColumnMappingTable
              csvHeaders={csvData.headers}
              csvRows={csvData.rows}
              onConfirm={(m) => {
                setMapping(m);
                setStep(3);
              }}
            />
          )}

          {step === 3 && csvData && (
            <ImportPreviewTable
              csvRows={csvData.rows}
              mapping={mapping}
              onBack={() => setStep(2)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
