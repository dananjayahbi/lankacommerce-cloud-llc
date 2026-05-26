"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, ArrowRight, ArrowLeft, Rocket, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface Theme {
  id: string;
  name: string;
  version: string;
  preview_image_url: string | null;
  category: string;
  is_free: boolean;
  is_default: boolean;
}

interface SetupPayload {
  theme_id: string;
  title: string;
  description: string;
}

export function WebstoreSetupWizard({
  tenantName,
}: {
  tenantName?: string;
}) {
  const [step, setStep] = useState(1);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [title, setTitle] = useState(tenantName ?? "");
  const [description, setDescription] = useState("");
  const [launchError, setLaunchError] = useState<string | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const { data: themes = [], isLoading: themesLoading } = useQuery<Theme[]>({
    queryKey: ["webstore-themes-all"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/webstore/themes/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to load themes");
      return res.json();
    },
    enabled: !!accessToken,
  });

  const launchMutation = useMutation<void, Error, SetupPayload>({
    mutationFn: async (payload) => {
      const res = await fetch(`${API_BASE}/api/webstore/setup/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Failed to launch webstore");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webstore-config"] });
      toast.success("Your webstore is live!", {
        description:
          "What to do next: 1. Customize your design  2. Add collections  3. Set up your navigation",
        duration: 8000,
      });
    },
    onError: (err) => {
      setLaunchError(err.message);
    },
  });

  const defaultThemeId =
    themes.find((t) => t.is_default)?.id ?? themes[0]?.id ?? null;
  const effectiveThemeId = selectedThemeId ?? defaultThemeId;

  function handleLaunch() {
    if (!effectiveThemeId) return;
    setLaunchError(null);
    launchMutation.mutate({
      theme_id: effectiveThemeId,
      title,
      description,
    });
  }

  const steps = ["Choose Theme", "Basic Info", "Review & Launch"];

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Step progress */}
      <div className="flex items-center gap-0 mb-10">
        {steps.map((label, idx) => {
          const num = idx + 1;
          const done = step > num;
          const active = step === num;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                    done
                      ? "bg-[#F97316] text-white"
                      : active
                        ? "border-2 border-[#F97316] text-[#F97316]"
                        : "border-2 border-slate-200 text-slate-400",
                  )}
                >
                  {done ? <Check className="w-4 h-4" /> : num}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    active ? "text-slate-900" : "text-slate-400",
                  )}
                >
                  {label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className="flex-1 h-px bg-slate-200 mx-4" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1 — Choose Theme */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Choose a theme for your store
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            You can change this at any time from the theme marketplace.
          </p>

          {themesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : themes.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Palette className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No themes available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {themes.map((theme) => {
                const isSelected = (effectiveThemeId ?? "") === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedThemeId(theme.id)}
                    className={cn(
                      "relative rounded-xl border-2 overflow-hidden text-left transition-all",
                      isSelected
                        ? "border-[#F97316] shadow-md"
                        : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <div className="aspect-video bg-slate-100 relative">
                      {theme.preview_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={theme.preview_image_url}
                          alt={theme.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Palette className="w-8 h-8 text-slate-300" />
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-[#F97316] rounded-full flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {theme.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs text-slate-400">
                          {theme.category}
                        </span>
                        <span className="text-xs text-slate-300">•</span>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            theme.is_free
                              ? "text-green-600"
                              : "text-amber-600",
                          )}
                        >
                          {theme.is_free ? "Free" : "Premium"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!effectiveThemeId}
              className="bg-[#F97316] hover:bg-orange-600 text-white gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 — Basic Info */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Tell us about your store
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            This information helps customers find your store.
          </p>

          <div className="space-y-5 mb-8">
            <div className="space-y-1.5">
              <Label htmlFor="ws-title">Webstore Title</Label>
              <Input
                id="ws-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. My Fashion Store"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ws-desc">Webstore Description</Label>
              <Textarea
                id="ws-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your store in a sentence or two…"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-slate-400">
                Used in search engine results and social sharing previews.
              </p>
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!title.trim()}
              className="bg-[#F97316] hover:bg-orange-600 text-white gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — Review & Launch */}
      {step === 3 && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Review and launch
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            You can customize the design and add content after launching.
          </p>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3 mb-6">
            {(() => {
              const theme = themes.find((t) => t.id === effectiveThemeId);
              return (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Theme</span>
                    <span className="font-medium text-slate-800">
                      {theme?.name ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Store Title</span>
                    <span className="font-medium text-slate-800">{title}</span>
                  </div>
                  {description && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Description</span>
                      <span className="font-medium text-slate-800 max-w-[60%] text-right">
                        {description}
                      </span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {launchError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-5">
              <p className="text-sm text-red-700">{launchError}</p>
            </div>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(2)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button
              onClick={handleLaunch}
              disabled={launchMutation.isPending}
              className="bg-[#F97316] hover:bg-orange-600 text-white gap-2 px-8"
              size="lg"
            >
              {launchMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4" />
              )}
              Launch Webstore
            </Button>
          </div>

          <p className="text-xs text-slate-400 text-center mt-4">
            You can customize the design and add content after launching.
          </p>
        </div>
      )}
    </div>
  );
}
