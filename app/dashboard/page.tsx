import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OwnerDashboardShell } from "../../components/owner/owner-dashboard-shell";
import { isAdminAuthenticated } from "../../lib/admin-auth";
import { createClient } from "../../lib/supabase/server";
import { createAdminClient } from "../../lib/supabase/admin";
import { adminLogout } from "../admin/actions";

export const dynamic = "force-dynamic";

function AdminMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-zinc-500">{detail}</p>
    </article>
  );
}

async function AdminDashboard() {
  if (!(await isAdminAuthenticated())) redirect("/login");
  const admin = createAdminClient();
  const [total, active, disabled, recent] = await Promise.all([
    admin.from("stores").select("id", { count: "exact", head: true }),
    admin
      .from("stores")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    admin
      .from("stores")
      .select("id", { count: "exact", head: true })
      .eq("is_active", false),
    admin
      .from("stores")
      .select("id, slug, name, owner_id, is_active, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  if (total.error || active.error || disabled.error || recent.error) {
    console.error(
      "Failed to load platform dashboard data.",
      total.error ?? active.error ?? disabled.error ?? recent.error,
    );
    throw new Error("Unable to load the platform dashboard.");
  }
  const latestStores = await Promise.all(
    (recent.data ?? []).map(async (store) => {
      const { data } = await admin.auth.admin.getUserById(store.owner_id);
      return {
        ...store,
        email: data.user?.email ?? "Owner account unavailable",
      };
    }),
  );

  return (
    <main className="min-h-screen bg-[#f7f5f1] px-5 py-8 text-zinc-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-zinc-500">
              Libaas Online · Platform
            </p>
            <h1 className="mt-1 font-serif text-4xl">Admin dashboard</h1>
            <p className="mt-2 text-zinc-600">
              A snapshot of stores across the platform.
            </p>
          </div>
          <Link
            href="/dashboard/stores"
            className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            Manage stores <span aria-hidden="true">→</span>
          </Link>
          <form action={adminLogout}>
            <button className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-medium transition hover:border-zinc-500">
              Sign out
            </button>
          </form>
        </header>
        <section
          aria-label="Platform summary"
          className="grid gap-4 sm:grid-cols-3"
        >
          <AdminMetric
            label="All stores"
            value={total.count ?? 0}
            detail="Stores on the platform"
          />
          <AdminMetric
            label="Enabled"
            value={active.count ?? 0}
            detail="Available to customers and owners"
          />
          <AdminMetric
            label="Disabled"
            value={disabled.count ?? 0}
            detail="Unavailable until re-enabled"
          />
        </section>
        <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl">Recently added stores</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Latest store and owner details.
              </p>
            </div>
            <Link
              href="/dashboard/stores"
              className="text-sm font-semibold underline underline-offset-4"
            >
              All stores
            </Link>
          </div>
          {latestStores.length ? (
            <div className="divide-y divide-zinc-100">
              {latestStores.map((store) => (
                <div
                  key={store.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{store.name}</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {store.slug}.libaasonline.com · {store.email}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${store.is_active ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-600"}`}
                  >
                    {store.is_active ? "Enabled" : "Disabled"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-zinc-50 px-5 py-8 text-center">
              <p className="font-medium">No stores yet</p>
              <p className="mt-1 text-sm text-zinc-500">
                Create the first store from the store management page.
              </p>
              <Link
                href="/dashboard/stores"
                className="mt-4 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white"
              >
                Create a store
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

async function StoreDashboard() {
  const requestHeaders = await headers();
  const tenantSlug = requestHeaders.get("x-store-slug")?.trim();
  if (!tenantSlug) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, slug, name, logo_url, theme_config, is_active")
    .eq("owner_id", user.id)
    .maybeSingle<{
      id: string;
      slug: string;
      name: string;
      logo_url: string | null;
      theme_config: Record<string, unknown> | null;
      is_active: boolean;
    }>();
  if (storeError) throw new Error("Unable to load your store dashboard.");
  if (!store || store.slug !== tenantSlug) redirect("/login?tenantMismatch=1");
  if (!store.is_active) redirect("/api/auth/disabled");

  const [products, publishedProducts, orders, pendingOrders] =
    await Promise.all([
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id)
        .eq("is_active", true),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id)
        .eq("status", "pending"),
    ]);
  const queryError =
    products.error ??
    publishedProducts.error ??
    orders.error ??
    pendingOrders.error;
  if (queryError)
    throw new Error("Unable to load your store dashboard summary.");

  return (
    <OwnerDashboardShell store={store} activePage="dashboard">
      <div className="space-y-8">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-zinc-500">
              Store overview
            </p>
            <h1 className="mt-1 font-serif text-4xl">
              Welcome to {store.name}
            </h1>
            <p className="mt-2 text-zinc-600">Here’s how your shop is doing.</p>
          </div>
          <Link
            href="/dashboard/products"
            className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            Manage products <span aria-hidden="true">→</span>
          </Link>
        </section>
        <section
          aria-label="Store summary"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {[
            ["Products", products.count ?? 0, "Across your catalog"],
            [
              "Published",
              publishedProducts.count ?? 0,
              "Visible in your store",
            ],
            ["Orders", orders.count ?? 0, "Orders received"],
            ["Pending orders", pendingOrders.count ?? 0, "Need your attention"],
          ].map(([label, value, detail]) => (
            <article
              key={String(label)}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-zinc-500">{label}</p>
              <p className="mt-3 text-4xl font-semibold tracking-tight">
                {value}
              </p>
              <p className="mt-2 text-sm text-zinc-500">{detail}</p>
            </article>
          ))}
        </section>
        <section className="grid gap-4 lg:grid-cols-2">
          <Link
            href="/dashboard/products"
            className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-400"
          >
            <p className="text-sm font-medium text-zinc-500">CATALOG</p>
            <h2 className="mt-2 font-serif text-2xl">Products and inventory</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Add products, manage variants and stock, and choose what customers
              can see.
            </p>
            <span className="mt-5 inline-flex text-sm font-semibold">
              Open products{" "}
              <span
                className="ml-2 transition group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </span>
          </Link>
          <Link
            href="/dashboard/orders"
            className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-400"
          >
            <p className="text-sm font-medium text-zinc-500">FULFILMENT</p>
            <h2 className="mt-2 font-serif text-2xl">Customer orders</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Review recent purchases, contact customers, and update order
              statuses.
            </p>
            <span className="mt-5 inline-flex text-sm font-semibold">
              Open orders{" "}
              <span
                className="ml-2 transition group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </span>
          </Link>
        </section>
      </div>
    </OwnerDashboardShell>
  );
}

export default async function DashboardPage() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-store-slug")?.trim() ? (
    <StoreDashboard />
  ) : (
    <AdminDashboard />
  );
}
