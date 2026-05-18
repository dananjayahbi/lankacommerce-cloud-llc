import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardProgressBarProps {
  currentStep: 1 | 2 | 3;
}

const STEPS = [
  { number: 1, label: "Basic Info" },
  { number: 2, label: "Variants" },
  { number: 3, label: "Review" },
];

export function WizardProgressBar({ currentStep }: WizardProgressBarProps) {
  return (
    <div className="flex items-center">
      {STEPS.map((step, index) => {
        const isCompleted = step.number < currentStep;
        const isActive = step.number === currentStep;
        const isPending = step.number > currentStep;

        return (
          <div key={step.number} className="flex flex-1 items-center">
            {/* Step pill */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                  isCompleted &&
                    "bg-[var(--color-orange)] text-white",
                  isActive &&
                    "bg-[var(--color-navy)] text-white",
                  isPending &&
                    "border-2 border-border text-[var(--color-navy)]",
                )}
              >
                {isCompleted ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  "mt-1 text-xs font-medium",
                  isActive && "text-[var(--color-navy)]",
                  isPending && "text-muted-foreground",
                  isCompleted && "text-[var(--color-orange)]",
                )}
              >
                {step.number} · {step.label}
              </span>
            </div>

            {/* Connecting line (except after last step) */}
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 flex-1 border-t-2",
                  isCompleted ? "border-[var(--color-orange)]" : "border-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
