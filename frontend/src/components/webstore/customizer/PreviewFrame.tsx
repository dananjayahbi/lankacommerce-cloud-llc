"use client";

import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";

import { Loader2, Monitor, Smartphone, Tablet } from "lucide-react";

import { cn } from "@/lib/utils";
import {
    isIFrameToParentMessage,
    makeMessage,
    ParentToIFrameMessageType,
    type IFrameToParentMessage,
    type LankaMessageType,
    type PayloadOf,
} from "@/lib/webstore/postMessageTypes";
import type { PageTemplate } from "@/lib/webstore/types";

/**
 * Devices the preview frame can simulate. Widths are CSS pixels; height is
 * 100% of the available viewport so we don't need scrolling letterboxes.
 */
export type PreviewDevice = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTHS: Readonly<Record<PreviewDevice, string>> = {
    desktop: "100%",
    tablet: "768px",
    mobile: "375px",
};

const DEVICE_LABELS: Readonly<Record<PreviewDevice, string>> = {
    desktop: "Desktop",
    tablet: "Tablet",
    mobile: "Mobile",
};

const DEVICE_ICONS = {
    desktop: Monitor,
    tablet: Tablet,
    mobile: Smartphone,
} as const;

/**
 * Imperative handle exposed by `PreviewFrame` so the parent can push messages
 * into the iframe without rerendering on every state mutation. The parent
 * holds a ref and calls `.send()` from event handlers.
 */
export interface PreviewFrameHandle {
    /** Type-safe single-message sender. */
    send: <TType extends LankaMessageType>(
        type: TType,
        payload: PayloadOf<TType>,
    ) => void;
    /** Force the iframe to reload from `src` (used after discard / publish). */
    reload: () => void;
}

interface PreviewFrameProps {
    /** Origin (scheme + host + port) of the iframe document. Used for both
     * outbound `postMessage` calls and inbound origin verification.
     * Defaults to `window.location.origin` (preview is always same-origin). */
    targetOrigin?: string;
    /** Current preview template. The iframe `src` switches on change so
     * Next.js routes to a fresh `/webstore-preview/<template>` page. */
    page: PageTemplate;
    /** Active device simulation. */
    device: PreviewDevice;
    /** Fires once the iframe has posted `LANKA_READY`. */
    onReady: (payload: PayloadOf<"LANKA_READY">) => void;
    /** Generic dispatcher for all iframe→parent messages. The parent's
     * `useReducer`/state handlers narrow on `type`. */
    onMessage: (message: IFrameToParentMessage) => void;
}

/**
 * Wraps an `<iframe>` to the storefront preview route and brokers a strictly
 * typed `postMessage` channel between the customizer (parent) and the
 * storefront (iframe).
 *
 * Security:
 *   - Outbound: every `postMessage` call passes an explicit `targetOrigin`
 *     equal to `props.targetOrigin` (never `"*"`).
 *   - Inbound: every received message is filtered by `event.source` (must be
 *     this iframe's `contentWindow`) AND `event.origin` (must equal
 *     `props.targetOrigin`) AND `isIFrameToParentMessage()` (structural).
 *
 * Lifecycle:
 *   - Mount → render iframe with `src` = `/webstore-preview/<page>?ts=<ts>`.
 *   - The iframe POSTs `LANKA_READY` once mounted; we surface it via
 *     `onReady` so the parent can immediately push `LANKA_INIT` with the
 *     full config.
 *   - Changing `page` updates the timestamp param and forces a route change.
 *     We hold a "waiting for READY" state during the swap and re-fire init.
 */
export const PreviewFrame = forwardRef<PreviewFrameHandle, PreviewFrameProps>(
    function PreviewFrame(
        { targetOrigin, page, device, onReady, onMessage },
        forwardedRef,
    ) {
        const iframeRef = useRef<HTMLIFrameElement | null>(null);
        const [isLoading, setIsLoading] = useState(true);
        // `ts` forces Next.js to treat each page swap as a distinct entry so
        // the iframe doesn't reuse cached client-side data from the previous
        // template.
        const [reloadKey, setReloadKey] = useState(() => Date.now());

        // Lock the origin to the current location at mount time. Doing this
        // inside the component (not at module scope) keeps SSR happy and lets
        // tests inject a different value via prop.
        const expectedOriginRef = useRef<string>("");
        if (expectedOriginRef.current === "") {
            expectedOriginRef.current =
                targetOrigin ?? (typeof window !== "undefined" ? window.location.origin : "");
        }
        const expectedOrigin = expectedOriginRef.current;

        useImperativeHandle(
            forwardedRef,
            () => ({
                send: (type, payload) => {
                    const frame = iframeRef.current;
                    if (!frame?.contentWindow || !expectedOrigin) return;
                    const message = makeMessage(type, payload);
                    // NEVER use "*" — leaking config to a hijacked iframe would
                    // expose draft theme content to third-party origins.
                    frame.contentWindow.postMessage(message, expectedOrigin);
                },
                reload: () => {
                    setIsLoading(true);
                    setReloadKey(Date.now());
                },
            }),
            [expectedOrigin],
        );

        // Page swap → bump key → force fresh `src` and wait for READY again.
        useEffect(() => {
            setIsLoading(true);
            setReloadKey(Date.now());
        }, [page]);

        const handleIFrameLoad = useCallback(() => {
            // Mark the iframe as loaded for the HTML side, but the React app
            // inside still has to mount and post LANKA_READY before we clear
            // the loading overlay.
        }, []);

        useEffect(() => {
            function listener(event: MessageEvent<unknown>) {
                // 1. Source check — must be from THIS iframe.
                if (
                    !iframeRef.current ||
                    event.source !== iframeRef.current.contentWindow
                ) {
                    return;
                }
                // 2. Origin check — must match the locked expected origin.
                if (event.origin !== expectedOrigin) {
                    return;
                }
                // 3. Structural check.
                if (!isIFrameToParentMessage(event.data)) {
                    return;
                }
                const message = event.data;
                if (message.type === "LANKA_READY") {
                    setIsLoading(false);
                    onReady(message.payload);
                }
                onMessage(message);
            }
            window.addEventListener("message", listener);
            return () => window.removeEventListener("message", listener);
        }, [expectedOrigin, onMessage, onReady]);

        const src = `/webstore-preview/${page}?preview=draft&ts=${reloadKey}`;
        const frameWidth = DEVICE_WIDTHS[device];

        return (
            <div className="relative flex h-full w-full items-stretch justify-center bg-muted/40 p-4">
                <div
                    className={cn(
                        "relative h-full overflow-hidden rounded-md border bg-background shadow-sm transition-[width] duration-200",
                        device === "desktop" ? "w-full" : "w-auto",
                    )}
                    style={device === "desktop" ? undefined : { width: frameWidth }}
                >
                    <iframe
                        ref={iframeRef}
                        // `key` triggers an actual element remount when the
                        // template changes, which is the only fully reliable
                        // way to discard a Next.js client cache for the
                        // previous preview page.
                        key={`${page}-${reloadKey}`}
                        src={src}
                        title="Storefront preview"
                        // `sandbox` would block postMessage if we restricted
                        // `allow-same-origin`; preview is same-origin and
                        // trusted, so we leave it unsandboxed but keep tight
                        // origin checks in the message listener instead.
                        className="block h-full w-full border-0 bg-white"
                        onLoad={handleIFrameLoad}
                    />
                    {isLoading && (
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 text-sm text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Loading preview…</span>
                        </div>
                    )}
                </div>
            </div>
        );
    },
);

/**
 * Compact device-mode toggle. Exposed from this module so the customizer top
 * bar can render it next to the publish controls.
 */
export function DeviceSwitcher({
    value,
    onChange,
}: {
    value: PreviewDevice;
    onChange: (next: PreviewDevice) => void;
}) {
    return (
        <div className="inline-flex items-center rounded-md border bg-background p-0.5">
            {(Object.keys(DEVICE_WIDTHS) as PreviewDevice[]).map((d) => {
                const Icon = DEVICE_ICONS[d];
                const isActive = value === d;
                return (
                    <button
                        key={d}
                        type="button"
                        aria-label={DEVICE_LABELS[d]}
                        aria-pressed={isActive}
                        onClick={() => onChange(d)}
                        className={cn(
                            "inline-flex h-7 w-8 items-center justify-center rounded-sm transition-colors",
                            isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted",
                        )}
                    >
                        <Icon className="h-3.5 w-3.5" />
                    </button>
                );
            })}
        </div>
    );
}
