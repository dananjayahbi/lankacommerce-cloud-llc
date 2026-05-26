/**
 * Strictly typed cross-frame communication protocol for the Visual Theme
 * Customizer (Phase 5).
 *
 * Two windows participate:
 *   - PARENT  — the customizer page at /store/webstore/customize. Owns the
 *               authoritative draft state and drives all edits.
 *   - IFRAME  — the preview page at /webstore-preview/<template>. Renders the
 *               theme using the draft config and reports user interactions.
 *
 * All messages MUST flow through these discriminated unions. Never send a
 * free-form object via `postMessage`: the protocol is the contract.
 *
 * Security:
 *   - The sender MUST pass an explicit `targetOrigin` to `postMessage`. Never
 *     use "*". Use `window.location.origin` (parent → iframe lives on the
 *     same tenant subdomain) or the captured parent origin (iframe → parent).
 *   - The receiver MUST verify `event.origin` against the expected origin and
 *     verify `event.data` via `isLankaMessage()` before trusting it.
 *
 * Versioning:
 *   - `PROTOCOL_VERSION` is bumped whenever a message shape changes in a
 *     non-backwards-compatible way. `LANKA_READY` carries the iframe's version
 *     so the parent can refuse mismatched preview builds.
 */

import type {
    BlockConfig,
    BlockId,
    GlobalSettings,
    PageTemplate,
    SectionConfig,
    SectionId,
    SettingsMap,
    ThemeConfig,
} from "./types";

// ---------------------------------------------------------------------------
// Version + namespacing
// ---------------------------------------------------------------------------

/** Bump on any breaking protocol change. */
export const PROTOCOL_VERSION = 1 as const;
export type ProtocolVersion = typeof PROTOCOL_VERSION;

/**
 * All message `type` values are prefixed with `LANKA_` so we can cheaply filter
 * unrelated `message` events (browser extensions, devtools, embedded SDKs).
 */
export const LANKA_MESSAGE_PREFIX = "LANKA_" as const;

// ---------------------------------------------------------------------------
// Message type literals
// ---------------------------------------------------------------------------

// Parent → iframe
export const ParentToIFrameMessageType = {
    INIT: "LANKA_INIT",
    UPDATE_GLOBAL: "LANKA_UPDATE_GLOBAL",
    UPDATE_SECTION: "LANKA_UPDATE_SECTION",
    UPDATE_BLOCK: "LANKA_UPDATE_BLOCK",
    REORDER_SECTIONS: "LANKA_REORDER_SECTIONS",
    REORDER_BLOCKS: "LANKA_REORDER_BLOCKS",
    ADD_SECTION: "LANKA_ADD_SECTION",
    REMOVE_SECTION: "LANKA_REMOVE_SECTION",
    ADD_BLOCK: "LANKA_ADD_BLOCK",
    REMOVE_BLOCK: "LANKA_REMOVE_BLOCK",
    TOGGLE_SECTION: "LANKA_TOGGLE_SECTION",
    NAVIGATE: "LANKA_NAVIGATE",
    HIGHLIGHT_SECTION: "LANKA_HIGHLIGHT_SECTION",
} as const;

export type ParentToIFrameMessageType =
    (typeof ParentToIFrameMessageType)[keyof typeof ParentToIFrameMessageType];

// IFrame → parent
export const IFrameToParentMessageType = {
    READY: "LANKA_READY",
    SECTION_CLICK: "LANKA_SECTION_CLICK",
    BLOCK_CLICK: "LANKA_BLOCK_CLICK",
    NAVIGATION_BLOCKED: "LANKA_NAVIGATION_BLOCKED",
    PREVIEW_ERROR: "LANKA_PREVIEW_ERROR",
} as const;

export type IFrameToParentMessageType =
    (typeof IFrameToParentMessageType)[keyof typeof IFrameToParentMessageType];

// ---------------------------------------------------------------------------
// Common envelope
// ---------------------------------------------------------------------------

/**
 * Every message shares this envelope. `version` lets the receiver reject
 * incompatible builds; `id` is an opaque correlation ID useful for ack/log
 * tracing (optional, but recommended for non-trivial flows).
 */
interface BaseMessage<TType extends string, TPayload> {
    type: TType;
    version: ProtocolVersion;
    payload: TPayload;
    id?: string;
}

/**
 * `template` in section/block operations is the page the section lives on. The
 * special value "layout" addresses the header/footer that render on every
 * page. We carry it on every section/block message so the iframe can resolve
 * the target without ambiguity even if its current page differs from the
 * sidebar's currently focused page.
 */
export type SectionScope = PageTemplate | "layout";

// ---------------------------------------------------------------------------
// Parent → IFrame payloads
// ---------------------------------------------------------------------------

export interface InitPayload {
    config: ThemeConfig;
    page: PageTemplate;
}

export interface UpdateGlobalPayload {
    global_settings: GlobalSettings;
}

export interface UpdateSectionPayload {
    template: SectionScope;
    sectionId: SectionId;
    settings: SettingsMap;
}

export interface UpdateBlockPayload {
    template: SectionScope;
    sectionId: SectionId;
    blockId: BlockId;
    settings: SettingsMap;
}

export interface ReorderSectionsPayload {
    template: SectionScope;
    order: readonly SectionId[];
}

export interface ReorderBlocksPayload {
    template: SectionScope;
    sectionId: SectionId;
    block_order: readonly BlockId[];
}

export interface AddSectionPayload {
    template: SectionScope;
    sectionId: SectionId;
    /** Position in the `order` array to insert at. Defaults to end. */
    index?: number;
    config: SectionConfig;
}

export interface RemoveSectionPayload {
    template: SectionScope;
    sectionId: SectionId;
}

export interface AddBlockPayload {
    template: SectionScope;
    sectionId: SectionId;
    blockId: BlockId;
    index?: number;
    config: BlockConfig;
}

export interface RemoveBlockPayload {
    template: SectionScope;
    sectionId: SectionId;
    blockId: BlockId;
}

export interface ToggleSectionPayload {
    template: SectionScope;
    sectionId: SectionId;
    disabled: boolean;
}

export interface NavigatePayload {
    page: PageTemplate;
}

export interface HighlightSectionPayload {
    template: SectionScope;
    sectionId: SectionId | null;
}

// ---------------------------------------------------------------------------
// Parent → IFrame message union
// ---------------------------------------------------------------------------

export type LankaInitMessage = BaseMessage<typeof ParentToIFrameMessageType.INIT, InitPayload>;
export type LankaUpdateGlobalMessage = BaseMessage<
    typeof ParentToIFrameMessageType.UPDATE_GLOBAL,
    UpdateGlobalPayload
>;
export type LankaUpdateSectionMessage = BaseMessage<
    typeof ParentToIFrameMessageType.UPDATE_SECTION,
    UpdateSectionPayload
>;
export type LankaUpdateBlockMessage = BaseMessage<
    typeof ParentToIFrameMessageType.UPDATE_BLOCK,
    UpdateBlockPayload
>;
export type LankaReorderSectionsMessage = BaseMessage<
    typeof ParentToIFrameMessageType.REORDER_SECTIONS,
    ReorderSectionsPayload
>;
export type LankaReorderBlocksMessage = BaseMessage<
    typeof ParentToIFrameMessageType.REORDER_BLOCKS,
    ReorderBlocksPayload
>;
export type LankaAddSectionMessage = BaseMessage<
    typeof ParentToIFrameMessageType.ADD_SECTION,
    AddSectionPayload
>;
export type LankaRemoveSectionMessage = BaseMessage<
    typeof ParentToIFrameMessageType.REMOVE_SECTION,
    RemoveSectionPayload
>;
export type LankaAddBlockMessage = BaseMessage<
    typeof ParentToIFrameMessageType.ADD_BLOCK,
    AddBlockPayload
>;
export type LankaRemoveBlockMessage = BaseMessage<
    typeof ParentToIFrameMessageType.REMOVE_BLOCK,
    RemoveBlockPayload
>;
export type LankaToggleSectionMessage = BaseMessage<
    typeof ParentToIFrameMessageType.TOGGLE_SECTION,
    ToggleSectionPayload
>;
export type LankaNavigateMessage = BaseMessage<
    typeof ParentToIFrameMessageType.NAVIGATE,
    NavigatePayload
>;
export type LankaHighlightSectionMessage = BaseMessage<
    typeof ParentToIFrameMessageType.HIGHLIGHT_SECTION,
    HighlightSectionPayload
>;

export type ParentToIFrameMessage =
    | LankaInitMessage
    | LankaUpdateGlobalMessage
    | LankaUpdateSectionMessage
    | LankaUpdateBlockMessage
    | LankaReorderSectionsMessage
    | LankaReorderBlocksMessage
    | LankaAddSectionMessage
    | LankaRemoveSectionMessage
    | LankaAddBlockMessage
    | LankaRemoveBlockMessage
    | LankaToggleSectionMessage
    | LankaNavigateMessage
    | LankaHighlightSectionMessage;

// ---------------------------------------------------------------------------
// IFrame → Parent payloads
// ---------------------------------------------------------------------------

export interface ReadyPayload {
    /** Protocol version implemented by the iframe build. */
    version: ProtocolVersion;
    /** The template the iframe is currently rendering. */
    page: PageTemplate;
}

export interface SectionClickPayload {
    template: SectionScope;
    sectionId: SectionId;
}

export interface BlockClickPayload {
    template: SectionScope;
    sectionId: SectionId;
    blockId: BlockId;
}

export interface NavigationBlockedPayload {
    /** URL the consumer tried to navigate to inside the preview. */
    href: string;
    reason: "add_to_cart" | "checkout" | "external" | "auth_required" | "other";
}

export interface PreviewErrorPayload {
    message: string;
    /** Optional structured detail for logging/Sentry. */
    detail?: unknown;
}

// ---------------------------------------------------------------------------
// IFrame → Parent message union
// ---------------------------------------------------------------------------

export type LankaReadyMessage = BaseMessage<
    typeof IFrameToParentMessageType.READY,
    ReadyPayload
>;
export type LankaSectionClickMessage = BaseMessage<
    typeof IFrameToParentMessageType.SECTION_CLICK,
    SectionClickPayload
>;
export type LankaBlockClickMessage = BaseMessage<
    typeof IFrameToParentMessageType.BLOCK_CLICK,
    BlockClickPayload
>;
export type LankaNavigationBlockedMessage = BaseMessage<
    typeof IFrameToParentMessageType.NAVIGATION_BLOCKED,
    NavigationBlockedPayload
>;
export type LankaPreviewErrorMessage = BaseMessage<
    typeof IFrameToParentMessageType.PREVIEW_ERROR,
    PreviewErrorPayload
>;

export type IFrameToParentMessage =
    | LankaReadyMessage
    | LankaSectionClickMessage
    | LankaBlockClickMessage
    | LankaNavigationBlockedMessage
    | LankaPreviewErrorMessage;

// ---------------------------------------------------------------------------
// Combined union + type-level helpers
// ---------------------------------------------------------------------------

export type LankaMessage = ParentToIFrameMessage | IFrameToParentMessage;
export type LankaMessageType = LankaMessage["type"];

/** Extract the payload type for a given message `type` literal. */
export type PayloadOf<TType extends LankaMessageType> = Extract<
    LankaMessage,
    { type: TType }
>["payload"];

// ---------------------------------------------------------------------------
// Runtime guards
// ---------------------------------------------------------------------------

const PARENT_TO_IFRAME_TYPES: ReadonlySet<string> = new Set(
    Object.values(ParentToIFrameMessageType),
);
const IFRAME_TO_PARENT_TYPES: ReadonlySet<string> = new Set(
    Object.values(IFrameToParentMessageType),
);
const ALL_LANKA_TYPES: ReadonlySet<string> = new Set([
    ...PARENT_TO_IFRAME_TYPES,
    ...IFRAME_TO_PARENT_TYPES,
]);

/** Narrow `unknown` (e.g. `MessageEvent.data`) into a structurally-valid LankaMessage. */
export function isLankaMessage(value: unknown): value is LankaMessage {
    if (value === null || typeof value !== "object") {
        return false;
    }
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.type !== "string" || !candidate.type.startsWith(LANKA_MESSAGE_PREFIX)) {
        return false;
    }
    if (!ALL_LANKA_TYPES.has(candidate.type)) {
        return false;
    }
    if (candidate.version !== PROTOCOL_VERSION) {
        return false;
    }
    if (candidate.payload === undefined || candidate.payload === null) {
        return false;
    }
    return true;
}

export function isParentToIFrameMessage(
    value: unknown,
): value is ParentToIFrameMessage {
    return (
        isLankaMessage(value) &&
        PARENT_TO_IFRAME_TYPES.has((value as LankaMessage).type)
    );
}

export function isIFrameToParentMessage(
    value: unknown,
): value is IFrameToParentMessage {
    return (
        isLankaMessage(value) &&
        IFRAME_TO_PARENT_TYPES.has((value as LankaMessage).type)
    );
}

// ---------------------------------------------------------------------------
// Builders — small ergonomic helpers so call sites cannot forget `version`
// ---------------------------------------------------------------------------

/**
 * Build a fully-typed message envelope. Prefer this over object literals at
 * call sites — it stamps the protocol version automatically.
 */
export function makeMessage<TType extends LankaMessageType>(
    type: TType,
    payload: PayloadOf<TType>,
    options?: { id?: string },
): Extract<LankaMessage, { type: TType }> {
    return {
        type,
        version: PROTOCOL_VERSION,
        payload,
        id: options?.id,
    } as Extract<LankaMessage, { type: TType }>;
}
