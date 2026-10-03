import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import {
  getStorefrontProducts,
  getStorefrontStore,
  type StorefrontProduct,
} from '../lib/queries';

export const dynamic = 'force-dynamic';

type HomeProps = {
  searchParams?: Promise<{ filter?: string }>;
};

type StorefrontFilter = 'all' | 'instock' | 'outofstock';

function getStoreLogo(store: Awaited<ReturnType<typeof getStorefrontStore>>) {
  if (!store) {
    return null;
  }

  const themeConfig = store.theme_config as Record<string, unknown> | undefined;
  const directLogo =
    (themeConfig?.logoUrl as string | undefined) ??
    (themeConfig?.logo_url as string | undefined) ??
    (themeConfig?.logo as string | undefined) ??
    store.logo_url;

  return directLogo ?? null;
}

function getProductDisplayPrice(product: StorefrontProduct) {
  const overrideValues = product.variants
    .map((variant) => variant.price_override)
    .filter((value): value is number => typeof value === 'number');

  if (overrideValues.length > 0) {
    return Math.min(...overrideValues);
  }

  return product.base_price;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(value);
}

function resolveFilter(filter?: string): StorefrontFilter {
  if (filter === 'instock' || filter === 'outofstock') {
    return filter;
  }

  return 'all';
}

export default async function Home({ searchParams }: HomeProps) {
  const requestHeaders = await headers();
  const tenantMode = requestHeaders.get('x-tenant-mode')?.trim().toLowerCase();

  if (tenantMode === 'root-domain' || tenantMode === 'none') {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-16 text-zinc-100 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-2xl shadow-black/20 sm:p-10 lg:p-12">
          <div className="max-w-2xl space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-400">Libaas Online</p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Launch a polished storefront for your business in minutes.
            </h1>
            <p className="text-lg leading-8 text-zinc-300">
              Build, manage, and grow your online shop with a simple multi-tenant platform made for modern sellers.
            </p>
          </div>

          <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 sm:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-white">Fast setup</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Create a storefront without wiring up a separate commerce stack.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Flexible product pages</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Present products clearly with pricing, variants, and inventory details.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Built for growth</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Scale from a single store to a broader multi-tenant experience over time.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const storeSlug = requestHeaders.get('x-store-slug')?.trim();

  if (!storeSlug) {
    notFound();
  }

  const params = searchParams ? await searchParams : undefined;
  const filter = resolveFilter(params?.filter);

  const [store, products] = await Promise.all([
    getStorefrontStore(storeSlug),
    getStorefrontProducts(storeSlug),
  ]);

  if (!store) {
    notFound();
  }

  const storeLogo = getStoreLogo(store);
  const filteredProducts = products.filter((product) => {
    if (filter === 'instock') {
      return product.variants.some((variant) => variant.stock_count > 0);
    }

    if (filter === 'outofstock') {
      return product.variants.every((variant) => variant.stock_count <= 0);
    }

    return true;
  });

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {storeLogo ? (
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                  <img src={storeLogo} alt={`${store.name} logo`} className="h-full w-full object-cover" />
                </div>
              ) : null}
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">Storefront</p>
                <h1 className="text-2xl font-semibold">{store.name}</h1>
                <p className="text-sm text-zinc-600">{store.slug}</p>
              </div>
            </div>
            <div className="rounded-full bg-zinc-100 px-4 py-2 text-sm text-zinc-600">
              {filteredProducts.length} active product{filteredProducts.length === 1 ? '' : 's'}
            </div>
          </div>
        </header>

        <div className="flex flex-wrap gap-3">
          {[
            { label: 'All products', value: 'all' },
            { label: 'In stock', value: 'instock' },
            { label: 'Out of stock', value: 'outofstock' },
          ].map((option) => {
            const active = filter === option.value;
            const href = option.value === 'all' ? '/' : `/?filter=${option.value}`;

            return (
              <Link
                key={option.value}
                href={href}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => {
            const primaryImage = product.images[0]?.url ?? null;
            const price = getProductDisplayPrice(product);
            const inStock = product.variants.some((variant) => variant.stock_count > 0);

            return (
              <article key={product.id} className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="h-48 bg-zinc-100">
                  {primaryImage ? (
                    <img src={primaryImage} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                      Placeholder image
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-zinc-900">{product.name}</h2>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          inStock ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {inStock ? 'In stock' : 'Out of stock'}
                      </span>
                    </div>
                    {product.description ? (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-600">{product.description}</p>
                    ) : null}
                  </div>

                  <div className="mt-auto flex items-center justify-between text-sm text-zinc-600">
                    <span>Starting at</span>
                    <span className="text-lg font-semibold text-zinc-900">{formatCurrency(price)}</span>
                  </div>

                  <Link href={`/products/${product.id}`} className="inline-flex items-center text-sm font-medium text-zinc-700 hover:text-zinc-950">
                    View details →
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
