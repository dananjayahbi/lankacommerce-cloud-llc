/**
 * Config Merger
 *
 * Provides schema-safe settings resolution for block components. When the
 * platform adds a new setting to a block schema AFTER a merchant has already
 * saved their theme config, the merchant's stored settings won't contain that
 * key. The merger fills in the schema's `default` value for every missing key,
 * preventing `undefined` from reaching component props.
 *
 * Usage:
 *   const merged = mergeConfigWithSchema(section.settings, section.type);
 *
 * The returned object is a mutable copy — never mutates the input.
 *
 * Design decisions:
 *  - Only fills in keys that are ABSENT from `savedSettings`. Existing values
 *    (even if falsy) are never overwritten — merchant intent is preserved.
 *  - Settings whose schema entry has no `default` property are skipped when
 *    absent (they default to `undefined`, which is TypeScript's `optional`
 *    semantics).
 *  - Presentational schema entries (type "header" | "paragraph") have no `id`
 *    that maps to a real setting value, so they are ignored here.
 *  - Unknown block types (no schema entry) return a shallow copy of the saved
 *    settings unchanged — the renderer handles missing settings gracefully.
 */

import type { SettingPrimitive, SettingsMap } from "./types";
import { BLOCK_SCHEMAS } from "./blockSchemas";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A mutable, merged settings map safe to pass directly to block components. */
export type MergedSettings = Record<string, SettingPrimitive>;

// ---------------------------------------------------------------------------
// Core merge function
// ---------------------------------------------------------------------------

/**
 * Merges a merchant's saved settings with the block schema defaults.
 *
 * @param savedSettings  The `settings` object from the persisted `SectionConfig`.
 * @param blockType      The section/block type string (e.g. "hero_banner").
 * @returns              A new object with all schema defaults backfilled.
 */
export function mergeConfigWithSchema(
  savedSettings: SettingsMap | undefined | null,
  blockType: string,
): MergedSettings {
  // Start with a shallow clone of the saved settings so we never mutate the
  // original (which is `Readonly` in the type system).
  const base: MergedSettings = savedSettings ? { ...savedSettings } : {};

  const schema = BLOCK_SCHEMAS[blockType];
  if (!schema || schema.length === 0) {
    // No schema registered for this type — return saved values as-is.
    return base;
  }

  for (const setting of schema) {
    // Skip presentational entries that don't correspond to a stored value.
    if (setting.type === "header" || setting.type === "paragraph") continue;

    // Only backfill when the key is truly absent (not just falsy).
    if (!(setting.id in base)) {
      const def = "default" in setting ? setting.default : undefined;
      if (def !== undefined) {
        // Cast is safe: SettingDefinition.default is always SettingPrimitive.
        (base as Record<string, SettingPrimitive>)[setting.id] =
          def as SettingPrimitive;
      }
    }
  }

  return base;
}

// ---------------------------------------------------------------------------
// Block-level merger (for nested blocks inside a section)
// ---------------------------------------------------------------------------

/**
 * Merges a nested block's settings using its block-type schema.
 *
 * Nested blocks share the same schema registry but are keyed by their own
 * `type` string (e.g. "announcement", "testimonial_item"). This helper is a
 * thin alias over `mergeConfigWithSchema` with a more descriptive name for
 * call sites that deal with nested blocks.
 */
export function mergeBlockSettings(
  savedSettings: SettingsMap | undefined | null,
  blockType: string,
): MergedSettings {
  return mergeConfigWithSchema(savedSettings, blockType);
}
