/**
 * Canonical TypeScript definitions for the Webstore theme configuration.
 *
 * These types MUST exactly mirror the JSON structure persisted in
 * `TenantThemeConfig.config` on the backend (see docs/webstore-feature-docs/
 * phase-01-core-database-models.md §4.7). They are the single source of truth
 * shared between the Visual Theme Customizer (parent frame), the storefront
 * preview iframe, and the live storefront renderer.
 *
 * Compatibility rules:
 *   - Field names use snake_case to match backend JSON exactly. Do NOT rename.
 *   - Anything that may be extended at runtime (per-section settings, per-block
 *     settings) is typed as a permissive record but with a strict value union.
 *   - Add new fields here BEFORE the backend ships them, marked `?` (optional),
 *     to keep the contract backwards-compatible during phased rollouts.
 */

// ---------------------------------------------------------------------------
// Primitive / brand types
// ---------------------------------------------------------------------------

/** Stable identifier for a section/block within a template (UUID v4 string). */
export type SectionId = string;
export type BlockId = string;

/** HEX color string, e.g. "#0F172A". Validation is enforced at the input layer. */
export type HexColor = string;

/** A URL string. Empty string is allowed and means "not set". */
export type UrlString = string;

/** Handles are URL-safe slugs used to reference catalog resources from settings. */
export type CollectionHandle = string;
export type ProductHandle = string;
export type MenuHandle = string;

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/**
 * The four page templates supported by the customizer in Phase 5.
 * Additional templates (blog, page, search, etc.) may be added later, but the
 * customizer only exposes these four.
 */
export type PageTemplate = "index" | "product" | "collection" | "cart";

export const PAGE_TEMPLATES: readonly PageTemplate[] = [
    "index",
    "product",
    "collection",
    "cart",
] as const;

// ---------------------------------------------------------------------------
// Global settings
// ---------------------------------------------------------------------------

export interface GlobalColors {
    primary: HexColor;
    secondary: HexColor;
    background: HexColor;
    text: HexColor;
    accent: HexColor;
}

export interface GlobalTypography {
    /** Font family identifier (matches an entry in the available web fonts list). */
    heading_font: string;
    body_font: string;
    /** Multiplier applied to heading font sizes. Expected range: 0.8 – 1.4. */
    heading_size_scale: number;
}

export interface GlobalLayout {
    /** Any valid CSS length, e.g. "1280px" or "75rem". */
    max_content_width: string;
    enable_sticky_header: boolean;
}

export interface GlobalSocial {
    facebook: UrlString;
    instagram: UrlString;
    tiktok: UrlString;
    youtube: UrlString;
}

export interface GlobalSettings {
    colors: GlobalColors;
    typography: GlobalTypography;
    layout: GlobalLayout;
    social: GlobalSocial;
}

// ---------------------------------------------------------------------------
// Setting values — the union of every primitive a setting can hold
// ---------------------------------------------------------------------------

/**
 * The set of value types any setting field can take. Kept intentionally narrow
 * so consumers can switch on `typeof` and stay exhaustive. Image/Collection/
 * Product/URL/Color all serialize as `string` at this layer; refinement happens
 * inside the rendering input components based on the schema's `type`.
 */
export type SettingPrimitive = string | number | boolean | null;

/** A bag of settings keyed by the schema's `id` field. */
export type SettingsMap = Readonly<Record<string, SettingPrimitive>>;

// ---------------------------------------------------------------------------
// Block (nested content) configuration
// ---------------------------------------------------------------------------

/**
 * A nested block lives inside a section's `blocks` map and is rendered in the
 * order defined by the parent section's `block_order` array. Blocks have no
 * `disabled` flag in the canonical schema — removal is the only way to hide
 * them. (If we add `disabled` later, mark it optional here first.)
 */
export interface BlockConfig {
    /** Block type identifier, e.g. "image_with_text_item", "slide", "menu_item". */
    type: string;
    settings: SettingsMap;
}

export type BlocksMap = Readonly<Record<BlockId, BlockConfig>>;

// ---------------------------------------------------------------------------
// Section configuration
// ---------------------------------------------------------------------------

export interface SectionConfig {
    /** Section type identifier, e.g. "hero_banner", "featured_collection". */
    type: string;
    /** When true the section is hidden in the storefront and preview. */
    disabled: boolean;
    settings: SettingsMap;
    blocks: BlocksMap;
    block_order: readonly BlockId[];
}

export type SectionsMap = Readonly<Record<SectionId, SectionConfig>>;

// ---------------------------------------------------------------------------
// Template configuration
// ---------------------------------------------------------------------------

export interface TemplateConfig {
    sections: SectionsMap;
    /** Render order of section IDs from top to bottom. */
    order: readonly SectionId[];
}

/**
 * Templates dictionary. All four entries are present in a healthy config, but
 * we type them as optional to remain forward-compatible with newly added
 * templates and to defend against partial backend responses.
 */
export type TemplatesMap = {
    [K in PageTemplate]?: TemplateConfig;
};

// ---------------------------------------------------------------------------
// Layout (header + footer, rendered on every template)
// ---------------------------------------------------------------------------

export interface LayoutConfig {
    header: SectionConfig;
    footer: SectionConfig;
}

// ---------------------------------------------------------------------------
// Root theme configuration
// ---------------------------------------------------------------------------

/**
 * The canonical shape of `TenantThemeConfig.config`. This is the object the
 * customizer holds in memory, sends in `LANKA_INIT`, and PATCHes to the
 * `/api/webstore/customizer/draft-config/` endpoint.
 */
export interface ThemeConfig {
    global_settings: GlobalSettings;
    layout: LayoutConfig;
    templates: TemplatesMap;
}

// ---------------------------------------------------------------------------
// Draft / publish status (matches the backend `ThemeConfigStatus` enum)
// ---------------------------------------------------------------------------

export type ThemeConfigStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

/** Envelope shape returned by GET /api/webstore/customizer/draft-config/. */
export interface DraftConfigEnvelope {
    id: string;
    theme_id: string;
    theme_name: string;
    status: ThemeConfigStatus;
    config: ThemeConfig;
    purchased_blocks: Readonly<Record<string, { purchased_at: string; invoice_id: string }>>;
    created_at: string;
    updated_at: string;
    published_at: string | null;
}

// ---------------------------------------------------------------------------
// Block / setting schema (drives the auto-generated settings form)
// ---------------------------------------------------------------------------

/**
 * The discriminator for every supported setting input. Keep this in sync with
 * the backend's `BlockType.section_schema` / `block_schemas` validators.
 */
export type SettingType =
    | "text"
    | "textarea"
    | "richtext"
    | "image"
    | "url"
    | "color"
    | "select"
    | "checkbox"
    | "range"
    | "collection"
    | "product"
    | "header"
    | "paragraph";

interface SettingDefinitionBase {
    /** The key used inside the section/block `settings` map. Required for input types. */
    id: string;
    type: SettingType;
    label?: string;
    info?: string;
}

export interface TextSettingDefinition extends SettingDefinitionBase {
    type: "text" | "textarea" | "richtext" | "url";
    default?: string;
    placeholder?: string;
}

export interface ImageSettingDefinition extends SettingDefinitionBase {
    type: "image";
    default?: string;
}

export interface ColorSettingDefinition extends SettingDefinitionBase {
    type: "color";
    default?: HexColor;
}

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectSettingDefinition extends SettingDefinitionBase {
    type: "select";
    options: readonly SelectOption[];
    default?: string;
}

export interface CheckboxSettingDefinition extends SettingDefinitionBase {
    type: "checkbox";
    default?: boolean;
}

export interface RangeSettingDefinition extends SettingDefinitionBase {
    type: "range";
    min: number;
    max: number;
    step: number;
    unit?: string;
    default?: number;
}

export interface CollectionSettingDefinition extends SettingDefinitionBase {
    type: "collection";
    default?: CollectionHandle;
}

export interface ProductSettingDefinition extends SettingDefinitionBase {
    type: "product";
    default?: ProductHandle;
}

/**
 * Presentational settings (no input). `id` is still required so React keys are
 * stable, but the value is never read or written.
 */
export interface HeaderSettingDefinition extends SettingDefinitionBase {
    type: "header";
    content: string;
}

export interface ParagraphSettingDefinition extends SettingDefinitionBase {
    type: "paragraph";
    content: string;
}

export type SettingDefinition =
    | TextSettingDefinition
    | ImageSettingDefinition
    | ColorSettingDefinition
    | SelectSettingDefinition
    | CheckboxSettingDefinition
    | RangeSettingDefinition
    | CollectionSettingDefinition
    | ProductSettingDefinition
    | HeaderSettingDefinition
    | ParagraphSettingDefinition;

/**
 * The schema exposed by a block type. Returned by
 * `GET /api/webstore/blocks/<type>/schema/`.
 */
export interface BlockSchema {
    /** Block type identifier, e.g. "hero_banner". */
    type: string;
    /** Display name shown in the Add Section panel and the sidebar tree. */
    name: string;
    /** Optional preview image URL shown in the Add Section grid. */
    preview_image?: string;
    /** True if this block requires a purchase to use. */
    premium: boolean;
    /** Settings rendered for the section/root block itself. */
    settings: readonly SettingDefinition[];
    /** Nested block kinds this section can contain (e.g. slides inside a slideshow). */
    blocks?: readonly NestedBlockSchema[];
    /** Templates this block may be placed on. Empty / omitted means "any". */
    available_on?: readonly PageTemplate[];
    /** Maximum count of this block per template. Omit for no limit. */
    max_per_template?: number;
}

export interface NestedBlockSchema {
    type: string;
    name: string;
    settings: readonly SettingDefinition[];
    max_per_section?: number;
}

// ---------------------------------------------------------------------------
// Convenience aliases used by the customizer UI
// ---------------------------------------------------------------------------

/**
 * The "currently focused" target in the sidebar. The customizer either edits
 * global settings, a section, or a nested block inside a section.
 */
export type CustomizerSelection =
    | { kind: "global" }
    | { kind: "section"; template: PageTemplate | "layout"; sectionId: SectionId }
    | {
          kind: "block";
          template: PageTemplate | "layout";
          sectionId: SectionId;
          blockId: BlockId;
      };

/**
 * Save status surfaced in the customizer top bar.
 *   - "idle": no pending changes
 *   - "dirty": local edits have not been persisted yet (debounce in flight)
 *   - "saving": PATCH in flight
 *   - "saved": last save succeeded; will revert to "idle" shortly
 *   - "error": last save failed; UI keeps the dirty buffer
 */
export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";
