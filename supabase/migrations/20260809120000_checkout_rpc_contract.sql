drop function if exists public.create_order_with_items(
  uuid,
  text,
  text,
  text,
  text,
  numeric,
  jsonb
);

drop function if exists public.create_order_with_items(
  uuid,
  text,
  text,
  text,
  text,
  jsonb
);

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
set search_path = public
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
    raise exception using
      errcode = 'P0001',
      message = 'The selected store does not exist.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'At least one order item is required.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_quantity <= 0 then
      raise exception using
        errcode = 'P0001',
        message = 'Order quantities must be greater than zero.';
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
        raise exception using
          errcode = 'P0001',
          message = 'The selected item is invalid or inactive.';
      end if;

      raise exception using
        errcode = 'P0001',
        message = 'The selected item is out of stock for the requested quantity.';
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
    store_id,
    customer_name,
    customer_phone,
    customer_address,
    notes,
    status,
    total_amount
  )
  values (
    p_store_id,
    p_customer_name,
    p_customer_phone,
    p_customer_address,
    p_notes,
    'pending',
    v_total_amount
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(v_validated_items)
  loop
    insert into public.order_items (
      order_id,
      product_variant_id,
      quantity,
      price_at_purchase
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
          )
          order by id
        )
        from public.order_items
        where order_id = v_order.id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

grant execute on function public.create_order_with_items(
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) to anon, authenticated;
