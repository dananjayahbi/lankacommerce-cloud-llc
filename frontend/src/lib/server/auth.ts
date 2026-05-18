import { headers } from "next/headers";

export interface ServerUser {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
  sessionVersion: number;
}

/**
 * Reads the authenticated user's info from the request headers injected
 * by the Next.js middleware. Only available in Server Components.
 */
export async function getServerUser(): Promise<ServerUser | null> {
  const headerStore = await headers();

  const id = headerStore.get("x-user-id");
  const email = headerStore.get("x-user-email");
  const role = headerStore.get("x-user-role");

  if (!id || !email || !role) return null;

  return {
    id,
    email,
    role,
    tenantId: headerStore.get("x-tenant-id") || null,
    sessionVersion: parseInt(headerStore.get("x-session-version") ?? "1", 10),
  };
}
