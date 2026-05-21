import { TenantStatusBadge } from "@/components/TenantStatusBadge";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import TenantFilters from "./_components/TenantFilters";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const DEFAULT_LIMIT = 20;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchParams {
  search?: string;
  status?: string;
  page?: string;
  limit?: string;
}

export interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  logo_url: string | null;
  subscription: {
    plan_name: string;
    status: string;
  } | null;
}

interface PaginatedTenants {
  results: TenantRecord[];
  count: number;
  next: string | null;
  previous: string | null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value ?? "";

  const currentPage = parseInt(params.page ?? "1", 10);
  const limit = parseInt(params.limit ?? String(DEFAULT_LIMIT), 10);

  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  qs.set("page", String(currentPage));
  qs.set("limit", String(limit));

  let data: PaginatedTenants = { results: [], count: 0, next: null, previous: null };
  let fetchError: string | null = null;

  try {
    const res = await fetch(`${API_BASE}/api/tenants/?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (res.status === 401) {
      redirect("/login");
    }

    if (res.status === 403) {
      fetchError = "Access Denied. You do not have permission to view tenants.";
    } else if (!res.ok) {
      fetchError = `Failed to load tenants (HTTP ${res.status}).`;
    } else {
      data = await res.json();
    }
  } catch {
    fetchError = "Unable to reach the API. Please ensure the backend is running.";
  }

  const totalPages = Math.ceil(data.count / limit);
  const startItem = data.count === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, data.count);

  function buildPageUrl(page: number) {
    const next = new URLSearchParams(qs);
    next.set("page", String(page));
    return `/superadmin/tenants?${next.toString()}`;
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage all LankaCommerce retail store tenants.
          </p>
        </div>
        <Link
          href="/superadmin/tenants/new"
          className="inline-flex items-center gap-2 rounded-md bg-[#F97316] px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} />
          New Tenant
        </Link>
      </div>

      {/* Search & filter */}
      <TenantFilters
        search={params.search ?? ""}
        status={params.status ?? ""}
      />

      {/* Error state */}
      {fetchError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {/* Data table */}
      {!fetchError && (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-600">Store Name</th>
                <th className="px-4 py-3 font-medium text-slate-600">Slug</th>
                <th className="px-4 py-3 font-medium text-slate-600">Plan</th>
                <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 font-medium text-slate-600">Created</th>
                <th className="px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.results.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No tenants found.
                  </td>
                </tr>
              ) : (
                data.results.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {tenant.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">
                      {tenant.slug}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {tenant.subscription?.plan_name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <TenantStatusBadge status={tenant.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Intl.DateTimeFormat("en-LK", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }).format(new Date(tenant.created_at))}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/superadmin/tenants/${tenant.id}`}
                        className="text-[#1B2B3A] font-medium hover:text-[#F97316] text-xs transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!fetchError && data.count > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            Showing {startItem}–{endItem} of {data.count} tenants
          </span>
          <div className="flex gap-2">
            {currentPage > 1 ? (
              <Link
                href={buildPageUrl(currentPage - 1)}
                className="rounded border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50 text-slate-700"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded border border-slate-100 bg-slate-50 px-3 py-1 text-slate-300 cursor-not-allowed">
                Previous
              </span>
            )}
            {currentPage < totalPages ? (
              <Link
                href={buildPageUrl(currentPage + 1)}
                className="rounded border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50 text-slate-700"
              >
                Next
              </Link>
            ) : (
              <span className="rounded border border-slate-100 bg-slate-50 px-3 py-1 text-slate-300 cursor-not-allowed">
                Next
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
