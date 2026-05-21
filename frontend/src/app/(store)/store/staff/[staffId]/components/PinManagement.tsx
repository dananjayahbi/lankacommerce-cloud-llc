"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shield, AlertTriangle, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import type { StaffMember } from "@/types/hr";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const schema = z
  .object({
    new_pin: z
      .string()
      .min(4, "PIN must be at least 4 digits.")
      .max(8, "PIN must be at most 8 digits.")
      .regex(/^\d+$/, "PIN must contain only digits."),
    confirm_pin: z
      .string()
      .min(4, "PIN must be at least 4 digits.")
      .max(8, "PIN must be at most 8 digits.")
      .regex(/^\d+$/, "PIN must contain only digits."),
  })
  .refine((data) => data.new_pin === data.confirm_pin, {
    message: "PINs do not match.",
    path: ["confirm_pin"],
  });

type FormValues = z.infer<typeof schema>;

interface PinManagementProps {
  staffMember: StaffMember;
}

export function PinManagement({ staffMember }: PinManagementProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const { role } = usePermissions();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
  });

  // Always invalidate after mounting so has_pin is fresh
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["staff-member", staffMember.id] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffMember.id]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch(`${API_BASE}/api/hr/staff/${staffMember.id}/pin/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ new_pin: values.new_pin }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to update PIN");
      return json.data as { message: string; updated_at: string };
    },
    onSuccess: () => {
      toast.success("PIN updated successfully.");
      void queryClient.invalidateQueries({ queryKey: ["staff-member", staffMember.id] });
      reset();
    },
    onError: (err) => {
      setError("new_pin", {
        message: err instanceof Error ? err.message : "Failed to update PIN.",
      });
    },
  });

  const isManagerOrAbove = role === "OWNER" || role === "MANAGER";

  return (
    <Card>
      <CardHeader>
        <CardTitle>PIN Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* PIN Status Indicator */}
        <div className="flex items-center gap-2">
          {staffMember.has_pin ? (
            <>
              <Shield className="h-4 w-4 text-green-500" />
              <span className="text-sm text-navy">PIN is set</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-navy">No PIN assigned</span>
            </>
          )}
        </div>

        {!isManagerOrAbove ? (
          <p className="text-text-muted text-sm">
            Only Managers and Owners can manage staff PINs.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4 max-w-sm"
          >
            <div className="space-y-1">
              <Label htmlFor="new-pin">New PIN</Label>
              <Input
                id="new-pin"
                type="password"
                inputMode="numeric"
                maxLength={8}
                autoComplete="new-password"
                placeholder="Enter 4–8 digits"
                {...register("new_pin")}
              />
              {errors.new_pin && (
                <p className="text-xs text-red-500">{errors.new_pin.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirm-pin">Confirm PIN</Label>
              <Input
                id="confirm-pin"
                type="password"
                inputMode="numeric"
                maxLength={8}
                autoComplete="new-password"
                placeholder="Repeat PIN"
                {...register("confirm_pin")}
              />
              {errors.confirm_pin && (
                <p className="text-xs text-red-500">{errors.confirm_pin.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="bg-orange hover:bg-orange-600 text-white"
              disabled={mutation.isPending || Object.keys(errors).length > 0}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set PIN
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

