"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ImageOff,
  LoaderCircle,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";

import { createClient } from "@supabase/supabase-js";

import { useCart } from "./cart-context";
import { formatCurrency } from "../../lib/format-currency";
import { getCloudinaryImageUrl } from "../../lib/cloudinary-image";
import { useToast } from "../ui/toast-provider";
import { AppIcon } from "../ui/app-icon";

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
  const { notify } = useToast();
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
    const { data: variant, error } = await supabase
      .from("product_variants")
      .select("stock_count")
      .eq("id", item.variant_id)
      .maybeSingle<{ stock_count: number }>();

    if (error) {
      notify("Could not check stock. Please try again.", "error");
      return;
    }
    if (!variant || item.quantity >= variant.stock_count) {
      setCartItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.variant_id === item.variant_id
            ? { ...currentItem, stock_count: variant?.stock_count ?? 0 }
            : currentItem,
        ),
      );
      notify(
        variant
          ? `Only ${variant.stock_count} available.`
          : "This item is no longer available.",
        "error",
      );
      return;
    }

    updateQuantity(item.variant_id, item.quantity + 1);
    notify("Cart quantity updated.", "success");
  }

  if (loading) {
    return (
      <main className="storefront-page storefront-cart px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
        <div className="cart-layout">
          <section className="cart-empty" role="status">
            <p className="storefront-eyebrow">Your selection</p>
            <span className="cart-empty__icon" aria-hidden="true">
              <AppIcon
                icon={LoaderCircle}
                size={22}
                className="app-icon--spin"
              />
            </span>
            <h1>Loading your bag…</h1>
            <p>Aap ka cart tayyar ho raha hai.</p>
          </section>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="storefront-page storefront-cart px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
        <div className="cart-layout">
          <section className="cart-empty" role="alert">
            <p className="storefront-eyebrow">Your selection</p>
            <span className="cart-empty__icon" aria-hidden="true">
              <AppIcon icon={RefreshCw} size={22} />
            </span>
            <h1>Cart load nahi ho saka.</h1>
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="cart-primary-link"
            >
              <AppIcon icon={RefreshCw} size={17} />
              Dobara try karein
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="storefront-page storefront-cart px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <section className="cart-empty">
            <p className="storefront-eyebrow">Your selection</p>
            <span className="cart-empty__icon" aria-hidden="true">
              <AppIcon icon={ShoppingBag} size={24} />
            </span>
            <h1>
              {loadError ? "Cart load nahi ho saka." : "Cart khali hai yaar."}
            </h1>
            <p>{loadError ?? "Kuch pasand aaye to cart mein daal dein."}</p>
            <div className="cart-empty__actions">
              <Link href="/" className="cart-primary-link">
                Products dekhein
                <AppIcon icon={ArrowRight} size={17} />
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="storefront-page storefront-cart px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
      <div className="cart-layout">
        <header className="cart-heading">
          <div>
            <p className="storefront-eyebrow">{store.name} · Your selection</p>
            <h1>Your bag</h1>
            <p>
              {cartItems.length} {cartItems.length === 1 ? "piece" : "pieces"}{" "}
              saved for you
            </p>
          </div>
          <div className="cart-heading__actions">
            <Link href="/" className="cart-text-link">
              Shopping jari rakhein <AppIcon icon={ArrowRight} size={16} />
            </Link>
            <button
              type="button"
              onClick={() => {
                clearCart();
                notify("Your bag has been cleared.", "info");
              }}
              className="cart-clear"
            >
              <AppIcon icon={Trash2} size={16} />
              Clear bag
            </button>
          </div>
        </header>

        <section
          className="cart-columns"
          aria-label="Cart items and order summary"
        >
          <div className="cart-items">
            {cartItems.map((item) => (
              <div key={item.variant_id} className="cart-item">
                <div className="cart-item__top">
                  <div className="cart-item__identity">
                    {item.image_url ? (
                      <img
                        src={getCloudinaryImageUrl(item.image_url, {
                          width: 240,
                        })}
                        alt={item.product_name}
                        loading="lazy"
                        decoding="async"
                        className="cart-item__image"
                      />
                    ) : (
                      <div className="cart-item__image cart-item__image--empty">
                        <AppIcon icon={ImageOff} size={20} />
                        Image unavailable
                      </div>
                    )}
                    <div>
                      <h2>{item.product_name}</h2>
                      <p className="cart-item__option">{item.option_label}</p>
                      <p className="cart-item__availability">
                        {item.stock_count > 0
                          ? `${item.stock_count} available`
                          : "Out of stock"}
                      </p>
                    </div>
                  </div>
                  <div className="cart-item__price">
                    <p>{formatCurrency(item.unit_price * item.quantity)}</p>
                    <span>{formatCurrency(item.unit_price)} each</span>
                  </div>
                </div>

                <div className="cart-item__controls">
                  {item.quantity > item.stock_count ? (
                    <p className="cart-item__stock-error" role="alert">
                      Sirf {item.stock_count} available hain. Checkout se pehle
                      quantity update karein.
                    </p>
                  ) : null}
                  <div className="cart-quantity" aria-label="Quantity">
                    <button
                      type="button"
                      onClick={() => {
                        const quantity = Math.max(0, item.quantity - 1);
                        updateQuantity(item.variant_id, quantity);
                        notify(
                          quantity
                            ? "Cart quantity updated."
                            : `${item.product_name} removed from your bag.`,
                          "success",
                        );
                      }}
                      aria-label={`${item.product_name} quantity kam karein`}
                      className="cart-quantity__button"
                    >
                      <AppIcon icon={Minus} size={16} />
                    </button>
                    <span className="cart-quantity__value">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => void increaseQuantity(item)}
                      disabled={item.quantity >= item.stock_count}
                      aria-label={`${item.product_name} quantity barhayein`}
                      className="cart-quantity__button"
                    >
                      <AppIcon icon={Plus} size={16} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      removeItem(item.variant_id);
                      notify(
                        `${item.product_name} removed from your bag.`,
                        "success",
                      );
                    }}
                    className="cart-remove"
                  >
                    <AppIcon icon={Trash2} size={15} />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <aside className="cart-summary">
            <p className="storefront-eyebrow">Order summary</p>
            <div className="cart-summary__line">
              <span>Subtotal</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            <div className="cart-summary__total">
              <span className="inline-flex items-center gap-2">
                <AppIcon icon={Truck} size={16} />
                Cash on Delivery
              </span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            <p className="cart-summary__note">
              Delivery charges seller confirm karega. Payment delivery par hogi.
            </p>
            <Link href="/checkout" className="cart-primary-link">
              Continue to checkout <AppIcon icon={ArrowRight} size={17} />
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}
