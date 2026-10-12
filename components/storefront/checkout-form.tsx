"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { createClient } from "@supabase/supabase-js";

import { useCart } from "./cart-context";
import { formatCurrency } from "../../lib/format-currency";

import type { StorefrontStore } from "../../lib/queries";

type CheckoutFormProps = {
  store: StorefrontStore;
};

type CartItem = {
  variant_id: string;
  quantity: number;
  product_name: string;
  unit_price: number;
  option_label: string;
};

type Confirmation = {
  order: {
    id: string;
    total_amount: number;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    notes?: string | null;
    status: string;
  };
  items: Array<{
    variant_id: string;
    quantity: number;
    price_at_purchase: number;
    product_name?: string;
    option_label?: string;
  }>;
};

export function CheckoutForm({ store }: CheckoutFormProps) {
  const { items, clearCart, removeItem } = useCart();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [cartLoadError, setCartLoadError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCartItems() {
      setLoadingCart(true);
      setCartLoadError(null);
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      );

      try {
        const resolvedItems = await Promise.all(
          items.map(async (item) => {
            const { data, error } = await supabase
              .from("product_variants")
              .select("id, price_override, product_id, size, color")
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

            const unitPrice = data.price_override ?? productData.base_price;

            return {
              variant_id: data.id,
              quantity: item.quantity,
              product_name: productData.name,
              unit_price: unitPrice,
              option_label:
                [data.size, data.color].filter(Boolean).join(" · ") ||
                "Standard option",
            } as CartItem;
          }),
        );

        if (!isMounted) {
          return;
        }

        setCartItems(
          resolvedItems.filter((item): item is CartItem => Boolean(item)),
        );
        const availableIds = new Set(
          resolvedItems
            .filter((item): item is CartItem => Boolean(item))
            .map((item) => item.variant_id),
        );
        items
          .filter((item) => !availableIds.has(item.variant_id))
          .forEach((item) => removeItem(item.variant_id));
      } catch {
        if (isMounted)
          setCartLoadError(
            "Cart details abhi load nahi huay. Internet check karke dobara try karein.",
          );
      } finally {
        if (isMounted) setLoadingCart(false);
      }
    }

    loadCartItems();

    return () => {
      isMounted = false;
    };
  }, [items, removeItem, store.id]);

  const total = cartItems.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !customerName.trim() ||
      !customerCity.trim() ||
      !customerAddress.trim()
    ) {
      setError("Naam, city aur delivery address zaroor likhein.");
      return;
    }
    const phoneDigits = customerPhone.replace(/\D/g, "");
    if (!/^(03\d{9}|923\d{9}|00923\d{9})$/.test(phoneDigits)) {
      setPhoneTouched(true);
      setError(
        "Number thora ghalat lag raha hai. 03XX-XXXXXXX ya +92 format mein likhein.",
      );
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          store_slug: store.slug,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: `City: ${customerCity.trim()}\nAddress: ${customerAddress.trim()}`,
          notes,
          items: cartItems.map((item) => ({
            variant_id: item.variant_id,
            quantity: item.quantity,
          })),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(
            "Sorry, aap ke cart ka koi item ya stock change ho gaya. Cart par wapas ja kar update karein.",
          );
        }
        throw new Error(
          "Order abhi place nahi ho saka. Details check karke dobara try karein.",
        );
      }

      clearCart();
      setConfirmation({
        order: payload.order,
        items: (payload.items ?? []).map(
          (orderItem: Confirmation["items"][number]) => {
            const cartItem = cartItems.find(
              (item) => item.variant_id === orderItem.variant_id,
            );
            return {
              ...orderItem,
              product_name: cartItem?.product_name,
              option_label: cartItem?.option_label,
            };
          },
        ),
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Order abhi place nahi ho saka. Dobara try karein.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (confirmation) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">
            Order confirm ho gaya
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-zinc-900">
            Order place ho gaya! 🎉
          </h2>
          <p className="mt-3 text-sm text-zinc-700">
            Aap ka Cash on Delivery order submit ho gaya.
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Order ID: {confirmation.order.id}
          </p>
          <p className="mt-2 text-xl font-semibold text-zinc-900">
            {formatCurrency(confirmation.order.total_amount)}
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Delivery charges seller confirm karega; ye total item subtotal hai.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Order details</h2>
          <div className="mt-4 space-y-2 text-sm text-zinc-700">
            <p>Aap: {confirmation.order.customer_name}</p>
            <p>Phone: {confirmation.order.customer_phone}</p>
            <p className="whitespace-pre-line">
              {confirmation.order.customer_address}
            </p>
            {confirmation.order.notes ? (
              <p>Notes: {confirmation.order.notes}</p>
            ) : null}
          </div>
          <div className="mt-6 space-y-3">
            {confirmation.items.map((item) => (
              <div
                key={item.variant_id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 p-3 text-sm"
              >
                <span>
                  {item.product_name ?? "Product"} ·{" "}
                  {item.option_label ?? "Option"} × {item.quantity}
                </span>
                <span className="font-medium text-zinc-900">
                  {formatCurrency(item.price_at_purchase)} each
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-form-layout grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      {loadingCart ? (
        <div
          className="rounded-2xl border border-zinc-200 bg-white p-6"
          role="status"
        >
          Aap ka order summary load ho raha hai…
        </div>
      ) : cartLoadError ? (
        <div className="rounded-2xl border border-rose-200 bg-white p-6">
          <h2 className="font-serif text-2xl">Cart details load nahi huay.</h2>
          <p className="mt-2 text-zinc-600">{cartLoadError}</p>
          <Link
            href="/cart"
            className="mt-5 inline-flex min-h-11 items-center rounded-full bg-zinc-900 px-5 text-white"
          >
            Cart par wapas jayein
          </Link>
        </div>
      ) : cartItems.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="font-serif text-2xl">Cart khali hai yaar.</h2>
          <p className="mt-2 text-zinc-600">
            Checkout se pehle products cart mein daalein.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-11 items-center rounded-full bg-zinc-900 px-5 text-white"
          >
            Products dekhein
          </Link>
        </div>
      ) : (
        <>
          <form
            id="guest-checkout"
            onSubmit={handleSubmit}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <div className="space-y-4">
              <label className="block text-base font-medium text-zinc-700">
                <span className="mb-2 block">Aap ka naam</span>
                <input
                  required
                  autoComplete="name"
                  maxLength={120}
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-3 text-base text-zinc-900"
                />
              </label>

              <label className="block text-base font-medium text-zinc-700">
                <span className="mb-2 block">WhatsApp ya phone number</span>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="03XX-XXXXXXX ya +92…"
                  aria-invalid={
                    phoneTouched &&
                    !/^(03\d{9}|923\d{9}|00923\d{9})$/.test(
                      customerPhone.replace(/\D/g, ""),
                    )
                  }
                  aria-describedby={
                    phoneTouched &&
                    customerPhone &&
                    !/^(03\d{9}|923\d{9}|00923\d{9})$/.test(
                      customerPhone.replace(/\D/g, ""),
                    )
                      ? "checkout-phone-error"
                      : undefined
                  }
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  onBlur={() => setPhoneTouched(true)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-3 text-base text-zinc-900"
                />
                {phoneTouched &&
                customerPhone &&
                !/^(03\d{9}|923\d{9}|00923\d{9})$/.test(
                  customerPhone.replace(/\D/g, ""),
                ) ? (
                  <span
                    id="checkout-phone-error"
                    className="mt-1 block text-sm font-normal text-rose-700"
                  >
                    03XX-XXXXXXX ya +92 format use karein.
                  </span>
                ) : null}
              </label>

              <label className="block text-base font-medium text-zinc-700">
                <span className="mb-2 block">Aap kahan se hain? (City)</span>
                <input
                  required
                  autoComplete="address-level2"
                  maxLength={100}
                  value={customerCity}
                  onChange={(event) => setCustomerCity(event.target.value)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-3 text-base text-zinc-900"
                />
              </label>

              <label className="block text-base font-medium text-zinc-700">
                <span className="mb-2 block">
                  Delivery kahan karni hai? (Full address)
                </span>
                <textarea
                  required
                  rows={4}
                  autoComplete="street-address"
                  maxLength={350}
                  value={customerAddress}
                  onChange={(event) => setCustomerAddress(event.target.value)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-3 text-base text-zinc-900"
                />
              </label>

              <label className="block text-base font-medium text-zinc-700">
                <span className="mb-2 block">
                  Order ke liye koi note? (Optional)
                </span>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-3 text-base text-zinc-900"
                />
              </label>
            </div>

            {error ? (
              <p
                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading || cartItems.length === 0}
              className="mt-6 w-full rounded-full bg-zinc-900 px-4 py-3 text-base font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {loading ? "Order place ho raha hai…" : "Order confirm karein"}
            </button>
          </form>

          <div className="checkout-summary rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
              Aap ka order
            </p>
            <div className="mt-4 space-y-3">
              {cartItems.map((item) => (
                <div
                  key={item.variant_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-zinc-900">
                      {item.product_name}
                    </p>
                    <p className="text-zinc-600">
                      {item.option_label} · Qty {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium text-zinc-900">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-4 text-sm">
              <span className="text-zinc-600">Cash on Delivery total</span>
              <span className="text-lg font-semibold text-zinc-900">
                {formatCurrency(total)}
              </span>
            </div>
            <p className="checkout-delivery-note mt-3">
              Delivery charges is total mein shamil nahi. Seller delivery cost
              confirm karega.
            </p>
          </div>
          <div className="checkout-sticky">
            <div>
              <span>COD total</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            <button type="submit" form="guest-checkout" disabled={loading}>
              {loading ? "Order ho raha hai…" : "Order confirm karein"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
