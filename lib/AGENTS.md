# Shared-library instructions

Use this file only for work under `lib/`. Inspect the target module and the direct caller before changing a shared abstraction. Select focused documentation instead of reading every guide:

| Target | Read | Inspect first |
| --- | --- | --- |
| `queries/` storefront reads | [`docs/supabase-and-data-security.md`](../docs/supabase-and-data-security.md), plus [`docs/tenant-routing.md`](../docs/tenant-routing.md) when slug/context changes | `queries/index.ts` and the calling server page |
| `supabase/` clients or session refresh | [`docs/supabase-and-data-security.md`](../docs/supabase-and-data-security.md) | The target client plus `proxy.ts` for middleware changes |
| `admin-auth.ts` or `supabase/admin.ts` | [`docs/supabase-and-data-security.md`](../docs/supabase-and-data-security.md) and [`docs/api-and-workflows.md`](../docs/api-and-workflows.md) | The target module and `app/admin/actions.ts` |
| Presentation/helper module | [`docs/ui-and-components.md`](../docs/ui-and-components.md) | The helper and each direct consumer being changed |
| Shared types | [`docs/project-structure.md`](../docs/project-structure.md) | `types/index.ts` and usage sites for the changed type |

Never move a server-only secret or service-role operation into browser-reachable code. When shared data access, tenant behavior, or a public type changes, update the focused guide and project structure map in the same change.
