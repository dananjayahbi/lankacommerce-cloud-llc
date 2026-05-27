"use client";

/**
 * ThemeForm — used by both /themes/new and /themes/[id] pages.
 *
 * Props:
 *   initialData  — pre-populated on edit; undefined on create
 *   onSubmit     — called with the serialized form payload
 *   isPending    — disables the submit button while saving
 *   blocks       — list of available block types (fetched from admin API)
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JsonEditor } from "./JsonEditor";

const CATEGORIES = [
  "GENERAL",
  "FASHION",
  "FOOD",
  "ELECTRONICS",
  "BEAUTY",
  "FURNITURE",
  "JEWELLERY",
] as const;

const EMPTY_DEFAULT_CONFIG = JSON.stringify(
  {
    global_settings: {
      colors: {
        primary: "#F97316",
        secondary: "#1B2B3A",
        background: "#FFFFFF",
        text: "#111827",
        accent: "#F59E0B",
      },
      typography: {
        heading_font: "Inter",
        body_font: "Inter",
        heading_size_scale: 1,
      },
      layout: { max_content_width: "1280px", enable_sticky_header: true },
      social: { facebook: "", instagram: "", tiktok: "", youtube: "" },
    },
    layout: {
      header: {
        type: "header",
        settings: {},
        blocks: {},
        block_order: [],
      },
      footer: {
        type: "footer",
        settings: {},
        blocks: {},
        block_order: [],
      },
    },
    templates: {
      index: {
        sections: {},
        order: [],
      },
    },
  },
  null,
  2,
);

const EMPTY_SCHEMA = JSON.stringify(
  [
    {
      id: "example_setting",
      type: "color",
      label: "Example Color Setting",
      default: "#F97316",
    },
  ],
  null,
  2,
);

export interface ThemeFormData {
  name: string;
  slug: string;
  category: string;
  description: string;
  is_free: boolean;
  price: string;
  preview_image_url: string;
  preview_images: string; // JSON string
  supported_sections: string[]; // block type strings
  global_settings_schema: string; // JSON string
  default_config: string; // JSON string
}

interface BlockOption {
  id: string;
  type: string;
  name: string;
}

interface ThemeFormProps {
  initialData?: Partial<ThemeFormData> & { is_published?: boolean; version_number?: number };
  onSubmit: (payload: Record<string, unknown>) => void;
  isPending: boolean;
  blocks: BlockOption[];
  isEdit?: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getErrors(data: ThemeFormData): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!data.name.trim()) errs.name = "Name is required.";
  if (!data.slug.trim()) errs.slug = "Slug is required.";
  if (!data.category) errs.category = "Category is required.";
  if (!data.is_free) {
    const priceVal = parseFloat(data.price);
    if (isNaN(priceVal) || priceVal <= 0)
      errs.price = "Price must be greater than 0 for paid themes.";
  }
  try {
    JSON.parse(data.default_config);
  } catch {
    errs.default_config = "default_config must be valid JSON.";
  }
  try {
    if (data.global_settings_schema) JSON.parse(data.global_settings_schema);
  } catch {
    errs.global_settings_schema = "global_settings_schema must be valid JSON.";
  }
  try {
    if (data.preview_images) JSON.parse(data.preview_images);
  } catch {
    errs.preview_images = "preview_images must be a valid JSON array.";
  }
  return errs;
}

export default function ThemeForm({
  initialData,
  onSubmit,
  isPending,
  blocks,
  isEdit = false,
}: ThemeFormProps) {
  const [form, setForm] = useState<ThemeFormData>({
    name: initialData?.name ?? "",
    slug: initialData?.slug ?? "",
    category: initialData?.category ?? "GENERAL",
    description: initialData?.description ?? "",
    is_free: initialData?.is_free ?? true,
    price: initialData?.price ?? "0",
    preview_image_url: initialData?.preview_image_url ?? "",
    preview_images: initialData?.preview_images
      ? typeof initialData.preview_images === "string"
        ? initialData.preview_images
        : JSON.stringify(initialData.preview_images, null, 2)
      : "[]",
    supported_sections: initialData?.supported_sections ?? [],
    global_settings_schema: initialData?.global_settings_schema
      ? typeof initialData.global_settings_schema === "string"
        ? initialData.global_settings_schema
        : JSON.stringify(initialData.global_settings_schema, null, 2)
      : EMPTY_SCHEMA,
    default_config: initialData?.default_config
      ? typeof initialData.default_config === "string"
        ? initialData.default_config
        : JSON.stringify(initialData.default_config, null, 2)
      : EMPTY_DEFAULT_CONFIG,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoSlug, setAutoSlug] = useState(!isEdit);

  function set(field: keyof ThemeFormData, val: unknown) {
    setForm((prev) => ({ ...prev, [field]: val }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  }

  function handleNameChange(val: string) {
    set("name", val);
    if (autoSlug) set("slug", slugify(val));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = getErrors(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    let parsedDefaultConfig: unknown;
    let parsedSchema: unknown;
    let parsedPreviewImages: unknown;
    try {
      parsedDefaultConfig = JSON.parse(form.default_config);
      parsedSchema = form.global_settings_schema ? JSON.parse(form.global_settings_schema) : [];
      parsedPreviewImages = form.preview_images ? JSON.parse(form.preview_images) : [];
    } catch {
      toast.error("JSON parse error – please validate your JSON fields.");
      return;
    }

    onSubmit({
      name: form.name.trim(),
      slug: form.slug.trim(),
      category: form.category,
      description: form.description.trim(),
      is_free: form.is_free,
      price: form.is_free ? "0.00" : form.price,
      preview_image_url: form.preview_image_url.trim(),
      preview_images: parsedPreviewImages,
      supported_sections: form.supported_sections,
      global_settings_schema: parsedSchema,
      default_config: parsedDefaultConfig,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section 1: Basic Info */}
      <Section title="Basic Info">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Theme Name" error={errors.name} required>
            <Input
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Awesome Theme"
            />
          </Field>
          <Field label="Slug" error={errors.slug} required hint="Auto-generated from name. Must be lowercase with hyphens.">
            <Input
              value={form.slug}
              onChange={(e) => {
                setAutoSlug(false);
                set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"));
              }}
              placeholder="my-awesome-theme"
              className="font-mono"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category" error={errors.category} required>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0) + cat.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Description">
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Short description of this theme..."
            rows={3}
          />
        </Field>
      </Section>

      {/* Section 2: Pricing */}
      <Section title="Pricing">
        <div className="flex items-center gap-3">
          <Checkbox
            id="is_free"
            checked={form.is_free}
            onCheckedChange={(v) => set("is_free", !!v)}
          />
          <Label htmlFor="is_free" className="cursor-pointer">Free theme</Label>
        </div>
        {!form.is_free && (
          <Field label="Price (LKR)" error={errors.price} required>
            <Input
              type="number"
              min="1"
              step="0.01"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="999.00"
            />
          </Field>
        )}
      </Section>

      {/* Section 3: Preview Images */}
      <Section title="Preview Images">
        <Field label="Primary Preview Image URL">
          <Input
            type="url"
            value={form.preview_image_url}
            onChange={(e) => set("preview_image_url", e.target.value)}
            placeholder="https://cdn.example.com/theme-preview.jpg"
          />
        </Field>
        <JsonEditor
          label="Additional Preview Images (JSON array of {url, label} objects)"
          value={form.preview_images}
          onChange={(v) => set("preview_images", v)}
          error={errors.preview_images}
          rows={5}
          placeholder='[{"url": "https://...", "label": "Homepage view"}]'
        />
      </Section>

      {/* Section 4: Supported Sections */}
      <Section title="Supported Sections (Block Types)">
        {blocks.length === 0 ? (
          <p className="text-sm text-slate-400">No block definitions found. Create blocks first.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {blocks.map((block) => (
              <label
                key={block.type}
                className="flex items-center gap-2 cursor-pointer text-sm"
              >
                <Checkbox
                  checked={form.supported_sections.includes(block.type)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...form.supported_sections, block.type]
                      : form.supported_sections.filter((t) => t !== block.type);
                    set("supported_sections", next);
                  }}
                />
                <span>
                  <span className="font-medium">{block.name}</span>
                  <span className="text-xs text-slate-400 font-mono ml-1">({block.type})</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </Section>

      {/* Section 5: Global Settings Schema */}
      <Section title="Global Settings Schema">
        <JsonEditor
          label="global_settings_schema (JSON array of setting definitions)"
          value={form.global_settings_schema}
          onChange={(v) => set("global_settings_schema", v)}
          error={errors.global_settings_schema}
          rows={10}
        />
      </Section>

      {/* Section 6: Default Config */}
      <Section title="Default Config">
        {isEdit && (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Changing <code className="font-mono">default_config</code> on a published theme will
              increment the version number and may affect existing installations.
              Tenants keep their current configs; the configMerger fills in missing settings.
            </span>
          </div>
        )}
        <JsonEditor
          label="default_config (must have global_settings, layout, and templates keys)"
          value={form.default_config}
          onChange={(v) => set("default_config", v)}
          error={errors.default_config}
          rows={18}
        />
      </Section>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          className="bg-[#F97316] hover:bg-orange-600 text-white"
          disabled={isPending}
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? "Save Changes" : "Create Theme"}
        </Button>
      </div>
    </form>
  );
}

// ─── Shared field wrappers ─────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-6 space-y-4">
      <h2 className="text-base font-semibold text-slate-800 border-b pb-2">{title}</h2>
      {children}
    </div>
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
