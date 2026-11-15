import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CircleCheck,
  CircleX,
  LogOut,
  Package,
  ReceiptText,
  Store,
} from "lucide-react";
import { AppIcon } from "../../components/ui/app-icon";
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
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof Store;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="dashboard-metric__label">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <AppIcon icon={icon} size={20} />
      </div>
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
    <main className="admin-dashboard min-h-screen bg-[#f7f5f1] px-5 py-8 text-zinc-900">
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
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            Manage stores <AppIcon icon={ArrowRight} size={16} />
          </Link>
          <form action={adminLogout}>
            <button className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-medium transition hover:border-zinc-500">
              <AppIcon icon={LogOut} size={16} />
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
            icon={Store}
          />
          <AdminMetric
            label="Enabled"
            value={active.count ?? 0}
            detail="Available to customers and owners"
            icon={CircleCheck}
          />
          <AdminMetric
            label="Disabled"
            value={disabled.count ?? 0}
            detail="Unavailable until re-enabled"
            icon={CircleX}
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
              className="inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
            >
              <AppIcon icon={Store} size={15} />
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
      <div className="owner-overview space-y-8">
        <section className="owner-overview__hero">
          <div>
            <p className="owner-page__eyebrow">Store overview</p>
            <h1>Welcome back, {store.name}</h1>
            <p>Your shop at a glance. Pick up where you left off.</p>
          </div>
          <Link href="/dashboard/products" className="owner-primary-action">
            <AppIcon icon={Package} size={17} />
            Manage products <AppIcon icon={ArrowRight} size={17} />
          </Link>
        </section>
        <section
          aria-label="Store summary"
          className="owner-overview__stats grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {[
            {
              label: "Products",
              value: products.count ?? 0,
              detail: "Across your catalog",
              icon: Package,
            },
            {
              label: "Published",
              value: publishedProducts.count ?? 0,
              detail: "Visible in your store",
              icon: CircleCheck,
            },
            {
              label: "Orders",
              value: orders.count ?? 0,
              detail: "Orders received",
              icon: ReceiptText,
            },
            {
              label: "Pending orders",
              value: pendingOrders.count ?? 0,
              detail: "Need your attention",
              icon: CircleX,
            },
          ].map((stat) => (
            <article
              key={stat.label}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="dashboard-metric__label">
                <p className="text-sm font-medium text-zinc-500">
                  {stat.label}
                </p>
                <AppIcon icon={stat.icon} size={20} />
              </div>
              <p className="mt-3 text-4xl font-semibold tracking-tight">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-zinc-500">{stat.detail}</p>
            </article>
          ))}
        </section>
        <section
          className="owner-overview__shortcuts grid gap-4 lg:grid-cols-2"
          aria-label="Store management shortcuts"
        >
          <Link
            href="/dashboard/products"
            className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-400"
          >
            <p className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500">
              <AppIcon icon={Package} size={16} />
              CATALOG
            </p>
            <h2 className="mt-2 font-serif text-2xl">Products and inventory</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Add products, manage variants and stock, and choose what customers
              can see.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
              Open products <AppIcon icon={ArrowRight} size={16} />
            </span>
          </Link>
          <Link
            href="/dashboard/orders"
            className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-400"
          >
            <p className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500">
              <AppIcon icon={ReceiptText} size={16} />
              FULFILMENT
            </p>
            <h2 className="mt-2 font-serif text-2xl">Customer orders</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Review recent purchases, contact customers, and update order
              statuses.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
              Open orders <AppIcon icon={ArrowRight} size={16} />
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
