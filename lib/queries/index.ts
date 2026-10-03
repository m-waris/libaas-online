import { createClient } from '@supabase/supabase-js';

export type StorefrontStore = {
  id: string;
  slug: string;
  name: string;
  logo_url?: string | null;
  theme_config?: Record<string, unknown> | null;
};

export type StorefrontProduct = {
  id: string;
  name: string;
  description?: string | null;
  base_price: number;
  is_active: boolean;
  images: StorefrontImage[];
  variants: StorefrontVariant[];
};

export type StorefrontVariant = {
  id: string;
  product_id: string;
  size?: string | null;
  color?: string | null;
  stock_count: number;
  price_override?: number | null;
  sku: string;
};

export type StorefrontImage = {
  id: string;
  product_id: string;
  url: string;
  sort_order: number;
};

function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

export async function getStorefrontStore(storeSlug: string) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('stores')
    .select('id, slug, name, logo_url, theme_config')
    .eq('slug', storeSlug)
    .maybeSingle<StorefrontStore>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getStorefrontProducts(storeSlug: string) {
  const supabase = createSupabaseClient();

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', storeSlug)
    .maybeSingle<{ id: string }>();

  if (storeError || !store) {
    return [];
  }

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, description, base_price, is_active')
    .eq('store_id', store.id)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (productsError) {
    throw productsError;
  }

  const productIds = (products ?? []).map((product) => product.id);

  const [imagesResult, variantsResult] = await Promise.all([
    productIds.length > 0
      ? supabase
          .from('product_images')
          .select('id, product_id, url, sort_order')
          .in('product_id', productIds)
          .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [] as StorefrontImage[], error: null }),
    productIds.length > 0
      ? supabase
          .from('product_variants')
          .select('id, product_id, size, color, stock_count, price_override, sku')
          .in('product_id', productIds)
      : Promise.resolve({ data: [] as StorefrontVariant[], error: null }),
  ]);

  if (imagesResult.error) {
    throw imagesResult.error;
  }

  if (variantsResult.error) {
    throw variantsResult.error;
  }

  const imagesByProduct = new Map<string, StorefrontImage[]>();
  for (const image of imagesResult.data ?? []) {
    const existing = imagesByProduct.get(image.product_id) ?? [];
    existing.push(image);
    imagesByProduct.set(image.product_id, existing);
  }

  const variantsByProduct = new Map<string, StorefrontVariant[]>();
  for (const variant of variantsResult.data ?? []) {
    const existing = variantsByProduct.get(variant.product_id) ?? [];
    existing.push(variant);
    variantsByProduct.set(variant.product_id, existing);
  }

  return (products ?? []).map((product) => ({
    ...product,
    images: imagesByProduct.get(product.id) ?? [],
    variants: variantsByProduct.get(product.id) ?? [],
  })) as StorefrontProduct[];
}

export async function getStorefrontProductById(storeSlug: string, productId: string) {
  const supabase = createSupabaseClient();

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', storeSlug)
    .maybeSingle<{ id: string }>();

  if (storeError || !store) {
    return null;
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, description, base_price, is_active')
    .eq('store_id', store.id)
    .eq('id', productId)
    .eq('is_active', true)
    .maybeSingle<StorefrontProduct>();

  if (productError || !product) {
    return null;
  }

  const [{ data: images }, { data: variants }] = await Promise.all([
    supabase
      .from('product_images')
      .select('id, product_id, url, sort_order')
      .eq('product_id', product.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('product_variants')
      .select('id, product_id, size, color, stock_count, price_override, sku')
      .eq('product_id', product.id),
  ]);

  return {
    ...product,
    images: (images ?? []) as StorefrontImage[],
    variants: (variants ?? []) as StorefrontVariant[],
  } as StorefrontProduct;
}
