"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod/v4";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/stores/authStore";
import type { StaffMember } from "@/types/hr";
import { ROLE_BADGE_CONFIG } from "../../components/StaffTable";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const rateFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Enter a valid email"),
  role: z.enum(["OWNER", "MANAGER", "CASHIER", "STOCK_CLERK"]),
  is_active: z.boolean(),
  commission_rate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ProfileTabProps {
  staffMember: StaffMember;
}

export function ProfileTab({ staffMember }: ProfileTabProps) {
  const [editMode, setEditMode] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const badge = ROLE_BADGE_CONFIG[staffMember.role];
  const rateDisplay =
    staffMember.commission_rate !== null
      ? `${rateFormatter.format(Number(staffMember.commission_rate))}%`
      : "No commission";

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      name: staffMember.name,
      email: staffMember.email,
      role: staffMember.role,
      is_active: staffMember.is_active,
      commission_rate: staffMember.commission_rate ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch(`${API_BASE}/api/hr/staff/${staffMember.id}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          role: values.role,
          is_active: values.is_active,
          ...(values.commission_rate
            ? { commission_rate: values.commission_rate }
            : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to update profile");
      return json.data as StaffMember;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["staff-member", staffMember.id] });
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Profile updated.");
      setEditMode(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update profile.");
    },
  });

  const handleCancel = () => {
    reset({
      name: staffMember.name,
      email: staffMember.email,
      role: staffMember.role,
      is_active: staffMember.is_active,
      commission_rate: staffMember.commission_rate ?? "",
    });
    setEditMode(false);
  };

  if (editMode) {
    return (
      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="space-y-4 max-w-lg"
      >
        <div className="space-y-1">
          <Label htmlFor="edit-name">Full Name</Label>
          <Input id="edit-name" {...register("name")} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="edit-email">Email</Label>
          <Input id="edit-email" type="email" {...register("email")} />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>Role</Label>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
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
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor="edit-is-active">Active</Label>
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <Switch
                id="edit-is-active"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="edit-commission">Commission Rate (%)</Label>
          <Input
            id="edit-commission"
            type="number"
            step="0.01"
            min={0}
            max={100}
            {...register("commission_rate")}
          />
          {errors.commission_rate && (
            <p className="text-xs text-red-500">{errors.commission_rate.message}</p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="submit"
              className="bg-orange hover:bg-orange-600 text-white"
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  // Read-only display
  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <p className="text-sm text-text-muted">Full Name</p>
        <p className="font-medium text-navy mt-0.5">{staffMember.name}</p>
      </div>

      <div>
        <p className="text-sm text-text-muted">Email</p>
        <p className="text-navy mt-0.5">{staffMember.email}</p>
      </div>

      <div>
        <p className="text-sm text-text-muted">Role</p>
        <span
          className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
          style={{ backgroundColor: badge.background, color: badge.color }}
        >
          {badge.label}
        </span>
      </div>

      <div>
        <p className="text-sm text-text-muted">Status</p>
        <span
          className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
          style={{
            backgroundColor: staffMember.is_active ? "#DCFCE7" : "#F1F5F9",
            color: staffMember.is_active ? "#16A34A" : "#64748B",
          }}
        >
          {staffMember.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      <div>
        <p className="text-sm text-text-muted">Commission Rate</p>
        <p className="text-navy mt-0.5">{rateDisplay}</p>
      </div>

      <div>
        <p className="text-sm text-text-muted">Clock Status</p>
        {staffMember.clocked_in_at ? (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            <p className="text-navy">
              Currently clocked in since{" "}
              {new Intl.DateTimeFormat("en-LK", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(staffMember.clocked_in_at))}
            </p>
          </div>
        ) : (
          <p className="text-text-muted mt-0.5">Not clocked in</p>
        )}
      </div>

      <Button variant="outline" onClick={() => setEditMode(true)}>
        Edit Profile
      </Button>
    </div>
  );
}
