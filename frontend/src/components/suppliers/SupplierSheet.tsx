"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuthStore } from "@/stores/authStore";
import type { Supplier } from "@/types/crm";

const PHONE_PATTERN = /^(\+94\d{9}|07\d{8})$/;

const schema = z.object({
  name: z.string().min(1, "Supplier name is required").max(200),
  contact_name: z.string().max(200).optional(),
  phone: z
    .string()
    .min(1, "Phone is required")
    .regex(PHONE_PATTERN, "Phone number must be in +94XXXXXXXXX or 07XXXXXXXX format"),
  whatsapp_number: z.string().optional(),
  email: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  address: z.string().max(500).optional(),
  lead_time_days: z.coerce.number().int().min(1).max(365).default(7),
  notes: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  supplier?: Supplier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export function SupplierSheet({ supplier, open, onOpenChange, onSuccess }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const isEdit = !!supplier;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      name: "",
      contact_name: "",
      phone: "",
      whatsapp_number: "",
      email: "",
      address: "",
      lead_time_days: 7,
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset(
        supplier
          ? {
              name: supplier.name,
              contact_name: supplier.contact_name ?? "",
              phone: supplier.phone,
              whatsapp_number: supplier.whatsapp_number ?? "",
              email: supplier.email ?? "",
              address: supplier.address ?? "",
              lead_time_days: supplier.lead_time_days ?? 7,
              notes: supplier.notes ?? "",
            }
          : {
              name: "",
              contact_name: "",
              phone: "",
              whatsapp_number: "",
              email: "",
              address: "",
              lead_time_days: 7,
              notes: "",
            },
      );
    }
  }, [open, supplier, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const url = isEdit
        ? `${API_BASE}/api/crm/suppliers/${supplier!.id}/`
        : `${API_BASE}/api/crm/suppliers/`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to save supplier");
      return json.data;
    },
    onSuccess: () => {
      toast.success("Supplier saved.");
      void queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to save supplier");
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle className="font-inter text-lg font-bold text-[#1B2B3A]">
            {isEdit ? "Edit Supplier" : "Add Supplier"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="s-name">Supplier Name *</Label>
            <Input id="s-name" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Contact Person */}
          <div className="space-y-1">
            <Label htmlFor="s-contact">Contact Person</Label>
            <Input id="s-contact" {...register("contact_name")} />
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <Label htmlFor="s-phone">Phone *</Label>
            <Input id="s-phone" placeholder="+94XXXXXXXXX or 07XXXXXXXX" {...register("phone")} />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
          </div>

          {/* WhatsApp */}
          <div className="space-y-1">
            <Label htmlFor="s-wa">WhatsApp Number</Label>
            <Input id="s-wa" placeholder="Leave blank to use Phone" {...register("whatsapp_number")} />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="s-email">Email</Label>
            <Input id="s-email" type="email" {...register("email")} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          {/* Address */}
          <div className="space-y-1">
            <Label htmlFor="s-address">Address</Label>
            <Textarea id="s-address" rows={2} {...register("address")} />
          </div>

          {/* Lead Time */}
          <div className="space-y-1">
            <Label htmlFor="s-lead">Lead Time (days)</Label>
            <Input id="s-lead" type="number" min={1} max={365} {...register("lead_time_days")} />
            {errors.lead_time_days && <p className="text-xs text-red-500">{errors.lead_time_days.message}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="s-notes">Notes</Label>
            <Textarea id="s-notes" rows={2} {...register("notes")} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 bg-[#F97316] hover:bg-[#ea6c0a] text-white"
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Add Supplier"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
