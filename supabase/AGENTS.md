# Supabase change instructions

Use this file for schema, RLS, database function, and Supabase configuration changes. Read [`docs/supabase-and-data-security.md`](../docs/supabase-and-data-security.md), then use targeted search to locate the table, policy, helper, trigger, view, or RPC. Read its defining migration and the relevant later migrations that alter it; do not infer database behavior from documentation alone.

- Add an additive, timestamped migration in `migrations/`; do not rewrite an applied migration.
- Preserve tenant isolation and inspect the exact affected RLS policies before changing access.
- Treat `SECURITY DEFINER` functions, anonymous checkout, stock mutation, grants, and service-role use as security-sensitive. Review their whole implementation and call sites.
- Inspect [`config.toml`](config.toml) when authentication or local Supabase configuration is involved.
- Follow a database contract through to its direct application caller, such as [`app/api/checkout/route.ts`](../app/api/checkout/route.ts) for checkout or [`scripts/create-store.mjs`](../scripts/create-store.mjs) for provisioning.

In the same change, update the security guide, API/workflow guide, and structure map wherever the schema, RLS, RPC contract, authentication behavior, or migration inventory changes.
