import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { InventoryListClient } from "./InventoryListClient";
import { decodeToken } from "@/lib/api/auth";
import { PERMISSIONS } from "@/constants/permissions";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const metadata = { title: "Inventory — LankaCommerce" };

export default async function InventoryPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const payload = decodeToken(accessToken);
  if (!payload) {
    redirect("/login");
  }

  const canView = payload.permissions.includes(PERMISSIONS.PRODUCTS_VIEW);
  if (!canView) {
    redirect("/store/dashboard");
  }

  const canCreate = payload.permissions.includes(PERMISSIONS.PRODUCTS_CREATE);

  // Initial product count for subtitle (server-side fetch)
  let initialCount = 0;
  try {
    const res = await fetch(`${API_BASE}/api/catalog/products/?page_size=1`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      initialCount = json.meta?.total ?? 0;
    }
  } catch {
    // Non-fatal: client will re-fetch
  }

  return (
    <InventoryListClient
      initialCount={initialCount}
      canCreate={canCreate}
    />
  );
}
