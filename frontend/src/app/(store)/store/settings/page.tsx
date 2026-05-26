import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { decodeToken } from "@/lib/api/auth";
import Link from "next/link";
import { ScrollText, Cpu, Webhook } from "lucide-react";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) redirect("/login");

  const payload = decodeToken(accessToken);
  if (!payload) redirect("/login");

  const isOwnerOrManager = ["OWNER", "MANAGER", "SUPER_ADMIN"].includes(
    payload.role,
  );
  if (!isOwnerOrManager) redirect("/store/dashboard");

  const sections = [
    {
      href: "/store/settings/audit-log",
      icon: ScrollText,
      title: "Audit Log",
      description: "View a full history of actions performed in your store.",
    },
    {
      href: "/store/settings/hardware",
      icon: Cpu,
      title: "Hardware",
      description: "Configure receipt printers and barcode scanners.",
    },
    {
      href: "/store/settings/webhooks",
      icon: Webhook,
      title: "Webhooks",
      description: "Manage outbound webhook endpoints for store events.",
    },
  ];

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your store configuration
        </p>
      </div>

      <div className="grid gap-4">
        {sections.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 hover:border-orange-300 hover:shadow-sm transition-all"
          >
            <div className="mt-0.5 rounded-lg bg-orange-50 p-2.5">
              <Icon className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{title}</p>
              <p className="text-sm text-slate-500 mt-0.5">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
