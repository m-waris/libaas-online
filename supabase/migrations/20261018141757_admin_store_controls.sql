alter table public.stores
  add column is_active boolean not null default true;

create or replace view public.storefront_stores
with (security_invoker = false)
as
select id, slug, name, logo_url, theme_config
from public.stores
where is_active = true;

create or replace function public.reject_disabled_store_order()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1 from public.stores where id = new.store_id and is_active = true
  ) then
    raise exception using errcode = 'P0001', message = 'This store is disabled.';
  end if;
  return new;
end;
$$;

create trigger orders_require_active_store
before insert on public.orders
for each row execute function public.reject_disabled_store_order();

create or replace function public.is_store_owner(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.stores s
    where s.id = p_store_id
      and s.owner_id = (select auth.uid())
      and s.is_active = true
  );
$$;

create or replace function public.is_storefront_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.products p
    join public.stores s on s.id = p.store_id
    where p.id = p_product_id and p.is_active = true and s.is_active = true
  );
$$;

drop policy if exists products_select_storefront on public.products;
create policy products_select_storefront
  on public.products for select to anon, authenticated
  using (public.is_storefront_product(id));

create or replace function public.is_valid_customer_order(p_store_id uuid, p_status public.order_status)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.stores s where s.id = p_store_id and s.is_active = true)
    and p_status = 'pending';
$$;

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
    select 1 from public.orders o
    join public.stores s on s.id = o.store_id
    join public.product_variants pv on pv.id = p_product_variant_id
    join public.products p on p.id = pv.product_id
    where o.id = p_order_id and s.is_active = true
      and p.store_id = o.store_id and p.is_active = true
  );
$$;

