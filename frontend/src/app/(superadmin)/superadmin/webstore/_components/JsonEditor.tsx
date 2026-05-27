"use client";

/**
 * JsonEditor — lightweight JSON textarea with validate button.
 * Used by the SuperAdmin theme and block forms to edit default_config,
 * global_settings_schema, and block schema fields.
 */

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface JsonEditorProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string | undefined;
  rows?: number | undefined;
  error?: string | undefined;
  hint?: string | undefined;
}

export function JsonEditor({
  label,
  value,
  onChange,
  placeholder,
  rows = 12,
  error,
  hint,
}: JsonEditorProps) {
  const [validationMsg, setValidationMsg] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  function validate() {
    try {
      JSON.parse(value);
      setValidationMsg({ ok: true, msg: "Valid JSON ✓" });
    } catch (e: unknown) {
      setValidationMsg({
        ok: false,
        msg: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-slate-500 hover:text-slate-800"
          onClick={validate}
        >
          Validate JSON
        </Button>
      </div>

      <textarea
        className={cn(
          "w-full rounded-md border bg-slate-950 text-slate-100 p-3 text-xs font-mono",
          "focus:outline-none focus:ring-2 focus:ring-[#F97316] resize-y",
          error ? "border-red-500" : "border-slate-700",
        )}
        rows={rows}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setValidationMsg(null);
        }}
        placeholder={placeholder}
        spellCheck={false}
      />

      {validationMsg && (
        <div
          className={cn(
            "flex items-center gap-1.5 text-xs",
            validationMsg.ok ? "text-emerald-600" : "text-red-600",
          )}
        >
          {validationMsg.ok ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <XCircle className="w-3.5 h-3.5" />
          )}
          {validationMsg.msg}
        </div>
      )}

      {error && !validationMsg && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      {hint && !error && !validationMsg && (
        <p className="text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}
