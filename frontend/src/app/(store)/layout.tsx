export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Shell placeholder — the AppSidebar (bg-navy) and main content area will be
          integrated in SubPhase 02.xx when the navigation components are built. */}
      {children}
    </div>
  );
}
