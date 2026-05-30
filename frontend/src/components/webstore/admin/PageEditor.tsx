"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { z } from "zod/v4";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/webstore/admin/RichTextEditor";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ─── Schema ───────────────────────────────────────────────────────────────────

const pageSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Max 200 chars"),
  handle: z
    .string()
    .min(1, "Handle is required")
    .max(200)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Lowercase letters, numbers and hyphens only",
    ),
  body_html: z.string().optional().or(z.literal("")),
  is_published: z.boolean(),
  seo_title: z.string().max(100, "Max 100 chars").optional().or(z.literal("")),
  seo_description: z
    .string()
    .max(300, "Max 300 chars")
    .optional()
    .or(z.literal("")),
});

type PageFormValues = z.infer<typeof pageSchema>;

interface FullPage {
  id: string;
  title: string;
  handle: string;
  body_html: string;
  is_published: boolean;
  seo_title: string;
  seo_description: string;
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

interface PageEditorProps {
  pageId?: string;
}

export function PageEditor({ pageId }: PageEditorProps) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const isNew = !pageId;

  const { data: page, isLoading } = useQuery<FullPage | null>({
    queryKey: ["webstore-page", pageId],
    queryFn: async () => {
      if (!pageId) return null;
      const res = await fetch(`${API_BASE}/api/webstore/pages/${pageId}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to load page");
      return res.json();
    },
    enabled: !!accessToken && !isNew,
  });

  const form = useForm<PageFormValues>({
    resolver: standardSchemaResolver(pageSchema),
    defaultValues: {
      title: "",
      handle: "",
      body_html: "",
      is_published: false,
      seo_title: "",
      seo_description: "",
    },
  });

  useEffect(() => {
    if (page) {
      form.reset({
        title: page.title,
        handle: page.handle,
        body_html: page.body_html ?? "",
        is_published: page.is_published,
        seo_title: page.seo_title ?? "",
        seo_description: page.seo_description ?? "",
      });
    }
  }, [page, form]);

  // Auto-generate handle for new pages
  const titleValue = form.watch("title");
  useEffect(() => {
    if (isNew) {
      form.setValue("handle", slugify(titleValue), { shouldDirty: false });
    }
  }, [titleValue, isNew, form]);

  const isDirty = form.formState.isDirty;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const saveMutation = useMutation<FullPage, Error, PageFormValues>({
    mutationFn: async (values) => {
      const url = isNew
        ? `${API_BASE}/api/webstore/pages/`
        : `${API_BASE}/api/webstore/pages/${pageId}/`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Failed to save page");
      }
      return res.json();
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["webstore-pages"] });
      queryClient.invalidateQueries({ queryKey: ["webstore-page", saved.id] });
      form.reset({
        title: saved.title,
        handle: saved.handle,
        body_html: saved.body_html ?? "",
        is_published: saved.is_published,
        seo_title: saved.seo_title ?? "",
        seo_description: saved.seo_description ?? "",
      });
      toast.success(isNew ? "Page created" : "Page saved");
      if (isNew) router.push(`/store/webstore/pages/${saved.id}`);
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
        <Link href="/store/webstore/pages">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            Pages
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">
            {isNew ? "Create Page" : (page?.title ?? "Edit Page")}
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

      <FormProvider {...form}>
        <form className="space-y-6">
          {/* Title + Handle */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Page Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. About Us" {...field} />
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
                    <Input placeholder="about-us" {...field} />
                  </FormControl>
                  <FormDescription>
                    This determines the URL:{" "}
                    <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                      /pages/{form.watch("handle") || "…"}
                    </code>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Content */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="font-semibold text-slate-800 text-sm">Content</h2>
            <Controller
              control={form.control}
              name="body_html"
              render={({ field }) => (
                <RichTextEditor
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          {/* SEO */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="font-semibold text-slate-800 text-sm">
              Search Engine Optimisation
            </h2>
            <FormField
              control={form.control}
              name="seo_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Leave blank to use the page title"
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
                  <FormLabel>Meta Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Leave blank to use the page content"
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
                      Published pages are visible on your storefront.
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
      </FormProvider>
    </div>
  );
}
