export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-navy">
      {/* Shell placeholder — the full SuperAdmin layout is implemented in Phase 03. */}
      {children}
    </div>
  );
}
