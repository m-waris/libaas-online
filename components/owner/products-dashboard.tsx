"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Boxes,
  Check,
  EllipsisVertical,
  Eye,
  EyeOff,
  Layers3,
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  Save,
  X,
} from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { getCloudinaryImageUrl } from "../../lib/cloudinary-image";
import { formatCurrency } from "../../lib/format-currency";
import { useToast } from "../ui/toast-provider";
import { AppIcon } from "../ui/app-icon";

const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_OPTIMIZED_IMAGE_BYTES = 3_800_000;
const MAX_PRODUCT_IMAGES = 8;

async function optimizeImageForUpload(file: File) {
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) {
    throw new Error("Choose a JPG, PNG, or WebP photo.");
  }
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error("Each selected photo must be 20 MB or smaller.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 32_000_000) {
      throw new Error(
        "This photo has too many pixels. Choose a smaller image.",
      );
    }

    const scale = Math.min(1, 2400 / bitmap.width, 3000 / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This photo could not be prepared.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const optimized = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.84),
    );
    if (!optimized) throw new Error("This photo could not be prepared.");
    if (optimized.size > MAX_OPTIMIZED_IMAGE_BYTES) {
      throw new Error("This photo is still too large after optimization.");
    }
    return optimized;
  } finally {
    bitmap.close();
  }
}

type StoreRecord = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  theme_config: Record<string, unknown> | null;
};

type ProductRecord = {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type VariantRecord = {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  stock_count: number;
  price_override: number | null;
  sku: string;
};

type ProductImageRecord = {
  id: string;
  product_id: string;
  url: string;
  sort_order: number;
};

type ProductsDashboardProps = {
  initialStore: StoreRecord;
  initialProducts: ProductRecord[];
  initialVariants: VariantRecord[];
  initialImages: ProductImageRecord[];
};

type ProductFormState = {
  name: string;
  description: string;
  base_price: string;
  is_active: boolean;
};

type VariantFormState = {
  size: string;
  color: string;
  stock_count: string;
  sku: string;
  price_override: string;
};

export function ProductsDashboard({
  initialStore,
  initialProducts,
  initialVariants,
  initialImages,
}: ProductsDashboardProps) {
  const supabase = createClient();
  const { notify } = useToast();
  const [products, setProducts] = useState(initialProducts);
  const [variants, setVariants] = useState(initialVariants);
  const [productImages, setProductImages] = useState(initialImages);
  const [newProductImages, setNewProductImages] = useState<File[]>([]);
  const [newProductImageMessage, setNewProductImageMessage] = useState<
    string | null
  >(null);
  const [imageMessages, setImageMessages] = useState<Record<string, string>>(
    {},
  );
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(
    null,
  );
  const [productForm, setProductForm] = useState<ProductFormState>({
    name: "",
    description: "",
    base_price: "",
    is_active: true,
  });
  const [variantForm, setVariantForm] = useState<VariantFormState>({
    size: "",
    color: "",
    stock_count: "",
    sku: "",
    price_override: "",
  });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [productMessage, setProductMessage] = useState<string | null>(null);
  const [variantMessage, setVariantMessage] = useState<string | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isCreatingVariant, setIsCreatingVariant] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [activeDialog, setActiveDialog] = useState<
    "create" | "edit" | "variant" | null
  >(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<{
    productId: string;
    top: number;
    left: number;
    trigger: HTMLButtonElement;
  } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeDialog) {
      if (!dialog.open) dialog.showModal();
      const scrollArea = dialog.querySelector<HTMLElement>(
        ".owner-products__dialog-body",
      );
      if (scrollArea) scrollArea.scrollTop = 0;
      dialog.focus({ preventScroll: true });
    }
    if (!activeDialog && dialog.open) dialog.close();
  }, [activeDialog]);

  useEffect(() => {
    const trigger = actionMenu?.trigger;
    if (!trigger) return;
    actionMenuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();

    function dismissMenu(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        (actionMenuRef.current?.contains(target) || trigger!.contains(target))
      ) {
        return;
      }
      setActionMenu(null);
    }

    function handleMenuKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActionMenu(null);
        trigger!.focus();
      }
    }

    function closeMenuOnScroll() {
      setActionMenu(null);
    }

    document.addEventListener("pointerdown", dismissMenu);
    document.addEventListener("keydown", handleMenuKey);
    window.addEventListener("scroll", closeMenuOnScroll, true);
    return () => {
      document.removeEventListener("pointerdown", dismissMenu);
      document.removeEventListener("keydown", handleMenuKey);
      window.removeEventListener("scroll", closeMenuOnScroll, true);
    };
  }, [actionMenu]);

  const variantsByProductId = useMemo(() => {
    return variants.reduce<Record<string, VariantRecord[]>>(
      (accumulator, variant) => {
        const existing = accumulator[variant.product_id] ?? [];
        existing.push(variant);
        accumulator[variant.product_id] = existing;
        return accumulator;
      },
      {},
    );
  }, [variants]);

  const imagesByProductId = useMemo(() => {
    return productImages.reduce<Record<string, ProductImageRecord[]>>(
      (accumulator, image) => {
        const existing = accumulator[image.product_id] ?? [];
        existing.push(image);
        accumulator[image.product_id] = existing;
        return accumulator;
      },
      {},
    );
  }, [productImages]);

  async function uploadProductImages(productId: string, files: File[]) {
    const uploadedImages: ProductImageRecord[] = [];
    const failures: string[] = [];

    for (const file of files) {
      try {
        const optimized = await optimizeImageForUpload(file);
        const formData = new FormData();
        formData.set("product_id", productId);
        formData.set("file", optimized, "product-photo.webp");
        const response = await fetch("/api/owner/product-images", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as {
          image?: ProductImageRecord;
          error?: string;
        };
        if (!response.ok || !result.image) {
          failures.push(
            result.error ?? "Photo upload failed. Please try again.",
          );
          continue;
        }
        uploadedImages.push(result.image);
      } catch (error) {
        failures.push(
          error instanceof Error
            ? error.message
            : "Photo upload failed. Please try again.",
        );
      }
    }

    return { uploadedImages, failures };
  }

  function getUploadMessage(uploadedCount: number, failures: string[]) {
    if (failures.length > 0) {
      return uploadedCount > 0
        ? `${uploadedCount} photo${uploadedCount === 1 ? "" : "s"} added. ${failures[0]}`
        : failures[0];
    }
    return `${uploadedCount} photo${uploadedCount === 1 ? "" : "s"} added.`;
  }

  async function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProductMessage(null);
    setIsCreatingProduct(true);
    const imagesToUpload = newProductImages;
    setNewProductImageMessage(null);

    const basePrice = Number(productForm.base_price);
    const { data, error } = await supabase
      .from("products")
      .insert({
        store_id: initialStore.id,
        name: productForm.name.trim(),
        description: productForm.description.trim() || null,
        base_price: basePrice,
        is_active: productForm.is_active,
      })
      .select(
        "id, name, description, base_price, is_active, created_at, updated_at",
      )
      .single();

    if (error || !data) {
      const message = error?.message ?? "Unable to create the product.";
      setProductMessage(message);
      notify(message, "error");
      setIsCreatingProduct(false);
      return;
    }

    setProducts((current) => [data, ...current]);
    setSelectedProductId(data.id);
    setProductForm({
      name: "",
      description: "",
      base_price: "",
      is_active: true,
    });
    if (imagesToUpload.length > 0) {
      const result = await uploadProductImages(data.id, imagesToUpload);
      setProductImages((current) => [...current, ...result.uploadedImages]);
      setNewProductImages([]);
      const uploadMessage = getUploadMessage(
        result.uploadedImages.length,
        result.failures,
      );
      setProductMessage(
        result.failures.length > 0
          ? `Product created. ${uploadMessage}`
          : `Product created: ${data.name}. ${uploadMessage}`,
      );
      if (result.failures.length > 0) {
        notify(result.failures[0], "error");
      }
    } else {
      setProductMessage(`Product created: ${data.name}`);
    }
    notify(`Product added: ${data.name}`, "success");
    setActiveDialog(null);
    setIsCreatingProduct(false);
  }

  function openEditProduct(product: ProductRecord) {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      description: product.description ?? "",
      base_price: String(product.base_price),
      is_active: product.is_active,
    });
    setProductMessage(null);
    setActiveDialog("edit");
  }

  async function handleEditProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProductId) return;
    setIsCreatingProduct(true);
    setProductMessage(null);
    const { data, error } = await supabase
      .from("products")
      .update({
        name: productForm.name.trim(),
        description: productForm.description.trim() || null,
        base_price: Number(productForm.base_price),
        is_active: productForm.is_active,
      })
      .eq("id", editingProductId)
      .eq("store_id", initialStore.id)
      .select(
        "id, name, description, base_price, is_active, created_at, updated_at",
      )
      .maybeSingle();
    if (error || !data) {
      const message = error?.message ?? "Unable to update the product.";
      setProductMessage(message);
      notify(message, "error");
    } else {
      setProducts((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      );
      setProductMessage(`Product updated: ${data.name}`);
      notify(`Product updated: ${data.name}`, "success");
      setActiveDialog(null);
    }
    setIsCreatingProduct(false);
  }

  async function handleUploadImages(product: ProductRecord, files: File[]) {
    const existingCount = imagesByProductId[product.id]?.length ?? 0;
    if (existingCount + files.length > MAX_PRODUCT_IMAGES) {
      notify(`A product can have up to ${MAX_PRODUCT_IMAGES} photos.`, "error");
      setImageMessages((current) => ({
        ...current,
        [product.id]: `A product can have up to ${MAX_PRODUCT_IMAGES} photos.`,
      }));
      return;
    }
    if (files.length === 0) return;

    setUploadingProductId(product.id);
    setImageMessages((current) => ({
      ...current,
      [product.id]: "Uploading photos…",
    }));
    const result = await uploadProductImages(product.id, files);
    setProductImages((current) => [...current, ...result.uploadedImages]);
    setImageMessages((current) => ({
      ...current,
      [product.id]: getUploadMessage(
        result.uploadedImages.length,
        result.failures,
      ),
    }));
    if (result.uploadedImages.length > 0) {
      notify(
        `${result.uploadedImages.length} photo${result.uploadedImages.length === 1 ? "" : "s"} added to ${product.name}.`,
        "success",
      );
    }
    if (result.failures.length > 0) notify(result.failures[0], "error");
    setUploadingProductId(null);
  }

  async function handleCreateVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProductId) {
      const message = "Create a product before adding a variant.";
      setVariantMessage(message);
      notify(message, "error");
      return;
    }

    setVariantMessage(null);
    setIsCreatingVariant(true);

    const stockCount = Number(variantForm.stock_count);
    const priceOverride = variantForm.price_override
      ? Number(variantForm.price_override)
      : null;

    const { data, error } = await supabase
      .from("product_variants")
      .insert({
        product_id: selectedProductId,
        size: variantForm.size.trim() || null,
        color: variantForm.color.trim() || null,
        stock_count: stockCount,
        sku: variantForm.sku.trim(),
        price_override: priceOverride,
      })
      .select("id, product_id, size, color, stock_count, price_override, sku")
      .single();

    if (error || !data) {
      const message = error?.message ?? "Unable to create the variant.";
      setVariantMessage(message);
      notify(message, "error");
      setIsCreatingVariant(false);
      return;
    }

    setVariants((current) => [data, ...current]);
    setVariantForm({
      size: "",
      color: "",
      stock_count: "",
      sku: "",
      price_override: "",
    });
    setVariantMessage(`Variant created for ${data.sku}.`);
    notify(`Variant added: ${data.sku}.`, "success");
    setActiveDialog(null);
    setIsCreatingVariant(false);
  }

  async function toggleProduct(product: ProductRecord) {
    setBusyId(product.id);
    const { data, error } = await supabase
      .from("products")
      .update({ is_active: !product.is_active })
      .eq("id", product.id)
      .eq("store_id", initialStore.id)
      .select("id, is_active")
      .maybeSingle();
    if (error || !data) {
      const message = "Product update nahi ho saka. Dobara try karein.";
      setProductMessage(message);
      notify(message, "error");
    } else {
      setProducts((current) =>
        current.map((item) =>
          item.id === product.id
            ? { ...item, is_active: data.is_active }
            : item,
        ),
      );
      notify(
        data.is_active
          ? "Product is visible in your store."
          : "Product hidden from your store.",
        "success",
      );
    }
    setBusyId(null);
  }

  async function saveStock(variant: VariantRecord) {
    const stockCount = Number(stockDrafts[variant.id] ?? variant.stock_count);
    if (!Number.isInteger(stockCount) || stockCount < 0) {
      notify("Enter a whole stock quantity of 0 or more.", "error");
      return;
    }
    setBusyId(variant.id);
    const { data, error } = await supabase
      .from("product_variants")
      .update({ stock_count: stockCount })
      .eq("id", variant.id)
      .eq("product_id", variant.product_id)
      .select("id, stock_count")
      .maybeSingle();
    if (error || !data) {
      const message = "Stock update nahi hua. Dobara try karein.";
      setVariantMessage(message);
      notify(message, "error");
    } else {
      setVariants((current) =>
        current.map((item) =>
          item.id === variant.id
            ? { ...item, stock_count: data.stock_count }
            : item,
        ),
      );
      setStockDrafts((current) => {
        const next = { ...current };
        delete next[variant.id];
        return next;
      });
      setVariantMessage("Stock update ho gaya.");
      notify("Stock updated.", "success");
    }
    setBusyId(null);
  }

  return (
    <div className="owner-page owner-products">
      <header className="owner-page__intro owner-products__header">
        <div>
          <p className="owner-page__eyebrow">Store management</p>
          <h1>Products and inventory</h1>
          <p>Everything in your catalog, in one clear view.</p>
        </div>
        <button
          type="button"
          className="owner-primary-action"
          onClick={() => {
            setProductForm({
              name: "",
              description: "",
              base_price: "",
              is_active: true,
            });
            setNewProductImages([]);
            setNewProductImageMessage(null);
            setProductMessage(null);
            setActiveDialog("create");
          }}
        >
          <AppIcon icon={Plus} size={17} />
          Create new product
        </button>
      </header>

      <section className="owner-stats" aria-label="Store summary">
        <div>
          <strong>{products.length}</strong>
          <span>
            <AppIcon icon={Package} size={15} />
            Products
          </span>
        </div>
        <div>
          <strong>{products.filter((item) => item.is_active).length}</strong>
          <span>
            <AppIcon icon={Eye} size={15} />
            Active
          </span>
        </div>
        <div>
          <strong>
            {variants.reduce((sum, item) => sum + item.stock_count, 0)}
          </strong>
          <span>
            <AppIcon icon={Boxes} size={15} />
            Total stock
          </span>
        </div>
      </section>

      {productMessage ? (
        <p className="owner-products__notice" role="status" aria-live="polite">
          {productMessage}
        </p>
      ) : null}
      {variantMessage ? (
        <p className="owner-products__notice" role="status" aria-live="polite">
          {variantMessage}
        </p>
      ) : null}

      <section
        className="owner-products__table-wrap"
        aria-labelledby="products-heading"
      >
        <div className="owner-products__table-heading">
          <div>
            <h2 id="products-heading">Your products</h2>
            <p>{products.length} items · active and inactive</p>
          </div>
          <span>Scroll table sideways on a small screen</span>
        </div>
        {products.length ? (
          <div
            className="owner-products__scroller"
            tabIndex={0}
            aria-label="Products table; scroll horizontally to see all columns"
          >
            <table className="owner-products__table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Price</th>
                  <th scope="col">Variants and stock</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const productVariants = variantsByProductId[product.id] ?? [];
                  const productImageList = imagesByProductId[product.id] ?? [];
                  const primaryImage = productImageList[0];
                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="owner-products__identity">
                          <div className="owner-products__thumbnail">
                            {primaryImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={getCloudinaryImageUrl(primaryImage.url, {
                                  width: 180,
                                  catalogCrop: true,
                                })}
                                alt={`${product.name} product`}
                                width={72}
                                height={90}
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <span aria-hidden="true">
                                Photo
                                <br />
                                pending
                              </span>
                            )}
                          </div>
                          <div className="owner-products__product-copy">
                            <strong>{product.name}</strong>
                            <p>{product.description || "No description"}</p>
                            <span className="owner-products__subline">
                              Added {product.created_at.slice(0, 10)}
                            </span>
                            <label className="owner-products__upload">
                              {uploadingProductId === product.id
                                ? "Uploading photos…"
                                : `Photos ${productImageList.length}/${MAX_PRODUCT_IMAGES} · Add`}
                              <input
                                aria-label={`Add photos for ${product.name}`}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                disabled={
                                  uploadingProductId !== null ||
                                  productImageList.length >= MAX_PRODUCT_IMAGES
                                }
                                onChange={(event) => {
                                  const files = Array.from(
                                    event.currentTarget.files ?? [],
                                  );
                                  event.currentTarget.value = "";
                                  void handleUploadImages(product, files);
                                }}
                              />
                            </label>
                            {imageMessages[product.id] ? (
                              <span
                                className="owner-products__inline-status"
                                role="status"
                              >
                                {imageMessages[product.id]}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{formatCurrency(product.base_price)}</strong>
                        <span className="owner-products__subline">
                          Base price
                        </span>
                      </td>
                      <td>
                        {productVariants.length ? (
                          <ul className="owner-products__variants">
                            {productVariants.map((variant) => (
                              <li key={variant.id}>
                                <div>
                                  <strong>{variant.sku}</strong>
                                  <span>
                                    {[
                                      variant.size && `Size ${variant.size}`,
                                      variant.color && `Color ${variant.color}`,
                                    ]
                                      .filter(Boolean)
                                      .join(" · ") || "No size or color"}
                                  </span>
                                  <span>
                                    {formatCurrency(
                                      variant.price_override ??
                                        product.base_price,
                                    )}{" "}
                                    · {variant.stock_count} in stock
                                  </span>
                                </div>
                                <label className="owner-products__stock">
                                  Stock
                                  <input
                                    aria-label={`Stock for ${variant.sku}`}
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={
                                      stockDrafts[variant.id] ??
                                      String(variant.stock_count)
                                    }
                                    onChange={(event) =>
                                      setStockDrafts((current) => ({
                                        ...current,
                                        [variant.id]: event.target.value,
                                      }))
                                    }
                                  />
                                  <button
                                    type="button"
                                    disabled={busyId === variant.id}
                                    onClick={() => void saveStock(variant)}
                                  >
                                    {busyId === variant.id ? (
                                      <>
                                        <AppIcon
                                          icon={LoaderCircle}
                                          size={15}
                                          className="app-icon--spin"
                                        />
                                        Saving…
                                      </>
                                    ) : (
                                      <>
                                        <AppIcon icon={Save} size={15} />
                                        Save
                                      </>
                                    )}
                                  </button>
                                </label>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="owner-products__subline">
                            No variants yet
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`owner-status ${product.is_active ? "is-active" : ""}`}
                        >
                          {product.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="owner-products__menu-trigger"
                          aria-label={`Actions for ${product.name}`}
                          aria-haspopup="menu"
                          aria-expanded={actionMenu?.productId === product.id}
                          onClick={(event) => {
                            if (actionMenu?.productId === product.id) {
                              setActionMenu(null);
                              return;
                            }
                            const rect =
                              event.currentTarget.getBoundingClientRect();
                            const width = 190;
                            const height = 160;
                            const left = Math.max(
                              12,
                              Math.min(
                                rect.right - width,
                                window.innerWidth - width - 12,
                              ),
                            );
                            const below = rect.bottom + 8;
                            const top =
                              below + height > window.innerHeight - 12
                                ? Math.max(12, rect.top - height - 8)
                                : below;
                            setActionMenu({
                              productId: product.id,
                              top,
                              left,
                              trigger: event.currentTarget,
                            });
                          }}
                        >
                          <AppIcon icon={EllipsisVertical} size={19} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="owner-products__empty">
            <span className="owner-products__empty-mark" aria-hidden="true">
              <AppIcon icon={Plus} size={23} />
            </span>
            <h3>Your catalog starts here</h3>
            <p>
              Add a product, then create variants for size, color, and stock.
            </p>
            <button
              type="button"
              className="owner-primary-action"
              onClick={() => {
                setProductMessage(null);
                setProductForm({
                  name: "",
                  description: "",
                  base_price: "",
                  is_active: true,
                });
                setActiveDialog("create");
              }}
            >
              <AppIcon icon={Plus} size={17} />
              Create new product
            </button>
          </div>
        )}
      </section>

      {actionMenu ? (
        <div
          ref={actionMenuRef}
          id={`product-actions-${actionMenu.productId}`}
          className="owner-products__action-popover"
          role="menu"
          aria-label={`Product actions for ${products.find((item) => item.id === actionMenu.productId)?.name ?? "product"}`}
          style={{ top: actionMenu.top, left: actionMenu.left }}
          onKeyDown={(event) => {
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            const menuItems = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="menuitem"]:not(:disabled)',
              ),
            );
            const currentIndex = menuItems.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const direction = event.key === "ArrowDown" ? 1 : -1;
            const nextIndex =
              (currentIndex + direction + menuItems.length) % menuItems.length;
            event.preventDefault();
            menuItems[nextIndex]?.focus();
          }}
        >
          {(() => {
            const product = products.find(
              (item) => item.id === actionMenu.productId,
            );
            if (!product) return null;
            return (
              <>
                <button
                  type="button"
                  className="owner-products__menu-action"
                  role="menuitem"
                  onClick={() => {
                    setActionMenu(null);
                    openEditProduct(product);
                  }}
                >
                  <AppIcon icon={Pencil} size={16} />
                  Edit product
                </button>
                <button
                  type="button"
                  className="owner-products__menu-action"
                  role="menuitem"
                  onClick={() => {
                    setActionMenu(null);
                    setSelectedProductId(product.id);
                    setVariantForm({
                      size: "",
                      color: "",
                      stock_count: "",
                      sku: "",
                      price_override: "",
                    });
                    setVariantMessage(null);
                    setActiveDialog("variant");
                  }}
                >
                  <AppIcon icon={Layers3} size={16} />
                  Add variant
                </button>
                <button
                  type="button"
                  className="owner-products__menu-action owner-products__menu-action--quiet"
                  role="menuitem"
                  disabled={busyId === product.id}
                  onClick={() => {
                    setActionMenu(null);
                    void toggleProduct(product);
                  }}
                >
                  <AppIcon icon={product.is_active ? EyeOff : Eye} size={16} />
                  {busyId === product.id
                    ? "Saving…"
                    : product.is_active
                      ? "Deactivate product"
                      : "Activate product"}
                </button>
              </>
            );
          })()}
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        className="owner-products__dialog"
        tabIndex={-1}
        aria-labelledby={
          activeDialog === "variant"
            ? "variant-dialog-title"
            : "product-dialog-title"
        }
        onCancel={() => setActiveDialog(null)}
        onClose={() => {
          if (activeDialog) setActiveDialog(null);
        }}
      >
        {activeDialog === "create" || activeDialog === "edit" ? (
          <form
            className="owner-products__dialog-form"
            onSubmit={
              activeDialog === "create"
                ? handleCreateProduct
                : handleEditProduct
            }
          >
            <div className="owner-products__dialog-head">
              <div>
                <p className="owner-page__eyebrow">Catalog</p>
                <h2 id="product-dialog-title">
                  {activeDialog === "create"
                    ? "Create a product"
                    : "Edit product"}
                </h2>
              </div>
              <button
                type="button"
                className="owner-products__close"
                aria-label="Close dialog"
                onClick={() => setActiveDialog(null)}
              >
                <AppIcon icon={X} size={18} />
              </button>
            </div>
            <div className="owner-products__dialog-body">
              <label className="owner-products__field">
                Product name
                <input
                  required
                  value={productForm.name}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="owner-products__field">
                Description
                <textarea
                  rows={3}
                  value={productForm.description}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="owner-products__field">
                Base price (Rs)
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={productForm.base_price}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      base_price: event.target.value,
                    }))
                  }
                />
              </label>
              {activeDialog === "create" ? (
                <label className="owner-products__field">
                  Product photos (optional)
                  <span className="owner-products__file-picker">
                    <span
                      className="owner-products__file-name"
                      title={newProductImages
                        .map((file) => file.name)
                        .join(", ")}
                    >
                      {newProductImages.length
                        ? `${newProductImages.length} selected · ${newProductImages[0].name}`
                        : "Choose product photos"}
                    </span>
                    <span className="owner-products__file-browse">Browse</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      aria-label="Choose product photos"
                      onChange={(event) => {
                        const files = Array.from(
                          event.currentTarget.files ?? [],
                        );
                        event.currentTarget.value = "";
                        if (files.length > MAX_PRODUCT_IMAGES) {
                          notify(
                            `Choose up to ${MAX_PRODUCT_IMAGES} photos.`,
                            "error",
                          );
                          setNewProductImageMessage(
                            `Choose up to ${MAX_PRODUCT_IMAGES} photos.`,
                          );
                          return;
                        }
                        setNewProductImages(files);
                        setNewProductImageMessage(null);
                      }}
                    />
                  </span>
                  <span>
                    JPG, PNG, or WebP · resized and compressed before upload
                  </span>
                </label>
              ) : null}
              {newProductImageMessage ? (
                <p role="alert" className="owner-products__inline-status">
                  {newProductImageMessage}
                </p>
              ) : null}
              {productMessage ? (
                <p className="owner-products__inline-status" role="alert">
                  {productMessage}
                </p>
              ) : null}
              <label className="owner-products__checkbox">
                <input
                  type="checkbox"
                  checked={productForm.is_active}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))
                  }
                />{" "}
                Active on storefront
              </label>
            </div>
            <div className="owner-products__dialog-actions">
              <button
                type="button"
                className="owner-action"
                onClick={() => setActiveDialog(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="owner-primary-action"
                disabled={isCreatingProduct || uploadingProductId !== null}
              >
                {isCreatingProduct
                  ? "Saving…"
                  : activeDialog === "create"
                    ? "Create product"
                    : "Save changes"}
                <AppIcon
                  icon={isCreatingProduct ? LoaderCircle : Check}
                  size={17}
                  className={isCreatingProduct ? "app-icon--spin" : undefined}
                />
              </button>
            </div>
          </form>
        ) : activeDialog === "variant" ? (
          <form
            className="owner-products__dialog-form"
            onSubmit={handleCreateVariant}
          >
            <div className="owner-products__dialog-head">
              <div>
                <p className="owner-page__eyebrow">Inventory</p>
                <h2 id="variant-dialog-title">Add a variant</h2>
                <p>
                  For{" "}
                  {products.find((item) => item.id === selectedProductId)
                    ?.name ?? "this product"}
                  .
                </p>
              </div>
              <button
                type="button"
                className="owner-products__close"
                aria-label="Close dialog"
                onClick={() => setActiveDialog(null)}
              >
                <AppIcon icon={X} size={18} />
              </button>
            </div>
            <div className="owner-products__dialog-body">
              <div className="owner-products__field-grid">
                <label className="owner-products__field">
                  Size
                  <input
                    value={variantForm.size}
                    onChange={(event) =>
                      setVariantForm((current) => ({
                        ...current,
                        size: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="owner-products__field">
                  Color
                  <input
                    value={variantForm.color}
                    onChange={(event) =>
                      setVariantForm((current) => ({
                        ...current,
                        color: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="owner-products__field-grid">
                <label className="owner-products__field">
                  Stock count
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={variantForm.stock_count}
                    onChange={(event) =>
                      setVariantForm((current) => ({
                        ...current,
                        stock_count: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="owner-products__field">
                  SKU
                  <input
                    required
                    value={variantForm.sku}
                    onChange={(event) =>
                      setVariantForm((current) => ({
                        ...current,
                        sku: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <label className="owner-products__field">
                Price override (optional)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={variantForm.price_override}
                  onChange={(event) =>
                    setVariantForm((current) => ({
                      ...current,
                      price_override: event.target.value,
                    }))
                  }
                />
              </label>
              {variantMessage ? (
                <p className="owner-products__inline-status" role="alert">
                  {variantMessage}
                </p>
              ) : null}
            </div>
            <div className="owner-products__dialog-actions">
              <button
                type="button"
                className="owner-action"
                onClick={() => setActiveDialog(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="owner-primary-action"
                disabled={isCreatingVariant}
              >
                {isCreatingVariant ? "Saving…" : "Create variant"}
                <AppIcon
                  icon={isCreatingVariant ? LoaderCircle : Check}
                  size={17}
                  className={isCreatingVariant ? "app-icon--spin" : undefined}
                />
              </button>
            </div>
          </form>
        ) : null}
      </dialog>
    </div>
  );
}
