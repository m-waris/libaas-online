import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  OrdersDashboard,
  type OwnerOrder,
} from "../../../components/owner/orders-dashboard";
import { OwnerDashboardShell } from "../../../components/owner/owner-dashboard-shell";
import { createClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

type StoreRecord = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  theme_config: Record<string, unknown> | null;
  is_active: boolean;
};

export default async function OrdersPage() {
  const requestHeaders = await headers();
  const expectedStoreSlug = requestHeaders.get("x-store-slug")?.trim() || null;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");
  if (!expectedStoreSlug) redirect("/login?tenantMismatch=1");

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, slug, name, logo_url, theme_config, is_active")
    .eq("owner_id", user.id)
    .maybeSingle<StoreRecord>();
  if (storeError) throw new Error("Unable to load your store right now.");
  if (!store || store.slug !== expectedStoreSlug)
    redirect("/login?tenantMismatch=1");
  if (!store.is_active) redirect("/api/auth/disabled");

  const { data: orderRows, error: ordersError } = await supabase
    .from("orders")
    .select(
      "id, customer_name, customer_phone, customer_address, notes, status, total_amount, created_at",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (ordersError) throw new Error("Unable to load orders for your store.");
  const orders = (orderRows ?? []) as Omit<OwnerOrder, "items">[];
  const orderIds = orders.map((order) => order.id);
  let items: {
    order_id: string;
    product_variant_id: string;
    quantity: number;
    price_at_purchase: number;
  }[] = [];
  if (orderIds.length) {
    const { data, error } = await supabase
      .from("order_items")
      .select("order_id, product_variant_id, quantity, price_at_purchase")
      .in("order_id", orderIds);
    if (error) throw new Error("Unable to load order items.");
    items = data ?? [];
  }
  const variantIds = [...new Set(items.map((item) => item.product_variant_id))];
  const { data: variantRows, error: variantError } = variantIds.length
    ? await supabase
        .from("product_variants")
        .select("id, product_id, size, color")
        .in("id", variantIds)
    : { data: [], error: null };
  if (variantError) throw new Error("Unable to load order variants.");
  const variants = variantRows ?? [];
  const productIds = [
    ...new Set(variants.map((variant) => variant.product_id)),
  ];
  const { data: productRows, error: productError } = productIds.length
    ? await supabase.from("products").select("id, name").in("id", productIds)
    : { data: [], error: null };
  if (productError) throw new Error("Unable to load order products.");
  const productNames = new Map(
    (productRows ?? []).map((product) => [product.id, product.name]),
  );
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const itemsByOrder = new Map<string, OwnerOrder["items"]>();
  for (const item of items) {
    const variant = variantById.get(item.product_variant_id);
    const line = {
      name: productNames.get(variant?.product_id ?? "") ?? "Product",
      size: variant?.size ?? null,
      color: variant?.color ?? null,
      quantity: item.quantity,
      price: Number(item.price_at_purchase),
    };
    const lines = itemsByOrder.get(item.order_id) ?? [];
    lines.push(line);
    itemsByOrder.set(item.order_id, lines);
  }
  const initialOrders: OwnerOrder[] = orders.map((order) => ({
    ...order,
    total_amount: Number(order.total_amount),
    items: itemsByOrder.get(order.id) ?? [],
  }));

  return (
    <OwnerDashboardShell store={store} activePage="orders">
      <OrdersDashboard initialOrders={initialOrders} storeName={store.name} />
    </OwnerDashboardShell>
  );
}
