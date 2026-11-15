"use client";

import { useState, type FormEvent } from "react";

export function StoreOwnerPortalLink() {
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  function openStoreLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedSlug = slug.trim().toLowerCase();

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
      setError(
        "Enter your store address, using letters, numbers, and hyphens.",
      );
      return;
    }

    const current = new URL(window.location.href);
    const hostname = current.hostname;
    let storeHost: string;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      storeHost = `${normalizedSlug}.${hostname}${current.port ? `:${current.port}` : ""}`;
    } else if (
      hostname === "libaasonline.com" ||
      hostname === "www.libaasonline.com"
    ) {
      storeHost = `${normalizedSlug}.libaasonline.com`;
    } else if (hostname === "libaasonline.netlify.app") {
      storeHost = `${normalizedSlug}.libaasonline.netlify.app`;
    } else {
      setError("Open the main Libaas Online site to choose your store.");
      return;
    }

    window.location.assign(`${current.protocol}//${storeHost}/login`);
  }

  return (
    <form onSubmit={openStoreLogin} className="root-login__form">
      <label className="block text-sm font-medium text-zinc-700">
        Store slug
        <div className="mt-2 flex overflow-hidden rounded-xl border border-zinc-300 bg-zinc-50">
          <input
            required
            value={slug}
            onChange={(event) => {
              setSlug(event.target.value);
              setError(null);
            }}
            autoCapitalize="none"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none"
            placeholder="your-store"
            aria-describedby={
              error ? "store-login-help store-login-error" : "store-login-help"
            }
            aria-invalid={Boolean(error)}
          />
        </div>
      </label>
      <p id="store-login-help" className="text-xs text-zinc-500">
        For example, “noor” opens noor.libaasonline.com.
      </p>
      {error ? (
        <p id="store-login-error" role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
      >
        Continue to store login
      </button>
    </form>
  );
}
