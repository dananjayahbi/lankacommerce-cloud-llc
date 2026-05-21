"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { WizardProgressBar } from "@/components/wizard/WizardProgressBar";
import { WizardStep1BasicInfo } from "@/components/wizard/WizardStep1BasicInfo";
import { WizardStep2Variants } from "@/components/wizard/WizardStep2Variants";
import { WizardStep3Review } from "@/components/wizard/WizardStep3Review";
import { useProductWizardStore } from "@/stores/productWizardStore";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";

export default function NewProductPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const { step, resetWizard } = useProductWizardStore();

  // Permission guard
  useEffect(() => {
    if (!can(PERMISSIONS.PRODUCTS_CREATE)) {
      router.replace("/store/inventory");
    }
  }, [can, router]);

  // Reset wizard on unmount (back button / navigation away)
  useEffect(() => {
    return () => {
      // Only reset on unmount, not on each render
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <nav className="text-sm text-muted-foreground">
            <span
              className="cursor-pointer hover:underline"
              onClick={() => {
                resetWizard();
                router.push("/store/inventory");
              }}
            >
              Inventory
            </span>
            {" › "}
            <span className="text-[var(--color-navy)]">New Product</span>
          </nav>
          <h1 className="mt-1 text-2xl font-bold text-[var(--color-navy)]">
            Add Product
          </h1>
        </div>

        {/* Wizard card */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          {/* Progress bar */}
          <div className="mb-8">
            <WizardProgressBar currentStep={step} />
          </div>

          {/* Step content */}
          {step === 1 && <WizardStep1BasicInfo />}
          {step === 2 && <WizardStep2Variants />}
          {step === 3 && <WizardStep3Review />}
        </div>
      </div>
    </div>
  );
}
