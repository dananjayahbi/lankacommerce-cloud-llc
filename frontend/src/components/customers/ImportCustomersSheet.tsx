"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuthStore } from "@/stores/authStore";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

async function importCustomers(file: File, token: string): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("csv", file);
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/api/crm/customers/import/`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Import failed");
  return json.data as ImportResult;
}

function downloadTemplate() {
  const template = "Name,Phone,Email,Gender,Birthday,Tags,Notes\r\n";
  const blob = new Blob([template], { type: "text/csv" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = "customer_import_template.csv";
  a.click();
  URL.revokeObjectURL(href);
}

export function ImportCustomersSheet({ open, onOpenChange, onSuccess }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorsExpanded, setErrorsExpanded] = useState(false);

  const mutation = useMutation({
    mutationFn: (file: File) => importCustomers(file, accessToken ?? ""),
    onSuccess: () => {
      onSuccess();
    },
  });

  function handleClose() {
    mutation.reset();
    setSelectedFile(null);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-inter text-lg font-bold text-[#1B2B3A]">
            Import Customers
          </SheetTitle>
          <p className="text-sm text-[#64748B]">
            Upload a CSV file to add multiple customers at once.
          </p>
        </SheetHeader>

        {!mutation.isSuccess ? (
          <div className="space-y-5">
            {/* Format description */}
            <div className="rounded-md bg-[#F1F5F9] px-4 py-3 text-sm text-[#1B2B3A] space-y-1">
              <p className="font-medium mb-1">Expected CSV columns:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[#64748B]">
                <li><strong>Name</strong> (required)</li>
                <li>Phone, Email, Gender (MALE/FEMALE/OTHER)</li>
                <li>Birthday (YYYY-MM-DD), Tags (comma-separated), Notes</li>
              </ul>
              <p className="mt-2 text-xs text-[#64748B]">Max 500 rows · Max 2 MB</p>
            </div>

            {/* Download template */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={downloadTemplate}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>

            {/* File input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1B2B3A]">Select CSV File</label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
              {selectedFile && (
                <p className="text-xs text-[#64748B]">Selected: {selectedFile.name}</p>
              )}
            </div>

            {mutation.isError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {(mutation.error as Error).message}
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 bg-[#F97316] hover:bg-[#ea6c0a] text-white"
                disabled={selectedFile === null || mutation.isPending}
                onClick={() => selectedFile && mutation.mutate(selectedFile)}
              >
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mutation.isPending ? "Importing..." : "Import"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Success result */}
            <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              <p className="text-sm text-green-800 font-medium">
                {mutation.data.imported} customer{mutation.data.imported !== 1 ? "s" : ""} imported successfully.
              </p>
            </div>

            {mutation.data.skipped > 0 && (
              <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                  {mutation.data.skipped} row{mutation.data.skipped !== 1 ? "s" : ""} skipped (duplicate phone numbers).
                </p>
              </div>
            )}

            {mutation.data.errors.length > 0 && (
              <details
                open={errorsExpanded}
                onToggle={(e) => setErrorsExpanded((e.target as HTMLDetailsElement).open)}
                className="rounded-md bg-red-50 border border-red-200"
              >
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-red-800 select-none">
                  {mutation.data.errors.length} row{mutation.data.errors.length !== 1 ? "s" : ""} had errors
                </summary>
                <ul className="px-4 pb-3 pt-1 space-y-1">
                  {mutation.data.errors.map((err, idx) => (
                    <li key={idx} className="text-xs text-red-700">
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <Button type="button" className="w-full" onClick={handleClose}>
              Close
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
