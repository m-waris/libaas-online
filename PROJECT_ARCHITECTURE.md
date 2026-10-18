# Libaas Online: Project Architecture

## Project idea

Libaas Online is a multi-tenant e-commerce application for small businesses. Each business has a storefront addressed by a store slug on a subdomain (for example, `rifah.libaasonline.com`). The Next.js app serves storefront and owner experiences from one codebase; Supabase provides authentication, PostgreSQL, and row-level access policies.

The current implemented customer flow is: browse a store catalog, view a product, select a variant, keep items in a browser cart, and submit an order. Store owners can sign in and create products and variants. Store onboarding is available through a CLI script.

## High-level request and data flow

1. `proxy.ts` parses the request host, refreshes the Supabase session, signs owners out when their tenant is disabled, and passes `x-store-slug` and `x-tenant-mode` request headers to the App Router.
2. Storefront server pages use the tenant slug to read the store and active catalog through `lib/queries/index.ts`.
3. Owner pages use the cookie-backed Supabase server client for authentication and owner-scoped reads. The owner dashboard uses the browser client for writes, with RLS enforcing ownership.
4. Checkout posts customer details and variant IDs to `app/api/checkout/route.ts`. The database RPC `create_order_with_items` revalidates the store, active products, prices, and inventory, then writes the order and line items.
5. Supabase migrations define the schema, RLS policies, and checkout RPC contract.

## Current project map

| Area                             | Location                                                                                                                                                   | Responsibility                                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| App Router pages and API         | [`app/`](app/)                                                                                                                                             | Storefront, product detail, login, owner products dashboard, cart, checkout, checkout API                          |
| Storefront UI                    | [`components/storefront/`](components/storefront/)                                                                                                         | Tenant-aware shell/header, catalog filters, product gallery/variant selection, cart state and views, checkout form |
| Owner UI                         | [`components/owner/`](components/owner/)                                                                                                                   | Store-branded login, shared admin shell, product/inventory and order management dashboards                         |
| Supabase clients and data access | [`lib/`](lib/)                                                                                                                                             | Browser/server clients, session helper, storefront queries, shared types                                           |
| Tenant resolution                | [`proxy.ts`](proxy.ts)                                                                                                                                     | Hostname-to-store-slug resolution and tenant headers                                                               |
| Database                         | [`supabase/migrations/`](supabase/migrations/)                                                                                                             | Tables, indexes, RLS policies, checkout RPC                                                                        |
| Store onboarding                 | [`scripts/create-store.mjs`](scripts/create-store.mjs)                                                                                                     | Creates an owner account and store using a server-side service key                                                 |
| Platform administration          | [`app/dashboard/stores/page.tsx`](app/dashboard/stores/page.tsx), [`app/admin/actions.ts`](app/admin/actions.ts), [`lib/admin-auth.ts`](lib/admin-auth.ts) | Admin login, store provisioning, and store enable/disable controls                                                 |
| Focused documentation            | [`docs/README.md`](docs/README.md)                                                                                                                         | Guide index for task-specific details                                                                              |

## Routes currently implemented

| Route                    | Purpose                                                                | Access/context                                                   |
| ------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `/`                      | Root-domain redirect to admin login or tenant product catalog/search   | Admin sign-in on root; public tenant catalog on store hosts      |
| `/products/[id]`         | Product details and variant selection                                  | Public; scoped to the resolved tenant                            |
| `/cart`                  | Cart view                                                              | Public; cart is browser-local and scoped by current app behavior |
| `/checkout`              | Customer details and order preview                                     | Public; requires a resolved store                                |
| `/api/checkout` (`POST`) | Validates request and invokes order-creation RPC                       | Public endpoint; database RPC validates order data and stock     |
| `/login`                 | Root admin or tenant store-owner sign-in                               | Public; login mode follows host context                          |
| `/dashboard`             | Platform summary on root domain or store-owner overview on tenant host | Admin or matching active store-owner session                     |
| `/dashboard/stores`      | Platform admin store list, create, update, and enable/disable          | Admin session cookie; service-role operations stay server-side   |
| `/api/auth/disabled`     | Clears owner session after a store is disabled                         | Store owner session cookie                                       |
| `/dashboard/products`    | Create/view products and variants; quick stock and visibility edits    | Owner session; verifies the signed-in user owns the tenant store |
| `/dashboard/orders`      | View recent orders, contact customers, and update status               | Owner session; verifies the signed-in user owns the tenant store |

## Current scope and known boundaries

- The owner dashboard supports order status management, customer WhatsApp contact, product/variant creation and listing, quick stock edits, and product visibility toggles. Image-upload management and store-contact settings remain unimplemented. Checkout collects the customer's city and street address separately in the UI, then stores both in the existing address text field.
- Storefront and owner prices use PKR (`Rs`) without decimals.
- The root domain is the platform admin login. Admin access uses `ADMIN_PASSWORD` and the configured admin email. Stores include an `is_active` flag; disabled stores are excluded from storefront lookup and order creation.
- Public storefront pages read safe store fields through the `storefront_stores` view; owner pages query the base table under owner-only RLS.
- Store and owner onboarding is intended to use the server-side provisioning script. Ordinary public signup and direct store insertion are disabled in local configuration/policies.
- The architecture and route guides describe implemented behavior. Planned work belongs in a clearly marked roadmap, not in the current feature description.

## Detailed guides

Start at [`docs/README.md`](docs/README.md) and open only the guide relevant to the task:

- [`docs/project-structure.md`](docs/project-structure.md) — route, module, and component map.
- [`docs/tenant-routing.md`](docs/tenant-routing.md) — host parsing, request headers, and tenant context.
- [`docs/api-and-workflows.md`](docs/api-and-workflows.md) — route behavior and checkout request/response flow.
- [`docs/supabase-and-data-security.md`](docs/supabase-and-data-security.md) — clients, schema, RLS, auth, and migrations.
- [`docs/ui-and-components.md`](docs/ui-and-components.md) — component responsibilities and UI conventions.
- [`docs/development.md`](docs/development.md) — environment, scripts, and local tenant setup.
