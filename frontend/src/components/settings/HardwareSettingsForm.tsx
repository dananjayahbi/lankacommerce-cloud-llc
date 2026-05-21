"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface HardwareConfig {
  printer_type?: string;
  host?: string;
  port?: number;
  paper_width?: string;
  cash_drawer_enabled?: boolean;
  cfd_enabled?: boolean;
}

interface HardwareSettingsFormProps {
  initialConfig: HardwareConfig;
  onSavedConfigChange: (config: HardwareConfig) => void;
  savedConfig: HardwareConfig;
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function HardwareSettingsForm({
  initialConfig,
  onSavedConfigChange,
  savedConfig,
}: HardwareSettingsFormProps) {
  const { toast } = useToast();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [printerType, setPrinterType] = useState(
    initialConfig.printer_type ?? "NETWORK",
  );
  const [host, setHost] = useState(initialConfig.host ?? "");
  const [port, setPort] = useState(String(initialConfig.port ?? 9100));
  const [paperWidth, setPaperWidth] = useState(
    initialConfig.paper_width ?? "58mm",
  );
  const [cashDrawerEnabled, setCashDrawerEnabled] = useState(
    initialConfig.cash_drawer_enabled ?? false,
  );
  const [cfdEnabled, setCfdEnabled] = useState(
    initialConfig.cfd_enabled ?? false,
  );

  // Sync when initialConfig prop changes (e.g. after query refetch)
  useEffect(() => {
    setPrinterType(initialConfig.printer_type ?? "NETWORK");
    setHost(initialConfig.host ?? "");
    setPort(String(initialConfig.port ?? 9100));
    setPaperWidth(initialConfig.paper_width ?? "58mm");
    setCashDrawerEnabled(initialConfig.cash_drawer_enabled ?? false);
    setCfdEnabled(initialConfig.cfd_enabled ?? false);
  }, [initialConfig]);

  const currentValues: HardwareConfig = {
    printer_type: printerType,
    host,
    port: Number(port),
    paper_width: paperWidth,
    cash_drawer_enabled: cashDrawerEnabled,
    cfd_enabled: cfdEnabled,
  };

  const hasUnsavedChanges = !deepEqual(currentValues, savedConfig);

  // Validation
  const isNetworkMissingHost =
    printerType === "NETWORK" && host.trim() === "";
  const portNum = Number(port);
  const isInvalidPort =
    !Number.isInteger(portNum) || portNum < 1 || portNum > 65535;

  const canSave = hasUnsavedChanges && !isNetworkMissingHost && !isInvalidPort;

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/accounts/settings/hardware/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(currentValues),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err?.error?.message ?? "Failed to save hardware settings",
        );
      }
      return res.json();
    },
    onSuccess: (data) => {
      onSavedConfigChange(data.data?.hardware ?? currentValues);
      toast({ description: "Hardware settings saved." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", description: err.message });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Printer Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">
            Printer Configuration
          </CardTitle>
          <CardDescription>
            Configure the thermal receipt printer for this register.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {/* Printer Type */}
          <div>
            <Label className="mb-2 block text-sm">Printer Type</Label>
            <RadioGroup
              value={printerType}
              onValueChange={setPrinterType}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="NETWORK" id="type-network" />
                <Label htmlFor="type-network" className="cursor-pointer">
                  Network (TCP/IP)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="USB" id="type-usb" />
                <Label htmlFor="type-usb" className="cursor-pointer">
                  USB
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* IP Address (show/hide with CSS, not conditional mount) */}
          <div className={printerType === "NETWORK" ? "block" : "hidden"}>
            <Label htmlFor="host" className="mb-1 block text-sm">
              IP Address
            </Label>
            <Input
              id="host"
              type="text"
              placeholder="192.168.1.100"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="max-w-xs"
            />
            {isNetworkMissingHost && (
              <p className="mt-1 text-xs text-red-600">
                IP address is required for network printers.
              </p>
            )}
          </div>

          {/* Port */}
          <div className={printerType === "NETWORK" ? "block" : "hidden"}>
            <Label htmlFor="port" className="mb-1 block text-sm">
              Port
            </Label>
            <Input
              id="port"
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="max-w-[120px]"
              min={1}
              max={65535}
            />
            {isInvalidPort && (
              <p className="mt-1 text-xs text-red-600">
                Port must be between 1 and 65535.
              </p>
            )}
          </div>

          {/* Paper Width */}
          <div>
            <Label className="mb-1 block text-sm">Paper Width</Label>
            <Select value={paperWidth} onValueChange={(v) => setPaperWidth(v ?? '80mm')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58mm">58 mm</SelectItem>
                <SelectItem value="80mm">80 mm</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Peripheral Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-navy">Peripherals</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-start justify-between">
            <div>
              <Label className="text-sm font-medium">Enable Cash Drawer</Label>
              <p className="mt-0.5 text-xs text-text-muted">
                Automatically opens when a cash payment is completed.
              </p>
            </div>
            <Switch
              checked={cashDrawerEnabled}
              onCheckedChange={setCashDrawerEnabled}
            />
          </div>

          <div className="flex items-start justify-between">
            <div>
              <Label className="text-sm font-medium">
                Enable Customer Facing Display
              </Label>
              <p className="mt-0.5 text-xs text-text-muted">
                Show cart contents on a second screen via browser.
              </p>
            </div>
            <Switch checked={cfdEnabled} onCheckedChange={setCfdEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div>
        <Button
          onClick={() => save()}
          disabled={!canSave || isSaving}
          className="bg-navy text-white hover:bg-navy/90"
        >
          {isSaving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
