import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { ProductVariantSelector } from "../../../components/storefront/product-variant-selector";
import { ProductGallery } from "../../../components/storefront/product-gallery";
import { StorefrontShell } from "../../../components/storefront/storefront-shell";
import { formatCurrency } from "../../../lib/format-currency";
import {
  getStorefrontProductById,
  getStorefrontStore,
} from "../../../lib/queries";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const requestHeaders = await headers();
  const storeSlug = requestHeaders.get("x-store-slug")?.trim();

  if (!storeSlug) {
    notFound();
  }

  const { id } = await params;
  const [store, product] = await Promise.all([
    getStorefrontStore(storeSlug),
    getStorefrontProductById(storeSlug, id),
  ]);

  if (!store || !product) {
    notFound();
  }

  const productImages = product.images
    .slice()
    .sort((left, right) => left.sort_order - right.sort_order);
  const price = product.variants[0]?.price_override ?? product.base_price;
  const inStock = product.variants.some((variant) => variant.stock_count > 0);

  return (
    <StorefrontShell store={store}>
      <main className="bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <Link
            href="/"
            className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-zinc-600 hover:text-zinc-950"
          >
            ← Wapas collection par
          </Link>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <ProductGallery images={productImages} productName={product.name} />

            <section className="space-y-6">
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
                      Product detail
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold text-zinc-900">
                      {product.name}
                    </h1>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-sm font-medium ${inStock ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                  >
                    {inStock ? "Available" : "Sold out"}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-600">
                  <span className="rounded-full bg-zinc-100 px-3 py-1">
                    {formatCurrency(price)} se
                  </span>
                </div>

                <div className="mt-6 space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-7 text-zinc-700">
                  <p className="font-medium text-zinc-900">Details</p>
                  <p>
                    {product.description ||
                      "Is product ki details jald add hongi."}
                  </p>
                </div>
              </div>

              <ProductVariantSelector
                product={product}
                variants={product.variants}
              />
            </section>
          </div>
        </div>
      </main>
    </StorefrontShell>
  );
}
