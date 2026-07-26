import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { ProductsDashboard } from "../../../components/owner/products-dashboard";

export const dynamic = "force-dynamic";

type StoreRecord = {
  id: string;
  slug: string;
  name: string;
};

type ProductRecord = {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type VariantRecord = {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  stock_count: number;
  price_override: number | null;
  sku: string;
};

export default async function ProductsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, slug, name")
    .eq("owner_id", user.id)
    .maybeSingle<StoreRecord>();

  if (storeError) {
    throw new Error("Unable to load your store right now.");
  }

  if (!store) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Owner dashboard
          </p>
          <h1 className="mt-2 text-2xl font-semibold">No store is linked to this account</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            The bootstrap script should have created exactly one store for the owner account you signed in with.
          </p>
        </div>
      </main>
    );
  }

  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select("id, name, description, base_price, is_active, created_at, updated_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (productsError) {
    throw new Error("Unable to load products for your store.");
  }

  const products = (productsData ?? []) as ProductRecord[];
  const productIds = products.map((product) => product.id);

  let variants: VariantRecord[] = [];

  if (productIds.length > 0) {
    const { data: variantsData, error: variantsError } = await supabase
      .from("product_variants")
      .select("id, product_id, size, color, stock_count, price_override, sku")
      .in("product_id", productIds)
      .order("sku", { ascending: true });

    if (!variantsError) {
      variants = (variantsData ?? []) as VariantRecord[];
    }
  }

  return (
    <ProductsDashboard
      initialStore={store}
      initialProducts={products}
      initialVariants={variants}
    />
  );
}
