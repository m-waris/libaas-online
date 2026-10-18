import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { StorefrontShell } from "../components/storefront/storefront-shell";
import { CatalogFilters } from "../components/storefront/catalog-filters";
import { getCloudinaryImageUrl } from "../lib/cloudinary-image";
import { formatCurrency } from "../lib/format-currency";
import {
  getStorefrontProducts,
  getStorefrontStore,
  type StorefrontProduct,
} from "../lib/queries";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: Promise<{ filter?: string; q?: string }>;
};

type StorefrontFilter = "all" | "instock" | "outofstock";

function getProductDisplayPrice(product: StorefrontProduct) {
  const overrideValues = product.variants
    .map((variant) => variant.price_override)
    .filter((value): value is number => typeof value === "number");

  return overrideValues.length > 0
    ? Math.min(...overrideValues)
    : product.base_price;
}

function resolveFilter(filter?: string): StorefrontFilter {
  if (filter === "instock" || filter === "outofstock") {
    return filter;
  }

  return "all";
}

function getPlatformWhatsAppUrl() {
  const phoneNumber = process.env.PLATFORM_WHATSAPP_NUMBER?.replace(/\D/g, "");

  if (!phoneNumber || phoneNumber.length < 10 || phoneNumber.length > 15) {
    return null;
  }

  const message = encodeURIComponent(
    "Assalam-o-alaikum! I would like to learn about opening a Libaas Online store.",
  );
  return `https://wa.me/${phoneNumber}?text=${message}`;
}

function PlatformLandingPage() {
  const whatsAppUrl = getPlatformWhatsAppUrl();

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f5f1] text-[#25211e]">
      <header className="mx-auto flex w-[min(100%-32px,1280px)] items-center justify-between py-5 sm:py-7">
        <Link
          href="/"
          className="font-serif text-xl font-semibold tracking-tight sm:text-2xl"
        >
          Libaas<span className="ml-1 text-[#8b7663]">Online</span>
        </Link>
        <nav
          aria-label="Main navigation"
          className="flex items-center gap-3 sm:gap-8"
        >
          <a
            href="#how-it-works"
            className="hidden min-h-11 items-center text-sm text-[#716960] transition hover:text-[#25211e] sm:inline-flex"
          >
            How it works
          </a>
          {whatsAppUrl ? (
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-full border border-[#d9d0c6] px-4 text-sm font-medium transition hover:border-[#25211e] sm:px-5"
            >
              Talk to us
            </a>
          ) : (
            <a
              href="#how-it-works"
              className="inline-flex min-h-11 items-center rounded-full border border-[#d9d0c6] px-4 text-sm font-medium transition hover:border-[#25211e] sm:px-5"
            >
              For sellers
            </a>
          )}
        </nav>
      </header>

      <section className="mx-auto grid w-[min(100%-32px,1280px)] items-center gap-12 pb-20 pt-12 sm:pb-28 sm:pt-16 lg:min-h-[680px] lg:grid-cols-[1.04fr_0.96fr] lg:gap-16 lg:py-16">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-[#837263] sm:text-sm">
            For independent fashion sellers in Pakistan
          </p>
          <h1 className="font-serif text-[clamp(3.3rem,8vw,6.5rem)] leading-[0.94] tracking-[-0.055em]">
            Your shop,
            <br />
            dressed for
            <br />
            <span className="text-[#8b7663]">the internet.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-[#716960] sm:text-lg sm:leading-8">
            Give your clothing business a beautiful home online. Share one link,
            show your collection, and let customers order with Cash on Delivery.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#how-it-works"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#39332e] px-6 text-sm font-semibold text-white transition hover:bg-[#554a41]"
            >
              See how it works
            </a>
            {whatsAppUrl ? (
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold text-[#39332e] transition hover:bg-[#ebe5dd]"
              >
                WhatsApp par baat karein
              </a>
            ) : null}
          </div>
          <p className="mt-5 text-sm text-[#837b72]">
            Made for the way local fashion businesses sell.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[560px] lg:justify-self-end">
          <div
            aria-hidden="true"
            className="absolute -right-14 -top-12 h-56 w-56 rounded-full bg-[#e6dbcf] sm:-right-10 sm:h-72 sm:w-72"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-10 -left-8 h-40 w-40 rounded-full border border-[#d8c9b8] sm:h-52 sm:w-52"
          />
          <div className="relative rotate-[1.25deg] rounded-[28px] border border-[#e7e0d7] bg-white p-3 shadow-[0_28px_80px_-48px_rgba(37,33,30,0.42)] sm:rounded-[34px] sm:p-4">
            <div className="overflow-hidden rounded-[21px] bg-[#faf8f5] sm:rounded-[26px]">
              <div className="flex items-center justify-between border-b border-[#ebe6df] px-4 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#39332e] font-serif text-lg text-white">
                    N
                  </span>
                  <div>
                    <p className="font-serif text-base font-semibold">
                      NOOR STUDIO
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#8c8278]">
                      Everyday / Eid edit
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-[#e7e0d7] px-3 py-2 text-xs text-[#716960]">
                  Bag · 0
                </span>
              </div>
              <div className="px-4 pb-5 pt-5 sm:px-6 sm:pb-7 sm:pt-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b7663]">
                  New season
                </p>
                <p className="mt-2 max-w-[310px] font-serif text-3xl leading-[1.02] tracking-tight sm:text-4xl">
                  Pieces to live in.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4">
                  <div>
                    <div className="aspect-[4/5] overflow-hidden rounded-xl bg-[#e7ddd2] p-3 sm:rounded-2xl sm:p-4">
                      <div className="flex h-full items-end rounded-lg bg-[linear-gradient(145deg,#d7c8b7_0%,#b3a08d_48%,#ede5dc_48%,#f5f1eb_100%)] p-3 sm:rounded-xl">
                        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[9px] text-[#554a41]">
                          LOOK 01
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium sm:text-sm">
                          Soft linen set
                        </p>
                        <p className="mt-1 text-[10px] text-[#8c8278] sm:text-xs">
                          3 sizes available
                        </p>
                      </div>
                      <p className="text-xs font-semibold sm:text-sm">
                        Rs 4,500
                      </p>
                    </div>
                  </div>
                  <div className="pt-7 sm:pt-10">
                    <div className="aspect-[4/5] overflow-hidden rounded-xl bg-[#e6e2dc] p-3 sm:rounded-2xl sm:p-4">
                      <div className="flex h-full items-end rounded-lg bg-[linear-gradient(35deg,#a39c92_0%,#d9d3ca_50%,#eeeae3_50%,#f6f4f0_100%)] p-3 sm:rounded-xl">
                        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[9px] text-[#554a41]">
                          LOOK 02
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium sm:text-sm">
                          Everyday kurta
                        </p>
                        <p className="mt-1 text-[10px] text-[#8c8278] sm:text-xs">
                          In stock
                        </p>
                      </div>
                      <p className="text-xs font-semibold sm:text-sm">
                        Rs 3,200
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-5 left-2 rounded-2xl border border-[#e7e0d7] bg-white px-4 py-3 shadow-lg shadow-[#25211e]/5 sm:left-0 sm:px-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#8c8278]">
              Made for local sellers
            </p>
            <p className="mt-1 text-sm font-semibold">
              One link. Your own shop.
            </p>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-[#e7e0d7] bg-[#fffefa]">
        <div className="mx-auto w-[min(100%-32px,1280px)] py-16 sm:py-20">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b7663]">
              A little more put together
            </p>
            <h2 className="mt-4 font-serif text-4xl leading-tight tracking-[-0.035em] sm:text-5xl">
              A storefront that feels like yours.
            </h2>
          </div>
          <div
            id="how-it-works"
            className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6"
          >
            {[
              {
                number: "01",
                title: "Your own store link",
                detail:
                  "Give customers one easy link to your shop and latest collection.",
              },
              {
                number: "02",
                title: "Products and sizes",
                detail:
                  "Show clear product details, variants, prices, and availability.",
              },
              {
                number: "03",
                title: "COD ordering",
                detail:
                  "Let shoppers place an order without needing to create an account.",
              },
            ].map((feature) => (
              <article
                key={feature.number}
                className="rounded-2xl border border-[#e7e0d7] bg-[#f7f5f1] p-5 sm:p-6"
              >
                <p className="font-serif text-xl text-[#8b7663]">
                  {feature.number}
                </p>
                <h3 className="mt-6 text-base font-semibold">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#716960]">
                  {feature.detail}
                </p>
              </article>
            ))}
          </div>
          <div
            id="contact"
            className="mt-12 flex flex-col gap-5 border-t border-[#e7e0d7] pt-8 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-serif text-2xl">
                Ready to bring your shop online?
              </p>
              <p className="mt-2 text-sm text-[#716960]">
                A beautiful, simple storefront for the business you’ve built.
              </p>
            </div>
            {whatsAppUrl ? (
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center self-start rounded-full bg-[#39332e] px-6 text-sm font-semibold text-white transition hover:bg-[#554a41] sm:self-auto"
              >
                WhatsApp par baat karein
              </a>
            ) : (
              <a
                href="#features"
                className="inline-flex min-h-12 items-center justify-center self-start rounded-full bg-[#39332e] px-6 text-sm font-semibold text-white transition hover:bg-[#554a41] sm:self-auto"
              >
                Explore the features
              </a>
            )}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-[min(100%-32px,1280px)] min-h-20 items-center justify-between gap-4 text-sm text-[#716960]">
        <span className="font-serif font-semibold text-[#25211e]">
          Libaas Online
        </span>
        <span>For the people behind the labels.</span>
      </footer>
    </main>
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const requestHeaders = await headers();
  const tenantMode = requestHeaders.get("x-tenant-mode")?.trim().toLowerCase();

  if (tenantMode === "root-domain" || tenantMode === "none") {
    redirect("/login");
  }

  const storeSlug = requestHeaders.get("x-store-slug")?.trim();

  if (!storeSlug) {
    notFound();
  }

  const params = searchParams ? await searchParams : undefined;
  const filter = resolveFilter(params?.filter);
  const query = (params?.q ?? "").trim().toLocaleLowerCase("en");

  const [store, products] = await Promise.all([
    getStorefrontStore(storeSlug),
    getStorefrontProducts(storeSlug),
  ]);

  if (!store) {
    notFound();
  }

  const filteredProducts = products.filter((product) => {
    const inStock = product.variants.some((variant) => variant.stock_count > 0);
    const matchesFilter =
      filter === "instock"
        ? inStock
        : filter === "outofstock"
          ? !inStock
          : true;
    const matchesQuery =
      query.length === 0 ||
      product.name.toLocaleLowerCase("en").includes(query) ||
      Boolean(product.description?.toLocaleLowerCase("en").includes(query));

    return matchesFilter && matchesQuery;
  });

  return (
    <StorefrontShell store={store} query={query}>
      <main className="bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <div className="flex flex-col gap-3 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-zinc-500">Aap ke liye</p>
              <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Chalo, kuch acha sa dhoondte hain.
              </h1>
            </div>
            <p className="text-sm text-zinc-500">
              {filteredProducts.length} pieces
            </p>
          </div>

          <CatalogFilters filter={filter} query={query} />

          {filteredProducts.length > 0 ? (
            <section
              aria-label="Products"
              className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4"
            >
              {filteredProducts.map((product) => {
                const primaryImage = product.images[0]?.url ?? null;
                const price = getProductDisplayPrice(product);
                const inStock = product.variants.some(
                  (variant) => variant.stock_count > 0,
                );

                return (
                  <article key={product.id} className="min-w-0">
                    <Link
                      href={`/products/${product.id}`}
                      className="group block text-inherit no-underline"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[#e7e0d7] sm:rounded-2xl">
                        {primaryImage ? (
                          // Product assets may currently be stored on arbitrary HTTPS hosts before Cloudinary uploads are added.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getCloudinaryImageUrl(primaryImage, {
                              width: 720,
                              catalogCrop: true,
                            })}
                            alt={product.name}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="flex h-full items-end bg-[linear-gradient(145deg,#e9e1d7,#d3c4b3)] p-4 text-sm text-[#716960]">
                            Photo jald aa rahi hai
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-medium text-zinc-900">
                            {product.name}
                          </h2>
                          <p
                            className={`mt-1 text-sm ${inStock ? "text-zinc-500" : "font-medium text-[#76504a]"}`}
                          >
                            {inStock ? "Available" : "Sold out"}
                          </p>
                        </div>
                        <span className="shrink-0 text-base font-semibold text-zinc-900">
                          {formatCurrency(price)}
                        </span>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </section>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center">
              <h2 className="font-serif text-2xl">Kuch nahi mila</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Search badal kar dekhein ya tamam products browse karein.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex min-h-11 items-center rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white"
              >
                Browse everything
              </Link>
            </div>
          )}
        </div>
      </main>
    </StorefrontShell>
  );
}
