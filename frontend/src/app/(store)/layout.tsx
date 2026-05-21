import { cookies, headers } from "next/headers";
import { StoreLayoutClient } from "./StoreLayoutClient";
import GracePeriodBanner from "@/components/GracePeriodBanner";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  const requestHeaders = await headers();
  const isGracePeriod = requestHeaders.get("x-grace-period") === "true";
  const graceEndsAt = requestHeaders.get("x-grace-ends-at") ?? undefined;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {isGracePeriod && <GracePeriodBanner graceEndsAt={graceEndsAt} />}
      <div id="main-content" className="flex flex-1">
        <StoreLayoutClient accessToken={accessToken}>
          {children}
        </StoreLayoutClient>
      </div>
    </div>
  );
}
