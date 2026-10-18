import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { LoginForm } from "../../components/owner/login-form";
import { AdminLoginForm } from "../../components/admin/admin-login-form";
import { isAdminAuthenticated } from "../../lib/admin-auth";
import { getStorefrontStore } from "../../lib/queries";
import {
  getStorefrontBranding,
  getStorefrontThemeStyle,
} from "../../lib/storefront-theme";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; disabled?: string }>;
}) {
  const requestHeaders = await headers();
  const expectedStoreSlug = requestHeaders.get("x-store-slug")?.trim() || null;
  if (!expectedStoreSlug) {
    if (await isAdminAuthenticated()) redirect("/dashboard");
    return <AdminLoginForm error={(await searchParams).error} />;
  }
  const publicStore = expectedStoreSlug
    ? await getStorefrontStore(expectedStoreSlug)
    : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && expectedStoreSlug) {
    const { data: ownedStore } = await supabase
      .from("stores")
      .select("is_active")
      .eq("owner_id", user.id)
      .maybeSingle<{ is_active: boolean }>();
    if (ownedStore && !ownedStore.is_active) redirect("/api/auth/disabled");
  }

  if (user && expectedStoreSlug) {
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("slug, is_active")
      .eq("owner_id", user.id)
      .maybeSingle<{ slug: string; is_active: boolean }>();

    if (!storeError && store?.slug === expectedStoreSlug && store.is_active) {
      redirect("/dashboard");
    }
  }

  return (
    <main
      className="owner-login"
      style={publicStore ? getStorefrontThemeStyle(publicStore) : undefined}
    >
      <div className="owner-login__card">
        <div className="owner-login__identity">
          {publicStore && getStorefrontBranding(publicStore).logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getStorefrontBranding(publicStore).logoUrl!}
              alt=""
              className="owner-login__logo"
            />
          ) : (
            <span className="owner-login__mark" aria-hidden="true">
              {publicStore?.name.slice(0, 1).toUpperCase() ?? "L"}
            </span>
          )}
          <p className="owner-login__eyebrow">Store owner access</p>
        </div>
        <h1 className="font-serif text-3xl font-semibold">
          {publicStore
            ? `Welcome back to ${publicStore.name}`
            : "Sign in to your store"}
        </h1>
        <p className="text-base leading-7 text-zinc-600">
          Sign in to manage products, variants, and orders for your store.
        </p>

        <LoginForm
          expectedStoreSlug={expectedStoreSlug}
          hasWrongStoreSession={Boolean(user)}
          isDisabledStore={
            !publicStore || (await searchParams).disabled === "1"
          }
        />
      </div>
    </main>
  );
}
