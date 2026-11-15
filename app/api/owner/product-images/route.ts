import { createHash, randomUUID } from "node:crypto";
import { headers } from "next/headers";

import { createClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 3_800_000;
const MAX_IMAGES_PER_PRODUCT = 8;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function createSignature(params: Record<string, string>, apiSecret: string) {
  const serialized = Object.entries(params)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${serialized}${apiSecret}`).digest("hex");
}

function isWebp(bytes: Uint8Array) {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

async function removeCloudinaryAsset(
  cloudName: string,
  apiKey: string,
  apiSecret: string,
  publicId: string,
) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createSignature(
    { public_id: publicId, timestamp },
    apiSecret,
  );
  const body = new FormData();
  body.set("public_id", publicId);
  body.set("timestamp", timestamp);
  body.set("api_key", apiKey);
  body.set("signature", signature);

  await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/destroy`,
    { method: "POST", body, cache: "no-store" },
  );
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_IMAGE_BYTES + 64_000) {
    return jsonError("Photo is too large. Choose a smaller image.", 413);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return jsonError("Please sign in again.", 401);

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (origin) {
    try {
      const requestHost =
        requestHeaders.get("host")?.trim() ||
        requestHeaders.get("x-forwarded-host")?.trim() ||
        new URL(request.url).host;
      if (new URL(origin).host.toLowerCase() !== requestHost.toLowerCase()) {
        return jsonError("Upload request origin is not allowed.", 403);
      }
    } catch {
      return jsonError("Upload request origin is not allowed.", 403);
    }
  }
  const expectedStoreSlug = requestHeaders.get("x-store-slug")?.trim();
  if (!expectedStoreSlug) return jsonError("Store context is required.", 403);

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, slug, is_active")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (storeError) return jsonError("Unable to verify store ownership.", 500);
  if (!store || store.slug !== expectedStoreSlug) {
    return jsonError("This store does not match your account.", 403);
  }
  if (!store.is_active)
    return jsonError("This store is currently disabled.", 403);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Choose a valid image file and try again.", 400);
  }

  const productId = formData.get("product_id");
  const file = formData.get("file");
  if (
    typeof productId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      productId,
    ) ||
    !(file instanceof File)
  ) {
    return jsonError("Choose a product and a valid photo.", 400);
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return jsonError("Photo is too large. Choose a smaller image.", 413);
  }
  if (file.type !== "image/webp") {
    return jsonError("Choose a supported photo and try again.", 415);
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("store_id", store.id)
    .maybeSingle();
  if (productError) return jsonError("Unable to verify this product.", 500);
  if (!product) return jsonError("Product not found in this store.", 404);

  const { data: currentImages, error: imageListError } = await supabase
    .from("product_images")
    .select("id, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(MAX_IMAGES_PER_PRODUCT);
  if (imageListError) return jsonError("Unable to load product photos.", 500);
  if ((currentImages?.length ?? 0) >= MAX_IMAGES_PER_PRODUCT) {
    return jsonError("This product already has the maximum of 8 photos.", 409);
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    return jsonError("Image uploads are not configured yet.", 503);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isWebp(bytes)) return jsonError("Choose a valid WebP photo.", 415);

  const assetFolder = `libaas-online/${store.slug}`;
  const publicId = randomUUID();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signedParams = {
    asset_folder: assetFolder,
    folder: assetFolder,
    overwrite: "false",
    public_id: publicId,
    timestamp,
  };
  const signature = createSignature(signedParams, apiSecret);
  const uploadData = new FormData();
  uploadData.set(
    "file",
    new Blob([bytes], { type: "image/webp" }),
    `${publicId}.webp`,
  );
  for (const [key, value] of Object.entries(signedParams)) {
    uploadData.set(key, value);
  }
  uploadData.set("api_key", apiKey);
  uploadData.set("signature", signature);

  let secureUrl: string;
  let uploadedPublicId: string;
  try {
    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
      { method: "POST", body: uploadData, cache: "no-store" },
    );
    const uploadResult = (await uploadResponse.json()) as {
      secure_url?: unknown;
      public_id?: unknown;
    };
    if (
      !uploadResponse.ok ||
      typeof uploadResult.secure_url !== "string" ||
      typeof uploadResult.public_id !== "string" ||
      !uploadResult.secure_url.startsWith(
        `https://res.cloudinary.com/${cloudName}/image/upload/`,
      )
    ) {
      return jsonError("Photo upload failed. Please try again.", 502);
    }
    secureUrl = uploadResult.secure_url;
    uploadedPublicId = uploadResult.public_id;
  } catch {
    return jsonError(
      "Photo upload failed. Check your connection and try again.",
      502,
    );
  }

  const sortOrder = (currentImages?.[0]?.sort_order ?? -1) + 1;
  const { data: image, error: insertError } = await supabase
    .from("product_images")
    .insert({ product_id: productId, url: secureUrl, sort_order: sortOrder })
    .select("id, product_id, url, sort_order")
    .single();

  if (insertError || !image) {
    try {
      await removeCloudinaryAsset(
        cloudName,
        apiKey,
        apiSecret,
        uploadedPublicId,
      );
    } catch {
      // The original database error remains the useful response. An orphaned
      // Cloudinary asset can be removed from the store's media folder later.
    }
    return jsonError(
      "Photo was uploaded but could not be saved to this product.",
      500,
    );
  }

  return Response.json({ image }, { status: 201 });
}
