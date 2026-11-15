"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Package, ReceiptText } from "lucide-react";

import type { ReactNode } from "react";

import type { StorefrontStore } from "../../lib/queries";
import {
  getStorefrontBranding,
  getStorefrontThemeStyle,
} from "../../lib/storefront-theme";
import { createClient } from "../../lib/supabase/client";
import { useToast } from "../ui/toast-provider";
import { AppIcon } from "../ui/app-icon";

export function OwnerDashboardShell({
  store,
  activePage,
  children,
}: {
  store: StorefrontStore;
  activePage: "dashboard" | "products" | "orders";
  children: ReactNode;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const { logoUrl } = getStorefrontBranding(store);

  async function handleSignOut() {
    const { error } = await createClient().auth.signOut();
    notify(
      error ? "Unable to sign out. Please try again." : "You are signed out.",
      error ? "error" : "info",
    );
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="owner-console" style={getStorefrontThemeStyle(store)}>
      <header className="owner-console__header">
        <div className="owner-console__brand">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="owner-console__logo" src={logoUrl} alt="" />
          ) : (
            <span className="owner-console__mark" aria-hidden="true">
              {store.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="owner-console__eyebrow">Your store</p>
            <p className="owner-console__store-name">{store.name}</p>
          </div>
        </div>
        <nav className="owner-console__nav" aria-label="Store management">
          <Link
            href="/dashboard"
            aria-current={activePage === "dashboard" ? "page" : undefined}
          >
            <AppIcon icon={LayoutDashboard} size={16} />
            Overview
          </Link>
          <Link
            href="/dashboard/products"
            aria-current={activePage === "products" ? "page" : undefined}
          >
            <AppIcon icon={Package} size={16} />
            Products
          </Link>
          <Link
            href="/dashboard/orders"
            aria-current={activePage === "orders" ? "page" : undefined}
          >
            <AppIcon icon={ReceiptText} size={16} />
            Orders
          </Link>
        </nav>
        <button
          type="button"
          className="owner-console__signout"
          onClick={handleSignOut}
        >
          <AppIcon icon={LogOut} size={16} />
          Sign out
        </button>
      </header>
      <div className="owner-console__content">{children}</div>
    </main>
  );
}
