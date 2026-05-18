import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decodeToken } from "@/lib/api/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { CategoriesClient } from "./CategoriesClient";

export const metadata = { title: "Categories — LankaCommerce" };

export default async function CategoriesPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) redirect("/login");
  const payload = decodeToken(accessToken);
  if (!payload) redirect("/login");

  if (!payload.permissions.includes(PERMISSIONS.CATEGORIES_EDIT)) {
    redirect("/inventory");
  }

  return <CategoriesClient />;
}
