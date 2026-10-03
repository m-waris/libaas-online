import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

type CheckoutItem = {
  variant_id: string;
  quantity: number;
};

type CheckoutPayload = {
  store_slug: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  notes?: string | null;
  items: CheckoutItem[];
};

function normalizeItems(items: unknown): CheckoutItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Partial<CheckoutItem>;
    const variantId = typeof candidate.variant_id === 'string' ? candidate.variant_id : null;
    const quantity = typeof candidate.quantity === 'number' && Number.isFinite(candidate.quantity) ? candidate.quantity : null;

    if (!variantId || !quantity || quantity <= 0) {
      return [];
    }

    return [{ variant_id: variantId, quantity }];
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CheckoutPayload>;

    const storeSlug = typeof body.store_slug === 'string' ? body.store_slug.trim() : '';
    const customerName = typeof body.customer_name === 'string' ? body.customer_name.trim() : '';
    const customerPhone = typeof body.customer_phone === 'string' ? body.customer_phone.trim() : '';
    const customerAddress = typeof body.customer_address === 'string' ? body.customer_address.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes : null;
    const items = normalizeItems(body.items);

    if (!storeSlug || !customerName || !customerPhone || !customerAddress || items.length === 0) {
      return NextResponse.json({ error: 'Please provide valid customer details and at least one cart item.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, slug, name')
      .eq('slug', storeSlug)
      .maybeSingle<{ id: string; slug: string; name: string }>();

    if (storeError || !store) {
      return NextResponse.json({ error: 'This store could not be found.' }, { status: 404 });
    }

    const createOrderPayload = {
      p_store_id: store.id,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_address: customerAddress,
      p_notes: notes,
      p_items: items,
    };

    const { data: order, error: rpcError } = await supabase.rpc('create_order_with_items', createOrderPayload);

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      order: order?.order,
      items: order?.items ?? [],
    });
  } catch {
    return NextResponse.json({ error: 'Unable to complete the order. Please try again.' }, { status: 500 });
  }
}
