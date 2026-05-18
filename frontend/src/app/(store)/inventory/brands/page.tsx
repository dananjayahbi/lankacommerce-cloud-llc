import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decodeToken } from "@/lib/api/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { BrandsClient } from "./BrandsClient";

export const metadata = { title: "Brands — LankaCommerce" };

export default async function BrandsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) redirect("/login");
  const payload = decodeToken(accessToken);
  if (!payload) redirect("/login");

  // Use CATEGORIES_EDIT as proxy for "inventory management" access
  if (!payload.permissions.includes(PERMISSIONS.CATEGORIES_EDIT)) {
    redirect("/inventory");
  }

  return <BrandsClient />;
}
