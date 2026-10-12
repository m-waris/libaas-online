# Supabase, data model, and security

This guide covers the repository's Supabase usage. Read the current migrations and source when changing behavior; they are authoritative if this summary differs.

## Client locations

- [`lib/supabase/client.ts`](../lib/supabase/client.ts): browser client created with `createBrowserClient` from `@supabase/ssr` and the publishable key.
- [`lib/supabase/server.ts`](../lib/supabase/server.ts): server client created with `createServerClient`, Next cookies, and the publishable key. Server Components can read cookies; cookie writes are caught because their cookie store can be read-only.
- [`lib/supabase/middleware.ts`](../lib/supabase/middleware.ts): `updateSession` refreshes auth state through `getUser()` and propagates refreshed cookies plus request headers. `proxy.ts` calls it while preserving tenant context.
- [`lib/queries/index.ts`](../lib/queries/index.ts): storefront queries instantiate `@supabase/supabase-js` with the public key and explicitly scope catalog reads using the resolved store slug/ID.
- [`app/api/checkout/route.ts`](../app/api/checkout/route.ts): API handler also uses the publishable key and invokes the database RPC.
- [`scripts/create-store.mjs`](../scripts/create-store.mjs): onboarding uses `SUPABASE_SERVICE_ROLE_KEY` for administrative Auth/store creation. Keep this key server-side and out of `NEXT_PUBLIC_*` variables.

## Data model

The initial migration defines:

- `stores`: tenant root, slug, branding/theme, and owner ID.
- `products`: store-owned catalog records with base price and active flag.
- `product_variants`: size/color/SKU, stock count, and optional price override.
- `product_images`: ordered product image URLs.
- `orders`: customer contact/address, status, total, and store ID.
- `order_items`: variant, quantity, and price captured at purchase.

The current order statuses and exact constraints/defaults are in [`supabase/migrations/20260711150000_initial_schema.sql`](../supabase/migrations/20260711150000_initial_schema.sql). Do not infer constraints from this summary; inspect the migration before changing data behavior.

## RLS and tenant isolation

[`supabase/migrations/20260711160000_rls_policies.sql`](../supabase/migrations/20260711160000_rls_policies.sql) enables RLS and defines ownership/storefront helpers and policies. At a high level:

- Public users can read store storefront details and active products, with variants/images gated by whether their product is active.
- Owners can manage their store's products, variants, and images through authenticated ownership checks.
- Owners can read and manage their own store's orders and line items.
- Customers cannot read other customers' order data and must use the checkout RPC to create orders and line items.

The hardening migration removes direct client `INSERT` access to orders and order items. Anonymous checkout must go through `create_order_with_items`, which calculates authoritative price and stock in one database transaction. Storefront reads use `public.storefront_stores`, a view exposing only `id`, `slug`, `name`, `logo_url`, and `theme_config`; direct access to the base `stores` table is owner-scoped for authenticated sessions.

Always inspect the exact policy and helper when changing access. `store_slug` or a product/order ID supplied by a browser is not authorization. Keep ownership checks in RLS or trusted server/database logic.

## Checkout RPC

The checkout migrations define `public.create_order_with_items`. It is a `SECURITY DEFINER` function granted to `anon` and `authenticated`, because anonymous customers need to create orders and decrement stock even though they have no direct variant update policy. The function sets `search_path = public` and validates the store, active product membership, positive quantities, and available stock. It computes server-side prices, decrements stock conditionally, and writes order and line items. Its contract is represented by migrations [`20260728190000_checkout_rpc.sql`](../supabase/migrations/20260728190000_checkout_rpc.sql) and [`20260809120000_checkout_rpc_contract.sql`](../supabase/migrations/20260809120000_checkout_rpc_contract.sql).

Because this function bypasses ordinary caller RLS as a security-definer routine, treat edits as security-sensitive: preserve its validation boundary, fixed `pg_catalog` search path, explicit execute grants to `anon` and `authenticated`, and transactional stock/order behavior. The hardening migration revokes default `PUBLIC` execution. Review the entire function and its migration history before changing it.

Store creation is provisioned by `scripts/create-store.mjs`. The hardening migration removes direct owner store-insert policy, and local Supabase config disables signup. Apply the same signup restriction in the hosted project's Auth settings; repository config does not change an already hosted project's Auth configuration.

## Migration workflow

Database changes belong in versioned SQL migrations under `supabase/migrations/`. Inspect the current schema, policies, and function definitions first. Create migration files using the repository's Supabase CLI workflow and conventions rather than inventing a timestamp/name format. Update this guide when tables, policies, RPCs, or client behavior change. The migration must be applied to the hosted Supabase project before deploying code that queries the new view.
