"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, ShoppingBag } from "lucide-react";

import { AppIcon } from "../ui/app-icon";
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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`storefront-header${isScrolled ? " is-scrolled" : ""}`}>
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
          <AppIcon icon={Search} size={18} />
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
          <AppIcon icon={ShoppingBag} size={19} />
          <span className="storefront-cart-link__label">Cart</span>
          {itemCount > 0 ? (
            <span key={itemCount} className="storefront-cart-link__count">
              {itemCount}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
