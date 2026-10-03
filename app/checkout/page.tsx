import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { CheckoutForm } from '../../components/storefront/checkout-form';
import { getStorefrontStore } from '../../lib/queries';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const requestHeaders = await headers();
  const storeSlug = requestHeaders.get('x-store-slug')?.trim();

  if (!storeSlug) {
    notFound();
  }

  const store = await getStorefrontStore(storeSlug);

  if (!store) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">Checkout</p>
          <h1 className="mt-2 text-3xl font-semibold">Complete your order</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            Your contact details are only used to fulfill this order. Prices and inventory are verified server-side.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/cart" className="text-sm font-medium text-zinc-700 hover:text-zinc-950">
              Back to cart
            </Link>
            <Link href="/" className="text-sm font-medium text-zinc-700 hover:text-zinc-950">
              Continue shopping
            </Link>
          </div>
        </div>

        <CheckoutForm store={store} />
      </div>
    </main>
  );
}
