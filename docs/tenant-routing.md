# Tenant routing and request context

Tenant routing selects a store from the incoming hostname. The implementation is in [`proxy.ts`](../proxy.ts).

## Resolution behavior

1. The proxy reads `host`, falling back to `x-forwarded-host`, lowercases and trims the hostname, and strips a trailing dot and numeric port.
2. `TENANT_STORE_SLUG`, when set and non-empty, overrides hostname resolution for local development.
3. `libaas.online` and `www.libaas.online` are treated as root domains. `localhost`, `127.0.0.1`, and `::1` have no tenant by themselves.
4. A hostname ending in `.localhost` or `.libaas.online` resolves to the prefix as the tenant slug.
5. The proxy passes `x-store-slug` and `x-tenant-mode` as request headers and calls `lib/supabase/middleware.ts` to refresh the Supabase session and propagate updated cookies. Modes currently include `override`, `subdomain`, `root-domain`, and `none`.

The proxy matcher excludes Next static assets, Next image optimization, and the favicon.

## Reading tenant context

Server pages use `await headers()` and read `x-store-slug`. The root page additionally checks `x-tenant-mode`: root/unknown hosts get the platform landing page; tenant hosts load the store and catalog. Tenant pages should verify that the resolved store exists before rendering tenant-specific data.

The slug is a routing hint, not an authorization mechanism. Data ownership and access must be enforced by query scoping and Supabase RLS. Do not treat a client-supplied slug or ID as proof of ownership. Owner-only pages must check the authenticated user's store ownership themselves; Proxy session refresh does not authorize access.

## Local development

- Use `{slug}.localhost:3000` to exercise hostname routing where supported.
- Set `TENANT_STORE_SLUG` to force a tenant while using `localhost:3000`.
- Clear the override when validating actual subdomain parsing.

If changing hostname normalization, supported domains, header names, or proxy matcher behavior, update this guide and the routing summary in [`PROJECT_ARCHITECTURE.md`](../PROJECT_ARCHITECTURE.md).
