import { cookies } from "next/headers";
import TenantProvisioningWizard from "./_components/TenantProvisioningWizard";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export interface PlanRecord {
  id: string;
  name: string;
  description: string;
  price_monthly: string;
  features: string[];
}

export default async function NewTenantPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value ?? "";

  let plans: PlanRecord[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/plans/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      // Handle both paginated and plain list responses
      plans = Array.isArray(data) ? data : (data.results ?? []);
    }
  } catch {
    // Plans will be empty; wizard handles the empty state
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New Tenant</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Provision a new retail store on LankaCommerce.
        </p>
      </div>
      <TenantProvisioningWizard plans={plans} accessToken={accessToken} />
    </div>
  );
}
