import { create } from "zustand";
import type { ProductStep1Data, ProductStep2Data } from "@/schemas/productSchema";

interface ProductWizardState {
  step: 1 | 2 | 3;
  step1Data: Partial<ProductStep1Data>;
  step2Data: Partial<ProductStep2Data>;

  goToStep: (step: 1 | 2 | 3) => void;
  setStep1Data: (data: ProductStep1Data) => void;
  setStep2Data: (data: ProductStep2Data) => void;
  resetWizard: () => void;
}

export const useProductWizardStore = create<ProductWizardState>((set) => ({
  step: 1,
  step1Data: {},
  step2Data: {},

  goToStep: (step) => set({ step }),
  setStep1Data: (data) => set({ step1Data: data }),
  setStep2Data: (data) => set({ step2Data: data }),
  resetWizard: () => set({ step: 1, step1Data: {}, step2Data: {} }),
}));
