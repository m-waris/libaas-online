'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@supabase/supabase-js';

import { useCart } from './cart-context';

import type { StorefrontStore } from '../../lib/queries';

type CheckoutFormProps = {
  store: StorefrontStore;
};

type CartItem = {
  variant_id: string;
  quantity: number;
  product_name: string;
  unit_price: number;
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
  }>;
};

export function CheckoutForm({ store }: CheckoutFormProps) {
  const { items, clearCart } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCartItems() {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      );

      const resolvedItems = await Promise.all(
        items.map(async (item) => {
          const { data, error } = await supabase
            .from('product_variants')
            .select('id, price_override, product_id')
            .eq('id', item.variant_id)
            .maybeSingle();

          if (error || !data) {
            return null;
          }

          const { data: productData, error: productError } = await supabase
            .from('products')
            .select('id, name, base_price, is_active, store_id')
            .eq('id', data.product_id)
            .maybeSingle();

          if (productError || !productData) {
            return null;
          }

          const unitPrice = data.price_override ?? productData.base_price;

          return {
            variant_id: data.id,
            quantity: item.quantity,
            product_name: productData.name,
            unit_price: unitPrice,
          } as CartItem;
        }),
      );

      if (!isMounted) {
        return;
      }

      setCartItems(resolvedItems.filter((item): item is CartItem => Boolean(item)));
    }

    loadCartItems();

    return () => {
      isMounted = false;
    };
  }, [items]);

  const total = cartItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_slug: store.slug,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          notes,
          items: cartItems.map((item) => ({ variant_id: item.variant_id, quantity: item.quantity })),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to place the order right now.');
      }

      clearCart();
      setConfirmation({ order: payload.order, items: payload.items ?? [] });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to place the order right now.');
    } finally {
      setLoading(false);
    }
  }

  if (confirmation) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Order confirmed</p>
          <h2 className="mt-2 text-3xl font-semibold text-zinc-900">Thank you for your order</h2>
          <p className="mt-3 text-sm text-zinc-700">Order ID: {confirmation.order.id}</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900">
            {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(confirmation.order.total_amount)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Saved order details</h2>
          <div className="mt-4 space-y-2 text-sm text-zinc-700">
            <p>Customer: {confirmation.order.customer_name}</p>
            <p>Phone: {confirmation.order.customer_phone}</p>
            <p>Address: {confirmation.order.customer_address}</p>
            {confirmation.order.notes ? <p>Notes: {confirmation.order.notes}</p> : null}
          </div>
          <div className="mt-6 space-y-3">
            {confirmation.items.map((item) => (
              <div key={item.variant_id} className="flex items-center justify-between rounded-xl border border-zinc-200 p-3 text-sm">
                <span>Variant {item.variant_id.slice(0, 8)} × {item.quantity}</span>
                <span className="font-medium text-zinc-900">
                  {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(item.price_at_purchase)} each
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-zinc-700">
            <span className="mb-2 block">Your name</span>
            <input
              required
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            <span className="mb-2 block">Phone number</span>
            <input
              required
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            <span className="mb-2 block">Delivery address</span>
            <textarea
              required
              rows={4}
              value={customerAddress}
              onChange={(event) => setCustomerAddress(event.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            <span className="mb-2 block">Notes</span>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </label>
        </div>

        {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

        <button
          type="submit"
          disabled={loading || cartItems.length === 0}
          className="mt-6 w-full rounded-full bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {loading ? 'Placing order…' : 'Place order'}
        </button>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">Order preview</p>
        <div className="mt-4 space-y-3">
          {cartItems.map((item) => (
            <div key={item.variant_id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3 text-sm">
              <div>
                <p className="font-medium text-zinc-900">{item.product_name}</p>
                <p className="text-zinc-600">Qty {item.quantity}</p>
              </div>
              <p className="font-medium text-zinc-900">
                {new Intl.NumberFormat('en-NG', {
                  style: 'currency',
                  currency: 'NGN',
                }).format(item.unit_price * item.quantity)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-4 text-sm">
          <span className="text-zinc-600">Total</span>
          <span className="text-lg font-semibold text-zinc-900">
            {new Intl.NumberFormat('en-NG', {
              style: 'currency',
              currency: 'NGN',
            }).format(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
