<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may differ from your training data. Before writing or changing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` and follow its current conventions and deprecation notices.
<!-- END:nextjs-agent-rules -->

# Libaas Online agent workflow

Use progressive disclosure. Start with the project map, then load only the instructions, documentation, and source for the area being changed. Do not scan the complete codebase or every guide for an ordinary task.

## Before changing code

1. Read [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) for the current product scope and project map.
2. Identify the owning area below and read its nearest `AGENTS.md`. Then open only the focused guide(s) it names.
3. Inspect the named implementation file and its direct dependencies. For a data or security change, inspect the relevant current migration and policies as well.
4. Treat source code and migrations as authoritative when they disagree with documentation.
5. For Next.js changes, consult the installed version's relevant guide in `node_modules/next/dist/docs/` before editing. For Supabase changes, follow the existing client, migration, and RLS patterns. Never expose a service-role key to browser code.

| Task area | Read next | Start with |
| --- | --- | --- |
| Page, route handler, or server action in `app/` | [`app/AGENTS.md`](app/AGENTS.md) | The target route and its direct component/data dependencies |
| Shared UI in `components/` | [`components/AGENTS.md`](components/AGENTS.md) | The target component and its calling page |
| Queries, Supabase clients, auth helpers, or shared utilities in `lib/` | [`lib/AGENTS.md`](lib/AGENTS.md) | The target module and the focused guide named there |
| Schema, RLS, database functions, or Supabase configuration | [`supabase/AGENTS.md`](supabase/AGENTS.md) | The relevant migration history and policy/function definition |
| Provisioning or maintenance script | [`scripts/AGENTS.md`](scripts/AGENTS.md) | The target script and its runtime/configuration dependencies |
| Documentation-only task | [`docs/AGENTS.md`](docs/AGENTS.md) | The guide whose stated behavior is changing |
| Tenant-host/proxy behavior | [`docs/tenant-routing.md`](docs/tenant-routing.md) | [`proxy.ts`](proxy.ts) and [`lib/supabase/middleware.ts`](lib/supabase/middleware.ts) |

## Keep documentation current

Documentation is part of the implementation. In the same change, update the smallest relevant guide whenever behavior, routes, APIs, security/data ownership, UI/component responsibilities, environment/setup, or project structure changes. Do not defer a known documentation update.

- Update the matching guide in [`docs/`](docs/README.md) with verified current behavior.
- Update [`docs/project-structure.md`](docs/project-structure.md) when adding, removing, moving, or changing the responsibility of a route, module, component, migration, or script.
- Update [`PROJECT_ARCHITECTURE.md`](PROJECT_ARCHITECTURE.md) when the high-level architecture, current scope, route map, or project map changes.
- Update [`docs/README.md`](docs/README.md) when adding, removing, or renaming a guide.
- Keep documentation concise, factual, and linked to source. Mark planned work as planned; do not describe it as implemented.

See [`docs/agent-workflow.md`](docs/agent-workflow.md) when creating or reorganizing agent instructions or documentation.

## Scope and verification

- Prefer the smallest change that satisfies the task and preserve existing conventions.
- Do not run tests, builds, linters, or other verification commands unless the user asks for verification. If requested, select the narrowest relevant command and report its result.
- Do not claim a behavior is implemented based only on a roadmap or stale documentation; verify it in source code and migrations.
