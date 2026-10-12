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

const MAX_BODY_BYTES = 16 * 1024;
const MAX_ITEMS = 30;
const MAX_QUANTITY = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function readLimitedBody(request: NextRequest): Promise<string | null> {
  if (!request.body) {
    return '';
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bodyBytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(bodyBytes);
}

function normalizeItems(items: unknown): CheckoutItem[] | null {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
    return null;
  }

  const normalized: CheckoutItem[] = [];
  const quantities = new Map<string, number>();

  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return null;
    }

    const candidate = item as Partial<CheckoutItem>;
    const variantId = typeof candidate.variant_id === 'string' ? candidate.variant_id : null;
    const quantity = typeof candidate.quantity === 'number' ? candidate.quantity : null;

    if (
      !variantId ||
      !UUID_PATTERN.test(variantId) ||
      quantity === null ||
      !Number.isSafeInteger(quantity) ||
      quantity <= 0 ||
      quantity > MAX_QUANTITY
    ) {
      return null;
    }

    const previousQuantity = quantities.get(variantId) ?? 0;
    const combinedQuantity = previousQuantity + quantity;
    if (combinedQuantity > MAX_QUANTITY) {
      return null;
    }

    quantities.set(variantId, combinedQuantity);
  }

  for (const [variant_id, quantity] of quantities) {
    normalized.push({ variant_id, quantity });
  }

  return normalized;
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Checkout request is too large.' }, { status: 413 });
    }

    const rawBody = await readLimitedBody(request);
    if (rawBody === null) {
      return NextResponse.json({ error: 'Checkout request is too large.' }, { status: 413 });
    }

    let body: Partial<CheckoutPayload>;
    try {
      body = JSON.parse(rawBody) as Partial<CheckoutPayload>;
    } catch {
      return NextResponse.json({ error: 'Please provide valid checkout details.' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Please provide valid checkout details.' }, { status: 400 });
    }

    const storeSlug = typeof body.store_slug === 'string' ? body.store_slug.trim() : '';
    const customerName = typeof body.customer_name === 'string' ? body.customer_name.trim() : '';
    const customerPhone = typeof body.customer_phone === 'string' ? body.customer_phone.trim() : '';
    const customerAddress = typeof body.customer_address === 'string' ? body.customer_address.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : null;
    const items = normalizeItems(body.items);

    if (
      storeSlug.length < 2 || storeSlug.length > 63 ||
      !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(storeSlug) ||
      !customerName || customerName.length > 120 ||
      !customerPhone || customerPhone.length > 40 ||
      !customerAddress || customerAddress.length > 500 ||
      (notes !== null && notes.length > 1000) ||
      !items
    ) {
      return NextResponse.json({ error: 'Please provide valid customer details and at least one cart item.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );

    const { data: store, error: storeError } = await supabase
      .from('storefront_stores')
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
      if (rpcError.code === 'P0001') {
        return NextResponse.json(
          { error: 'One or more items are unavailable or their stock has changed.' },
          { status: 409 },
        );
      }

      return NextResponse.json({ error: 'Unable to place the order right now.' }, { status: 500 });
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
