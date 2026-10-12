# Routes, API, and workflows

For the route file map, see [Project structure](project-structure.md). For how requests acquire tenant context, see [Tenant routing](tenant-routing.md).

## Page routes

| Route                 | Behavior                                                                                                                                                                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                   | On root/unknown domain, renders the Libaas Online platform landing page. On tenant subdomains, wraps the catalog in the shared store shell and supports product search via `?q=...` and stock filters via `?filter=all`, `?filter=instock`, and `?filter=outofstock`. |
| `/products/[id]`      | Loads the active product by ID within the resolved tenant, then renders its images, description, price, stock state, and variant selector.                                                                                                                            |
| `/cart`               | Loads the tenant record and renders cart contents from the browser cart context.                                                                                                                                                                                      |
| `/checkout`           | Loads the tenant record and renders customer details plus a cart preview.                                                                                                                                                                                             |
| `/login`              | Shows store-owner email/password login. If already authenticated, redirects to `/dashboard/products`.                                                                                                                                                                 |
| `/dashboard/products` | Requires an authenticated owner and a tenant slug matching the owner's store. Displays products and variants and supports creation, stock edits, and visibility toggles.                                                                                              |
| `/dashboard/orders`   | Requires an authenticated owner and matching tenant. Displays up to 100 recent orders with customer details and supports owner-authorized status changes.                                                                                                             |

Storefront/cart/checkout/product routes are tenant-scoped. Login and dashboard behavior also depends on the tenant subdomain. Dashboard pages verify the authenticated owner and matching tenant slug before querying. Order updates use the authenticated owner session and RLS. The UI offers pending → confirmed/cancelled, confirmed → shipped/cancelled, and shipped → delivered/cancelled. Customer WhatsApp links use the order phone and a prefilled message; opening WhatsApp does not change order state.

The shared tenant header appears on catalog, product, cart, and checkout pages. Its search form submits a GET request to the tenant catalog; availability filters use `?filter=instock` and `?filter=outofstock`, with a mobile bottom sheet. Cart count hydrates from local browser storage. The platform landing can link to WhatsApp when `PLATFORM_WHATSAPP_NUMBER` is configured.

## `POST /api/checkout`

The checkout form sends JSON to [`app/api/checkout/route.ts`](../app/api/checkout/route.ts):

```json
{
  "store_slug": "rifah",
  "customer_name": "Customer Name",
  "customer_phone": "...",
  "customer_address": "...",
  "notes": "optional",
  "items": [{ "variant_id": "uuid", "quantity": 2 }]
}
```

The handler caps the request body at 16 KiB, accepts at most 30 distinct variants and 100 units per variant, validates UUIDs and customer field lengths, looks up the store through the safe `storefront_stores` view, and invokes `create_order_with_items`. It returns `{ "success": true, "order": ..., "items": [...] }` on success. It returns 400 for invalid input, 404 for an unknown store, 409 when inventory/order validation fails, 413 for an oversized request, and a generic 500 for unexpected failures. Durable rate limiting must be configured at the deployment/API gateway layer; there is no distributed application rate limiter in this repository yet.

The API uses the public/publishable key. It does not trust the cart's displayed prices: the database function recalculates prices from the selected variants and product base prices, checks that each item is active and belongs to the requested store, conditionally decrements stock, and creates a pending order and order items. See [Supabase and data security](supabase-and-data-security.md).

## Customer purchase flow

1. Catalog and product detail pages read active products for the current store.
2. Variant selection adds a variant ID and quantity to the cart context, persisted in `localStorage`.
3. Cart/checkout resolve product data for display using the public Supabase client.
4. Checkout posts contact details and selected variant IDs to the API.
5. The database RPC validates and writes the order transactionally; the browser cart is cleared after successful submission.

The client-side cart and order preview are convenience UI. The database RPC is authoritative for price and stock at purchase time. Checkout asks for city and full delivery address separately, then stores them together as labeled lines in the existing `customer_address` field; the API/schema contract has not changed. The displayed COD total is the item subtotal; delivery charges are not included or calculated by the current schema/API.

## Owner product workflow

The login page authenticates with Supabase Auth. It redirects only when the current user owns the tenant store. A stale session for another tenant is recoverable through a client-side sign-out, which can update the browser cookies. The dashboard checks the authenticated user, loads their store, and requires that its slug matches the tenant slug. Product and variant writes use the browser session and rely on RLS to enforce ownership.

Document new endpoints here with method, path, payload, response shape, error behavior, tenant requirements, and where validation/authorization occurs.
