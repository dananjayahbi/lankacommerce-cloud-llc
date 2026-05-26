"use client";

import { useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { Loader2, Globe, Lock, Settings2, ShoppingCart } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const generalSchema = z.object({
  seo_title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Max 100 characters"),
  seo_description: z.string().max(300, "Max 300 characters").optional().or(z.literal("")),
  is_enabled: z.boolean(),
});

const domainSchema = z.object({
  storefront_domain: z
    .string()
    .max(253, "Domain too long")
    .regex(
      /^$|^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/,
      "Enter a valid domain (e.g. shop.mystore.com) or leave blank",
    )
    .optional()
    .or(z.literal("")),
});

const passwordSchema = z
  .object({
    password_protected: z.boolean(),
    store_password: z.string().optional().or(z.literal("")),
    store_password_confirm: z.string().optional().or(z.literal("")),
  })
  .refine(
    (d) => {
      if (d.password_protected && d.store_password) {
        return d.store_password === d.store_password_confirm;
      }
      return true;
    },
    { message: "Passwords do not match", path: ["store_password_confirm"] },
  )
  .refine(
    (d) => {
      if (d.password_protected) {
        return (d.store_password?.length ?? 0) >= 4;
      }
      return true;
    },
    { message: "Password must be at least 4 characters", path: ["store_password"] },
  );

const checkoutSchema = z.object({
  customer_accounts: z.enum(["DISABLED", "OPTIONAL", "REQUIRED"]),
  require_login_for_cart: z.boolean(),
  allow_order_notes: z.boolean(),
  show_shipping_calculator: z.boolean(),
});

type GeneralValues = z.infer<typeof generalSchema>;
type DomainValues = z.infer<typeof domainSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;
type CheckoutValues = z.infer<typeof checkoutSchema>;

interface WebstoreConfig {
  seo_title: string;
  seo_description: string;
  is_enabled: boolean;
  storefront_domain: string | null;
  custom_domain_verified: boolean;
  slug: string;
  password_protected: boolean;
  customer_accounts: "DISABLED" | "OPTIONAL" | "REQUIRED";
  require_login_for_cart: boolean;
  allow_order_notes: boolean;
  show_shipping_calculator: boolean;
}

// ─── Sub-forms ────────────────────────────────────────────────────────────────

function GeneralForm({ config }: { config: WebstoreConfig }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const form = useForm<GeneralValues>({
    resolver: standardSchemaResolver(generalSchema),
    defaultValues: {
      seo_title: config.seo_title,
      seo_description: config.seo_description ?? "",
      is_enabled: config.is_enabled,
    },
  });

  const isDirty = form.formState.isDirty;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const mutation = useMutation<void, Error, GeneralValues>({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/api/webstore/config/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Failed to save settings");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webstore-config"] });
      form.reset(form.getValues());
      toast.success("General settings saved");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        className="space-y-5"
      >
        <FormField
          control={form.control}
          name="seo_title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Webstore Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. My Fashion Store" {...field} />
              </FormControl>
              <FormDescription>
                Shown in browser tabs and search engine results.
              </FormDescription>
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
                  placeholder="A short description of your store…"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Appears in search engine results and social sharing previews.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="is_enabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
              <div>
                <FormLabel className="text-base">Webstore Status</FormLabel>
                <FormDescription>
                  When disabled, visitors see a coming-soon page.
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
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={mutation.isPending || !isDirty}
            className="bg-[#F97316] hover:bg-orange-600 text-white"
          >
            {mutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Save General Settings
          </Button>
        </div>
      </form>
    </Form>
  );
}

function DomainForm({ config }: { config: WebstoreConfig }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const form = useForm<DomainValues>({
    resolver: standardSchemaResolver(domainSchema),
    defaultValues: {
      storefront_domain: config.storefront_domain ?? "",
    },
  });

  const isDirty = form.formState.isDirty;

  const mutation = useMutation<void, Error, DomainValues>({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/api/webstore/config/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          storefront_domain: data.storefront_domain || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Failed to save domain settings");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webstore-config"] });
      form.reset(form.getValues());
      toast.success("Domain settings saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const autoUrl = `https://${config.slug}.lankacommerce.com/`;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        className="space-y-5"
      >
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">
            Auto-generated URL
          </p>
          <a
            href={autoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#F97316] hover:underline font-mono"
          >
            {autoUrl}
          </a>
        </div>

        <FormField
          control={form.control}
          name="storefront_domain"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Custom Domain</FormLabel>
              <FormControl>
                <Input
                  placeholder="shop.yourdomain.com"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Point your CNAME record to{" "}
                <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                  storefront.lankacommerce.com
                </code>{" "}
                then enter your domain here.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {config.storefront_domain && (
          <div
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
              config.custom_domain_verified
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                config.custom_domain_verified ? "bg-green-500" : "bg-amber-400"
              }`}
            />
            {config.custom_domain_verified
              ? "Domain verified"
              : "Domain not yet verified — DNS changes can take up to 48 hours"}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={mutation.isPending || !isDirty}
            className="bg-[#F97316] hover:bg-orange-600 text-white"
          >
            {mutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Save Domain Settings
          </Button>
        </div>
      </form>
    </Form>
  );
}

function PasswordForm({ config }: { config: WebstoreConfig }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const form = useForm<PasswordValues>({
    resolver: standardSchemaResolver(passwordSchema),
    defaultValues: {
      password_protected: config.password_protected,
      store_password: "",
      store_password_confirm: "",
    },
  });

  const isDirty = form.formState.isDirty;
  const isProtected = form.watch("password_protected");

  const mutation = useMutation<void, Error, PasswordValues>({
    mutationFn: async (data) => {
      const payload: Record<string, unknown> = {
        password_protected: data.password_protected,
      };
      if (data.password_protected && data.store_password) {
        payload.store_password = data.store_password;
      }
      const res = await fetch(`${API_BASE}/api/webstore/config/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Failed to save password settings");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webstore-config"] });
      form.reset({
        password_protected: form.getValues("password_protected"),
        store_password: "",
        store_password_confirm: "",
      });
      toast.success("Password settings saved");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        className="space-y-5"
      >
        <FormField
          control={form.control}
          name="password_protected"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
              <div>
                <FormLabel className="text-base">
                  Password-protect my store
                </FormLabel>
                <FormDescription>
                  Visitors must enter a password before viewing your store.
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

        {isProtected && (
          <>
            <FormField
              control={form.control}
              name="store_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="store_password_confirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={mutation.isPending || !isDirty}
            className="bg-[#F97316] hover:bg-orange-600 text-white"
          >
            {mutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Save Password Settings
          </Button>
        </div>
      </form>
    </Form>
  );
}

function CheckoutForm({ config }: { config: WebstoreConfig }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const form = useForm<CheckoutValues>({
    resolver: standardSchemaResolver(checkoutSchema),
    defaultValues: {
      customer_accounts: config.customer_accounts,
      require_login_for_cart: config.require_login_for_cart,
      allow_order_notes: config.allow_order_notes,
      show_shipping_calculator: config.show_shipping_calculator,
    },
  });

  const isDirty = form.formState.isDirty;

  const mutation = useMutation<void, Error, CheckoutValues>({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/api/webstore/config/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Failed to save checkout settings");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webstore-config"] });
      form.reset(form.getValues());
      toast.success("Checkout settings saved");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        className="space-y-5"
      >
        <FormField
          control={form.control}
          name="customer_accounts"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer Accounts</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="space-y-2 mt-1"
                >
                  {[
                    {
                      value: "DISABLED",
                      label: "Disabled",
                      desc: "Customers check out as guests",
                    },
                    {
                      value: "OPTIONAL",
                      label: "Optional",
                      desc: "Customers can create accounts but it isn't required",
                    },
                    {
                      value: "REQUIRED",
                      label: "Required",
                      desc: "Customers must log in to complete checkout",
                    },
                  ].map(({ value, label, desc }) => (
                    <div
                      key={value}
                      className="flex items-start space-x-3 rounded-lg border border-slate-200 p-3"
                    >
                      <RadioGroupItem value={value} id={`ca-${value}`} />
                      <Label
                        htmlFor={`ca-${value}`}
                        className="cursor-pointer"
                      >
                        <span className="font-medium text-slate-800">
                          {label}
                        </span>
                        <p className="text-xs text-slate-500 font-normal mt-0.5">
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

        {(
          [
            {
              name: "require_login_for_cart" as const,
              label: "Require login to add to cart",
              desc: "Customers must be logged in before adding items.",
            },
            {
              name: "allow_order_notes" as const,
              label: "Allow order notes",
              desc: "Customers can add a note to their order at checkout.",
            },
            {
              name: "show_shipping_calculator" as const,
              label: "Show shipping calculator in cart",
              desc: "Displays estimated shipping costs in the cart page.",
            },
          ] satisfies { name: keyof CheckoutValues; label: string; desc: string }[]
        ).map(({ name, label, desc }) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                <div>
                  <FormLabel className="text-base">{label}</FormLabel>
                  <FormDescription>{desc}</FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value as boolean}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        ))}

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={mutation.isPending || !isDirty}
            className="bg-[#F97316] hover:bg-orange-600 text-white"
          >
            {mutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Save Checkout Settings
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WebstoreSettingsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data: config, isLoading } = useQuery<WebstoreConfig>({
    queryKey: ["webstore-config"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/webstore/config/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to load config");
      return res.json();
    },
    enabled: !!accessToken,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-500">
          No webstore found. Please complete the setup first.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Webstore Settings</h1>
        <p className="text-slate-500 text-sm mt-1">
          Configure your storefront behaviour and appearance
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-6 grid w-full grid-cols-4">
          <TabsTrigger value="general" className="gap-1.5 text-xs sm:text-sm">
            <Settings2 className="w-3.5 h-3.5" />
            General
          </TabsTrigger>
          <TabsTrigger value="domain" className="gap-1.5 text-xs sm:text-sm">
            <Globe className="w-3.5 h-3.5" />
            Domain
          </TabsTrigger>
          <TabsTrigger value="password" className="gap-1.5 text-xs sm:text-sm">
            <Lock className="w-3.5 h-3.5" />
            Password
          </TabsTrigger>
          <TabsTrigger value="checkout" className="gap-1.5 text-xs sm:text-sm">
            <ShoppingCart className="w-3.5 h-3.5" />
            Checkout
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralForm config={config} />
        </TabsContent>
        <TabsContent value="domain">
          <DomainForm config={config} />
        </TabsContent>
        <TabsContent value="password">
          <PasswordForm config={config} />
        </TabsContent>
        <TabsContent value="checkout">
          <CheckoutForm config={config} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
