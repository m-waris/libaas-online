import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

import { ProductVariantSelector } from '../../../components/storefront/product-variant-selector';
import { getStorefrontProductById, getStorefrontProducts, getStorefrontStore } from '../../../lib/queries';

export const dynamic = 'force-dynamic';

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(value);
}

export default async function ProductPage({ params }: ProductPageProps) {
  const requestHeaders = await headers();
  const storeSlug = requestHeaders.get('x-store-slug')?.trim();

  if (!storeSlug) {
    notFound();
  }

  const { id } = await params;
  const [store, product, catalog] = await Promise.all([
    getStorefrontStore(storeSlug),
    getStorefrontProductById(storeSlug, id),
    getStorefrontProducts(storeSlug),
  ]);

  if (!store || !product) {
    notFound();
  }

  const productImages = product.images.slice().sort((left, right) => left.sort_order - right.sort_order);
  const primaryImage = productImages[0]?.url ?? null;
  const price = product.variants[0]?.price_override ?? product.base_price;
  const inStock = product.variants.some((variant) => variant.stock_count > 0);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">Storefront</p>
              <h1 className="text-2xl font-semibold">{store.name}</h1>
            </div>
            <Link href="/" className="text-sm font-medium text-zinc-700 hover:text-zinc-950">
              Back to catalog
            </Link>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
              {primaryImage ? (
                <img src={primaryImage} alt={product.name} className="h-96 w-full object-cover" />
              ) : (
                <div className="flex h-96 items-center justify-center bg-zinc-100 text-sm text-zinc-500">
                  No product image available yet.
                </div>
              )}
            </div>

            {productImages.length > 1 ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {productImages.map((image) => (
                  <div key={image.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                    <img src={image.url} alt={`${product.name} ${image.sort_order}`} className="h-32 w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">Product</p>
                  <h2 className="mt-2 text-3xl font-semibold text-zinc-900">{product.name}</h2>
                </div>
                <div
                  className={`rounded-full px-3 py-1 text-sm font-medium ${inStock ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
                >
                  {inStock ? 'In stock' : 'Out of stock'}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-600">
                <span className="rounded-full bg-zinc-100 px-3 py-1">Starting at {formatCurrency(price)}</span>
                <span className="rounded-full bg-zinc-100 px-3 py-1">{catalog.length} products in store</span>
              </div>

              <div className="mt-6 space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-7 text-zinc-700">
                <p className="font-medium text-zinc-900">Description</p>
                <p>{product.description || 'No description available yet.'}</p>
              </div>
            </div>

            <ProductVariantSelector product={product} variants={product.variants} />
          </section>
        </div>
      </div>
    </main>
  );
}
