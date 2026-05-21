import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decodeJwt } from "jose";
import React from "react";
import SuperAdminNav from "./superadmin/_components/SuperAdminNav";
import LogoutButton from "./superadmin/_components/LogoutButton";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  let email = "";
  try {
    const payload = decodeJwt(accessToken);
    if (!payload.role || payload.role !== "SUPER_ADMIN") {
      redirect("/login");
    }
    email = (payload.email as string) ?? "";
  } catch {
    redirect("/login");
  }

  return (
    <>
      {/* Desktop-only notice (shown on small screens) */}
      <div className="md:hidden flex h-screen items-center justify-center bg-[#1B2B3A] px-6">
        <div className="text-center">
          <p className="text-white font-bold text-xl mb-2">LankaCommerce</p>
          <p className="text-white/70 text-sm">
            The admin console requires a desktop browser. Please open this page
            on a device with a wider screen.
          </p>
        </div>
      </div>

      {/* Full layout (desktop) */}
      <div className="hidden md:flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 h-full flex flex-col flex-shrink-0 bg-[#1B2B3A]">
          {/* Wordmark */}
          <div className="px-5 pt-6 pb-0">
            <span className="text-white font-bold text-lg tracking-tight">
              LankaCommerce
            </span>
            <div className="mt-3 h-px w-full bg-[#F97316]" />
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto">
            <SuperAdminNav />
          </div>

          {/* User footer */}
          <LogoutButton email={email} />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-slate-100 p-6">
          {children}
        </main>
      </div>
    </>
  );
}

