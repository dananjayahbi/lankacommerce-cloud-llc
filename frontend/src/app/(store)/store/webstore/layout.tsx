import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decodeToken } from "@/lib/api/auth";
import { WebstoreUpgradePrompt } from "@/components/webstore/admin/WebstoreUpgradePrompt";

export default async function WebstoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) redirect("/login");

  const payload = decodeToken(accessToken);
  if (!payload) redirect("/login");

  const hasAccess =
    payload.role === "SUPER_ADMIN" ||
    (payload.permissions ?? []).includes("webstore.access");

  if (!hasAccess) {
    return (
      <div className="flex-1 overflow-auto">
        <WebstoreUpgradePrompt />
      </div>
    );
  }

  return <>{children}</>;
}
