"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

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

type ProductsDashboardProps = {
  initialStore: StoreRecord;
  initialProducts: ProductRecord[];
  initialVariants: VariantRecord[];
};

type ProductFormState = {
  name: string;
  description: string;
  base_price: string;
  is_active: boolean;
};

type VariantFormState = {
  size: string;
  color: string;
  stock_count: string;
  sku: string;
  price_override: string;
};

export function ProductsDashboard({
  initialStore,
  initialProducts,
  initialVariants,
}: ProductsDashboardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [products, setProducts] = useState(initialProducts);
  const [variants, setVariants] = useState(initialVariants);
  const [productForm, setProductForm] = useState<ProductFormState>({
    name: "",
    description: "",
    base_price: "",
    is_active: true,
  });
  const [variantForm, setVariantForm] = useState<VariantFormState>({
    size: "",
    color: "",
    stock_count: "",
    sku: "",
    price_override: "",
  });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productMessage, setProductMessage] = useState<string | null>(null);
  const [variantMessage, setVariantMessage] = useState<string | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isCreatingVariant, setIsCreatingVariant] = useState(false);

  const variantsByProductId = useMemo(() => {
    return variants.reduce<Record<string, VariantRecord[]>>((accumulator, variant) => {
      const existing = accumulator[variant.product_id] ?? [];
      existing.push(variant);
      accumulator[variant.product_id] = existing;
      return accumulator;
    }, {});
  }, [variants]);

  async function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProductMessage(null);
    setIsCreatingProduct(true);

    const basePrice = Number(productForm.base_price);
    const { data, error } = await supabase
      .from("products")
      .insert({
        store_id: initialStore.id,
        name: productForm.name.trim(),
        description: productForm.description.trim() || null,
        base_price: basePrice,
        is_active: productForm.is_active,
      })
      .select("id, name, description, base_price, is_active, created_at, updated_at")
      .single();

    if (error || !data) {
      setProductMessage(error?.message ?? "Unable to create the product.");
      setIsCreatingProduct(false);
      return;
    }

    setProducts((current) => [data, ...current]);
    setSelectedProductId(data.id);
    setProductForm({
      name: "",
      description: "",
      base_price: "",
      is_active: true,
    });
    setProductMessage(`Product created: ${data.name}`);
    setIsCreatingProduct(false);
  }

  async function handleCreateVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProductId) {
      setVariantMessage("Create a product before adding a variant.");
      return;
    }

    setVariantMessage(null);
    setIsCreatingVariant(true);

    const stockCount = Number(variantForm.stock_count);
    const priceOverride = variantForm.price_override
      ? Number(variantForm.price_override)
      : null;

    const { data, error } = await supabase
      .from("product_variants")
      .insert({
        product_id: selectedProductId,
        size: variantForm.size.trim() || null,
        color: variantForm.color.trim() || null,
        stock_count: stockCount,
        sku: variantForm.sku.trim(),
        price_override: priceOverride,
      })
      .select("id, product_id, size, color, stock_count, price_override, sku")
      .single();

    if (error || !data) {
      setVariantMessage(error?.message ?? "Unable to create the variant.");
      setIsCreatingVariant(false);
      return;
    }

    setVariants((current) => [data, ...current]);
    setVariantForm({
      size: "",
      color: "",
      stock_count: "",
      sku: "",
      price_override: "",
    });
    setVariantMessage(`Variant created for ${data.sku}.`);
    setIsCreatingVariant(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
              Owner dashboard
            </p>
            <h1 className="mt-2 text-2xl font-semibold">{initialStore.name}</h1>
            <p className="mt-1 text-sm text-zinc-600">Slug: {initialStore.slug}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
          >
            Sign out
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Create a product</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Writes go through your authenticated session so RLS can enforce owner scope.
                </p>
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleCreateProduct}>
              <label className="block text-sm font-medium text-zinc-700">
                <span className="mb-2 block">Name</span>
                <input
                  required
                  value={productForm.name}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none"
                />
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                <span className="mb-2 block">Description</span>
                <textarea
                  rows={3}
                  value={productForm.description}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none"
                />
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                <span className="mb-2 block">Base price</span>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.base_price}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, base_price: event.target.value }))
                  }
                  className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none"
                />
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                <input
                  type="checkbox"
                  checked={productForm.is_active}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, is_active: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-zinc-300"
                />
                Active on storefront
              </label>

              <button
                type="submit"
                disabled={isCreatingProduct}
                className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingProduct ? "Creating product…" : "Create product"}
              </button>
            </form>

            {productMessage ? (
              <p className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                {productMessage}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold">Add a variant</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Once a product exists, you can add at least one variant for size, color, and stock.
              </p>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleCreateVariant}>
              <label className="block text-sm font-medium text-zinc-700">
                <span className="mb-2 block">Product</span>
                <select
                  value={selectedProductId ?? ""}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none"
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-zinc-700">
                  <span className="mb-2 block">Size</span>
                  <input
                    value={variantForm.size}
                    onChange={(event) =>
                      setVariantForm((current) => ({ ...current, size: event.target.value }))
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none"
                  />
                </label>

                <label className="block text-sm font-medium text-zinc-700">
                  <span className="mb-2 block">Color</span>
                  <input
                    value={variantForm.color}
                    onChange={(event) =>
                      setVariantForm((current) => ({ ...current, color: event.target.value }))
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-zinc-700">
                  <span className="mb-2 block">Stock count</span>
                  <input
                    required
                    type="number"
                    min="0"
                    value={variantForm.stock_count}
                    onChange={(event) =>
                      setVariantForm((current) => ({ ...current, stock_count: event.target.value }))
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none"
                  />
                </label>

                <label className="block text-sm font-medium text-zinc-700">
                  <span className="mb-2 block">SKU</span>
                  <input
                    required
                    value={variantForm.sku}
                    onChange={(event) =>
                      setVariantForm((current) => ({ ...current, sku: event.target.value }))
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-zinc-700">
                <span className="mb-2 block">Price override (optional)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={variantForm.price_override}
                  onChange={(event) =>
                    setVariantForm((current) => ({ ...current, price_override: event.target.value }))
                  }
                  className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none"
                />
              </label>

              <button
                type="submit"
                disabled={isCreatingVariant}
                className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingVariant ? "Creating variant…" : "Create variant"}
              </button>
            </form>

            {variantMessage ? (
              <p className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                {variantMessage}
              </p>
            ) : null}
          </section>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Products in your store</h2>
              <p className="mt-1 text-sm text-zinc-600">
                This owner dashboard includes inactive products as well as active ones.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {products.map((product) => {
              const productVariants = variantsByProductId[product.id] ?? [];
              return (
                <article key={product.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-zinc-900">{product.name}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${product.is_active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"}`}>
                          {product.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {product.description ? (
                        <p className="mt-2 text-sm leading-6 text-zinc-600">{product.description}</p>
                      ) : null}
                      <p className="mt-2 text-sm text-zinc-600">
                        Base price: {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(product.base_price)}
                      </p>
                    </div>
                    <div className="text-sm text-zinc-600">
                      <p>{productVariants.length} variant{productVariants.length === 1 ? "" : "s"}</p>
                      <p className="mt-1">Created {new Date(product.created_at).toLocaleString()}</p>
                    </div>
                  </div>

                  {productVariants.length > 0 ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {productVariants.map((variant) => (
                        <div key={variant.id} className="rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-600">
                          <p className="font-medium text-zinc-900">{variant.sku}</p>
                          <p className="mt-1">
                            {variant.size ? `Size: ${variant.size}` : "Size: —"}
                            {variant.color ? ` • Color: ${variant.color}` : " • Color: —"}
                          </p>
                          <p className="mt-1">Stock: {variant.stock_count}</p>
                          <p className="mt-1">
                            Price override: {variant.price_override != null ? new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(variant.price_override) : "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
