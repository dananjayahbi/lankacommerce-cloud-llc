/**
 * VariantPicker (standalone)
 *
 * Displays variant attribute selectors for the product detail page.
 *
 * Two rendering modes based on option name:
 *   - "Color" / "Colour" option → colour swatches (circular buttons with
 *     a CSS background colour matching the value name)
 *   - All other options → pill buttons
 *
 * Availability:
 *   - For each option value, availability is determined by checking whether
 *     any variant that would be selected — given the value for this option and
 *     the current selections for all other options — is `available: true`.
 *   - Unavailable values are rendered disabled and visually dimmed / struck.
 *
 * Variant resolution uses `option1` / `option2` / `option3` positional fields
 * on `ProductVariant` (matching the public API response shape from Phase 2).
 *
 * Usage:
 *   <VariantPicker
 *     options={product.options}
 *     variants={product.variants}
 *     selectedVariantId={selectedVariantId}
 *     onVariantChange={(variantId) => setSelectedVariantId(variantId)}
 *   />
 */

"use client";

import { useCallback, useState } from "react";
import type { ProductVariant } from "@/lib/webstore/themeRenderer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProductOption {
  name: string;
  values: string[];
}

interface VariantPickerProps {
  options: ProductOption[];
  variants: ProductVariant[];
  selectedVariantId: string | null;
  onVariantChange: (variantId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the option name represents a colour selector. */
function isColorOption(name: string): boolean {
  return /^colou?r$/i.test(name.trim());
}

/**
 * Finds the variant that matches the given per-option selections.
 * Selections are keyed by option name mapping to attribute values.
 */
function findMatchingVariant(
  variants: ProductVariant[],
  selections: Record<string, string | null>,
): ProductVariant | undefined {
  return variants.find((v) => {
    return Object.entries(selections).every(([optName, sel]) => {
      if (sel === null) return true;
      // attributes keys are lowercase (e.g. "colour", "size")
      const key = optName.toLowerCase();
      return v.attributes[key] === sel;
    });
  });
}

/**
 * Returns true if any variant matching the proposed option combination has
 * `is_available: true`.
 */
function isValueAvailable(
  variants: ProductVariant[],
  currentSelections: Record<string, string | null>,
  optionName: string,
  value: string,
): boolean {
  const testSelections = { ...currentSelections, [optionName.toLowerCase()]: value };

  const candidates = variants.filter((v) => {
    return Object.entries(testSelections).every(([optName, sel]) => {
      if (sel === null) return true;
      return v.attributes[optName.toLowerCase()] === sel;
    });
  });

  return candidates.some((v) => v.is_available);
}

// ---------------------------------------------------------------------------
// Colour swatch button
// ---------------------------------------------------------------------------

interface SwatchButtonProps {
  value: string;
  isSelected: boolean;
  isAvailable: boolean;
  onClick: () => void;
}

function SwatchButton({ value, isSelected, isAvailable, onClick }: SwatchButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isAvailable}
      title={isAvailable ? value : `${value} — out of stock`}
      aria-label={`Colour: ${value}${!isAvailable ? " (out of stock)" : ""}`}
      aria-pressed={isSelected}
      className={[
        "relative h-8 w-8 rounded-full border-2 transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)] focus-visible:ring-offset-2",
        isSelected ? "scale-110" : "hover:scale-105",
        isAvailable ? "cursor-pointer" : "cursor-not-allowed opacity-40",
      ].join(" ")}
      style={{
        backgroundColor: value.toLowerCase(),
        borderColor: isSelected ? "var(--ws-color-primary)" : "transparent",
        boxShadow: isSelected ? "0 0 0 1px var(--ws-color-primary)" : undefined,
      }}
    >
      {/* Out-of-stock diagonal slash */}
      {!isAvailable && (
        <span
          className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(135deg, transparent 44%, #DC2626 44%, #DC2626 56%, transparent 56%)",
          }}
        />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Pill button
// ---------------------------------------------------------------------------

interface PillButtonProps {
  value: string;
  isSelected: boolean;
  isAvailable: boolean;
  onClick: () => void;
}

function PillButton({ value, isSelected, isAvailable, onClick }: PillButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isAvailable}
      aria-pressed={isSelected}
      aria-label={`${value}${!isAvailable ? " (out of stock)" : ""}`}
      className={[
        "rounded-md border px-3 py-1.5 text-sm transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)] focus-visible:ring-offset-1",
        isSelected
          ? "border-[var(--ws-color-primary)] font-semibold"
          : isAvailable
            ? "border-gray-300 hover:border-gray-500 bg-white"
            : "cursor-not-allowed border-gray-200 line-through",
      ].join(" ")}
      style={{
        color: isSelected
          ? "var(--ws-color-primary)"
          : isAvailable
            ? "var(--ws-color-text)"
            : "#9CA3AF",
        borderColor: isSelected ? "var(--ws-color-primary)" : undefined,
      }}
    >
      {value}
    </button>
  );
}

// ---------------------------------------------------------------------------
// VariantPicker
// ---------------------------------------------------------------------------

export function VariantPicker({
  options,
  variants,
  selectedVariantId,
  onVariantChange,
}: VariantPickerProps) {
  // Derive initial selections from the currently selected variant (or first variant)
  const initialVariant =
    variants.find((v) => v.id === selectedVariantId) ?? variants[0] ?? null;

  const [selections, setSelections] = useState<Record<string, string | null>>(
    () => {
      const init: Record<string, string | null> = {};
      options.forEach((opt) => {
        const key = opt.name.toLowerCase();
        init[opt.name] = initialVariant?.attributes[key] ?? null;
      });
      return init;
    }
  );

  const handleSelect = useCallback(
    (optionName: string, value: string) => {
      const newSelections = { ...selections, [optionName]: value };
      setSelections(newSelections);

      const match = findMatchingVariant(variants, newSelections);
      if (match) {
        onVariantChange(match.id);
      }
    },
    [selections, variants, onVariantChange],
  );

  // Nothing to show — single default variant
  if (options.length === 0) return null;
  if (
    options.length === 1 &&
    options[0]!.values.length === 1 &&
    options[0]!.values[0] === "Default Title"
  ) {
    return null;
  }

  return (
    <div className="flex flex-col gap-5">
      {options.map((option, optionIndex) => {
        const isColor = isColorOption(option.name);
        const selectedValue = selections[option.name];

        return (
          <div key={option.name}>
            {/* Option label */}
            <p
              className="mb-2 text-sm font-semibold"
              style={{ color: "var(--ws-color-text)" }}
              id={`variant-option-${optionIndex}`}
            >
              {option.name}
              {selectedValue && (
                <span className="ml-2 font-normal opacity-60">{selectedValue}</span>
              )}
            </p>

            {/* Option values */}
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-labelledby={`variant-option-${optionIndex}`}
            >
              {option.values.map((value) => {
                const isSelected = selectedValue === value;
                const available = isValueAvailable(
                  variants,
                  selections,
                  option.name,
                  value,
                );

                if (isColor) {
                  return (
                    <SwatchButton
                      key={value}
                      value={value}
                      isSelected={isSelected}
                      isAvailable={available}
                      onClick={() => available && handleSelect(option.name, value)}
                    />
                  );
                }

                return (
                  <PillButton
                    key={value}
                    value={value}
                    isSelected={isSelected}
                    isAvailable={available}
                    onClick={() => available && handleSelect(option.name, value)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
