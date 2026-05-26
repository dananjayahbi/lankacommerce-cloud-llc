/**
 * Webstore Preview sub-layout
 *
 * Overrides the parent (webstore) layout chrome for the customizer iframe.
 * The parent layout still wraps this (providing CartStoreProvider + CSS vars
 * if a tenant slug is available), but we suppress header/footer so the
 * preview is a clean canvas. The preview page itself renders the full
 * ThemeRenderer including header and footer blocks.
 */

export default function WebstorePreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-white text-black">{children}</div>;
}
