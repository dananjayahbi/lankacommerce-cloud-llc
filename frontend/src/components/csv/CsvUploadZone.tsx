"use client";

import { useState, useRef } from "react";
import { UploadCloudIcon } from "lucide-react";
import Papa from "papaparse";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
  rowCount: number;
}

interface CsvUploadZoneProps {
  onParsed: (result: ParseResult) => void;
}

export function CsvUploadZone({ onParsed }: CsvUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState<ParseResult | null>(null);

  const validateFile = (file: File): string | null => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      return "Only .csv files are accepted.";
    }
    if (file.size > 5 * 1024 * 1024) {
      return "File is too large. Maximum size is 5 MB.";
    }
    return null;
  };

  const parseFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setIsParsing(true);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        const rows = results.data;
        const result: ParseResult = {
          headers,
          rows,
          fileName: file.name,
          rowCount: rows.length,
        };
        setParsed(result);
        onParsed(result);
        setIsParsing(false);
      },
      error: () => {
        setError("Failed to parse CSV file. Please check the file format.");
        setIsParsing(false);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  if (isParsing) {
    return (
      <div className="space-y-2 rounded-lg border-2 border-dashed border-border p-8">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
          isDragOver
            ? "border-[var(--color-orange)] bg-orange-50"
            : "border-border bg-background hover:border-[var(--color-navy)]/50",
        )}
        onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <UploadCloudIcon
          className={cn("h-10 w-10 mb-2", isDragOver ? "text-[var(--color-orange)]" : "text-muted-foreground")}
        />
        <p className="text-sm font-medium text-[var(--color-navy)]">
          Drag your CSV file here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground mt-1">Supports .csv files up to 5 MB</p>
      </div>

      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {parsed && (
        <div className="rounded-lg border border-border bg-surface p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-navy)]">{parsed.fileName}</span>
            <span className="text-xs text-muted-foreground">{parsed.rowCount} rows</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {parsed.headers.map((h) => (
              <span key={h} className="rounded-full border border-border px-2 py-0.5 text-xs">
                {h}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
