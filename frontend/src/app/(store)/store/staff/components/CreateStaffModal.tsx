"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod/v4";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/authStore";
import type { StaffMember } from "@/types/hr";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const schema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.email("Enter a valid email address"),
  role: z.enum(["OWNER", "MANAGER", "CASHIER", "STOCK_CLERK"]),
  commission_rate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateStaffModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateStaffModal({ open, onClose }: CreateStaffModalProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues: { role: "CASHIER", commission_rate: "" },
  });

  const selectedRole = watch("role");

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) reset({ role: "CASHIER", commission_rate: "" });
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const body: Record<string, unknown> = {
        name: values.name,
        email: values.email,
        role: values.role,
      };
      if (values.role === "CASHIER" && values.commission_rate) {
        body.commission_rate = values.commission_rate;
      }
      const res = await fetch(`${API_BASE}/api/hr/staff/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.status === 403) {
        throw Object.assign(new Error("FORBIDDEN"), { isForbidden: true });
      }
      if (!res.ok) throw Object.assign(new Error("VALIDATION"), { detail: json });
      return json.data as StaffMember;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Staff member created.");
      onClose();
    },
    onError: (err: unknown) => {
      const e = err as { isForbidden?: boolean; detail?: { error?: { message?: string }; errors?: Record<string, string[]> } };
      if (e.isForbidden) {
        toast.error("You do not have permission to create staff.");
        return;
      }
      // Map server field errors to form fields
      const detail = e.detail;
      if (detail?.errors) {
        for (const [field, messages] of Object.entries(detail.errors)) {
          setError(field as keyof FormValues, {
            type: 'server',
            message: Array.isArray(messages) ? (messages[0] ?? 'Invalid') : String(messages),
          });
        }
      } else {
        toast.error(detail?.error?.message ?? "Failed to create staff member.");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-120">
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          className="space-y-4 pt-2"
        >
          {/* Full Name */}
          <div className="space-y-1">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" {...register("name")} placeholder="e.g. Kasun Perera" />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="staff@example.com"
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-1">
            <Label htmlFor="role">Role</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OWNER">Owner</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="CASHIER">Cashier</SelectItem>
                    <SelectItem value="STOCK_CLERK">Stock Clerk</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && (
              <p className="text-xs text-red-500">{errors.role.message}</p>
            )}
          </div>

          {/* Commission Rate — only shown for CASHIER */}
          {selectedRole === "CASHIER" && (
            <div className="space-y-1">
              <Label htmlFor="commission_rate">Commission Rate (%)</Label>
              <Input
                id="commission_rate"
                type="number"
                step="0.01"
                min={0}
                max={100}
                {...register("commission_rate")}
                placeholder="0.00"
              />
              <p className="text-xs text-text-muted">
                Percentage of each sale credited to this staff member. Enter 5 for 5%.
              </p>
              {errors.commission_rate && (
                <p className="text-xs text-red-500">{errors.commission_rate.message}</p>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-orange hover:bg-orange-600 text-white"
              disabled={mutation.isPending}
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
