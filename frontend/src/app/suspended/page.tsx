import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { AlertTriangle, Mail } from "lucide-react";

const DJANGO_API_BASE =
  process.env.DJANGO_API_BASE_URL ?? "http://localhost:8000";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: string;
  status: string;
  billing_date: string;
  paid_at: string | null;
}

export default async function SuspendedPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  let unpaidInvoice: Invoice | null = null;

  if (accessToken) {
    try {
      const payload = decodeJwt(accessToken);
      const tenantId = payload.tenant_id as string | undefined;

      if (tenantId) {
        const res = await fetch(
          `${DJANGO_API_BASE}/api/tenants/${tenantId}/invoices/?status=UNPAID`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: "no-store",
          }
        );

        if (res.ok) {
          const data = await res.json();
          const invoices: Invoice[] = Array.isArray(data)
            ? data
            : data.results ?? [];
          if (invoices.length > 0) {
            unpaidInvoice = invoices[0];
          }
        }
      }
    } catch {
      // Fail silently — don't block the suspension page
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-lg w-full">
        {/* Brand */}
        <p className="text-2xl font-bold text-[#1B2B3A] text-center mb-6">
          LankaCommerce
        </p>

        {/* Icon + Heading */}
        <div className="flex justify-center mb-4">
          <AlertTriangle size={56} className="text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 text-center mb-3">
          Your Account Has Been Suspended
        </h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          Access to your LankaCommerce store has been suspended. This may be due
          to an outstanding payment or a violation of our terms of service.
          Please resolve the issue below or contact our support team.
        </p>

        {/* Outstanding Invoice Card */}
        {unpaidInvoice && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 mb-6">
            <p className="text-sm font-semibold text-amber-700 mb-1">
              Outstanding Balance
            </p>
            <p className="text-xs text-slate-500 mb-2">
              Invoice #{unpaidInvoice.invoice_number}
            </p>
            <p className="text-2xl font-bold text-amber-600 mb-1">
              {new Intl.NumberFormat("en-LK", {
                style: "currency",
                currency: "LKR",
                minimumFractionDigits: 0,
              }).format(parseFloat(unpaidInvoice.amount))}
            </p>
            <p className="text-xs text-slate-500 mb-2">
              Due:{" "}
              {new Date(unpaidInvoice.billing_date).toLocaleDateString("en-LK")}
            </p>
            <p className="text-xs text-amber-700">
              Please settle this invoice to restore access to your store.
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="flex flex-col items-center gap-3">
          <a
            href="mailto:support@lankacommerce.lk"
            className="inline-flex items-center gap-2 rounded-md bg-[#F97316] px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
          >
            <Mail size={16} />
            Contact Support
          </a>
          <p className="text-xs text-slate-400">
            Or call us at +94 11 XXX XXXX
          </p>
        </div>
      </div>
    </div>
  );
}
