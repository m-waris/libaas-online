import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

import { CartClientPage } from '../../components/storefront/cart-client-page';
import { getStorefrontStore } from '../../lib/queries';

export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const requestHeaders = await headers();
  const storeSlug = requestHeaders.get('x-store-slug')?.trim();

  if (!storeSlug) {
    notFound();
  }

  const store = await getStorefrontStore(storeSlug);

  if (!store) {
    notFound();
  }

  return <CartClientPage store={store} />;
}
