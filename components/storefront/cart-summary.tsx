"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { useCart } from "./cart-context";
import { AppIcon } from "../ui/app-icon";

export function CartSummary() {
  const { items, itemCount, removeItem, updateQuantity } = useCart();
  const [loading, setLoading] = useState(false);

  const itemRows = useMemo(() => items.map((item) => ({ ...item })), [items]);

  if (itemRows.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
              <AppIcon icon={ShoppingBag} size={16} />
              Cart
            </p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-900">
              Your cart is empty
            </h2>
          </div>
          <div className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600">
            {itemCount} items
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            <AppIcon icon={ShoppingBag} size={16} />
            Cart
          </p>
          <h2 className="mt-2 text-xl font-semibold text-zinc-900">
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </h2>
        </div>
        <Link
          href="/cart"
          className="text-sm font-medium text-zinc-700 hover:text-zinc-950"
        >
          View cart <AppIcon icon={ArrowRight} size={16} />
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {itemRows.map((item) => (
          <div
            key={item.variant_id}
            className="rounded-xl border border-zinc-200 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-zinc-900">
                Variant {item.variant_id.slice(0, 8)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateQuantity(
                      item.variant_id,
                      Math.max(0, item.quantity - 1),
                    )
                  }
                  aria-label="Decrease quantity"
                  className="inline-grid h-11 w-11 place-items-center rounded-lg border border-zinc-300"
                >
                  <AppIcon icon={Minus} size={15} />
                </button>
                <span className="w-6 text-center text-sm font-medium">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateQuantity(item.variant_id, item.quantity + 1)
                  }
                  aria-label="Increase quantity"
                  className="inline-grid h-11 w-11 place-items-center rounded-lg border border-zinc-300"
                >
                  <AppIcon icon={Plus} size={15} />
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-zinc-600">Quantity {item.quantity}</p>
              <button
                type="button"
                onClick={() => removeItem(item.variant_id)}
                className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-rose-600"
              >
                <AppIcon icon={Trash2} size={15} />
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <Link
          href="/checkout"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-zinc-900 px-4 text-center text-sm font-medium text-white"
        >
          Checkout <AppIcon icon={ArrowRight} size={16} />
        </Link>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
            }, 200);
          }}
          className="text-sm font-medium text-zinc-500"
        >
          {loading ? "Preparing…" : "Continue shopping"}
        </button>
      </div>
    </div>
  );
}
