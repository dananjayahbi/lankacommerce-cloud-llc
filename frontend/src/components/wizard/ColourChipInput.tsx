"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

interface ColourChipInputProps {
  value: string[];
  onChange: (colours: string[]) => void;
}

function isValidCssColour(name: string): boolean {
  const s = new Option().style;
  s.color = name;
  return s.color !== "";
}

export function ColourChipInput({ value, onChange }: ColourChipInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addColour = (colour: string) => {
    const trimmed = colour.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInputValue("");
  };

  const removeColour = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addColour(inputValue);
    }
  };

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface p-2">
      {value.map((colour, index) => (
        <span
          key={`${colour}-${index}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-navy)] px-2.5 py-0.5 text-xs text-white"
        >
          {isValidCssColour(colour) && (
            <span
              className="h-3 w-3 rounded-full border border-white/30"
              style={{ backgroundColor: colour }}
            />
          )}
          {colour}
          <button type="button" onClick={() => removeColour(index)}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? "Add colours..." : ""}
        className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
