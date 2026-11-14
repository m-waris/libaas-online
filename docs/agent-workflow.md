# Agent workflow and documentation maintenance

The repository uses progressive disclosure so an agent can understand the relevant area without reading the full codebase or every guide. [`AGENTS.md`](../AGENTS.md) is the universal entry point; it requires the project map first, then routes each task to the nearest scoped instructions.

## Instruction hierarchy

| Scope | Instruction file | Use for |
| --- | --- | --- |
| Repository | [`AGENTS.md`](../AGENTS.md) | Every implementation task; project orientation and task routing |
| App Router | [`app/AGENTS.md`](../app/AGENTS.md) | Pages, route handlers, and server actions |
| Components | [`components/AGENTS.md`](../components/AGENTS.md) | Storefront, owner, and admin UI |
| Shared code | [`lib/AGENTS.md`](../lib/AGENTS.md) | Queries, Supabase clients, auth helpers, types, and utilities |
| Database | [`supabase/AGENTS.md`](../supabase/AGENTS.md) | Migrations, RLS, RPCs, and Supabase configuration |
| Scripts | [`scripts/AGENTS.md`](../scripts/AGENTS.md) | Provisioning and operational scripts |
| Documentation | [`docs/AGENTS.md`](AGENTS.md) | Documentation-only work and guide maintenance |

Scoped instruction files should link to the focused guide and likely entry-point files for their area. They should not duplicate implementation detail that belongs in source documentation or add broad rules that apply to the entire repository.

## Documentation synchronization

Every implementation change must include its matching documentation update when it changes documented behavior. Use this routing:

| Change | Update |
| --- | --- |
| Route, API, server action, payload, response, or workflow | `api-and-workflows.md`; also `project-structure.md` for new or moved building blocks |
| Host, subdomain, proxy, or tenant context | `tenant-routing.md`; also `PROJECT_ARCHITECTURE.md` for high-level flow changes |
| Schema, RLS, auth, secret boundary, migration, database function, view, trigger, or checkout contract | `supabase-and-data-security.md`; also API/structure guides where callers or maps change |
| Component responsibility or observable UI behavior | `ui-and-components.md`; also `project-structure.md` for additions, removals, or moves |
| Environment variable, script, setup, or local development behavior | `development.md`; also `project-structure.md` for a new/moved script |
| High-level product scope, route map, request/data flow, or directory map | `PROJECT_ARCHITECTURE.md` |
| Documentation-guide inventory | `docs/README.md` |

Verify the source before documenting it. If a feature is proposed or blocked, label it as planned rather than current behavior. Keep guides short and link to source instead of duplicating large code samples.

## Maintaining the workflow

Add a new scoped `AGENTS.md` only when a directory has distinct conventions, security boundaries, or documentation routing that the parent file cannot describe concisely. When adding one, link it from the root task table and this guide if it is a first-level area. Prefer improving a focused guide over putting feature-specific detail in an agent instruction file.
