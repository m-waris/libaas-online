# Libaas Online

A **multi-tenant e-commerce platform** enabling small businesses to create and manage online storefronts via unique subdomains (e.g., `rifah.libaas.online`).

**[→ Full Architecture & Setup Guide](PROJECT_ARCHITECTURE.md)** ← Start here for detailed documentation

---

## 🎯 What Is This?

- **Multi-tenant SaaS**: Each store = independent storefront on its own subdomain
- **Superadmin controls**: Create stores & owners via CLI script
- **Store owners manage**: Products, variants, orders, inventory
- **Customers browse & buy**: View products, place orders
- **Secure by default**: Row-Level Security (RLS) isolates tenant data

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (`.env.local`)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### 3. Run Migrations
```bash
npx supabase migration up
```

### 4. Create a Test Store
```bash
node scripts/create-store.mjs \
  --slug test-store \
  --name "Test Store" \
  --email owner@example.com
```

### 5. Start Dev Server
```bash
npm run dev
```

**Visit:** `http://test-store.localhost:3000`

---

## 📋 Available Scripts

```bash
npm run dev       # Start dev server (http://localhost:3000)
npm run build     # Build for production
npm start         # Run production build
npm run lint      # Check code quality
npm run format    # Format code with Prettier
```

---

## 🏗️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 + React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Backend | Supabase (PostgreSQL + Auth) |
| Multi-Tenancy | Subdomain-based routing |
| Security | Row-Level Security (RLS) |

---

## 📁 Project Structure

```
app/                    # Next.js pages (storefront UI)
lib/                    # Utilities (Supabase clients, types, queries)
supabase/               # Database schema & migrations
scripts/                # CLI tools (create-store.mjs)
proxy.ts               # Subdomain routing
```

---

## 🔐 Security

- **RLS enforces**: Store owners see only their data; customers see only active products
- **Multi-tenant isolation**: `store_id` filters all queries
- **Service-role key**: Server-side only; never exposed to clients

---

## 🎯 Key Features (Roadmap)

✅ Multi-tenant infrastructure  
✅ Store creation (CLI)  
✅ Product management schema  
⬜ Admin dashboard  
⬜ Shopping cart  
⬜ Checkout & orders  
⬜ Payment processing  

**[→ See full roadmap](PROJECT_ARCHITECTURE.md#-to-do--future-features)**

---

## 📚 Documentation

- **[PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)** — Full system design, database schema, workflows, security details
- **[Next.js Docs](https://nextjs.org/docs)**
- **[Supabase Docs](https://supabase.com/docs)**

---

## 💡 Common Tasks

### Create a new store
```bash
node scripts/create-store.mjs --slug my-store --name "My Store" --email owner@example.com
```

### Test multi-tenant routing locally
Edit `/etc/hosts` (or `C:\Windows\System32\drivers\etc\hosts` on Windows):
```
127.0.0.1 store1.localhost
127.0.0.1 store2.localhost
```
Then visit `http://store1.localhost:3000`

### Debug tenant resolution
Add logs in `proxy.ts` to see which tenant slug is resolved.

---

## 📝 License

MIT

---

**Status:** Early Development (MVP Phase) · **Last Updated:** January 2026
