-- Initial multi-tenant e-commerce schema for Libaas Online.
-- RLS policies are intentionally omitted; add them in a follow-up migration.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.order_status as enum (
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled'
);

-- ---------------------------------------------------------------------------
-- Utility: updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Sets updated_at to the current UTC timestamp before row updates.';

-- ---------------------------------------------------------------------------
-- stores
-- Tenant root table. Subdomain resolution uses slug; RLS will key off owner_id.
-- ---------------------------------------------------------------------------

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  logo_url text,
  theme_config jsonb not null default '{}'::jsonb,
  owner_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint stores_slug_unique unique (slug),
  constraint stores_slug_format check (
    slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'
    and length(slug) between 2 and 63
  ),
  constraint stores_name_not_empty check (trim(name) <> ''),
  constraint stores_theme_config_is_object check (jsonb_typeof(theme_config) = 'object')
);

create index stores_owner_id_idx on public.stores (owner_id);

create trigger stores_set_updated_at
  before update on public.stores
  for each row
  execute function public.set_updated_at();

comment on table public.stores is
  'Tenant store; slug maps to the request subdomain.';
comment on column public.stores.owner_id is
  'Store owner. Use directly in RLS (owner_id = auth.uid()) rather than a separate owners view.';

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  description text,
  base_price numeric(12, 2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint products_name_not_empty check (trim(name) <> ''),
  constraint products_base_price_non_negative check (base_price >= 0)
);

create index products_store_id_idx on public.products (store_id);
create index products_store_id_is_active_idx on public.products (store_id, is_active);

create trigger products_set_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- product_variants
-- ---------------------------------------------------------------------------

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size text,
  color text,
  stock_count integer not null default 0,
  price_override numeric(12, 2),
  sku text not null,

  constraint product_variants_stock_count_non_negative check (stock_count >= 0),
  constraint product_variants_price_override_non_negative check (
    price_override is null or price_override >= 0
  ),
  constraint product_variants_sku_not_empty check (trim(sku) <> ''),
  constraint product_variants_product_id_sku_unique unique (product_id, sku)
);

create index product_variants_product_id_idx on public.product_variants (product_id);

-- ---------------------------------------------------------------------------
-- product_images
-- ---------------------------------------------------------------------------

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,

  constraint product_images_url_not_empty check (trim(url) <> ''),
  constraint product_images_sort_order_non_negative check (sort_order >= 0)
);

create index product_images_product_id_idx on public.product_images (product_id);
create index product_images_product_id_sort_order_idx
  on public.product_images (product_id, sort_order);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  notes text,
  status public.order_status not null default 'pending',
  total_amount numeric(12, 2) not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint orders_customer_name_not_empty check (trim(customer_name) <> ''),
  constraint orders_customer_phone_not_empty check (trim(customer_phone) <> ''),
  constraint orders_customer_address_not_empty check (trim(customer_address) <> ''),
  constraint orders_total_amount_non_negative check (total_amount >= 0)
);

create index orders_store_id_idx on public.orders (store_id);
create index orders_store_id_status_idx on public.orders (store_id, status);
create index orders_store_id_created_at_idx on public.orders (store_id, created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_variant_id uuid not null references public.product_variants (id) on delete restrict,
  quantity integer not null,
  price_at_purchase numeric(12, 2) not null,

  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_price_at_purchase_non_negative check (price_at_purchase >= 0),
  constraint order_items_order_id_product_variant_id_unique
    unique (order_id, product_variant_id)
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_variant_id_idx on public.order_items (product_variant_id);
