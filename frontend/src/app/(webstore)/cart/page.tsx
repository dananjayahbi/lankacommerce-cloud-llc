/**
 * Cart Page — Server Component wrapper
 *
 * Adds storefront header/footer chrome then renders the client-side cart UI.
 */

import { headers } from 'next/headers';
import { StorefrontChrome } from '@/components/webstore/layout/StorefrontChrome';
import { CartPageClient } from './CartPageClient';

export default async function CartPage() {
  const headerStore = await headers();
  const tenantSlug = headerStore.get('x-tenant-slug') ?? '';

  return (
    <StorefrontChrome tenantSlug={tenantSlug}>
      <CartPageClient />
    </StorefrontChrome>
  );
}
