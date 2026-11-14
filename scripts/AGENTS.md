# Script instructions

Use this file for operational scripts. Read [`docs/development.md`](../docs/development.md) and [`docs/supabase-and-data-security.md`](../docs/supabase-and-data-security.md), then inspect the target script and the exact server-side module, configuration, or database objects it operates on.

Scripts that provision users or stores may use server-only credentials, but must never expose secrets to client code, logs, or documentation examples. Keep argument behavior and failure modes explicit.

Update the development guide, security guide, and project structure map in the same change when a script, required environment variable, setup workflow, or operational behavior changes.
