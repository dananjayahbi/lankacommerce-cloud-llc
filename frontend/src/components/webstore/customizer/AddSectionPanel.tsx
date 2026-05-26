"use client";

import { useMemo, useState } from "react";

import { Lock, Search, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { BlockSchema, PageTemplate } from "@/lib/webstore/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AddSectionPanelProps {
    open: boolean;
    onClose: () => void;
    /** All known block schemas keyed by type. */
    schemas: Record<string, BlockSchema>;
    /** The page template currently shown in the sidebar — used to filter
     * schemas to those available on this template. */
    currentTemplate: PageTemplate;
    /** Set of block types the tenant has purchased (unlocked premium blocks). */
    purchasedBlocks?: ReadonlySet<string>;
    /** Called when the merchant clicks a block type card to add it. */
    onSelect: (schema: BlockSchema) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddSectionPanel({
    open,
    onClose,
    schemas,
    currentTemplate,
    purchasedBlocks = new Set(),
    onSelect,
}: AddSectionPanelProps) {
    const [query, setQuery] = useState("");

    // Filter to blocks available on this template and matching the search
    // query.  Non-premium OR purchased blocks are always shown; purely
    // premium ones are shown with an "Unavailable" overlay.
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return Object.values(schemas).filter((schema) => {
            // Availability filter: skip blocks explicitly unavailable on this
            // template (empty / absent `available_on` means "any template").
            if (
                schema.available_on &&
                schema.available_on.length > 0 &&
                !schema.available_on.includes(currentTemplate)
            ) {
                return false;
            }
            // Text filter.
            if (q && !schema.name.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [schemas, currentTemplate, query]);

    const handleSelect = (schema: BlockSchema) => {
        // Premium blocks that are not purchased cannot be added.
        if (schema.premium && !purchasedBlocks.has(schema.type)) return;
        onSelect(schema);
        onClose();
        setQuery("");
    };

    return (
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
            <SheetContent
                side="left"
                // Override the default side so the block library appears as a
                // second panel to the right of the customizer sidebar, not on
                // top of the preview.
                className="w-80 p-0"
                onCloseAutoFocus={(e) => e.preventDefault()}
            >
                <SheetHeader className="border-b px-4 py-3">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-sm font-semibold">
                            Add section
                        </SheetTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={onClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="relative mt-1">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search sections…"
                            className="h-8 pl-8 text-sm"
                        />
                    </div>
                </SheetHeader>

                <div className="overflow-y-auto p-3">
                    {filtered.length === 0 ? (
                        <p className="py-8 text-center text-xs text-muted-foreground">
                            No sections found.
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {filtered.map((schema) => {
                                const isPremium = schema.premium;
                                const isLocked = isPremium && !purchasedBlocks.has(schema.type);
                                return (
                                    <BlockTypeCard
                                        key={schema.type}
                                        schema={schema}
                                        isPremium={isPremium}
                                        isLocked={isLocked}
                                        onSelect={handleSelect}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

// ---------------------------------------------------------------------------
// Block type card
// ---------------------------------------------------------------------------

function BlockTypeCard({
    schema,
    isPremium,
    isLocked,
    onSelect,
}: {
    schema: BlockSchema;
    isPremium: boolean;
    isLocked: boolean;
    onSelect: (schema: BlockSchema) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => onSelect(schema)}
            disabled={isLocked}
            className={cn(
                "group relative flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-colors",
                isLocked
                    ? "cursor-not-allowed opacity-60"
                    : "hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
            )}
        >
            {/* Preview image or placeholder */}
            <div className="relative aspect-video w-full overflow-hidden bg-muted">
                {schema.preview_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={schema.preview_image}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <BlockPlaceholderIcon />
                )}
                {/* Locked overlay */}
                {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                    </div>
                )}
            </div>

            {/* Name + badges */}
            <div className="flex items-start justify-between gap-1 p-2">
                <span className="text-xs font-medium leading-tight">{schema.name}</span>
                {isPremium && (
                    <Badge
                        variant="secondary"
                        className="shrink-0 gap-0.5 px-1 py-0 text-[9px] uppercase"
                    >
                        <Sparkles className="h-2.5 w-2.5" />
                        Pro
                    </Badge>
                )}
            </div>
        </button>
    );
}

function BlockPlaceholderIcon() {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <svg
                className="h-8 w-8 text-muted-foreground/30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" />
                <path d="M3 9h18M9 21V9" strokeWidth="1.5" />
            </svg>
        </div>
    );
}
