import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { LoginForm } from "../../components/owner/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const requestHeaders = await headers();
  const expectedStoreSlug = requestHeaders.get("x-store-slug")?.trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && expectedStoreSlug) {
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("slug")
      .eq("owner_id", user.id)
      .maybeSingle<{ slug: string }>();

    if (!storeError && store?.slug === expectedStoreSlug) {
      redirect("/dashboard/products");
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Store owner access
          </p>
          <h1 className="text-3xl font-semibold">Sign in to manage your catalog</h1>
          <p className="text-sm leading-6 text-zinc-600">
            Use the email and password created for your store owner account by the bootstrap script.
          </p>
        </div>

        <LoginForm
          expectedStoreSlug={expectedStoreSlug}
          hasWrongStoreSession={Boolean(user)}
        />
      </div>
    </main>
  );
}
