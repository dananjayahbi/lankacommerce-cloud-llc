"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { MenuItemTree, type MenuItem } from "@/components/webstore/admin/MenuItemTree";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const menuSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Max 100 characters"),
  handle: z
    .string()
    .min(1, "Handle is required")
    .max(100, "Max 100 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Handle can only contain lowercase letters, numbers, and hyphens",
    ),
});

type MenuFormValues = z.infer<typeof menuSchema>;

interface FullMenu {
  id: string;
  title: string;
  handle: string;
  items: MenuItem[];
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface MenuEditorProps {
  menuId?: string; // undefined = new menu
}

export function MenuEditor({ menuId }: MenuEditorProps) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [itemsDirty, setItemsDirty] = useState(false);

  const isNew = !menuId;

  const { data: menu, isLoading } = useQuery<FullMenu | null>({
    queryKey: ["webstore-menu", menuId],
    queryFn: async () => {
      if (!menuId) return null;
      const res = await fetch(`${API_BASE}/api/webstore/menus/${menuId}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to load menu");
      return res.json();
    },
    enabled: !!accessToken && !isNew,
  });

  const form = useForm<MenuFormValues>({
    resolver: standardSchemaResolver(menuSchema),
    defaultValues: { title: "", handle: "" },
  });

  // Populate form once menu is loaded
  useEffect(() => {
    if (menu) {
      form.reset({ title: menu.title, handle: menu.handle });
      setMenuItems(menu.items ?? []);
    }
  }, [menu, form]);

  // Auto-generate handle from title for new menus
  const titleValue = form.watch("title");
  useEffect(() => {
    if (isNew) {
      form.setValue("handle", slugify(titleValue), { shouldDirty: false });
    }
  }, [titleValue, isNew, form]);

  const isDirty = form.formState.isDirty || itemsDirty;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const saveMutation = useMutation<FullMenu, Error, MenuFormValues>({
    mutationFn: async (values) => {
      const body = { ...values, items: menuItems };
      const url = isNew
        ? `${API_BASE}/api/webstore/menus/`
        : `${API_BASE}/api/webstore/menus/${menuId}/`;
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
        throw new Error(err.detail ?? "Failed to save menu");
      }
      return res.json();
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["webstore-menus"] });
      queryClient.invalidateQueries({ queryKey: ["webstore-menu", saved.id] });
      form.reset({ title: saved.title, handle: saved.handle });
      setMenuItems(saved.items ?? []);
      setItemsDirty(false);
      toast.success(isNew ? "Menu created" : "Menu saved");
      if (isNew) router.push(`/store/webstore/menus/${saved.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  function handleItemsChange(items: MenuItem[]) {
    setMenuItems(items);
    setItemsDirty(true);
  }

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/store/webstore/menus">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            Menus
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">
            {isNew ? "Create Menu" : (menu?.title ?? "Edit Menu")}
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
          {isNew ? "Create Menu" : "Save Changes"}
        </Button>
      </div>

      {/* Meta form */}
      <Form {...form}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 p-5 rounded-xl border border-slate-200 bg-white">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Menu Title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Main Navigation" {...field} />
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
                  <Input placeholder="main-navigation" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>

      {/* Tree editor */}
      <div className="mb-2">
        <h2 className="font-semibold text-slate-700 mb-4">Menu Items</h2>
        <p className="text-xs text-slate-400 mb-4">
          Drag items to reorder. Items support one level of nesting (sub-menus).
        </p>
        <MenuItemTree items={menuItems} onChange={handleItemsChange} />
      </div>
    </div>
  );
}
