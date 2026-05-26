/**
 * Minimal route-group layout for the webstore preview iframe.
 *
 * The preview is rendered inside an `<iframe>` by the customizer. We
 * deliberately do NOT pull in the store admin chrome (sidebar, top nav) and
 * we do NOT enforce permission checks here — middleware + the customizer's
 * own auth gate already protect this route. Anyone reaching this URL without
 * the right cookie will get an unstyled but harmless preview shell; the
 * preview page itself fetches with the bearer token from the auth store.
 */
export default function WebstorePreviewLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <div className="min-h-screen bg-white text-black">{children}</div>;
}
