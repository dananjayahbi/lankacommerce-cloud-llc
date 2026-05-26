"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Save,
  Plus,
  Trash2,
  Package,
  GripVertical,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  CollectionProductPicker,
  type PickedProduct,
} from "@/components/webstore/admin/CollectionProductPicker";
import {
  CollectionRuleEditor,
  type CollectionRule,
} from "@/components/webstore/admin/CollectionRuleEditor";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ─── Schema ───────────────────────────────────────────────────────────────────

const collectionSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Max 200 chars"),
  handle: z
    .string()
    .min(1, "Handle is required")
    .max(200)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Lowercase letters, numbers and hyphens only",
    ),
  description: z.string().max(2000, "Max 2000 chars").optional().or(z.literal("")),
  collection_type: z.enum(["MANUAL", "AUTOMATED"]),
  is_published: z.boolean(),
  seo_title: z.string().max(100, "Max 100 chars").optional().or(z.literal("")),
  seo_description: z
    .string()
    .max(300, "Max 300 chars")
    .optional()
    .or(z.literal("")),
});

type CollectionFormValues = z.infer<typeof collectionSchema>;

interface FullCollection {
  id: string;
  title: string;
  handle: string;
  description: string;
  collection_type: "MANUAL" | "AUTOMATED";
  is_published: boolean;
  seo_title: string;
  seo_description: string;
  products: PickedProduct[];
  rules: CollectionRule[];
  disjunctive: boolean;
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Editor component ─────────────────────────────────────────────────────────

interface CollectionEditorProps {
  collectionId?: string;
}

export function CollectionEditor({ collectionId }: CollectionEditorProps) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const isNew = !collectionId;

  const [products, setProducts] = useState<PickedProduct[]>([]);
  const [rules, setRules] = useState<CollectionRule[]>([]);
  const [disjunctive, setDisjunctive] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [extraDirty, setExtraDirty] = useState(false);

  const { data: collection, isLoading } = useQuery<FullCollection | null>({
    queryKey: ["webstore-collection", collectionId],
    queryFn: async () => {
      if (!collectionId) return null;
      const res = await fetch(
        `${API_BASE}/api/webstore/collections/${collectionId}/`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) throw new Error("Failed to load collection");
      return res.json();
    },
    enabled: !!accessToken && !isNew,
  });

  const form = useForm<CollectionFormValues>({
    resolver: standardSchemaResolver(collectionSchema),
    defaultValues: {
      title: "",
      handle: "",
      description: "",
      collection_type: "MANUAL",
      is_published: false,
      seo_title: "",
      seo_description: "",
    },
  });

  useEffect(() => {
    if (collection) {
      form.reset({
        title: collection.title,
        handle: collection.handle,
        description: collection.description ?? "",
        collection_type: collection.collection_type,
        is_published: collection.is_published,
        seo_title: collection.seo_title ?? "",
        seo_description: collection.seo_description ?? "",
      });
      setProducts(collection.products ?? []);
      setRules(collection.rules ?? []);
      setDisjunctive(collection.disjunctive ?? false);
    }
  }, [collection, form]);

  // Auto-generate handle for new collections
  const titleValue = form.watch("title");
  useEffect(() => {
    if (isNew) {
      form.setValue("handle", slugify(titleValue), { shouldDirty: false });
    }
  }, [titleValue, isNew, form]);

  const collectionType = form.watch("collection_type");
  const isDirty = form.formState.isDirty || extraDirty;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const saveMutation = useMutation<FullCollection, Error, CollectionFormValues>({
    mutationFn: async (values) => {
      const body = {
        ...values,
        products: products.map((p) => p.id),
        rules,
        disjunctive,
      };
      const url = isNew
        ? `${API_BASE}/api/webstore/collections/`
        : `${API_BASE}/api/webstore/collections/${collectionId}/`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Failed to save collection");
      }
      return res.json();
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["webstore-collections"] });
      queryClient.invalidateQueries({
        queryKey: ["webstore-collection", saved.id],
      });
      form.reset({
        title: saved.title,
        handle: saved.handle,
        description: saved.description ?? "",
        collection_type: saved.collection_type,
        is_published: saved.is_published,
        seo_title: saved.seo_title ?? "",
        seo_description: saved.seo_description ?? "",
      });
      setExtraDirty(false);
      toast.success(isNew ? "Collection created" : "Collection saved");
      if (isNew) router.push(`/store/webstore/collections/${saved.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/store/webstore/collections">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            Collections
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">
            {isNew ? "Create Collection" : (collection?.title ?? "Edit Collection")}
          </h1>
        </div>
        <Button
          onClick={form.handleSubmit((v) => saveMutation.mutate(v))}
          disabled={saveMutation.isPending || !isDirty}
          className="bg-[#F97316] hover:bg-orange-600 text-white gap-2"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isNew ? "Create" : "Save"}
        </Button>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          {/* Basic info */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="font-semibold text-slate-800 text-sm">
              Collection Details
            </h2>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Summer Collection" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="handle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Handle</FormLabel>
                  <FormControl>
                    <Input placeholder="summer-collection" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe this collection…"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Collection type */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="font-semibold text-slate-800 text-sm">
              Collection Type
            </h2>
            <FormField
              control={form.control}
              name="collection_type"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-2 gap-3"
                    >
                      {[
                        {
                          value: "MANUAL",
                          label: "Manual",
                          desc: "You hand-pick the products",
                        },
                        {
                          value: "AUTOMATED",
                          label: "Automated",
                          desc: "Products match rules you define",
                        },
                      ].map(({ value, label, desc }) => (
                        <div
                          key={value}
                          className="flex items-start space-x-3 rounded-lg border border-slate-200 p-3 cursor-pointer"
                        >
                          <RadioGroupItem
                            value={value}
                            id={`ct-${value}`}
                          />
                          <Label htmlFor={`ct-${value}`} className="cursor-pointer">
                            <span className="font-medium text-slate-800">
                              {label}
                            </span>
                            <p className="text-xs text-slate-500 font-normal">
                              {desc}
                            </p>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Manual products */}
          {collectionType === "MANUAL" && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-800 text-sm">
                  Products ({products.length})
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setPickerOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Products
                </Button>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                  <Package className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">
                    No products added. Click &ldquo;Add Products&rdquo; to begin.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                      <div className="w-8 h-8 rounded bg-white border border-slate-200 shrink-0 overflow-hidden">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-3 h-3 text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {p.name}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
                          {p.sku}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProducts((prev) =>
                            prev.filter((x) => x.id !== p.id),
                          );
                          setExtraDirty(true);
                        }}
                        className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <CollectionProductPicker
                open={pickerOpen}
                selectedIds={products.map((p) => p.id)}
                onConfirm={(picked) => {
                  setProducts((prev) => {
                    const existing = new Set(prev.map((p) => p.id));
                    const newOnes = picked.filter((p) => !existing.has(p.id));
                    return [...prev, ...newOnes];
                  });
                  setExtraDirty(true);
                }}
                onClose={() => setPickerOpen(false)}
              />
            </div>
          )}

          {/* Automated rules */}
          {collectionType === "AUTOMATED" && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <h2 className="font-semibold text-slate-800 text-sm">
                Conditions
              </h2>
              <CollectionRuleEditor
                rules={rules}
                disjunctive={disjunctive}
                onChange={(r, d) => {
                  setRules(r);
                  setDisjunctive(d);
                  setExtraDirty(true);
                }}
              />
            </div>
          )}

          {/* SEO */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="font-semibold text-slate-800 text-sm">SEO</h2>
            <FormField
              control={form.control}
              name="seo_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Leave blank to use collection title"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="seo_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Leave blank to use collection description"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Visibility */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <FormField
              control={form.control}
              name="is_published"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel className="text-base">Published</FormLabel>
                    <FormDescription>
                      Published collections appear on your storefront.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    </div>
  );
}
