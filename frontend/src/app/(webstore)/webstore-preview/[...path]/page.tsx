/**
 * Storefront preview route — the iframe target for the visual theme customizer.
 *
 * URL: /webstore-preview/<template>?preview=draft
 *
 * Lifecycle:
 *   1. Mount → fetch DRAFT config from the customizer API (initial render).
 *   2. POST `LANKA_READY` to `window.parent` with our protocol version.
 *   3. Listen for parent → iframe messages and apply structural mutations to
 *      local React state. React's reconciler handles partial re-renders.
 *   4. Block real e-commerce navigation (add-to-cart, checkout, external
 *      links) and POST `LANKA_NAVIGATION_BLOCKED` to the parent instead.
 *
 * Security:
 *   - `event.origin` must equal `window.location.origin` AND
 *     `event.source` must equal `window.parent`. Anything else is dropped.
 *   - Outbound `postMessage` always uses an explicit `targetOrigin` (never
 *     `"*"`); the origin is captured at mount and never changes.
 *   - Mount is gated by a real auth check (cookie-based access token) — but
 *     that is enforced by the layout above (see route group `(webstore)`).
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { notFound, useParams, useSearchParams } from "next/navigation";

import { useAuthStore } from "@/stores/authStore";
import {
    PROTOCOL_VERSION,
    IFrameToParentMessageType,
    isParentToIFrameMessage,
    makeMessage,
    type LankaMessageType,
    type PayloadOf,
} from "@/lib/webstore/postMessageTypes";
import type {
    DraftConfigEnvelope,
    PageTemplate,
    SectionConfig,
    SectionId,
    SettingsMap,
    ThemeConfig,
} from "@/lib/webstore/types";
import { PAGE_TEMPLATES } from "@/lib/webstore/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const VALID_TEMPLATES = new Set<PageTemplate>(PAGE_TEMPLATES);

function isPageTemplate(value: string): value is PageTemplate {
    return VALID_TEMPLATES.has(value as PageTemplate);
}

export default function WebstorePreviewPage() {
    const params = useParams<{ path: string | string[] }>();
    const searchParams = useSearchParams();
    const accessToken = useAuthStore((s) => s.accessToken);

    // First path segment is the template; subsequent segments are ignored
    // here (Phase 7 will use them for product/collection handles).
    const rawSegment = useMemo(() => {
        const path = params?.path;
        if (Array.isArray(path)) return path[0];
        return path ?? "index";
    }, [params]);

    if (!isPageTemplate(rawSegment)) {
        notFound();
    }
    const template = rawSegment;

    // Preview-only routes require this flag — guards against accidentally
    // linking the preview from the consumer storefront.
    const isPreviewMode = searchParams?.get("preview") === "draft";

    // -----------------------------------------------------------------------
    // Parent-origin lock
    // -----------------------------------------------------------------------

    // The expected parent origin equals our own — the customizer renders the
    // preview on the same tenant subdomain. We capture it once at mount.
    const [parentOrigin] = useState<string>(() =>
        typeof window !== "undefined" ? window.location.origin : "",
    );

    const post = useCallback(
        <TType extends LankaMessageType>(
            type: TType,
            payload: PayloadOf<TType>,
        ) => {
            if (typeof window === "undefined") return;
            if (!window.parent || window.parent === window) return;
            window.parent.postMessage(makeMessage(type, payload), parentOrigin);
        },
        [parentOrigin],
    );

    // -----------------------------------------------------------------------
    // Local mutable config (driven by postMessages after initial fetch)
    // -----------------------------------------------------------------------

    const [config, setConfig] = useState<ThemeConfig | null>(null);
    const [hasFetched, setHasFetched] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        if (!isPreviewMode || !accessToken || hasFetched) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(
                    `${API_BASE}/api/webstore/customizer/draft-config/`,
                    { headers: { Authorization: `Bearer ${accessToken}` } },
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const envelope = (await res.json()) as DraftConfigEnvelope;
                if (!cancelled) {
                    setConfig(envelope.config);
                    setHasFetched(true);
                }
            } catch (err) {
                if (!cancelled) {
                    setFetchError(
                        err instanceof Error ? err.message : "Unknown error",
                    );
                    post(IFrameToParentMessageType.PREVIEW_ERROR, {
                        message: "Failed to load draft config",
                        detail: String(err),
                    });
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isPreviewMode, accessToken, hasFetched, post]);

    // -----------------------------------------------------------------------
    // postMessage listener — parent → iframe mutations
    // -----------------------------------------------------------------------

    useEffect(() => {
        function listener(event: MessageEvent<unknown>) {
            // 1. Source: only accept from our parent frame.
            if (event.source !== window.parent) return;
            // 2. Origin: must match the locked origin.
            if (event.origin !== parentOrigin) return;
            // 3. Structural: must be a valid Parent→IFrame message.
            if (!isParentToIFrameMessage(event.data)) return;

            const message = event.data;
            switch (message.type) {
                case "LANKA_INIT":
                    setConfig(message.payload.config);
                    setHasFetched(true);
                    break;
                case "LANKA_UPDATE_GLOBAL":
                    setConfig((c) =>
                        c
                            ? { ...c, global_settings: message.payload.global_settings }
                            : c,
                    );
                    break;
                case "LANKA_UPDATE_SECTION":
                    setConfig((c) =>
                        applySectionPatch(c, message.payload.template, message.payload.sectionId, (s) => ({
                            ...s,
                            settings: message.payload.settings,
                        })),
                    );
                    break;
                case "LANKA_UPDATE_BLOCK":
                    setConfig((c) =>
                        applySectionPatch(c, message.payload.template, message.payload.sectionId, (s) => {
                            const block = s.blocks[message.payload.blockId];
                            if (!block) return s;
                            return {
                                ...s,
                                blocks: {
                                    ...s.blocks,
                                    [message.payload.blockId]: {
                                        ...block,
                                        settings: message.payload.settings,
                                    },
                                },
                            };
                        }),
                    );
                    break;
                case "LANKA_REORDER_SECTIONS":
                    setConfig((c) =>
                        applyTemplatePatch(c, message.payload.template, (t) => ({
                            ...t,
                            order: message.payload.order,
                        })),
                    );
                    break;
                case "LANKA_REORDER_BLOCKS":
                    setConfig((c) =>
                        applySectionPatch(c, message.payload.template, message.payload.sectionId, (s) => ({
                            ...s,
                            block_order: message.payload.block_order,
                        })),
                    );
                    break;
                case "LANKA_ADD_SECTION":
                    setConfig((c) =>
                        applyTemplatePatch(c, message.payload.template, (t) => {
                            const order = [...t.order];
                            const idx =
                                message.payload.index ?? order.length;
                            order.splice(idx, 0, message.payload.sectionId);
                            return {
                                ...t,
                                sections: {
                                    ...t.sections,
                                    [message.payload.sectionId]: message.payload.config,
                                },
                                order,
                            };
                        }),
                    );
                    break;
                case "LANKA_REMOVE_SECTION":
                    setConfig((c) =>
                        applyTemplatePatch(c, message.payload.template, (t) => {
                            const sections = { ...t.sections };
                            delete sections[message.payload.sectionId];
                            return {
                                ...t,
                                sections,
                                order: t.order.filter(
                                    (id) => id !== message.payload.sectionId,
                                ),
                            };
                        }),
                    );
                    break;
                case "LANKA_ADD_BLOCK":
                    setConfig((c) =>
                        applySectionPatch(c, message.payload.template, message.payload.sectionId, (s) => {
                            const order = [...s.block_order];
                            const idx = message.payload.index ?? order.length;
                            order.splice(idx, 0, message.payload.blockId);
                            return {
                                ...s,
                                blocks: {
                                    ...s.blocks,
                                    [message.payload.blockId]: message.payload.config,
                                },
                                block_order: order,
                            };
                        }),
                    );
                    break;
                case "LANKA_REMOVE_BLOCK":
                    setConfig((c) =>
                        applySectionPatch(c, message.payload.template, message.payload.sectionId, (s) => {
                            const blocks = { ...s.blocks };
                            delete blocks[message.payload.blockId];
                            return {
                                ...s,
                                blocks,
                                block_order: s.block_order.filter(
                                    (id) => id !== message.payload.blockId,
                                ),
                            };
                        }),
                    );
                    break;
                case "LANKA_TOGGLE_SECTION":
                    setConfig((c) =>
                        applySectionPatch(c, message.payload.template, message.payload.sectionId, (s) => ({
                            ...s,
                            disabled: message.payload.disabled,
                        })),
                    );
                    break;
                case "LANKA_NAVIGATE":
                    // The parent has navigated to a new template. The parent
                    // also bumps the iframe `src`, but we honour an in-place
                    // navigate too so updates land instantly.
                    if (message.payload.page !== template) {
                        window.location.href = `/webstore-preview/${message.payload.page}?preview=draft`;
                    }
                    break;
                case "LANKA_HIGHLIGHT_SECTION":
                    // Visual-only ack — section outlines are owned by the
                    // ThemeRenderer (Phase 6). No-op here.
                    break;
                default:
                    break;
            }
        }

        window.addEventListener("message", listener);
        return () => window.removeEventListener("message", listener);
    }, [parentOrigin, template]);

    // -----------------------------------------------------------------------
    // READY handshake — sent once we are mounted and listening.
    // -----------------------------------------------------------------------

    useEffect(() => {
        if (typeof window === "undefined") return;
        post(IFrameToParentMessageType.READY, {
            version: PROTOCOL_VERSION,
            page: template,
        });
    }, [post, template]);

    // -----------------------------------------------------------------------
    // E-commerce blocker — intercept clicks that would navigate away.
    // -----------------------------------------------------------------------

    useEffect(() => {
        function clickHandler(e: MouseEvent) {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            const anchor = target.closest("a") as HTMLAnchorElement | null;
            const button = target.closest("[data-cart-action]") as HTMLElement | null;

            if (button) {
                e.preventDefault();
                e.stopPropagation();
                post(IFrameToParentMessageType.NAVIGATION_BLOCKED, {
                    href: button.getAttribute("data-cart-action") ?? "",
                    reason: "add_to_cart",
                });
                return;
            }
            if (!anchor) return;
            const href = anchor.getAttribute("href");
            if (!href || href.startsWith("#")) return;

            let reason: PayloadOf<"LANKA_NAVIGATION_BLOCKED">["reason"] = "other";
            try {
                const url = new URL(href, window.location.origin);
                if (url.origin !== window.location.origin) reason = "external";
                else if (url.pathname.startsWith("/checkout")) reason = "checkout";
                else if (url.pathname.startsWith("/account")) reason = "auth_required";
            } catch {
                /* malformed href → leave reason as "other" */
            }

            e.preventDefault();
            e.stopPropagation();
            post(IFrameToParentMessageType.NAVIGATION_BLOCKED, { href, reason });
        }

        document.addEventListener("click", clickHandler, true);
        return () => document.removeEventListener("click", clickHandler, true);
    }, [post]);

    // -----------------------------------------------------------------------
    // Section click broadcaster — exposed as a delegated listener so the
    // ThemeRenderer (Phase 6) only needs to put `data-section-id` on its
    // root element to opt in.
    // -----------------------------------------------------------------------

    useEffect(() => {
        function sectionClick(e: MouseEvent) {
            const target = e.target as HTMLElement | null;
            const node = target?.closest("[data-section-id]") as HTMLElement | null;
            if (!node) return;
            const sectionId = node.getAttribute("data-section-id");
            if (!sectionId) return;
            const scope = (node.getAttribute("data-section-scope") ?? template) as PageTemplate | "layout";
            post(IFrameToParentMessageType.SECTION_CLICK, {
                template: scope,
                sectionId,
            });
        }
        document.addEventListener("click", sectionClick);
        return () => document.removeEventListener("click", sectionClick);
    }, [post, template]);

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    if (!isPreviewMode) {
        return (
            <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
                Preview unavailable.
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-2 text-sm text-destructive">
                <p>Failed to load preview: {fetchError}</p>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
                Loading preview…
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <PreviewBadge />
            <ThemePlaceholderRenderer config={config} template={template} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function applyTemplatePatch(
    config: ThemeConfig | null,
    scope: PageTemplate | "layout",
    patch: (t: NonNullable<ThemeConfig["templates"][PageTemplate]>) => NonNullable<ThemeConfig["templates"][PageTemplate]>,
): ThemeConfig | null {
    if (!config) return config;
    if (scope === "layout") return config; // header/footer live under `layout`, handled separately if needed.
    const tmpl = config.templates[scope];
    if (!tmpl) return config;
    return {
        ...config,
        templates: { ...config.templates, [scope]: patch(tmpl) },
    };
}

function applySectionPatch(
    config: ThemeConfig | null,
    scope: PageTemplate | "layout",
    sectionId: SectionId,
    patch: (s: SectionConfig) => SectionConfig,
): ThemeConfig | null {
    if (!config) return config;
    if (scope === "layout") {
        // Targets either header or footer — match by section id == "header"|"footer".
        if (sectionId !== "header" && sectionId !== "footer") return config;
        return {
            ...config,
            layout: {
                ...config.layout,
                [sectionId]: patch(config.layout[sectionId]),
            },
        };
    }
    return applyTemplatePatch(config, scope, (t) => {
        const section = t.sections[sectionId];
        if (!section) return t;
        return {
            ...t,
            sections: { ...t.sections, [sectionId]: patch(section) },
        };
    });
}

function PreviewBadge() {
    return (
        <div
            className="pointer-events-none fixed left-2 top-2 z-50 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow"
            data-testid="preview-badge"
        >
            Preview
        </div>
    );
}

/**
 * Placeholder renderer — Phase 6 ships the real `ThemeRenderer` that walks
 * the config and mounts block React components. Until then this renders a
 * simple stack so the postMessage pipeline can be verified end-to-end.
 */
function ThemePlaceholderRenderer({
    config,
    template,
}: {
    config: ThemeConfig;
    template: PageTemplate;
}) {
    const tmpl = config.templates[template];
    const sections = tmpl?.sections ?? {};
    const order = tmpl?.order ?? [];

    return (
        <main
            style={{
                backgroundColor: config.global_settings.colors.background,
                color: config.global_settings.colors.text,
                fontFamily: config.global_settings.typography.body_font,
            }}
        >
            <ScopedHeader settings={config.layout.header.settings} primary={config.global_settings.colors.primary} />

            {order.length === 0 && (
                <div className="p-12 text-center text-sm opacity-60">
                    No sections on this page.
                </div>
            )}

            {order.map((id) => {
                const section = sections[id];
                if (!section || section.disabled) return null;
                return (
                    <section
                        key={id}
                        data-section-id={id}
                        data-section-scope={template}
                        className="cursor-pointer border-b p-8 hover:outline hover:outline-2 hover:outline-blue-500"
                    >
                        <p className="text-xs uppercase opacity-50">{section.type}</p>
                        <PlaceholderFromSettings settings={section.settings} />
                    </section>
                );
            })}

            <ScopedFooter settings={config.layout.footer.settings} />
        </main>
    );
}

function ScopedHeader({
    settings,
    primary,
}: {
    settings: SettingsMap;
    primary: string;
}) {
    return (
        <header
            data-section-id="header"
            data-section-scope="layout"
            style={{ backgroundColor: primary, color: "white" }}
            className="cursor-pointer p-4"
        >
            {String(settings.title ?? "Storefront")}
        </header>
    );
}

function ScopedFooter({ settings }: { settings: SettingsMap }) {
    return (
        <footer
            data-section-id="footer"
            data-section-scope="layout"
            className="cursor-pointer p-6 text-xs opacity-70"
        >
            {String(settings.copyright ?? "© Your Store")}
        </footer>
    );
}

function PlaceholderFromSettings({ settings }: { settings: SettingsMap }) {
    const title = settings.title ?? settings.heading ?? settings.headline;
    return (
        <h2 className="mt-1 text-2xl font-semibold">
            {String(title ?? "(Untitled section)")}
        </h2>
    );
}
