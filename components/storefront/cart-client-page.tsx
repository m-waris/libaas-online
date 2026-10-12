"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@supabase/supabase-js";

import { useCart } from "./cart-context";
import { formatCurrency } from "../../lib/format-currency";
import { getCloudinaryImageUrl } from "../../lib/cloudinary-image";

import type { StorefrontStore } from "../../lib/queries";

type CartItem = {
  variant_id: string;
  quantity: number;
  product_name: string;
  image_url?: string | null;
  unit_price: number;
  stock_count: number;
  option_label: string;
};

type CartClientPageProps = {
  store: StorefrontStore;
};

export function CartClientPage({ store }: CartClientPageProps) {
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCartItems() {
      setLoading(true);
      setLoadError(null);
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      );

      try {
        const variants = await Promise.all(
          items.map(async (item) => {
            const { data, error } = await supabase
              .from("product_variants")
              .select(
                "id, stock_count, price_override, product_id, size, color",
              )
              .eq("id", item.variant_id)
              .maybeSingle();

            if (error) throw error;
            if (!data) {
              return null;
            }

            const { data: productData, error: productError } = await supabase
              .from("products")
              .select("id, name, base_price, is_active, store_id")
              .eq("id", data.product_id)
              .eq("store_id", store.id)
              .eq("is_active", true)
              .maybeSingle();

            if (productError) throw productError;
            if (!productData) {
              return null;
            }

            const price = data.price_override ?? productData.base_price;
            const { data: imageData } = await supabase
              .from("product_images")
              .select("url")
              .eq("product_id", productData.id)
              .order("sort_order", { ascending: true })
              .limit(1)
              .maybeSingle();

            return {
              variant_id: data.id,
              quantity: item.quantity,
              product_name: productData.name,
              image_url: imageData?.url ?? null,
              unit_price: price,
              stock_count: data.stock_count,
              option_label:
                [data.size, data.color].filter(Boolean).join(" · ") ||
                "Standard option",
            } as CartItem;
          }),
        );

        if (!isMounted) {
          return;
        }

        const availableItems = variants.filter((item): item is CartItem =>
          Boolean(item),
        );
        setCartItems(availableItems);
        const availableIds = new Set(
          availableItems.map((item) => item.variant_id),
        );
        items
          .filter((item) => !availableIds.has(item.variant_id))
          .forEach((item) => removeItem(item.variant_id));
      } catch {
        if (isMounted) {
          setLoadError(
            "Cart load nahi ho saka. Internet check karke page dobara kholein.",
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCartItems();

    return () => {
      isMounted = false;
    };
  }, [items, removeItem, store.id]);

  const total = useMemo(
    () =>
      cartItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
    [cartItems],
  );

  async function increaseQuantity(item: CartItem) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
    const { data: variant } = await supabase
      .from("product_variants")
      .select("stock_count")
      .eq("id", item.variant_id)
      .maybeSingle<{ stock_count: number }>();

    if (!variant || item.quantity >= variant.stock_count) {
      setCartItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.variant_id === item.variant_id
            ? { ...currentItem, stock_count: variant?.stock_count ?? 0 }
            : currentItem,
        ),
      );
      return;
    }

    updateQuantity(item.variant_id, item.quantity + 1);
  }

  if (loading) {
    return (
      <main className="bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <span role="status">Aap ka cart load ho raha hai…</span>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-rose-200 bg-white p-8 shadow-sm">
          <h1 className="font-serif text-2xl">Cart load nahi ho saka.</h1>
          <p className="mt-2 text-zinc-600">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 min-h-11 rounded-full bg-zinc-900 px-5 text-white"
          >
            Dobara try karein
          </button>
        </div>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
              Cart
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              {loadError ? "Cart load nahi ho saka." : "Cart khali hai yaar."}
            </h1>
            <p className="mt-3 text-sm leading-7 text-zinc-600">
              {loadError ?? "Kuch pasand aaye to cart mein daal dein."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
              >
                Products dekhein
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
                Cart
              </p>
              <h1 className="mt-2 text-3xl font-semibold">{store.name}</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-sm font-medium text-zinc-700 hover:text-zinc-950"
              >
                Shopping jari rakhein
              </Link>
              <button
                type="button"
                onClick={() => clearCart()}
                className="text-sm font-medium text-rose-600"
              >
                Cart khali karein
              </button>
            </div>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.variant_id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    {item.image_url ? (
                      <img
                        src={getCloudinaryImageUrl(item.image_url, {
                          width: 240,
                        })}
                        alt={item.product_name}
                        loading="lazy"
                        decoding="async"
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-zinc-100 text-xs text-zinc-500">
                        Photo nahi
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-900">
                        {item.product_name}
                      </h2>
                      <p className="mt-2 text-sm text-zinc-600">
                        {item.option_label}
                      </p>
                      <p className="mt-2 text-sm text-zinc-600">
                        Stock: {item.stock_count}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-zinc-900">
                      {formatCurrency(item.unit_price * item.quantity)}
                    </p>
                    <p className="text-sm text-zinc-600">
                      {formatCurrency(item.unit_price)} each
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  {item.quantity > item.stock_count ? (
                    <p
                      className="w-full text-sm font-medium text-rose-700"
                      role="alert"
                    >
                      Sirf {item.stock_count} available hain. Checkout se pehle
                      quantity update karein.
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.variant_id,
                          Math.max(0, item.quantity - 1),
                        )
                      }
                      aria-label={`${item.product_name} quantity kam karein`}
                      className="min-h-11 min-w-11 rounded-full border border-zinc-300 text-lg"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => void increaseQuantity(item)}
                      disabled={item.quantity >= item.stock_count}
                      aria-label={`${item.product_name} quantity barhayein`}
                      className="min-h-11 min-w-11 rounded-full border border-zinc-300 text-lg"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.variant_id)}
                    className="min-h-11 px-3 text-sm font-medium text-rose-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
              Summary
            </p>
            <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
              <span>Subtotal</span>
              <span className="font-medium text-zinc-900">
                {formatCurrency(total)}
              </span>
            </div>
            <div className="mt-6">
              <Link
                href="/checkout"
                className="block rounded-full bg-zinc-900 px-4 py-3 text-center text-sm font-medium text-white"
              >
                Checkout par chalein
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
