"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";
import { HardwareSettingsForm } from "@/components/settings/HardwareSettingsForm";
import { Info, Loader } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface HardwareConfig {
  printer_type?: string;
  host?: string;
  port?: number;
  paper_width?: string;
  cash_drawer_enabled?: boolean;
  cfd_enabled?: boolean;
}

async function fetchHardwareSettings(token: string): Promise<HardwareConfig> {
  const res = await fetch(`${API_BASE}/api/accounts/settings/hardware/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch hardware settings");
  const json = await res.json();
  return (json.data?.hardware ?? {}) as HardwareConfig;
}

export default function HardwareSettingsPage() {
  const { isManagerOrAbove } = usePermissions();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { toast } = useToast();

  const [savedConfig, setSavedConfig] = useState<HardwareConfig>({});
  const [testingPrinter, setTestingPrinter] = useState(false);
  const [testingDrawer, setTestingDrawer] = useState(false);

  const { data: hardwareConfig, isLoading } = useQuery<HardwareConfig>({
    queryKey: ["hardware-settings"],
    queryFn: () => fetchHardwareSettings(accessToken ?? ""),
    enabled: !!accessToken,
    placeholderData: (prev) => prev,
    onSuccess: (data: HardwareConfig) => {
      setSavedConfig(data);
    },
  } as Parameters<typeof useQuery>[0]);

  // Role guard
  if (isManagerOrAbove === false) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to configure hardware settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const config = hardwareConfig ?? {};
  const hasUnsavedChanges =
    JSON.stringify(config) !== JSON.stringify(savedConfig);

  async function handleTestPrinter() {
    setTestingPrinter(true);
    try {
      const res = await fetch(`${API_BASE}/api/hardware/test-print/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Test failed");
      }
      toast({ title: "Printer Test", description: "Print successful!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Test failed";
      toast({
        variant: "destructive",
        title: "Printer Test Failed",
        description: msg,
      });
    } finally {
      setTestingPrinter(false);
    }
  }

  async function handleTestDrawer() {
    setTestingDrawer(true);
    try {
      const res = await fetch(`${API_BASE}/api/hardware/test-drawer/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Test failed");
      }
      toast({
        title: "Drawer Test",
        description: "Drawer opened successfully!",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Test failed";
      toast({
        variant: "destructive",
        title: "Drawer Test Failed",
        description: msg,
      });
    } finally {
      setTestingDrawer(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Breadcrumb */}
      <nav className="text-xs text-text-muted">
        Dashboard &rsaquo; Settings &rsaquo; Hardware
      </nav>

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-navy">Hardware Settings</h1>
        <p className="mt-1 text-sm text-text-muted">
          Configure the thermal printer, cash drawer, and customer-facing
          display.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange border-t-transparent" />
        </div>
      ) : (
        <>
          <HardwareSettingsForm
            initialConfig={config}
            savedConfig={savedConfig}
            onSavedConfigChange={setSavedConfig}
          />

          {/* Test Connections */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-navy">
                Test Connections
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  disabled={hasUnsavedChanges || testingPrinter}
                  onClick={handleTestPrinter}
                  className="flex items-center gap-2"
                >
                  {testingPrinter && (
                    <Loader className="h-4 w-4 animate-spin" />
                  )}
                  Test Printer
                </Button>

                <Button
                  variant="outline"
                  disabled={hasUnsavedChanges || testingDrawer}
                  onClick={handleTestDrawer}
                  className="flex items-center gap-2"
                >
                  {testingDrawer && (
                    <Loader className="h-4 w-4 animate-spin" />
                  )}
                  Test Drawer
                </Button>
              </div>

              {hasUnsavedChanges && (
                <p className="text-xs italic text-text-muted">
                  Save changes before testing.
                </p>
              )}

              {/* USB Help Alert */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle className="text-xs font-bold">
                  USB Printer Requirements
                </AlertTitle>
                <AlertDescription className="text-xs">
                  For USB printers on Windows, the libusb driver must be
                  installed via Zadig before USB printer detection will work.
                  For network printers, assign a static IP address reachable
                  from the server host.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
