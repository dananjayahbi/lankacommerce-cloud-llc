import { cookies } from "next/headers";
import { StoreLayoutClient } from "./StoreLayoutClient";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read the access token server-side to pass to StoreLayoutClient for store hydration
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  return (
    <div className="min-h-screen flex bg-background">
      <StoreLayoutClient accessToken={accessToken}>
        {children}
      </StoreLayoutClient>
    </div>
  );
}
