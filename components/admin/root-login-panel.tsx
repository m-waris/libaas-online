"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ShieldCheck, Store } from "lucide-react";
import { AppIcon } from "../ui/app-icon";
import { AdminLoginForm } from "./admin-login-form";
import { StoreOwnerPortalLink } from "../owner/store-owner-portal-link";
import { ToastNotice } from "../ui/toast-notice";

export function RootLoginPanel({
  error,
  signedOut = false,
}: {
  error?: string;
  signedOut?: boolean;
}) {
  const [showAdminLogin, setShowAdminLogin] = useState(error === "admin");
  const errorMessage =
    error === "admin" ? "Email or password is incorrect." : null;

  return (
    <main className="root-login">
      <ToastNotice message={errorMessage ?? undefined} kind="error" />
      <ToastNotice
        message={signedOut ? "You are signed out." : undefined}
        kind="info"
      />
      <div className="root-login__layout">
        <aside className="root-login__aside">
          <Link href="/" className="root-login__wordmark">
            Libaas<span>Online</span>
          </Link>
          <div>
            <p className="root-login__eyebrow">
              A place for independent labels
            </p>
            <h1>Good things deserve their own storefront.</h1>
            <p className="root-login__aside-copy">
              Give your collection a clear home, then let customers order with
              Cash on Delivery.
            </p>
          </div>
          <p className="root-login__aside-note">
            Made for the people behind the labels.
          </p>
        </aside>

        <section className="root-login__panel" aria-label="Sign in">
          <div
            className="root-login__mode"
            role="group"
            aria-label="Choose sign-in type"
          >
            <button
              type="button"
              aria-pressed={!showAdminLogin}
              onClick={() => setShowAdminLogin(false)}
            >
              <AppIcon icon={Store} size={16} />
              Store owner
            </button>
            <button
              type="button"
              aria-pressed={showAdminLogin}
              onClick={() => setShowAdminLogin(true)}
            >
              <AppIcon icon={ShieldCheck} size={16} />
              Platform admin
            </button>
          </div>

          {showAdminLogin ? (
            <AdminLoginForm error={error} />
          ) : (
            <section className="root-login__card">
              <p className="root-login__card-label">Store owner access</p>
              <h2>Continue to your store</h2>
              <p className="root-login__description">
                Enter your store name to open its secure sign-in page.
              </p>
              <StoreOwnerPortalLink />
            </section>
          )}

          <Link href="/" className="root-login__back">
            <AppIcon icon={ArrowLeft} size={16} />
            Back to home
          </Link>
        </section>
      </div>
    </main>
  );
}
