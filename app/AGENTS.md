# App Router instructions

Use this file only for work under `app/`. First read [`docs/project-structure.md`](../docs/project-structure.md), then inspect the target route and only its direct dependencies.

Choose focused documentation by change type:

- Route handler, server action, checkout, login, dashboard, or request/response behavior: [`docs/api-and-workflows.md`](../docs/api-and-workflows.md).
- Tenant-aware page behavior or request headers: [`docs/tenant-routing.md`](../docs/tenant-routing.md).
- Auth, privileged data access, checkout authorization, or Supabase calls: [`docs/supabase-and-data-security.md`](../docs/supabase-and-data-security.md).
- Rendered UI or client/server component boundary: [`docs/ui-and-components.md`](../docs/ui-and-components.md) and the affected component in `../components/`.

Before editing Next.js code, read the installed Next.js guide relevant to the API or convention being changed. Preserve the existing server-side tenant and owner authorization checks; a route parameter, store slug, or request header is not authorization.

When the change alters route behavior, access requirements, API contracts, or a page's dependencies, update the applicable focused guide and the project structure map in the same change.
