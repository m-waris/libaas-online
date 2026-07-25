import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type StoreRecord = {
  id: string;
  slug: string;
  name: string;
  logo_url?: string | null;
  theme_config?: Record<string, unknown> | null;
};

type ProductRecord = {
  id: string;
  name: string;
  description?: string | null;
  base_price: number;
  is_active: boolean;
};

type VariantRecord = {
  id: string;
  product_id: string;
  size?: string | null;
  color?: string | null;
  stock_count: number;
  price_override?: number | null;
  sku: string;
};

async function getStoreData(storeSlug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, slug, name, logo_url, theme_config")
    .eq("slug", storeSlug)
    .maybeSingle<StoreRecord>();

  if (storeError || !store) {
    return null;
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, description, base_price, is_active")
    .eq("store_id", store.id)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (productsError) {
    return null;
  }

  const productIds = (products ?? []).map((product) => product.id);
  let variants: VariantRecord[] = [];

  if (productIds.length > 0) {
    const { data: productVariants, error: variantsError } = await supabase
      .from("product_variants")
      .select("id, product_id, size, color, stock_count, price_override, sku")
      .in("product_id", productIds);

    if (!variantsError) {
      variants = (productVariants ?? []) as VariantRecord[];
    }
  }

  return {
    store,
    products: (products ?? []) as ProductRecord[],
    variants,
  };
}

function getStoreLogo(store: StoreRecord) {
  const themeConfig = store.theme_config as Record<string, unknown> | undefined;
  const directLogo =
    (themeConfig?.logoUrl as string | undefined) ??
    (themeConfig?.logo_url as string | undefined) ??
    (themeConfig?.logo as string | undefined) ??
    store.logo_url;

  return directLogo ?? null;
}

export default async function Home() {
  const requestHeaders = await headers();
  const storeSlug = requestHeaders.get("x-store-slug")?.trim();

  if (!storeSlug) {
    notFound();
  }

  const data = await getStoreData(storeSlug);

  if (!data) {
    notFound();
  }

  const { store, products, variants } = data;
  const storeLogo = getStoreLogo(store);
  const variantMap = new Map(variants.map((variant) => [variant.product_id, variant]));

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {storeLogo ? (
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                  <img
                    src={storeLogo}
                    alt={`${store.name} logo`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
                  Storefront
                </p>
                <h1 className="text-2xl font-semibold">{store.name}</h1>
                <p className="text-sm text-zinc-600">{store.slug}</p>
              </div>
            </div>
            <div className="rounded-full bg-zinc-100 px-4 py-2 text-sm text-zinc-600">
              {products.length} active product{products.length === 1 ? "" : "s"}
            </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const variant = variantMap.get(product.id);
            const price = variant?.price_override ?? product.base_price;

            return (
              <article
                key={product.id}
                className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div>
                  <h2 className="text-lg font-semibold">{product.name}</h2>
                  {product.description ? (
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      {product.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between text-sm text-zinc-600">
                  <span>Starting at</span>
                  <span className="text-lg font-semibold text-zinc-900">
                    {new Intl.NumberFormat("en-NG", {
                      style: "currency",
                      currency: "NGN",
                    }).format(price)}
                  </span>
                </div>

                {variant ? (
                  <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
                    <p className="font-medium text-zinc-900">Variant</p>
                    <p>
                      {variant.size ? `Size: ${variant.size}` : null}
                      {variant.size && variant.color ? " • " : ""}
                      {variant.color ? `Color: ${variant.color}` : null}
                    </p>
                    <p className="mt-1">SKU: {variant.sku}</p>
                    <p className="mt-1">Stock: {variant.stock_count}</p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
                    No variants configured yet.
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
