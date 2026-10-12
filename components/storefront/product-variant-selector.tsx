"use client";

import { useMemo, useState } from "react";

import type { StorefrontProduct, StorefrontVariant } from "../../lib/queries";
import { formatCurrency } from "../../lib/format-currency";
import { useCart } from "./cart-context";

type ProductVariantSelectorProps = {
  product: StorefrontProduct;
  variants: StorefrontVariant[];
};

export function ProductVariantSelector({
  product,
  variants,
}: ProductVariantSelectorProps) {
  const sizeOptions = useMemo(
    () =>
      Array.from(
        new Set(variants.map((variant) => variant.size).filter(Boolean)),
      ) as string[],
    [variants],
  );

  const colorOptions = useMemo(
    () =>
      Array.from(
        new Set(variants.map((variant) => variant.color).filter(Boolean)),
      ) as string[],
    [variants],
  );

  const [selectedSize, setSelectedSize] = useState<string | null>(
    sizeOptions[0] ?? null,
  );
  const [selectedColor, setSelectedColor] = useState<string | null>(
    colorOptions[0] ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const { addItem } = useCart();

  const selectedVariant = useMemo(() => {
    if (variants.length === 0) {
      return null;
    }

    return (
      variants.find((variant) => {
        const matchesSize =
          sizeOptions.length === 0 ||
          !variant.size ||
          variant.size === selectedSize;
        const matchesColor =
          colorOptions.length === 0 ||
          !variant.color ||
          variant.color === selectedColor;
        return matchesSize && matchesColor;
      }) ?? variants[0]
    );
  }, [
    colorOptions.length,
    selectedColor,
    selectedSize,
    sizeOptions.length,
    variants,
  ]);

  const price = selectedVariant?.price_override ?? product.base_price;
  const inStock = selectedVariant ? selectedVariant.stock_count > 0 : false;
  const canAdd = Boolean(
    selectedVariant && quantity > 0 && quantity <= selectedVariant.stock_count,
  );

  function handleAddToCart() {
    if (!selectedVariant) {
      setMessage("Choose an available variant first.");
      return;
    }

    if (!canAdd) {
      setMessage(
        `Only ${selectedVariant.stock_count} item${selectedVariant.stock_count === 1 ? "" : "s"} available.`,
      );
      return;
    }

    addItem(selectedVariant.id, quantity);
    setMessage("Added to cart.");
  }

  return (
    <div className="product-purchase rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Price
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {formatCurrency(price)}
          </p>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-sm font-medium ${inStock ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
        >
          {inStock ? "Available" : "Sold out"}
        </div>
      </div>

      {variants.length > 0 ? (
        <div className="mt-6 space-y-4">
          {sizeOptions.length > 0 ? (
            <label className="block text-sm font-medium text-zinc-700">
              <span className="mb-2 block">Apna size chunein</span>
              <select
                value={selectedSize ?? ""}
                onChange={(event) =>
                  setSelectedSize(event.target.value || null)
                }
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                <option value="">Select size</option>
                {sizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {colorOptions.length > 0 ? (
            <label className="block text-sm font-medium text-zinc-700">
              <span className="mb-2 block">Color</span>
              <select
                value={selectedColor ?? ""}
                onChange={(event) =>
                  setSelectedColor(event.target.value || null)
                }
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                <option value="">Select color</option>
                {colorOptions.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {selectedVariant ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
              <p className="font-medium text-zinc-900">Aap ki choice</p>
              <p className="mt-2">
                {selectedVariant.size
                  ? `Size: ${selectedVariant.size}`
                  : "Size: any"}
                {selectedVariant.size && selectedVariant.color ? " • " : ""}
                {selectedVariant.color
                  ? `Color: ${selectedVariant.color}`
                  : "Color: any"}
              </p>
              <p className="mt-1">SKU: {selectedVariant.sku}</p>
              <p className="mt-1">Stock: {selectedVariant.stock_count}</p>
              <div className="mt-4 flex items-center gap-3">
                <label
                  htmlFor="product-quantity"
                  className="font-medium text-zinc-900"
                >
                  Quantity
                </label>
                <input
                  id="product-quantity"
                  aria-label="Quantity"
                  type="number"
                  min={1}
                  max={Math.max(1, selectedVariant.stock_count)}
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(Math.max(1, Number(event.target.value) || 1))
                  }
                  className="w-20 rounded-lg border border-zinc-300 px-2 py-1 text-center text-zinc-900"
                />
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!canAdd}
                className="mt-4 w-full rounded-full bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {inStock ? "Cart mein daalo" : "Sold out"}
              </button>
              {message ? (
                <p className="mt-3 text-sm text-zinc-600" role="status">
                  {message}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-600">
          No variants have been configured for this product yet.
        </div>
      )}
      {selectedVariant ? (
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!canAdd}
          className="product-purchase__sticky"
        >
          {inStock ? `Cart mein daalo · ${formatCurrency(price)}` : "Sold out"}
        </button>
      ) : null}
    </div>
  );
}
