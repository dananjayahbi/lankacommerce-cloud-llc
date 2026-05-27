"use client";

/**
 * BlockForm — used by both /blocks/new and /blocks/[id] pages.
 */

import { useState } from "react";
import { AlertTriangle, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { JsonEditor } from "./JsonEditor";
import { cn } from "@/lib/utils";

// 17 supported setting types
const SETTING_TYPES = [
  "text", "textarea", "richtext", "number", "range", "checkbox",
  "select", "radio", "color", "image_picker", "url", "video_url",
  "font_picker", "collection", "product", "blog", "page",
] as const;

// Default templates for each type
function newSetting(type: string) {
  const base = { id: `setting_${Date.now()}`, type, label: "New Setting" };
  if (type === "select" || type === "radio")
    return { ...base, options: [{ value: "option1", label: "Option 1" }] };
  if (type === "range")
    return { ...base, min: 0, max: 100, step: 1, default: 50 };
  if (type === "color") return { ...base, default: "#F97316" };
  return base;
}

const EMPTY_SCHEMA = "[]";

interface BlockFormData {
  type: string;
  name: string;
  description: string;
  react_component_key: string;
  schema: string;
  is_premium: boolean;
}

interface BlockFormProps {
  initialData?: Partial<BlockFormData> & { is_published?: boolean };
  onSubmit: (payload: Record<string, unknown>) => void;
  isPending: boolean;
  isEdit?: boolean;
}

function getErrors(data: BlockFormData): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!data.type.trim()) errs.type = "Block type is required.";
  if (!data.name.trim()) errs.name = "Block name is required.";
  if (!data.react_component_key.trim())
    errs.react_component_key = "Component key is required.";
  try {
    const parsed = JSON.parse(data.schema);
    if (!Array.isArray(parsed)) errs.schema = "schema must be a JSON array.";
  } catch {
    errs.schema = "schema must be valid JSON.";
  }
  return errs;
}

export default function BlockForm({
  initialData,
  onSubmit,
  isPending,
  isEdit = false,
}: BlockFormProps) {
  const [form, setForm] = useState<BlockFormData>({
    type: initialData?.type ?? "",
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    react_component_key: initialData?.react_component_key ?? "",
    schema: initialData?.schema
      ? typeof initialData.schema === "string"
        ? initialData.schema
        : JSON.stringify(initialData.schema, null, 2)
      : EMPTY_SCHEMA,
    is_premium: initialData?.is_premium ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(field: keyof BlockFormData, val: unknown) {
    setForm((prev) => ({ ...prev, [field]: val }));
    setErrors((prev) => { const n = { ...prev }; delete n[field as string]; return n; });
  }

  function appendSettingTemplate(type: string) {
    try {
      const current = JSON.parse(form.schema || "[]");
      current.push(newSetting(type));
      set("schema", JSON.stringify(current, null, 2));
    } catch {
      // schema is invalid JSON — append a text setting anyway
      set("schema", JSON.stringify([newSetting(type)], null, 2));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = getErrors(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    let parsedSchema: unknown;
    try { parsedSchema = JSON.parse(form.schema); } catch { return; }

    onSubmit({
      type: form.type.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      react_component_key: form.react_component_key.trim(),
      schema: parsedSchema,
      is_premium: form.is_premium,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Info */}
      <div className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-800 border-b pb-2">Block Identity</h2>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Block Type" error={errors.type} required hint={isEdit ? undefined : "Must match the key in the frontend BLOCK_REGISTRY"}>
            <Input
              value={form.type}
              onChange={(e) => set("type", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
              placeholder="hero_banner"
              className="font-mono"
              disabled={isEdit}
            />
          </Field>
          <Field label="Display Name" error={errors.name} required>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Hero Banner"
            />
          </Field>
        </div>

        <Field label="React Component Key" error={errors.react_component_key} required
          hint='The exact key registered in the frontend BLOCK_REGISTRY, e.g. "HeroBanner"'>
          <Input
            value={form.react_component_key}
            onChange={(e) => set("react_component_key", e.target.value)}
            placeholder="HeroBanner"
            className="font-mono"
          />
        </Field>

        <Field label="Description">
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Brief description of what this block does..."
            rows={2}
          />
        </Field>

        <div className="flex items-center gap-2">
          <Checkbox
            id="is_premium"
            checked={form.is_premium}
            onCheckedChange={(v) => set("is_premium", !!v)}
          />
          <Label htmlFor="is_premium" className="cursor-pointer">Premium block</Label>
        </div>

        {!isEdit && (
          <div className="flex items-start gap-2 rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
            <span>
              The <strong>type</strong> and <strong>React Component Key</strong> must exactly match
              what is registered in the frontend <code className="font-mono text-xs">BLOCK_REGISTRY</code>.
              Mismatches will cause the block to render as a placeholder in the customizer.
            </span>
          </div>
        )}
      </div>

      {/* Schema editor */}
      <div className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-800 border-b pb-2">Block Schema</h2>

        {/* Quick-add setting buttons */}
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            Quick-add a setting template to the schema:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SETTING_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => appendSettingTemplate(type)}
                className="h-6 px-2 rounded text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono transition-colors"
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <JsonEditor
          label="schema (JSON array of setting definition objects)"
          value={form.schema}
          onChange={(v) => set("schema", v)}
          error={errors.schema}
          rows={16}
          placeholder="[]"
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          className="bg-[#F97316] hover:bg-orange-600 text-white"
          disabled={isPending}
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? "Save Changes" : "Create Block"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  error,
  hint,
  required,
}: {
  label: string;
  children: React.ReactNode;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
