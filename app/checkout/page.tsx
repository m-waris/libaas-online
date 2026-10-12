import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { CheckoutForm } from "../../components/storefront/checkout-form";
import { StorefrontShell } from "../../components/storefront/storefront-shell";
import { getStorefrontStore } from "../../lib/queries";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const requestHeaders = await headers();
  const storeSlug = requestHeaders.get("x-store-slug")?.trim();

  if (!storeSlug) {
    notFound();
  }

  const store = await getStorefrontStore(storeSlug);

  if (!store) {
    notFound();
  }

  return (
    <StorefrontShell store={store}>
      <main className="bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
              Checkout
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              Bas thori si details, aur order aap ka!
            </h1>
            <p className="mt-3 text-sm leading-7 text-zinc-600">
              Cash on Delivery: maal aaye, phir paisay dein. Price aur stock
              order confirm karte waqt dobara check honge.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/cart"
                className="text-sm font-medium text-zinc-700 hover:text-zinc-950"
              >
                Cart par wapas jayein
              </Link>
              <Link
                href="/"
                className="text-sm font-medium text-zinc-700 hover:text-zinc-950"
              >
                Shopping jari rakhein
              </Link>
            </div>
          </div>

          <CheckoutForm store={store} />
        </div>
      </main>
    </StorefrontShell>
  );
}
