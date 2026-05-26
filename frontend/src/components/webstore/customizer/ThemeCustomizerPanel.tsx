"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
    ChevronLeft,
    Eye,
    EyeOff,
    GripVertical,
    Image as ImageIcon,
    Loader2,
    Plus,
    Search,
    Trash2,
    Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
    BlockConfig,
    BlockId,
    CustomizerSelection,
    PageTemplate,
    SectionConfig,
    SectionId,
    SettingDefinition,
    SettingPrimitive,
    SettingsMap,
    ThemeConfig,
} from "@/lib/webstore/types";
import { PAGE_TEMPLATES } from "@/lib/webstore/types";

// ===========================================================================
// Public props
// ===========================================================================

export interface ThemeCustomizerPanelProps {
    config: ThemeConfig;
    /** Schemas, keyed by section/block type, sourced from the block registry. */
    schemas: Readonly<Record<string, readonly SettingDefinition[]>>;
    currentTemplate: PageTemplate;
    selection: CustomizerSelection;
    onSelect: (next: CustomizerSelection) => void;
    onTemplateChange: (next: PageTemplate) => void;
    onUpdateGlobal: (next: ThemeConfig["global_settings"]) => void;
    onUpdateSectionSettings: (sectionId: SectionId, settings: SettingsMap) => void;
    onUpdateBlockSettings: (sectionId: SectionId, blockId: BlockId, settings: SettingsMap) => void;
    onReorderSections: (order: readonly SectionId[]) => void;
    onReorderBlocks: (sectionId: SectionId, blockOrder: readonly BlockId[]) => void;
    onToggleSection: (sectionId: SectionId, disabled: boolean) => void;
    onRemoveSection: (sectionId: SectionId) => void;
    onAddSection: () => void;
    onRemoveBlock: (sectionId: SectionId, blockId: BlockId) => void;
    /** Catalog endpoints — supplied by the parent so this component is decoupled
     * from data fetching. Each returns `{ value, label }` records. */
    fetchCollections?: () => Promise<readonly { value: string; label: string }[]>;
    fetchProducts?: (query: string) => Promise<readonly { value: string; label: string }[]>;
    /** Async uploader for ImageInput. Returns the public URL. */
    uploadImage?: (file: File) => Promise<string>;
}

// ===========================================================================
// Top-level panel — tabs + routing between the three views
// ===========================================================================

type PanelView = "theme" | "pages";

export function ThemeCustomizerPanel(props: ThemeCustomizerPanelProps) {
    const { selection } = props;
    const [view, setView] = useState<PanelView>(() =>
        selection.kind === "global" ? "theme" : "pages",
    );

    // Whenever a section/block becomes selected from the preview iframe,
    // ensure the user is looking at the Pages view (so the settings form
    // actually shows up).
    useEffect(() => {
        if (selection.kind !== "global") setView("pages");
    }, [selection]);

    return (
        <aside className="flex h-full w-90 shrink-0 flex-col border-r bg-card">
            <div className="flex items-center gap-1 border-b px-2 py-2">
                <TabButton active={view === "theme"} onClick={() => setView("theme")}>
                    Theme
                </TabButton>
                <TabButton active={view === "pages"} onClick={() => setView("pages")}>
                    Pages
                </TabButton>
            </div>

            <div className="flex-1 overflow-y-auto">
                {view === "theme" ? (
                    <GlobalSettingsPanel
                        value={props.config.global_settings}
                        onChange={props.onUpdateGlobal}
                        schemas={props.schemas}
                        uploadImage={props.uploadImage}
                        fetchCollections={props.fetchCollections}
                        fetchProducts={props.fetchProducts}
                    />
                ) : selection.kind === "block" ? (
                    <BlockSettingsView
                        {...props}
                        sectionId={selection.sectionId}
                        blockId={selection.blockId}
                    />
                ) : selection.kind === "section" ? (
                    <SectionSettingsView {...props} sectionId={selection.sectionId} />
                ) : (
                    <PagesView {...props} />
                )}
            </div>
        </aside>
    );
}

function TabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50",
            )}
        >
            {children}
        </button>
    );
}

// ===========================================================================
// Pages view — page selector + section list
// ===========================================================================

function PagesView(props: ThemeCustomizerPanelProps) {
    const template = props.config.templates[props.currentTemplate];
    const sections = template?.sections ?? {};
    const order = template?.order ?? [];

    return (
        <div className="space-y-3 p-3">
            <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Page
                </Label>
                <div className="grid grid-cols-4 gap-1">
                    {PAGE_TEMPLATES.map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => props.onTemplateChange(p)}
                            className={cn(
                                "rounded-md border px-2 py-1.5 text-xs capitalize transition-colors",
                                p === props.currentTemplate
                                    ? "border-primary bg-primary/5 text-primary"
                                    : "border-transparent text-muted-foreground hover:bg-muted",
                            )}
                        >
                            {p === "index" ? "Home" : p}
                        </button>
                    ))}
                </div>
            </div>

            <SectionList
                sections={sections}
                order={order}
                onSelect={(id) =>
                    props.onSelect({
                        kind: "section",
                        template: props.currentTemplate,
                        sectionId: id,
                    })
                }
                onReorder={props.onReorderSections}
                onToggle={props.onToggleSection}
                onRemove={props.onRemoveSection}
            />

            <Button
                variant="outline"
                className="w-full"
                onClick={props.onAddSection}
            >
                <Plus className="mr-2 h-4 w-4" /> Add section
            </Button>
        </div>
    );
}

// ===========================================================================
// Section list (lightweight reorder — no external DnD lib dependency)
// ===========================================================================

function SectionList({
    sections,
    order,
    onSelect,
    onReorder,
    onToggle,
    onRemove,
}: {
    sections: Readonly<Record<SectionId, SectionConfig>>;
    order: readonly SectionId[];
    onSelect: (id: SectionId) => void;
    onReorder: (next: readonly SectionId[]) => void;
    onToggle: (id: SectionId, disabled: boolean) => void;
    onRemove: (id: SectionId) => void;
}) {
    // Minimal HTML5 drag-and-drop. The production version should switch to
    // @dnd-kit/sortable to match the menu editor; this keeps the component
    // self-contained while the dnd plumbing is wired into the customizer.
    const [draggingId, setDraggingId] = useState<SectionId | null>(null);

    const handleDrop = (targetId: SectionId) => {
        if (!draggingId || draggingId === targetId) return;
        const next = order.filter((id) => id !== draggingId);
        const targetIndex = next.indexOf(targetId);
        next.splice(targetIndex, 0, draggingId);
        onReorder(next);
        setDraggingId(null);
    };

    return (
        <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Sections
            </Label>
            <ul className="divide-y rounded-md border">
                {order.length === 0 && (
                    <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                        No sections yet. Click “Add section” below.
                    </li>
                )}
                {order.map((id) => {
                    const section = sections[id];
                    if (!section) return null;
                    return (
                        <li
                            key={id}
                            draggable
                            onDragStart={() => setDraggingId(id)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop(id)}
                            className={cn(
                                "flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted/40",
                                draggingId === id && "opacity-50",
                            )}
                        >
                            <GripVertical className="h-3.5 w-3.5 cursor-grab text-muted-foreground" />
                            <button
                                type="button"
                                onClick={() => onSelect(id)}
                                className="flex-1 truncate text-left"
                            >
                                <span className="capitalize">
                                    {section.type.replace(/_/g, " ")}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onToggle(id, !section.disabled)}
                                title={section.disabled ? "Show section" : "Hide section"}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                {section.disabled ? (
                                    <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                    <Eye className="h-3.5 w-3.5" />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => onRemove(id)}
                                title="Remove section"
                                className="text-muted-foreground hover:text-destructive"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

// ===========================================================================
// Section settings view — auto-generated form
// ===========================================================================

function SectionSettingsView(
    props: ThemeCustomizerPanelProps & { sectionId: SectionId },
) {
    const template = props.config.templates[props.currentTemplate];
    const section = template?.sections[props.sectionId];
    const schema = section ? props.schemas[section.type] ?? [] : [];

    if (!section) {
        return (
            <div className="p-6 text-sm text-muted-foreground">
                Section not found. It may have been removed.
            </div>
        );
    }

    const handleSettingChange = (settingId: string, value: SettingPrimitive) => {
        props.onUpdateSectionSettings(props.sectionId, {
            ...section.settings,
            [settingId]: value,
        });
    };

    return (
        <div className="space-y-3 p-3">
            <div className="flex items-center gap-1.5 border-b pb-2">
                <button
                    type="button"
                    onClick={() => props.onSelect({ kind: "global" })}
                    aria-label="Back to sections"
                    className="text-muted-foreground hover:text-foreground"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <h3 className="text-sm font-semibold capitalize">
                    {section.type.replace(/_/g, " ")}
                </h3>
            </div>

            <SchemaForm
                schema={schema}
                values={section.settings}
                onChange={handleSettingChange}
                uploadImage={props.uploadImage}
                fetchCollections={props.fetchCollections}
                fetchProducts={props.fetchProducts}
            />

            {/* Block list — rendered below section settings when the section
                has nested blocks (e.g. a slideshow with slides). */}
            {section.block_order.length > 0 && (
                <BlockList
                    section={section}
                    schemas={props.schemas}
                    sectionId={props.sectionId}
                    currentTemplate={props.currentTemplate}
                    onSelect={props.onSelect}
                    onReorderBlocks={props.onReorderBlocks}
                    onRemoveBlock={props.onRemoveBlock}
                />
            )}
        </div>
    );
}

// ===========================================================================
// Block list — nested blocks within a section
// ===========================================================================

function BlockList({
    section,
    schemas: _schemas,
    sectionId,
    currentTemplate,
    onSelect,
    onReorderBlocks,
    onRemoveBlock,
}: {
    section: SectionConfig;
    schemas: ThemeCustomizerPanelProps["schemas"];
    sectionId: SectionId;
    currentTemplate: PageTemplate;
    onSelect: ThemeCustomizerPanelProps["onSelect"];
    onReorderBlocks: ThemeCustomizerPanelProps["onReorderBlocks"];
    onRemoveBlock: ThemeCustomizerPanelProps["onRemoveBlock"];
}) {
    const [draggingId, setDraggingId] = useState<BlockId | null>(null);

    const handleDrop = (targetId: BlockId) => {
        if (!draggingId || draggingId === targetId) return;
        const next = section.block_order.filter((id) => id !== draggingId);
        const targetIndex = next.indexOf(targetId);
        const mutable = [...next];
        mutable.splice(targetIndex, 0, draggingId);
        onReorderBlocks(sectionId, mutable);
        setDraggingId(null);
    };

    return (
        <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Blocks
            </Label>
            <ul className="divide-y rounded-md border">
                {section.block_order.map((blockId) => {
                    const block = section.blocks[blockId];
                    if (!block) return null;
                    return (
                        <li
                            key={blockId}
                            draggable
                            onDragStart={() => setDraggingId(blockId)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop(blockId)}
                            className={cn(
                                "flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted/40",
                                draggingId === blockId && "opacity-50",
                            )}
                        >
                            <GripVertical className="h-3.5 w-3.5 cursor-grab text-muted-foreground" />
                            <button
                                type="button"
                                onClick={() =>
                                    onSelect({
                                        kind: "block",
                                        template: currentTemplate,
                                        sectionId,
                                        blockId,
                                    })
                                }
                                className="flex-1 truncate text-left"
                            >
                                <span className="capitalize">
                                    {block.type.replace(/_/g, " ")}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onRemoveBlock(sectionId, blockId)}
                                title="Remove block"
                                className="text-muted-foreground hover:text-destructive"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

// ===========================================================================
// Block settings view — settings for a nested block inside a section
// ===========================================================================

function BlockSettingsView(
    props: ThemeCustomizerPanelProps & { sectionId: SectionId; blockId: BlockId },
) {
    const template = props.config.templates[props.currentTemplate];
    const section = template?.sections[props.sectionId];
    const block: BlockConfig | undefined = section?.blocks[props.blockId];
    const schema = block ? props.schemas[block.type] ?? [] : [];

    if (!block || !section) {
        return (
            <div className="p-6 text-sm text-muted-foreground">
                Block not found. It may have been removed.
            </div>
        );
    }

    const handleSettingChange = (settingId: string, value: SettingPrimitive) => {
        props.onUpdateBlockSettings(props.sectionId, props.blockId, {
            ...block.settings,
            [settingId]: value,
        });
    };

    return (
        <div className="space-y-3 p-3">
            <div className="flex items-center gap-1.5 border-b pb-2">
                <button
                    type="button"
                    onClick={() =>
                        props.onSelect({
                            kind: "section",
                            template: props.currentTemplate,
                            sectionId: props.sectionId,
                        })
                    }
                    aria-label="Back to section"
                    className="text-muted-foreground hover:text-foreground"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <h3 className="text-sm font-semibold capitalize">
                    {block.type.replace(/_/g, " ")}
                </h3>
            </div>

            <SchemaForm
                schema={schema}
                values={block.settings}
                onChange={handleSettingChange}
                uploadImage={props.uploadImage}
                fetchCollections={props.fetchCollections}
                fetchProducts={props.fetchProducts}
            />
        </div>
    );
}

// ===========================================================================
// Global settings panel
// ===========================================================================

function GlobalSettingsPanel({
    value,
    onChange,
    schemas: _schemas,
    uploadImage,
    fetchCollections,
    fetchProducts,
}: {
    value: ThemeConfig["global_settings"];
    onChange: (next: ThemeConfig["global_settings"]) => void;
    schemas: ThemeCustomizerPanelProps["schemas"];
    uploadImage?: ThemeCustomizerPanelProps["uploadImage"];
    fetchCollections?: ThemeCustomizerPanelProps["fetchCollections"];
    fetchProducts?: ThemeCustomizerPanelProps["fetchProducts"];
}) {
    // Inline static schema for the global tab. We could also drive this from
    // the backend (`/api/webstore/customizer/global-schema/`) but the global
    // shape is part of our hard contract and rarely changes.
    const globalSchema: readonly SettingDefinition[] = useMemo(
        () => [
            { id: "__header_colors", type: "header", content: "Colors" },
            { id: "colors.primary", type: "color", label: "Primary" },
            { id: "colors.secondary", type: "color", label: "Secondary" },
            { id: "colors.background", type: "color", label: "Background" },
            { id: "colors.text", type: "color", label: "Text" },
            { id: "colors.accent", type: "color", label: "Accent" },
            { id: "__header_type", type: "header", content: "Typography" },
            { id: "typography.heading_font", type: "text", label: "Heading font" },
            { id: "typography.body_font", type: "text", label: "Body font" },
            {
                id: "typography.heading_size_scale",
                type: "range",
                label: "Heading size scale",
                min: 0.8,
                max: 1.4,
                step: 0.05,
            },
            { id: "__header_social", type: "header", content: "Social" },
            { id: "social.facebook", type: "url", label: "Facebook URL" },
            { id: "social.instagram", type: "url", label: "Instagram URL" },
            { id: "social.tiktok", type: "url", label: "TikTok URL" },
            { id: "social.youtube", type: "url", label: "YouTube URL" },
        ],
        [],
    );

    const flat = useMemo(() => flattenGlobalSettings(value), [value]);

    return (
        <div className="space-y-3 p-3">
            <SchemaForm
                schema={globalSchema}
                values={flat}
                onChange={(settingId, primitive) => {
                    const next = applyGlobalSettingChange(value, settingId, primitive);
                    onChange(next);
                }}
                uploadImage={uploadImage}
                fetchCollections={fetchCollections}
                fetchProducts={fetchProducts}
            />
        </div>
    );
}

// Convert nested global_settings → flat `{ "colors.primary": "#xxx", ... }` so
// the same SchemaForm component can drive both flat (section) and nested
// (global) settings.
function flattenGlobalSettings(
    value: ThemeConfig["global_settings"],
): SettingsMap {
    return {
        "colors.primary": value.colors.primary,
        "colors.secondary": value.colors.secondary,
        "colors.background": value.colors.background,
        "colors.text": value.colors.text,
        "colors.accent": value.colors.accent,
        "typography.heading_font": value.typography.heading_font,
        "typography.body_font": value.typography.body_font,
        "typography.heading_size_scale": value.typography.heading_size_scale,
        "social.facebook": value.social.facebook,
        "social.instagram": value.social.instagram,
        "social.tiktok": value.social.tiktok,
        "social.youtube": value.social.youtube,
    };
}

function applyGlobalSettingChange(
    value: ThemeConfig["global_settings"],
    path: string,
    primitive: SettingPrimitive,
): ThemeConfig["global_settings"] {
    const [group, key] = path.split(".") as [
        keyof ThemeConfig["global_settings"],
        string,
    ];
    if (!group || !key) return value;
    return {
        ...value,
        [group]: {
            ...(value[group] as Record<string, unknown>),
            [key]: primitive,
        },
    };
}

// ===========================================================================
// Schema-driven form renderer
// ===========================================================================

function SchemaForm({
    schema,
    values,
    onChange,
    uploadImage,
    fetchCollections,
    fetchProducts,
}: {
    schema: readonly SettingDefinition[];
    values: SettingsMap;
    onChange: (settingId: string, value: SettingPrimitive) => void;
    uploadImage?: ThemeCustomizerPanelProps["uploadImage"];
    fetchCollections?: ThemeCustomizerPanelProps["fetchCollections"];
    fetchProducts?: ThemeCustomizerPanelProps["fetchProducts"];
}) {
    return (
        <div className="space-y-3">
            {schema.map((def) => (
                <SettingField
                    key={def.id}
                    definition={def}
                    value={values[def.id] ?? def.type === "checkbox" ? false : null}
                    onChange={(next) => onChange(def.id, next)}
                    uploadImage={uploadImage}
                    fetchCollections={fetchCollections}
                    fetchProducts={fetchProducts}
                />
            ))}
        </div>
    );
}

function SettingField({
    definition,
    value,
    onChange,
    uploadImage,
    fetchCollections,
    fetchProducts,
}: {
    definition: SettingDefinition;
    value: SettingPrimitive;
    onChange: (next: SettingPrimitive) => void;
    uploadImage?: ThemeCustomizerPanelProps["uploadImage"];
    fetchCollections?: ThemeCustomizerPanelProps["fetchCollections"];
    fetchProducts?: ThemeCustomizerPanelProps["fetchProducts"];
}) {
    switch (definition.type) {
        case "header":
            return (
                <h4 className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {definition.content}
                </h4>
            );
        case "paragraph":
            return (
                <p className="text-xs text-muted-foreground">{definition.content}</p>
            );
        case "text":
        case "url":
            return (
                <FieldShell label={definition.label}>
                    <Input
                        type={definition.type === "url" ? "url" : "text"}
                        value={(value as string) ?? ""}
                        placeholder={definition.placeholder}
                        onChange={(e) => onChange(e.target.value)}
                    />
                </FieldShell>
            );
        case "textarea":
            return (
                <FieldShell label={definition.label}>
                    <Textarea
                        value={(value as string) ?? ""}
                        placeholder={definition.placeholder}
                        onChange={(e) => onChange(e.target.value)}
                        rows={3}
                    />
                </FieldShell>
            );
        case "richtext":
            // Embedded rich text gets a textarea fallback here; the real
            // editor (RichTextEditor.tsx) is wired up in Phase 6 alongside
            // the consumer rich-text blocks.
            return (
                <FieldShell label={definition.label}>
                    <Textarea
                        value={(value as string) ?? ""}
                        onChange={(e) => onChange(e.target.value)}
                        rows={5}
                    />
                </FieldShell>
            );
        case "color":
            return (
                <ColorInput
                    label={definition.label}
                    value={(value as string) ?? "#000000"}
                    onChange={onChange}
                />
            );
        case "checkbox":
            return (
                <div className="flex items-center justify-between">
                    <Label className="text-sm">{definition.label}</Label>
                    <Switch
                        checked={Boolean(value)}
                        onCheckedChange={(checked) => onChange(checked)}
                    />
                </div>
            );
        case "range":
            return (
                <RangeInput
                    label={definition.label}
                    value={(value as number) ?? definition.min}
                    min={definition.min}
                    max={definition.max}
                    step={definition.step}
                    unit={definition.unit}
                    onChange={onChange}
                />
            );
        case "select":
            return (
                <FieldShell label={definition.label}>
                    <select
                        value={(value as string) ?? ""}
                        onChange={(e) => onChange(e.target.value)}
                        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                    >
                        {definition.options.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </FieldShell>
            );
        case "image":
            return (
                <ImageInput
                    label={definition.label}
                    value={(value as string) ?? ""}
                    onChange={onChange}
                    uploadImage={uploadImage}
                />
            );
        case "collection":
            return (
                <ResourcePicker
                    label={definition.label}
                    value={(value as string) ?? ""}
                    placeholder="Select collection…"
                    fetcher={fetchCollections}
                    onChange={onChange}
                />
            );
        case "product":
            return (
                <ResourcePicker
                    label={definition.label}
                    value={(value as string) ?? ""}
                    placeholder="Select product…"
                    fetcher={fetchProducts ? (q) => fetchProducts(q) : undefined}
                    onChange={onChange}
                    searchable
                />
            );
        default: {
            // Exhaustiveness guard
            const _exhaustive: never = definition;
            return _exhaustive;
        }
    }
}

function FieldShell({
    label,
    children,
}: {
    label?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            {label && <Label className="text-xs">{label}</Label>}
            {children}
        </div>
    );
}

// ===========================================================================
// Specialised inputs
// ===========================================================================

function ColorInput({
    label,
    value,
    onChange,
}: {
    label?: string;
    value: string;
    onChange: (next: string) => void;
}) {
    const safe = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : "#000000";
    return (
        <FieldShell label={label}>
            <div className="flex items-center gap-2">
                <label
                    className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md border"
                    style={{ backgroundColor: safe }}
                >
                    <input
                        type="color"
                        value={safe}
                        onChange={(e) => onChange(e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        aria-label={label ? `${label} color picker` : "Color picker"}
                    />
                </label>
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    spellCheck={false}
                    className="font-mono text-xs uppercase"
                />
            </div>
        </FieldShell>
    );
}

function RangeInput({
    label,
    value,
    min,
    max,
    step,
    unit,
    onChange,
}: {
    label?: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    onChange: (next: number) => void;
}) {
    return (
        <FieldShell label={label}>
            <div className="flex items-center gap-2">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="h-2 flex-1 cursor-pointer accent-primary"
                />
                <span className="w-14 text-right font-mono text-xs text-muted-foreground">
                    {value.toFixed(step < 1 ? 2 : 0)}
                    {unit ?? ""}
                </span>
            </div>
        </FieldShell>
    );
}

function ImageInput({
    label,
    value,
    onChange,
    uploadImage,
}: {
    label?: string;
    value: string;
    onChange: (next: string) => void;
    uploadImage?: (file: File) => Promise<string>;
}) {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFile = useCallback(
        async (file: File) => {
            if (!uploadImage) {
                setError("Image upload is not configured.");
                return;
            }
            setError(null);
            setIsUploading(true);
            try {
                const url = await uploadImage(file);
                onChange(url);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Upload failed");
            } finally {
                setIsUploading(false);
            }
        },
        [uploadImage, onChange],
    );

    return (
        <FieldShell label={label}>
            <div className="flex items-center gap-2">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                    {value ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={value}
                            alt=""
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                    {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                            <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                    )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                    <label className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border bg-background px-2 text-xs hover:bg-muted">
                        <Upload className="h-3.5 w-3.5" />
                        <span>{value ? "Replace" : "Upload"}</span>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) void handleFile(f);
                                e.target.value = "";
                            }}
                        />
                    </label>
                    {value && (
                        <button
                            type="button"
                            onClick={() => onChange("")}
                            className="text-left text-xs text-muted-foreground hover:text-destructive"
                        >
                            Remove
                        </button>
                    )}
                </div>
            </div>
            {error && (
                <p className="text-xs text-destructive">{error}</p>
            )}
        </FieldShell>
    );
}

function ResourcePicker({
    label,
    value,
    placeholder,
    fetcher,
    onChange,
    searchable = false,
}: {
    label?: string;
    value: string;
    placeholder: string;
    fetcher?: (query: string) => Promise<readonly { value: string; label: string }[]>;
    onChange: (next: string) => void;
    searchable?: boolean;
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<readonly { value: string; label: string }[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !fetcher) return;
        let cancelled = false;
        setIsLoading(true);
        fetcher(query)
            .then((rows) => {
                if (!cancelled) setResults(rows);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [isOpen, query, fetcher]);

    return (
        <FieldShell label={label}>
            <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                className="flex h-9 w-full items-center justify-between rounded-md border bg-background px-2 text-sm"
            >
                <span className={cn(!value && "text-muted-foreground")}>
                    {value || placeholder}
                </span>
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {isOpen && (
                <div className="rounded-md border bg-popover p-1 shadow-sm">
                    {searchable && (
                        <Input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search…"
                            className="mb-1 h-8"
                        />
                    )}
                    {isLoading && (
                        <div className="flex items-center justify-center py-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    {!isLoading && results.length === 0 && (
                        <p className="px-2 py-1.5 text-xs text-muted-foreground">
                            No results
                        </p>
                    )}
                    <ul className="max-h-60 overflow-y-auto">
                        {results.map((r) => (
                            <li key={r.value}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(r.value);
                                        setIsOpen(false);
                                    }}
                                    className="block w-full truncate rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                                >
                                    {r.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </FieldShell>
    );
}
