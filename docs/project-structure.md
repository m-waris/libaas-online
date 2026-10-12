# Project structure

Use this map to locate implementation. For route behavior, see [API and workflows](api-and-workflows.md); for tenant headers, see [Tenant routing](tenant-routing.md).

## App routes

| Path | File | Role |
|---|---|---|
| `/` | `app/page.tsx` | Root-domain platform landing or tenant catalog with stock filters |
| `/products/[id]` | `app/products/[id]/page.tsx` | Tenant-scoped product details and variant selector |
| `/cart` | `app/cart/page.tsx` | Loads tenant and renders client cart |
| `/checkout` | `app/checkout/page.tsx` | Loads tenant and renders checkout form |
| `/api/checkout` | `app/api/checkout/route.ts` | POST endpoint for order submission |
| `/login` | `app/login/page.tsx` | Owner login page |
| `/dashboard/products` | `app/dashboard/products/page.tsx` | Authenticated owner product and variant dashboard |

`app/layout.tsx` is the root layout and wraps route content with `CartProvider`. `app/globals.css` contains global styles.

## Shared code

- `components/storefront/`: cart context and views, product variant selector, and checkout form.
- `components/owner/`: login form and product dashboard.
- `lib/queries/index.ts`: public storefront store/product queries and their result types.
- `lib/supabase/client.ts`: browser Supabase client.
- `lib/supabase/server.ts`: cookie-backed server Supabase client.
- `lib/supabase/middleware.ts`: session refresh helper; currently not invoked by `proxy.ts`.
- `lib/types/index.ts`: shared type definitions; check usage before extending it.
- `proxy.ts`: tenant hostname resolution and request context headers.
- `scripts/create-store.mjs`: command-line store/owner bootstrap.
- `supabase/migrations/`: schema, policies, and checkout RPC migrations.

## Where changes usually belong

- New URL page or route handler: `app/` using App Router file conventions.
- Reusable UI: the relevant `components/owner/` or `components/storefront/` area.
- Storefront read logic: `lib/queries/`.
- Authenticated browser/server Supabase access: `lib/supabase/`.
- Schema, policy, or database function change: a new migration under `supabase/migrations/` following repository/CLI conventions.
- Host-to-tenant behavior: `proxy.ts` and `docs/tenant-routing.md`.

Update this map when adding, removing, or moving architectural building blocks.
