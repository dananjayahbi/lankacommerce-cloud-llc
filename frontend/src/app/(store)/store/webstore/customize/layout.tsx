import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { decodeToken } from "@/lib/api/auth";

/**
 * Full-screen customizer layout.
 *
 * The (store) layout above us renders a left sidebar via `StoreLayoutClient`.
 * The visual theme customizer needs the entire viewport, so this layout uses
 * `fixed inset-0 z-50` to paint over everything the parent rendered. The
 * parent sidebar is still in the DOM (we can't unmount a parent layout from a
 * child) but it is fully obscured and not focusable.
 *
 * Authentication and the `webstore.access` permission are re-checked here so
 * that direct navigation to /store/webstore/customize cannot bypass the
 * webstore feature gate.
 *
 * The top bar (back link, save status, publish/discard buttons) and the
 * two-pane workspace are rendered by the page component because they share
 * the customizer's in-memory state. Splitting them across layout/page would
 * require a shared client context for negligible benefit.
 */
export default async function CustomizeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;
    if (!accessToken) redirect("/login");

    const payload = decodeToken(accessToken);
    if (!payload) redirect("/login");

    const hasAccess =
        payload.role === "SUPER_ADMIN" ||
        (payload.permissions ?? []).includes("webstore.access");

    if (!hasAccess) redirect("/store/webstore");

    return (
        <div
            // `fixed inset-0` escapes the parent StoreLayout's flex container.
            // `z-50` keeps us above any banners/dialogs the parent rendered.
            // `overflow-hidden` prevents the customizer from causing the page
            // to grow — the workspace owns its own scroll containers.
            className="fixed inset-0 z-50 flex min-h-screen w-full flex-col overflow-hidden bg-background"
            data-customizer-root="true"
        >
            {children}
        </div>
    );
}
