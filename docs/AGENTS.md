# Documentation instructions

Documentation records verified current behavior. For a documentation-only task, first inspect the implementation and relevant migration or configuration; never update a guide solely from a request, roadmap, or another guide.

Start at [`README.md`](README.md) and open only the guide that owns the changed behavior. Use the source links in that guide to verify details. Keep content concise, factual, and oriented to what an agent needs to locate and change safely.

- Put routes, modules, components, migrations, and scripts in [`project-structure.md`](project-structure.md).
- Put host parsing and tenant request context in [`tenant-routing.md`](tenant-routing.md).
- Put endpoints, payloads, workflows, authorization boundaries, and error behavior in [`api-and-workflows.md`](api-and-workflows.md).
- Put clients, data model, RLS, RPCs, secrets, and migration conventions in [`supabase-and-data-security.md`](supabase-and-data-security.md).
- Put component responsibilities and observable UI behavior in [`ui-and-components.md`](ui-and-components.md).
- Put environment and local operation details in [`development.md`](development.md).

Update [`README.md`](README.md) when the guide set changes, and update [`../PROJECT_ARCHITECTURE.md`](../PROJECT_ARCHITECTURE.md) when the high-level project map or current scope changes. See [`agent-workflow.md`](agent-workflow.md) before adding or reorganizing agent instructions.
