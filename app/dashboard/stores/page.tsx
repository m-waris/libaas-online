import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "../../../lib/admin-auth";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createStore, adminLogout, updateStore } from "../../admin/actions";

export const dynamic = "force-dynamic";

export default async function StoresAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; updated?: string }>;
}) {
  if (!(await isAdminAuthenticated())) redirect("/login");
  const params = await searchParams;
  const admin = createAdminClient();
  const { data: stores, error } = await admin
    .from("stores")
    .select("id, slug, name, owner_id, is_active, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Failed to load stores from Supabase.", {
      code: error.code,
      message: error.message,
    });
    throw new Error(
      "Unable to load stores. Check the server Supabase configuration and database schema.",
    );
  }
  const rows = await Promise.all(
    (stores ?? []).map(async (store) => {
      const { data } = await admin.auth.admin.getUserById(store.owner_id);
      return { ...store, email: data.user?.email ?? "Unknown owner" };
    }),
  );
  const messages: Record<string, string> = {
    invalid:
      "Check the store details and use a valid slug and owner password (at least 8 characters).",
    owner:
      "Could not create the owner account. Check whether that email is already in use.",
    store: "Could not save the store. The slug may already be in use.",
    created: "Store created.",
    updated: "Store updated.",
  };
  return (
    <main className="min-h-screen bg-[#f7f5f1] px-5 py-8 text-zinc-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-widest text-zinc-500">
              Libaas Online
            </p>
            <h1 className="mt-1 font-serif text-3xl">Store administration</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
            >
              Dashboard
            </Link>
            <form action={adminLogout}>
              <button className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">
                Sign out
              </button>
            </form>
          </div>
        </header>
        {params.error || params.created || params.updated ? (
          <p role="status" className="mb-5 rounded-lg bg-white p-3 text-sm">
            {messages[params.error ?? params.created ?? params.updated ?? ""]}
          </p>
        ) : null}
        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-serif text-2xl">Create a store</h2>
          <form
            action={createStore}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <label className="text-sm">
              Store name
              <input
                required
                name="name"
                className="mt-1 block w-full rounded-lg border p-2"
              />
            </label>
            <label className="text-sm">
              Slug
              <input
                required
                name="slug"
                pattern="[a-z0-9]+([a-z0-9-]*[a-z0-9])?"
                minLength={2}
                maxLength={63}
                className="mt-1 block w-full rounded-lg border p-2"
              />
            </label>
            <label className="text-sm">
              Owner email
              <input
                required
                type="email"
                name="email"
                className="mt-1 block w-full rounded-lg border p-2"
              />
            </label>
            <label className="text-sm">
              Owner password
              <input
                required
                type="password"
                name="password"
                minLength={8}
                className="mt-1 block w-full rounded-lg border p-2"
              />
            </label>
            <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white sm:col-span-2 lg:col-span-4">
              Create store and owner
            </button>
          </form>
        </section>
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-serif text-2xl">
            Stores{" "}
            <span className="font-sans text-base text-zinc-500">
              ({rows.length})
            </span>
          </h2>
          {rows.length ? (
            <div className="space-y-4">
              {rows.map((store) => (
                <form
                  action={updateStore}
                  key={store.id}
                  className="grid gap-3 rounded-xl border border-zinc-200 p-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end"
                >
                  <input type="hidden" name="id" value={store.id} />
                  <label className="text-xs text-zinc-500">
                    Store name
                    <input
                      required
                      name="name"
                      defaultValue={store.name}
                      className="mt-1 block w-full rounded-lg border p-2 text-sm text-zinc-900"
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    Slug
                    <input
                      required
                      name="slug"
                      defaultValue={store.slug}
                      minLength={2}
                      maxLength={63}
                      className="mt-1 block w-full rounded-lg border p-2 text-sm text-zinc-900"
                    />
                  </label>
                  <div className="text-xs text-zinc-500">
                    Owner email
                    <p className="mt-2 text-sm text-zinc-900">{store.email}</p>
                  </div>
                  <div className="text-xs text-zinc-500">
                    Storefront
                    <p className="mt-2 text-sm text-zinc-900">
                      {store.slug}.libaasonline.com
                    </p>
                  </div>
                  <label className="text-sm">
                    <span className="sr-only">Store status</span>
                    <select
                      name="is_active"
                      defaultValue={String(store.is_active)}
                      className="w-full rounded-lg border p-2"
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </label>
                  <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
                    Save
                  </button>
                </form>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No stores yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
