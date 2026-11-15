import Link from "next/link";
import { ArrowLeft, ArrowRight, ShoppingBag, Truck } from "lucide-react";
import { AppIcon } from "../../components/ui/app-icon";
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
      <main className="storefront-page storefront-checkout bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <header className="checkout-intro">
            <div className="checkout-intro__main">
              <p className="storefront-eyebrow inline-flex items-center gap-2">
                <AppIcon icon={ShoppingBag} size={16} />
                Checkout
              </p>
              <h1>Bas thori si details, aur order aap ka!</h1>
            </div>
            <div className="checkout-intro__details">
              <span className="checkout-intro__tag inline-flex items-center gap-2">
                <AppIcon icon={Truck} size={16} />
                Cash on Delivery
              </span>
              <p>
                Maal aaye, phir paisay dein. Price aur stock order confirm karte
                waqt dobara check honge.
              </p>
              <nav aria-label="Checkout navigation">
                <Link href="/cart" className="checkout-intro__link">
                  <AppIcon icon={ArrowLeft} size={16} />
                  Cart par wapas jayein
                </Link>
                <Link href="/" className="checkout-intro__link">
                  Shopping jari rakhein <AppIcon icon={ArrowRight} size={16} />
                </Link>
              </nav>
            </div>
          </header>

          <CheckoutForm store={store} />
        </div>
      </main>
    </StorefrontShell>
  );
}
