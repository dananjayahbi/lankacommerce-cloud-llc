"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SizeChipInputProps {
  value: string[];
  onChange: (sizes: string[]) => void;
}

const SIZE_PRESETS = [
  { label: "S / M / L / XL", values: ["S", "M", "L", "XL"] },
  { label: "XS – XXL", values: ["XS", "S", "M", "L", "XL", "XXL"] },
  { label: "2Y / 4Y ... 10Y", values: ["2Y", "4Y", "6Y", "8Y", "10Y"] },
  { label: "One Size", values: ["One Size"] },
];

export function SizeChipInput({ value, onChange }: SizeChipInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addSize = (size: string) => {
    const trimmed = size.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInputValue("");
  };

  const removeSize = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSize(inputValue);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {SIZE_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="outline"
            size="xs"
            onClick={() => onChange(preset.values)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface p-2">
        {value.map((size, index) => (
          <span
            key={`${size}-${index}`}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--color-navy)] px-2.5 py-0.5 text-xs text-white"
          >
            {size}
            <button type="button" onClick={() => removeSize(index)}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? "Add sizes..." : ""}
          className="min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
