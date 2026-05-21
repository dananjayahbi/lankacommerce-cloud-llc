import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decodeToken } from "@/lib/api/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { ProductDetailClient } from "./ProductDetailClient";
import type { Metadata } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface PageProps {
  params: Promise<{ productId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productId } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) return { title: "Product — LankaCommerce" };

  try {
    const res = await fetch(`${API_BASE}/api/catalog/products/${productId}/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      const name = json.data?.name ?? json.name ?? "Product";
      return { title: `${name} — LankaCommerce` };
    }
  } catch {
    // Non-fatal
  }

  return { title: "Product — LankaCommerce" };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { productId } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) redirect("/login");

  const payload = decodeToken(accessToken);
  if (!payload) redirect("/login");

  if (!payload.permissions.includes(PERMISSIONS.PRODUCTS_VIEW)) {
    redirect("/store/inventory");
  }

  return <ProductDetailClient productId={productId} />;
}
