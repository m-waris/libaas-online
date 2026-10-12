"use client";

import Link from "next/link";

import { useCart } from "./cart-context";
import type { StorefrontStore } from "../../lib/queries";

type StorefrontHeaderProps = {
  store: StorefrontStore;
  logoUrl: string | null;
  query?: string;
};

export function StorefrontHeader({
  store,
  logoUrl,
  query = "",
}: StorefrontHeaderProps) {
  const { itemCount } = useCart();

  return (
    <header className="storefront-header">
      <div className="storefront-header__inner">
        <Link
          href="/"
          className="storefront-brand"
          aria-label={`${store.name} home`}
        >
          {logoUrl ? (
            // Store logos may come from owner-managed external URLs; keep the browser-native image path.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="storefront-brand__logo" />
          ) : (
            <span className="storefront-brand__mark" aria-hidden="true">
              {store.name.trim().charAt(0).toUpperCase() || "L"}
            </span>
          )}
          <span className="storefront-brand__name">{store.name}</span>
        </Link>

        <form
          action="/"
          method="get"
          role="search"
          className="storefront-search"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle
              cx="10.8"
              cy="10.8"
              r="6.8"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="m16 16 4 4"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="search"
            name="q"
            placeholder="Search"
            aria-label="Search products"
            defaultValue={query}
          />
        </form>

        <Link
          href="/cart"
          className="storefront-cart-link"
          aria-label={`Cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4.5 8h15l-1.2 12h-12L4.5 8Z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M9 9V6a3 3 0 0 1 6 0v3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span className="storefront-cart-link__label">Cart</span>
          {itemCount > 0 ? (
            <span className="storefront-cart-link__count">{itemCount}</span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
