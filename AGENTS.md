<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may differ from your training data. Before writing or changing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` and follow its current conventions and deprecation notices.
<!-- END:nextjs-agent-rules -->

# Instructions for AI agents

## Before changing code

1. Read [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) for the current project map.
2. Open only the focused guide(s) in [`docs/`](docs/README.md) that apply to the task. Follow links from there to the relevant implementation files.
3. Inspect the current code and migrations before relying on documentation; the repository is authoritative when docs and implementation disagree.
4. For Next.js changes, consult the installed version's relevant guide in `node_modules/next/dist/docs/` before editing.
5. For Supabase changes, follow the repository's existing client, migration, and RLS patterns. Never expose a service-role key to browser code.

## Keep documentation current

Update the relevant guide in `docs/` in the same change whenever an implementation change affects documented behavior, routes, APIs, middleware/proxy behavior, data ownership/security, UI/component responsibilities, or project structure. Update `PROJECT_ARCHITECTURE.md` when the high-level architecture or project map changes. Update `docs/README.md` when adding, removing, or renaming a guide.

When adding a route, API endpoint, shared component, data-access module, migration, or other architectural building block, add it to the corresponding map. Keep documentation concise and factual: describe what exists today, distinguish planned work from implemented behavior, and link to source files instead of duplicating large code excerpts.

## Scope and verification

- Prefer the smallest change that satisfies the task and preserve existing conventions.
- Do not run tests, builds, or other verification commands unless the user asks for verification. If verification is requested, select the narrowest relevant command and report its result.
- Do not claim a behavior is implemented based only on a roadmap or stale documentation; verify it in source code and migrations.
