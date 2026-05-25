import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-white">
            Lanka<span className="text-blue-400">Commerce</span>
          </span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            Start Free Trial
          </Link>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-900/50 border border-blue-700/50 px-4 py-1.5 text-xs font-medium text-blue-300 mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
          Now available — 30-day free trial, no credit card required
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight mb-6">
          The Modern POS &amp; ERP
          <br />
          <span className="text-blue-400">Built for Sri Lankan Retail</span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg text-slate-400 mb-10">
          LankaCommerce gives your business a powerful point-of-sale, inventory
          management, CRM, and reporting suite — all under your own branded
          subdomain, starting in minutes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-500 px-8 py-3.5 text-base font-semibold shadow-lg transition-colors"
          >
            Create Your Store — It&apos;s Free
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto rounded-xl border border-slate-700 hover:border-slate-500 px-8 py-3.5 text-base font-medium text-slate-300 hover:text-white transition-colors"
          >
            Sign In to Your Dashboard
          </Link>
        </div>
      </section>

      {/* ── Feature Cards ──────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-slate-500 mb-12">
          Everything you need to run a modern retail store
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm hover:border-blue-800 transition-colors"
            >
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="mb-2 text-base font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing teaser ─────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-28 text-center">
        <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
        <p className="text-slate-400 mb-8">
          Start with a 30-day free trial. No setup fees. Cancel any time.
        </p>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Basic POS
            </p>
            <p className="text-3xl font-bold mb-1">
              LKR 4,999<span className="text-base font-normal text-slate-400">/mo</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-400">
              <li>✓ POS Terminal</li>
              <li>✓ Inventory Management</li>
              <li>✓ Sales History &amp; Reports</li>
              <li>✓ Up to 3 Staff Accounts</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-blue-700 bg-blue-950/40 p-6 text-left ring-1 ring-blue-700/50">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-2">
              Advanced Retail
            </p>
            <p className="text-3xl font-bold mb-1">
              LKR 9,999<span className="text-base font-normal text-slate-400">/mo</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-400">
              <li>✓ Everything in Basic</li>
              <li>✓ CRM &amp; Customer Loyalty</li>
              <li>✓ HR &amp; Attendance</li>
              <li>✓ Promotions &amp; Discounts</li>
              <li>✓ Unlimited Staff Accounts</li>
            </ul>
          </div>
        </div>
        <div className="mt-10">
          <Link
            href="/register"
            className="inline-block rounded-xl bg-blue-600 hover:bg-blue-500 px-10 py-3.5 text-base font-semibold shadow-lg transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-600">
        © {new Date().getFullYear()} LankaCommerce. All rights reserved.
      </footer>
    </main>
  );
}

const FEATURES = [
  {
    icon: "🛒",
    title: "Point of Sale",
    description:
      "Fast, touch-friendly POS with barcode scanning, receipt printing, and PIN-based quick login for cashiers.",
  },
  {
    icon: "📦",
    title: "Inventory Management",
    description:
      "Track stock levels in real time, manage suppliers, set reorder alerts, and handle purchase orders.",
  },
  {
    icon: "📊",
    title: "Sales Reports",
    description:
      "Daily, weekly, and monthly reports with profit/loss breakdowns, best-sellers, and trend analytics.",
  },
  {
    icon: "👥",
    title: "CRM & Customers",
    description:
      "Build customer profiles, track purchase history, and run loyalty programmes to keep buyers coming back.",
  },
  {
    icon: "👨‍💼",
    title: "Staff & HR",
    description:
      "Manage staff roles, attendance, shifts, and commissions with a built-in HR module.",
  },
  {
    icon: "🔒",
    title: "Multi-Tenant & Secure",
    description:
      "Each store gets its own isolated subdomain and data environment. Role-based access control at every level.",
  },
] as const;

