"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod/v4";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/authStore";
import type { Customer } from "@/types/crm";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  birthday: z.string().optional(),
  tags_raw: z.string().optional(), // comma-separated
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerSheetProps {
  customer?: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function tagsToRaw(tags: string[]): string {
  return tags.join(", ");
}

function rawToTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function CustomerSheet({ customer, open, onOpenChange, onSuccess }: CustomerSheetProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isEdit = customer !== undefined;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: standardSchemaResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      tags_raw: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (customer) {
        reset({
          name: customer.name,
          phone: customer.phone,
          email: customer.email ?? "",
          ...(customer.gender !== null ? { gender: customer.gender } : {}),
          birthday: customer.birthday ?? "",
          tags_raw: tagsToRaw(customer.tags),
          notes: customer.notes,
        });
      } else {
        reset({
          name: "",
          phone: "",
          email: "",
          tags_raw: "",
          notes: "",
        });
      }
    }
  }, [open, customer, reset]);

  const mutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const tags = rawToTags(data.tags_raw ?? "");
      const body: Record<string, unknown> = {
        name: data.name,
        phone: data.phone,
        tags,
        notes: data.notes ?? "",
      };
      if (data.email && data.email !== "") {
        body.email = data.email;
      } else {
        body.email = null;
      }
      if (data.gender) {
        body.gender = data.gender;
      }
      if (data.birthday && data.birthday !== "") {
        body.birthday = data.birthday;
      }

      const url = isEdit
        ? `${API_BASE}/api/crm/customers/${customer.id}/`
        : `${API_BASE}/api/crm/customers/`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const message =
          err && typeof err === "object" && "detail" in err
            ? String((err as { detail: unknown }).detail)
            : `Request failed (${res.status})`;
        throw new Error(message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(isEdit ? "Customer updated" : "Customer created");
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to save customer");
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[480px]">
        <SheetHeader className="border-b border-[#E2E8F0] pb-4">
          <SheetTitle className="font-inter text-lg font-semibold text-[#1B2B3A]">
            {isEdit ? "Edit Customer" : "Add Customer"}
          </SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="flex flex-col gap-4 overflow-y-auto px-4 py-4"
        >
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-name" className="font-inter text-sm font-medium text-[#1B2B3A]">
              Full Name <span className="text-[#EF4444]">*</span>
            </Label>
            <Input
              id="cust-name"
              {...register("name")}
              placeholder="e.g. Nimal Perera"
              className="border-[#E2E8F0] font-inter text-sm"
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="font-inter text-xs text-[#EF4444]">{errors.name.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-phone" className="font-inter text-sm font-medium text-[#1B2B3A]">
              Phone <span className="text-[#EF4444]">*</span>
            </Label>
            <Input
              id="cust-phone"
              {...register("phone")}
              placeholder="e.g. 0771234567"
              className="border-[#E2E8F0] font-inter text-sm"
              aria-invalid={!!errors.phone}
            />
            {errors.phone && (
              <p className="font-inter text-xs text-[#EF4444]">{errors.phone.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-email" className="font-inter text-sm font-medium text-[#1B2B3A]">
              Email
            </Label>
            <Input
              id="cust-email"
              type="email"
              {...register("email")}
              placeholder="e.g. nimal@example.com"
              className="border-[#E2E8F0] font-inter text-sm"
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="font-inter text-xs text-[#EF4444]">{errors.email.message}</p>
            )}
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <Label className="font-inter text-sm font-medium text-[#1B2B3A]">Gender</Label>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(val) => {
                    if (val === "") {
                      field.onChange(undefined);
                    } else {
                      field.onChange(val as "MALE" | "FEMALE" | "OTHER");
                    }
                  }}
                >
                  <SelectTrigger className="border-[#E2E8F0] font-inter text-sm">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not specified</SelectItem>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Birthday */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-birthday" className="font-inter text-sm font-medium text-[#1B2B3A]">
              Birthday
            </Label>
            <Input
              id="cust-birthday"
              type="date"
              {...register("birthday")}
              className="border-[#E2E8F0] font-inter text-sm"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-tags" className="font-inter text-sm font-medium text-[#1B2B3A]">
              Tags
            </Label>
            <Input
              id="cust-tags"
              {...register("tags_raw")}
              placeholder="e.g. VIP, Regular, Wholesale"
              className="border-[#E2E8F0] font-inter text-sm"
            />
            <p className="font-inter text-xs text-[#64748B]">Separate tags with commas</p>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-notes" className="font-inter text-sm font-medium text-[#1B2B3A]">
              Notes
            </Label>
            <Textarea
              id="cust-notes"
              {...register("notes")}
              rows={3}
              placeholder="Internal notes about this customer…"
              className="border-[#E2E8F0] font-inter text-sm"
            />
          </div>

          <SheetFooter className="border-t border-[#E2E8F0] pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
              className="border-[#E2E8F0] font-inter text-sm text-[#64748B]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-[#F97316] font-inter text-sm text-white hover:bg-[#EA6C0A]"
            >
              {mutation.isPending
                ? isEdit
                  ? "Saving…"
                  : "Creating…"
                : isEdit
                  ? "Save Changes"
                  : "Create Customer"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
