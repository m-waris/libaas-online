-- Keep public storefront discovery separate from owner-only store records.
-- The view runs with its migration owner privileges and exposes only public fields.
create or replace view public.storefront_stores
with (security_invoker = false)
as
select id, slug, name, logo_url, theme_config
from public.stores;

revoke all on public.storefront_stores from public, anon, authenticated;
grant select on public.storefront_stores to anon, authenticated, service_role;

-- Authenticated owners can query only their own base store row. Anonymous and
-- authenticated storefront reads go through the safe-column view above.
drop policy if exists stores_select_storefront on public.stores;
revoke select on public.stores from public, anon, authenticated;
grant select on public.stores to authenticated, service_role;

-- Preserve only the privileged provisioning path for store creation.
revoke insert on public.stores from public, anon, authenticated;
grant insert on public.stores to service_role;

-- Store creation is performed by the server-side provisioning script.
drop policy if exists stores_insert_owner on public.stores;

-- Customers must use create_order_with_items so stock and prices are checked
-- atomically. No client role may create orders or line items directly.
drop policy if exists orders_insert_customer on public.orders;
drop policy if exists orders_insert_owner on public.orders;
drop policy if exists order_items_insert_customer on public.order_items;
drop policy if exists order_items_insert_owner on public.order_items;
revoke insert on public.orders, public.order_items from public, anon, authenticated;
grant insert on public.orders, public.order_items to service_role;

-- Prevent an owner from reassigning an order line to a variant from another store.
create or replace function public.order_item_matches_order_store(
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
  );
$$;

revoke execute on function public.order_item_matches_order_store(uuid, uuid) from public;
grant execute on function public.order_item_matches_order_store(uuid, uuid) to authenticated;

drop policy if exists order_items_update_owner on public.order_items;
create policy order_items_update_owner
  on public.order_items
  for update
  to authenticated
  using (public.user_owns_order(order_id))
  with check (
    public.user_owns_order(order_id)
    and public.order_item_matches_order_store(order_id, product_variant_id)
  );

-- Remove default PUBLIC execution and retain only the roles that need each
-- helper. Public storefront and customer-validation helpers remain callable by
-- anonymous visitors; owner predicates remain authenticated-only.
revoke execute on function public.is_store_owner(uuid) from public;
revoke execute on function public.user_owns_product(uuid) from public;
revoke execute on function public.user_owns_order(uuid) from public;
revoke execute on function public.is_storefront_product(uuid) from public;
revoke execute on function public.is_valid_customer_order(uuid, public.order_status) from public;
revoke execute on function public.is_valid_customer_order_item(uuid, uuid) from public;
revoke execute on function public.is_valid_customer_order(uuid, public.order_status) from anon, authenticated;
revoke execute on function public.is_valid_customer_order_item(uuid, uuid) from anon, authenticated;

grant execute on function public.is_store_owner(uuid) to authenticated;
grant execute on function public.user_owns_product(uuid) to authenticated;
grant execute on function public.user_owns_order(uuid) to authenticated;
grant execute on function public.is_storefront_product(uuid) to anon, authenticated;

revoke execute on function public.create_order_with_items(
  uuid, text, text, text, text, jsonb
) from public;
grant execute on function public.create_order_with_items(
  uuid, text, text, text, text, jsonb
) to anon, authenticated;

alter function public.create_order_with_items(
  uuid, text, text, text, text, jsonb
) set search_path = pg_catalog;

-- The RPC is intentionally callable by anonymous storefront visitors, so its
-- validation must also stand on its own when callers bypass the Next.js route.
create or replace function public.create_order_with_items(
  p_store_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_notes text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_order public.orders;
  v_item jsonb;
  v_quantity integer;
  v_unit_price numeric;
  v_total_amount numeric := 0;
  v_updated_rows integer;
  v_validated_items jsonb := '[]'::jsonb;
begin
  if not exists (select 1 from public.stores where id = p_store_id) then
    raise exception using errcode = 'P0001', message = 'The selected store does not exist.';
  end if;

  if trim(coalesce(p_customer_name, '')) = '' or length(p_customer_name) > 120
    or trim(coalesce(p_customer_phone, '')) = '' or length(p_customer_phone) > 40
    or trim(coalesce(p_customer_address, '')) = '' or length(p_customer_address) > 500
    or length(coalesce(p_notes, '')) > 1000 then
    raise exception using errcode = 'P0001', message = 'Customer details are invalid.';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception using errcode = 'P0001', message = 'Order items must be an array.';
  end if;

  if jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    raise exception using errcode = 'P0001', message = 'Order must contain between 1 and 30 items.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) is distinct from 'object'
      or jsonb_typeof(v_item -> 'variant_id') is distinct from 'string'
      or jsonb_typeof(v_item -> 'quantity') is distinct from 'number' then
      raise exception using errcode = 'P0001', message = 'Order item data is invalid.';
    end if;

    v_quantity := (v_item ->> 'quantity')::integer;

    if v_quantity <= 0 or v_quantity > 100
      or (v_item ->> 'quantity')::numeric <> v_quantity then
      raise exception using errcode = 'P0001', message = 'Order quantities must be whole numbers from 1 to 100.';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(p_items) as candidate(item)
      where candidate.item ->> 'variant_id' = v_item ->> 'variant_id'
      group by candidate.item ->> 'variant_id'
      having count(*) > 1
    ) then
      raise exception using errcode = 'P0001', message = 'Each variant may appear only once in an order.';
    end if;

    update public.product_variants pv
    set stock_count = pv.stock_count - v_quantity
    from public.products p
    where pv.id = (v_item ->> 'variant_id')::uuid
      and p.id = pv.product_id
      and p.store_id = p_store_id
      and p.is_active = true
      and pv.stock_count >= v_quantity;

    get diagnostics v_updated_rows = row_count;

    if v_updated_rows <> 1 then
      if not exists (
        select 1
        from public.product_variants pv
        join public.products p on p.id = pv.product_id
        where pv.id = (v_item ->> 'variant_id')::uuid
          and p.store_id = p_store_id
          and p.is_active = true
      ) then
        raise exception using errcode = 'P0001', message = 'The selected item is invalid or inactive.';
      end if;

      raise exception using errcode = 'P0001', message = 'The selected item is out of stock for the requested quantity.';
    end if;

    select coalesce(pv.price_override, p.base_price)
    into v_unit_price
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = (v_item ->> 'variant_id')::uuid
      and p.store_id = p_store_id
      and p.is_active = true;

    v_total_amount := v_total_amount + (v_unit_price * v_quantity);
    v_validated_items := v_validated_items || jsonb_build_array(
      jsonb_build_object(
        'variant_id', v_item ->> 'variant_id',
        'quantity', v_quantity,
        'unit_price', v_unit_price
      )
    );
  end loop;

  insert into public.orders (
    store_id, customer_name, customer_phone, customer_address,
    notes, status, total_amount
  )
  values (
    p_store_id, trim(p_customer_name), trim(p_customer_phone),
    trim(p_customer_address), nullif(trim(coalesce(p_notes, '')), ''),
    'pending', v_total_amount
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(v_validated_items)
  loop
    insert into public.order_items (
      order_id, product_variant_id, quantity, price_at_purchase
    )
    values (
      v_order.id,
      (v_item ->> 'variant_id')::uuid,
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'unit_price')::numeric
    );
  end loop;

  return jsonb_build_object(
    'order', to_jsonb(v_order),
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'variant_id', product_variant_id,
            'quantity', quantity,
            'price_at_purchase', price_at_purchase
          ) order by id
        )
        from public.order_items
        where order_id = v_order.id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke execute on function public.create_order_with_items(
  uuid, text, text, text, text, jsonb
) from public;
grant execute on function public.create_order_with_items(
  uuid, text, text, text, text, jsonb
) to anon, authenticated;
