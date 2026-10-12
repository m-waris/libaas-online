# Documentation index

Use this page to choose the smallest guide relevant to a task. The source code and Supabase migrations are authoritative if a guide is out of date.

| Guide | Read when working on |
|---|---|
| [Project structure](project-structure.md) | Routes, modules, shared components, or deciding where a change belongs |
| [Tenant routing](tenant-routing.md) | `proxy.ts`, hostnames, store slugs, root-domain behavior, or tenant context |
| [API and workflows](api-and-workflows.md) | App routes, checkout API, cart/order flow, or request/response behavior |
| [Supabase and data security](supabase-and-data-security.md) | Supabase clients, auth, RLS, SQL schema, migrations, or order creation |
| [UI and components](ui-and-components.md) | Storefront/owner UI, client state, component responsibilities, or styling |
| [Frontend design brief](frontend-design.md) | Visual direction decisions and phased design plan mapped to the current architecture |
| [Development](development.md) | Environment setup, local tenant testing, or package scripts |

For the product idea and high-level architecture, start with [PROJECT_ARCHITECTURE.md](../PROJECT_ARCHITECTURE.md). Agent workflow and documentation maintenance rules are in [AGENTS.md](../AGENTS.md).

## Updating these guides

When a code change alters documented behavior, update the relevant guide in the same change. Add new routes, API endpoints, components, modules, or migrations to the corresponding map. Keep guides focused and link to implementation files rather than copying large sections of code.
