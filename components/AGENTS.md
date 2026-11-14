# Component instructions

Use this file only for work under `components/`. Read [`docs/ui-and-components.md`](../docs/ui-and-components.md), then inspect the target component, its direct caller, and only the shared state or utility it uses. Do not inventory unrelated components.

- For `storefront/`, inspect the owning storefront page and, when tenant or cart behavior changes, the specific related module in `../lib/` or sibling component.
- For `owner/` or `admin/`, inspect the owning dashboard/login page and the specific auth or data-access module it invokes.
- Keep server-side authorization in pages, routes, RLS, or trusted server logic; client components may improve interaction but must not become the authorization boundary.
- Reuse current styling and state patterns. Before changing a component's client/server boundary, read the installed Next.js guidance that applies.

Update [`docs/ui-and-components.md`](../docs/ui-and-components.md) and [`docs/project-structure.md`](../docs/project-structure.md) whenever a component is added, removed, gains a materially different responsibility, or changes observable UI behavior.
