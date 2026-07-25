-- Row Level Security for Libaas Online multi-tenant schema.
-- Service-role (server-only) bypasses RLS entirely; no superadmin policies here.

-- ---------------------------------------------------------------------------
-- Helper functions (security definer — read underlying rows without RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_store_owner(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.stores s
    where s.id = p_store_id
      and s.owner_id = (select auth.uid())
  );
$$;

comment on function public.is_store_owner(uuid) is
  'True when the current authenticated user owns the given store.';

create or replace function public.user_owns_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.products p
    where p.id = p_product_id
      and public.is_store_owner(p.store_id)
  );
$$;

comment on function public.user_owns_product(uuid) is
  'True when the current user owns the store that the product belongs to.';

create or replace function public.user_owns_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and public.is_store_owner(o.store_id)
  );
$$;

comment on function public.user_owns_order(uuid) is
  'True when the current user owns the store that the order belongs to.';

create or replace function public.is_storefront_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.products p
    where p.id = p_product_id
      and p.is_active = true
  );
$$;

comment on function public.is_storefront_product(uuid) is
  'True when a product is published on the public storefront (is_active = true).';

create or replace function public.is_valid_customer_order(p_store_id uuid, p_status public.order_status)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (select 1 from public.stores s where s.id = p_store_id)
    and p_status = 'pending';
$$;

comment on function public.is_valid_customer_order(uuid, public.order_status) is
  'True when an order targets an existing store and customers leave it in pending status.';

create or replace function public.is_valid_customer_order_item(
  p_order_id uuid,
  p_product_variant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders o
    join public.product_variants pv on pv.id = p_product_variant_id
    join public.products p on p.id = pv.product_id
    where o.id = p_order_id
      and p.store_id = o.store_id
      and p.is_active = true
  );
$$;

comment on function public.is_valid_customer_order_item(uuid, uuid) is
  'True when a line item references an order and an active variant from the same store.';

grant execute on function public.is_store_owner(uuid) to authenticated;
grant execute on function public.user_owns_product(uuid) to authenticated;
grant execute on function public.user_owns_order(uuid) to authenticated;
grant execute on function public.is_storefront_product(uuid) to anon, authenticated;
grant execute on function public.is_valid_customer_order(uuid, public.order_status) to anon, authenticated;
grant execute on function public.is_valid_customer_order_item(uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS on all tenant tables
-- ---------------------------------------------------------------------------

alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- ===========================================================================
-- stores
-- ===========================================================================

-- Storefront visitors may read store branding (name, logo, theme) for subdomain
-- resolution. Prevents: anon/authenticated users modifying or deleting stores.
-- Note: no is_published column yet — all stores are readable once created.
create policy stores_select_storefront
  on public.stores
  for select
  to anon, authenticated
  using (true);

-- Owners may read their own store rows (redundant with storefront select, but
-- explicit for admin dashboards). Prevents: owners reading is not an issue here;
-- combined with write policies, prevents non-owners from mutating stores.
create policy stores_select_owner
  on public.stores
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

-- Owners may create a store they own. Prevents: assigning someone else as owner
-- or creating stores on behalf of another user.
create policy stores_insert_owner
  on public.stores
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

-- Owners may update their own store settings. Prevents: owners editing another
-- tenant's branding, slug, or theme; prevents transferring ownership via update.
create policy stores_update_owner
  on public.stores
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Owners may delete their own store. Prevents: cross-tenant store deletion.
create policy stores_delete_owner
  on public.stores
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- ===========================================================================
-- products
-- ===========================================================================

-- Storefront visitors may browse active products. Prevents: exposing draft or
-- deactivated (is_active = false) catalog items to the public.
create policy products_select_storefront
  on public.products
  for select
  to anon, authenticated
  using (is_active = true);

-- Owners may read all products in their store, including inactive ones.
-- Prevents: owners from viewing another store's catalog in the admin UI.
create policy products_select_owner
  on public.products
  for select
  to authenticated
  using (public.is_store_owner(store_id));

-- Owners may add products to their own store. Prevents: injecting products into
-- another tenant's catalog.
create policy products_insert_owner
  on public.products
  for insert
  to authenticated
  with check (public.is_store_owner(store_id));

-- Owners may update products in their store. Prevents: cross-tenant edits and
-- moving a product to a store they do not own (store_id change blocked).
create policy products_update_owner
  on public.products
  for update
  to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

-- Owners may delete products from their store. Prevents: cross-tenant deletion.
create policy products_delete_owner
  on public.products
  for delete
  to authenticated
  using (public.is_store_owner(store_id));

-- ===========================================================================
-- product_variants
-- ===========================================================================

-- Storefront visitors may read variants of active products. Prevents: exposing
-- SKUs, stock, or pricing for deactivated products.
create policy product_variants_select_storefront
  on public.product_variants
  for select
  to anon, authenticated
  using (public.is_storefront_product(product_id));

-- Owners may read all variants for products in their store (including inactive
-- parent products). Prevents: owners inspecting another store's inventory.
create policy product_variants_select_owner
  on public.product_variants
  for select
  to authenticated
  using (public.user_owns_product(product_id));

-- Owners may create variants on their products. Prevents: attaching variants to
-- another store's products.
create policy product_variants_insert_owner
  on public.product_variants
  for insert
  to authenticated
  with check (public.user_owns_product(product_id));

-- Owners may update variants on their products. Prevents: cross-tenant stock or
-- price tampering; blocks re-parenting variants to another store's product.
create policy product_variants_update_owner
  on public.product_variants
  for update
  to authenticated
  using (public.user_owns_product(product_id))
  with check (public.user_owns_product(product_id));

-- Owners may delete variants from their products. Prevents: cross-tenant deletion.
create policy product_variants_delete_owner
  on public.product_variants
  for delete
  to authenticated
  using (public.user_owns_product(product_id));

-- ===========================================================================
-- product_images
-- ===========================================================================

-- Storefront visitors may view images for active products. Prevents: leaking
-- media for unpublished or deactivated products.
create policy product_images_select_storefront
  on public.product_images
  for select
  to anon, authenticated
  using (public.is_storefront_product(product_id));

-- Owners may read all images for products in their store. Prevents: owners
-- browsing another tenant's asset list.
create policy product_images_select_owner
  on public.product_images
  for select
  to authenticated
  using (public.user_owns_product(product_id));

-- Owners may upload images to their products. Prevents: attaching images to
-- another store's products.
create policy product_images_insert_owner
  on public.product_images
  for insert
  to authenticated
  with check (public.user_owns_product(product_id));

-- Owners may reorder or replace images on their products. Prevents: cross-tenant
-- image edits and re-parenting images to foreign products.
create policy product_images_update_owner
  on public.product_images
  for update
  to authenticated
  using (public.user_owns_product(product_id))
  with check (public.user_owns_product(product_id));

-- Owners may remove images from their products. Prevents: cross-tenant deletion.
create policy product_images_delete_owner
  on public.product_images
  for delete
  to authenticated
  using (public.user_owns_product(product_id));

-- ===========================================================================
-- orders
-- ===========================================================================

-- Owners may read orders for their store. Prevents: store A's owner viewing
-- store B's customer PII (names, phones, addresses).
create policy orders_select_owner
  on public.orders
  for select
  to authenticated
  using (public.is_store_owner(store_id));

-- Customers (anon or logged-in) may place a new order. Prevents: inserting
-- orders for non-existent stores, setting non-pending status, or writing via
-- a path reserved for owners. Does NOT grant read access after insert.
create policy orders_insert_customer
  on public.orders
  for insert
  to anon, authenticated
  with check (public.is_valid_customer_order(store_id, status));

-- Owners may create orders manually in their dashboard (e.g. phone orders).
-- Prevents: owners creating orders against another tenant's store_id.
create policy orders_insert_owner
  on public.orders
  for insert
  to authenticated
  with check (public.is_store_owner(store_id));

-- Owners may update order status and details for their store. Prevents:
-- customers or other store owners from confirming, shipping, or cancelling orders.
create policy orders_update_owner
  on public.orders
  for update
  to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

-- Owners may delete orders from their store. Prevents: cross-tenant order removal.
-- No delete policy for anon/authenticated customers.
create policy orders_delete_owner
  on public.orders
  for delete
  to authenticated
  using (public.is_store_owner(store_id));

-- ===========================================================================
-- order_items
-- ===========================================================================

-- Owners may read line items for orders in their store. Prevents: exposing
-- another store's order contents and purchase prices.
create policy order_items_select_owner
  on public.order_items
  for select
  to authenticated
  using (public.user_owns_order(order_id));

-- Customers may add line items when placing an order. Prevents: attaching items
-- to another store's order, inactive products, or arbitrary order IDs.
-- Does NOT grant read access to confirm the insert via SELECT.
create policy order_items_insert_customer
  on public.order_items
  for insert
  to anon, authenticated
  with check (
    public.is_valid_customer_order_item(order_id, product_variant_id)
  );

-- Owners may add line items to orders in their store. Prevents: cross-tenant
-- line-item injection.
create policy order_items_insert_owner
  on public.order_items
  for insert
  to authenticated
  with check (public.user_owns_order(order_id));

-- Owners may adjust line items (quantity corrections). Prevents: customers or
-- foreign owners mutating order contents after checkout.
create policy order_items_update_owner
  on public.order_items
  for update
  to authenticated
  using (public.user_owns_order(order_id))
  with check (public.user_owns_order(order_id));

-- Owners may remove line items from their orders. Prevents: cross-tenant deletion.
create policy order_items_delete_owner
  on public.order_items
  for delete
  to authenticated
  using (public.user_owns_order(order_id));
