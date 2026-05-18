import { TenantStatusBadge } from "@/components/TenantStatusBadge";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import TenantAdminActions from "./_components/TenantAdminActions";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TenantSettings {
  currency: string;
  timezone: string;
  vatRate: number;
  ssclRate: number;
  receiptFooter: string;
}

interface TenantSubscription {
  id: string;
  plan_name: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  next_billing_date: string;
}

interface TenantInvoice {
  id: string;
  invoice_number: string;
  amount: string;
  status: string;
  billing_date: string;
}

interface TenantUser {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  logo_url: string | null;
  grace_ends_at: string | null;
  custom_domain: string | null;
  settings: TenantSettings;
  subscription: TenantSubscription | null;
  invoices: TenantInvoice[];
  users: TenantUser[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function formatLKR(amount: string) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(parseFloat(amount));
}

function toTitleCase(str: string) {
  return str
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const INVOICE_STATUS_CLASSES: Record<string, string> = {
  PAID: "bg-green-100 text-green-700 border-green-200",
  UNPAID: "bg-amber-100 text-amber-700 border-amber-200",
  OVERDUE: "bg-red-100 text-red-700 border-red-200",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value ?? "";

  let tenant: TenantDetail | null = null;
  let fetchError: string | null = null;

  try {
    const res = await fetch(`${API_BASE}/api/tenants/${id}/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (res.status === 401) redirect("/login");
    if (res.status === 404) notFound();

    if (!res.ok) {
      fetchError = `Failed to load tenant (HTTP ${res.status}).`;
    } else {
      tenant = await res.json();
    }
  } catch {
    fetchError = "Unable to reach the API. Please ensure the backend is running.";
  }

  if (fetchError || !tenant) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {fetchError ?? "Unknown error."}
      </div>
    );
  }

  const periodEnd = tenant.subscription
    ? new Date(tenant.subscription.current_period_end)
    : null;
  const daysUntilEnd = periodEnd
    ? Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const billingEndsSoon = daysUntilEnd !== null && daysUntilEnd <= 7 && daysUntilEnd >= 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/superadmin" className="hover:text-slate-700">
          Super Admin
        </Link>
        <ChevronRight size={14} />
        <Link href="/superadmin/tenants" className="hover:text-slate-700">
          Tenants
        </Link>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium">{tenant.name}</span>
      </nav>

      {/* Title row */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{tenant.name}</h1>
          <p className="mt-0.5 font-mono text-sm text-slate-500">{tenant.slug}</p>
        </div>
        <TenantStatusBadge status={tenant.status} />
      </div>

      {/* Info cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tenant Identity */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Tenant Identity
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900">{tenant.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Slug</dt>
              <dd className="font-mono text-slate-700">{tenant.slug}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd>
                <TenantStatusBadge status={tenant.status} />
              </dd>
            </div>
            {tenant.logo_url && (
              <div>
                <dt className="text-slate-500">Logo</dt>
                <dd>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tenant.logo_url}
                    alt={`${tenant.name} logo`}
                    className="mt-1 max-w-[120px] rounded"
                  />
                </dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500">Created</dt>
              <dd className="text-slate-700">{formatDate(tenant.created_at)}</dd>
            </div>
            {tenant.custom_domain && (
              <div>
                <dt className="text-slate-500">Custom Domain</dt>
                <dd className="text-slate-700">{tenant.custom_domain}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Store Settings */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Store Settings
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Currency</dt>
              <dd className="text-slate-700">{tenant.settings.currency}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Timezone</dt>
              <dd className="text-slate-700">{tenant.settings.timezone}</dd>
            </div>
            <div>
              <dt className="text-slate-500">VAT Rate</dt>
              <dd className="text-slate-700">{tenant.settings.vatRate}%</dd>
            </div>
            <div>
              <dt className="text-slate-500">SSCL Rate</dt>
              <dd className="text-slate-700">{tenant.settings.ssclRate}%</dd>
            </div>
            <div>
              <dt className="text-slate-500">Receipt Footer</dt>
              <dd className="text-slate-700 italic">
                {tenant.settings.receiptFooter || "—"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Subscription */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Subscription
          </h2>
          {tenant.subscription ? (
            <>
              <p className="text-2xl font-bold text-slate-900 mb-1">
                {tenant.subscription.plan_name}
              </p>
              <div className="mb-4">
                <TenantStatusBadge status={tenant.subscription.status} />
              </div>
              {billingEndsSoon && (
                <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Billing cycle ends soon ({daysUntilEnd} day
                  {daysUntilEnd !== 1 ? "s" : ""} remaining).
                </div>
              )}
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-slate-500">Period Start</dt>
                  <dd className="text-slate-700">
                    {formatDate(tenant.subscription.current_period_start)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Period End</dt>
                  <dd className="text-slate-700">
                    {formatDate(tenant.subscription.current_period_end)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Next Billing</dt>
                  <dd className="text-slate-700">
                    {formatDate(tenant.subscription.next_billing_date)}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="text-sm text-slate-400">No active subscription.</p>
          )}
        </div>

        {/* Invoice History */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Invoice History
          </h2>
          {tenant.invoices.length === 0 ? (
            <p className="text-sm text-slate-400">No invoices yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="pb-2 font-medium text-slate-500">Invoice</th>
                  <th className="pb-2 font-medium text-slate-500">Date</th>
                  <th className="pb-2 font-medium text-slate-500">Amount</th>
                  <th className="pb-2 font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {tenant.invoices.slice(0, 10).map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 font-mono text-xs text-slate-700">
                      {inv.invoice_number}
                    </td>
                    <td className="py-2 text-slate-500">
                      {formatDate(inv.billing_date)}
                    </td>
                    <td className="py-2 text-slate-700">{formatLKR(inv.amount)}</td>
                    <td className="py-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                          INVOICE_STATUS_CLASSES[inv.status] ??
                          "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {toTitleCase(inv.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Active Users */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Active Staff</h2>
        {tenant.users.length === 0 ? (
          <p className="text-sm text-center text-slate-400 py-4">
            No staff accounts yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="pb-2 font-medium text-slate-500">Email</th>
                <th className="pb-2 font-medium text-slate-500">Role</th>
                <th className="pb-2 font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {tenant.users.map((user) => (
                <tr key={user.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 text-slate-700">{user.email}</td>
                  <td className="py-2 text-slate-600">{toTitleCase(user.role)}</td>
                  <td className="py-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        user.is_active
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Admin Actions */}
      <TenantAdminActions
        tenantId={tenant.id}
        currentStatus={tenant.status}
        accessToken={accessToken}
      />
    </div>
  );
}
