# Development setup and commands

See [`README.md`](../README.md) for the quick start. This guide lists repository-specific local conventions.

## Environment

The app expects:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` for the store creation script only
- `TENANT_STORE_SLUG` optionally to force a tenant in local development

Never put the service-role key in a public/browser variable or client module.

Local Supabase Auth signup is disabled because stores are provisioned through the CLI. Hosted project Auth settings are separate and must also disable public signup if onboarding is intended to remain CLI-only.

## Package scripts

Defined in [`package.json`](../package.json):

- `npm run dev`: start the Next.js development server.
- `npm run build`: production build.
- `npm start`: serve a production build.
- `npm run lint`: run ESLint.
- `npm run format`: format repository files with Prettier.
- `npm run format:check`: check formatting.

Do not run verification commands unless the user asks for verification. When asked, choose the narrowest command that covers the change.

## Tenant testing

- Start the development server and visit `http://{slug}.localhost:3000` to exercise subdomain mode where the local browser/network supports it.
- Alternatively set `TENANT_STORE_SLUG={slug}` and use `http://localhost:3000` to force a tenant.
- Use an unset override when checking actual host parsing.

The exact host mapping and tenant headers are documented in [Tenant routing](tenant-routing.md).
