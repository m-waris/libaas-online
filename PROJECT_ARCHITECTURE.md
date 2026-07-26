# Libaas Online - Project Architecture & Guide

## 🎯 Project Purpose

**Libaas Online** is a **multi-tenant e-commerce platform** designed to enable small businesses and entrepreneurs to create and manage their own online storefronts. Each store operates independently via a unique subdomain while sharing the same infrastructure, enabling cost-effective scalability.

**Key Vision:**
- Superadmin creates stores for shop owners via CLI script
- Shop owners manage their products, variants, and orders via their own storefront
- Customers browse and order products from individual storefronts
- All data is securely isolated through multi-tenant architecture with Row-Level Security (RLS)

---

## 🏗️ Architecture Overview

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | Next.js 16 + React 19 | Full-stack app with Server & Client components |
| **Styling** | Tailwind CSS 4 | Utility-first CSS framework |
| **Backend** | Supabase (PostgreSQL) | Database + Auth + RLS |
| **Authentication** | Supabase Auth | User management & session handling |
| **Multi-Tenancy** | Subdomain routing | Each store = unique subdomain (e.g., `rifah.libaas.online`) |
| **Type Safety** | TypeScript 5 | Full-stack type safety |
| **Linting** | ESLint 9 + Prettier | Code quality & formatting |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                  Browser / Client                    │
│  (Storefront UI - Products, Cart, Orders)            │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│         Next.js Proxy & App Router                  │
│  • Subdomain parsing (proxy.ts)                    │
│  • Multi-tenant context injection                   │
│  • Dynamic route resolution                         │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│    Next.js App (Server & Client Components)         │
│  • /app/page.tsx      → Storefront landing          │
│  • /app/layout.tsx    → Root layout + fonts         │
│  • Dynamic routes     → TBD (product detail, etc)   │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│         Supabase JavaScript SDK                     │
│  • lib/supabase/server.ts → Server-side client      │
│  • lib/supabase/client.ts → Browser client          │
│  • Automatic session management via SSR             │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│      PostgreSQL Database (Supabase)                 │
│  ├─ stores (multi-tenant root)                      │
│  ├─ products (with store_id FK)                     │
│  ├─ product_variants                                │
│  ├─ product_images                                  │
│  ├─ orders (customer orders)                        │
│  └─ order_items                                     │
│                                                      │
│  All tables use Row-Level Security (RLS) to ensure  │
│  data isolation per store & user.                   │
└──────────────────────────────────────────────────────┘
```

### Multi-Tenancy Strategy

**Subdomain-Based Routing:**
- Root domain: `libaas.online` (future: tenant marketplace/admin)
- Tenant domains: `{store-slug}.libaas.online` (e.g., `rifah.libaas.online`)
- Localhost support: `{store-slug}.localhost` for local development

**How It Works:**
1. **Proxy** (`proxy.ts`) intercepts every request
2. Extracts hostname from request headers
3. Resolves tenant slug from subdomain (e.g., `rifah` from `rifah.libaas.online`)
4. Injects `x-store-slug` header into request context
5. App components access slug via `headers().get("x-store-slug")`
6. All Supabase queries filtered by `store_id` (enforced by RLS)

---

## 📁 Directory Structure

```
libaas-online/
├── app/                        # Next.js App Router
│   ├── globals.css            # Global Tailwind styles
│   ├── layout.tsx             # Root layout (fonts, metadata)
│   └── page.tsx               # Storefront landing page (dynamic per store)
│
├── components/                # React components (empty, ready for expansion)
│   └── .gitkeep
│
├── lib/                       # Shared utilities & configurations
│   ├── queries/
│   │   └── index.ts          # Supabase data-access functions (TBD)
│   ├── supabase/
│   │   ├── client.ts         # Browser-side Supabase client
│   │   ├── server.ts         # Server-side Supabase client (SSR)
│   │   └── middleware.ts     # TBD - middleware helpers
│   └── types/
│       └── index.ts          # Shared TypeScript types (TBD)
│
├── supabase/                  # Supabase infrastructure
│   ├── config.toml           # Supabase project config
│   └── migrations/
│       ├── 20260711150000_initial_schema.sql    # Tables & schema
│       └── 20260711160000_rls_policies.sql      # Row-Level Security
│
├── scripts/
│   └── create-store.mjs       # CLI tool: Create new store + owner (superadmin only)
│
├── public/                    # Static assets (favicon, etc)
│   └── .gitkeep
│
├── proxy.ts                   # Next.js proxy (subdomain → store slug)
├── next.config.ts            # Next.js configuration
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── postcss.config.mjs        # PostCSS configuration
├── eslint.config.mjs         # ESLint rules
├── package.json              # Dependencies & scripts
├── README.md                 # Basic setup guide
└── PROJECT_ARCHITECTURE.md   # This file
```

---

## 🗄️ Database Schema

### Core Tables

#### `stores` (Multi-Tenant Root)
Represents each online storefront. One row per business.

```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,        -- "rifah" (used in subdomain)
  name TEXT NOT NULL,               -- "Rifah Collection"
  logo_url TEXT,                    -- Store logo URL
  theme_config JSONB,               -- Theme customization (colors, etc)
  owner_id UUID NOT NULL,           -- Reference to auth.users
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**RLS Policy:** Store owner can only access their own store.

---

#### `products`
Store inventory items.

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  store_id UUID NOT NULL,           -- Foreign key to stores
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC(12, 2),        -- Starting price (may be overridden by variant)
  is_active BOOLEAN,                -- Published on storefront?
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**RLS Policy:** Store owner can manage their own products; customers see only active products from their store.

---

#### `product_variants`
Product options (size, color) with independent pricing & stock.

```sql
CREATE TABLE product_variants (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL,         -- Foreign key to products
  size TEXT,                        -- Optional: "Small", "Medium", "Large"
  color TEXT,                       -- Optional: "Red", "Blue"
  stock_count INTEGER,              -- Inventory
  price_override NUMERIC(12, 2),    -- Use instead of product.base_price if set
  sku TEXT NOT NULL UNIQUE          -- SKU per variant
);
```

---

#### `product_images`
Images for each product (multiple images per product).

```sql
CREATE TABLE product_images (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL,
  url TEXT NOT NULL,                -- Image URL
  sort_order INTEGER                -- Display order in storefront
);
```

---

#### `orders`
Customer orders (one per checkout).

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  store_id UUID NOT NULL,           -- Which store?
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  notes TEXT,
  status order_status ENUM,         -- 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'
  total_amount NUMERIC(12, 2),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**RLS Policy:** Store owner can view/manage orders for their store; customers can view their own orders.

---

#### `order_items`
Line items for each order.

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL,           -- Foreign key to orders
  product_variant_id UUID NOT NULL, -- Foreign key to product_variants
  quantity INTEGER NOT NULL,
  price_at_purchase NUMERIC(12, 2)         -- Price at time of order
);
```

---

### Security: Row-Level Security (RLS)

**All tables are protected by RLS policies** that enforce:

1. **Store Owners** can only access their own store's data (products, orders)
2. **Customers** can only see active products and their own orders
3. **Service Role** (server-side scripts) bypasses RLS for admin operations

**Key RLS Helper Functions:**
- `is_store_owner(store_id)` — Check if user owns a store
- `user_owns_product(product_id)` — Check if user owns the store that owns this product
- `user_owns_order(order_id)` — Check if user owns the store that received this order
- `is_storefront_product(product_id)` — Check if product is published (`is_active = true`)

---

## 📄 Key Files & Their Purpose

### `proxy.ts`
**Purpose:** Route requests to the correct tenant based on subdomain.

**Flow:**
1. Extract hostname from request
2. Normalize hostname (lowercase, remove port)
3. Check if it matches root domain (`libaas.online`), localhost, or a tenant subdomain
4. Resolve tenant slug (e.g., `rifah` from `rifah.libaas.online`)
5. Inject `x-store-slug` and `x-tenant-mode` headers
6. Pass request through

**Key Functions:**
- `resolveTenantSlug(hostname)` — Parse subdomain
- `normalizeHostname(host)` — Sanitize hostname

---

### `app/page.tsx`
**Purpose:** Dynamic storefront landing page (different content per store).

**How It Works:**
1. Read `x-store-slug` header from proxy
2. If no slug, return 404 (no store found)
3. Query Supabase:
   - Fetch store details (`stores` table)
   - Fetch active products (`products` table where `is_active = true`)
   - Fetch product variants & images
4. Render storefront with store name, logo, products, and prices

**Key Data Fetched:**
```typescript
type StoreRecord = {
  id: string;
  slug: string;
  name: string;
  logo_url?: string;
  theme_config?: Record<string, unknown>;
};

type ProductRecord = {
  id: string;
  name: string;
  description?: string;
  base_price: number;
  is_active: boolean;
};

type VariantRecord = {
  id: string;
  product_id: string;
  size?: string;
  color?: string;
  stock_count: number;
  price_override?: number;
  sku: string;
};
```

---

### `scripts/create-store.mjs`
**Purpose:** CLI tool for superadmin to onboard new stores.

**Usage:**
```bash
node scripts/create-store.mjs \
  --slug my-store \
  --name "My Store Name" \
  --email owner@example.com \
  --password "TempPass123!" \
  --theme-json '{"primaryColor":"#111827"}' \
  --base-url "https://app.libaas.online"
```

**What It Does:**
1. Validates CLI arguments
2. Creates Supabase auth user (store owner)
3. Creates store record with owner_id
4. Prints handoff details (login URL, email, temp password, store URL)

**Environment Variables Required:**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Server-only admin key (never expose to client)

---

### `lib/supabase/server.ts`
**Purpose:** Server-side Supabase client for SSR operations.

**Usage in Server Components:**
```typescript
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();
const { data, error } = await supabase
  .from("stores")
  .select("*")
  .eq("slug", slug)
  .single();
```

---

### `lib/supabase/client.ts`
**Purpose:** Browser-side Supabase client for Client Components & frontend.

**Usage in Client Components:**
```typescript
"use client";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const { data, error } = await supabase.auth.getUser();
```

---

### `supabase/migrations/*.sql`
**Purpose:** Database schema versioning.

- **20260711150000_initial_schema.sql** — Core tables, indexes, triggers
- **20260711160000_rls_policies.sql** — Row-Level Security policies

Migration runs automatically when deploying to Supabase.

---

## 🔄 Key Workflows

### 1️⃣ Superadmin Creates a Store

**Actor:** Superadmin (via CLI)

```bash
node scripts/create-store.mjs --slug rifah --name "Rifah Collection" --email owner@rifah.example.com
```

**Steps:**
1. Script creates auth user in Supabase (`rifah@example.com`)
2. Script creates `stores` record with `slug='rifah'` and `owner_id=<uid>`
3. Script prints:
   - Login URL: `http://localhost:3000/login`
   - Email & temporary password
   - Store URL: `https://rifah.libaas.online`

**Result:** Store owner can now log in and manage their store.

---

### 2️⃣ Store Owner Logs In & Adds Products

**Actor:** Store owner

**Flow:**
1. Owner visits `https://rifah.libaas.online/login` (TBD: not yet implemented)
2. Logs in with email & password
3. Navigates to product dashboard (TBD)
4. Adds product:
   - Name, description, base price
   - Product images
   - Variants (size/color options with SKUs & prices)
5. Publishes product (`is_active = true`)

**Data Flow:**
- All writes go through Supabase SDK
- RLS enforces: user can only create products for their store (`owner_id = auth.uid()`)

---

### 3️⃣ Customer Visits Store Storefront

**Actor:** Customer (anonymous or logged in)

**Flow:**
1. Customer visits `https://rifah.libaas.online`
2. Proxy resolves `store_slug='rifah'`
3. App fetches:
   - Store details
   - Active products
   - Variants & images
4. Storefront renders with products
5. Customer adds items to cart (TBD: cart logic)
6. Customer checks out & places order (TBD)

**Data Flow:**
- All reads are unauthenticated (or authenticated if customer logged in)
- RLS enforces: customers see only active products from this store
- No access to owner's admin data or other stores

---

### 4️⃣ Store Owner Views Orders

**Actor:** Store owner

**Flow:**
1. Owner logs in
2. Navigates to order dashboard (TBD)
3. Views all orders for their store
4. Updates order status (pending → confirmed → shipped → delivered)

**Data Flow:**
- RLS enforces: owner can only view orders from their store
- Service role (admin script) can view all orders

---

## 🔐 Security & Multi-Tenancy

### Row-Level Security (RLS)

Every query is automatically filtered by RLS policies:

```sql
-- Example: Store owners can only see their own products
CREATE POLICY "Store owners can see their products"
  ON products
  FOR SELECT
  USING (public.is_store_owner(store_id));

-- Example: Customers can only see active products
CREATE POLICY "Customers see active products"
  ON products
  FOR SELECT
  USING (is_active = true);
```

### Isolation Guarantees

| User Type | Can Access | Cannot Access |
|-----------|-----------|-------------|
| **Store Owner (rifah)** | Their store's products, orders, customers | Other stores' data |
| **Store Owner (other)** | Their own store's data | Other stores' data |
| **Customer** | Active products from any store, their own orders | Admin data, other customers' orders |
| **Superadmin (service-role)** | All data (RLS bypassed) | N/A |

### Service-Role Key Usage

The `SUPABASE_SERVICE_ROLE_KEY` is used **only on the server**:
- Never exposed to browser / client
- Used in `scripts/create-store.mjs` to bypass RLS
- Used by server components/proxy when admin operations are needed

**Environment Setup:**
```bash
# .env.local (development)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc... (public, safe to expose)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (secret, server-only!)
```

---

## 📦 Dependencies

### Production
- **next** (16.2.10) — React framework
- **react** (19.2.4) — UI library
- **react-dom** (19.2.4) — React rendering
- **@supabase/ssr** (0.12.0) — Supabase for Next.js SSR
- **@supabase/supabase-js** (2.110.2) — Supabase SDK

### Development
- **typescript** (5) — Type safety
- **tailwindcss** (4) — Styling
- **eslint** (9) — Linting
- **prettier** (3.9.5) — Code formatting
- **@tailwindcss/postcss** (4) — Tailwind integration

---

## 🚀 Getting Started

### Prerequisites
1. Node.js 18+
2. Supabase account & project
3. Git

### Local Setup

1. **Clone & install:**
   ```bash
   git clone <repo>
   cd libaas-online
   npm install
   ```

2. **Set environment variables** (`.env.local`):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   TENANT_STORE_SLUG=  # Optional: hardcode store for dev
   ```

3. **Run database migrations:**
   ```bash
   npx supabase migration up
   ```

4. **Create a test store:**
   ```bash
   node scripts/create-store.mjs \
     --slug test-store \
     --name "Test Store" \
     --email test@example.com
   ```

5. **Start dev server:**
   ```bash
   npm run dev
   ```

6. **Visit:**
   - Storefront: `http://test-store.localhost:3000`
   - Or set `TENANT_STORE_SLUG=test-store` and visit `http://localhost:3000`

---

## 📋 To-Do / Future Features

### Core Features (Planned)
- [ ] **Authentication UI** — Login/signup pages
- [ ] **Store Admin Dashboard** — Manage products, orders, settings
- [ ] **Product Management** — CRUD for products & variants
- [ ] **Shopping Cart** — Add to cart, cart management
- [ ] **Checkout Flow** — Order creation, payment integration
- [ ] **Order Management** — Track orders, update status
- [ ] **Customer Accounts** — Customer registration & order history
- [ ] **Inventory Management** — Stock tracking, low stock alerts
- [ ] **Store Customization** — Theme editor, logo upload
- [ ] **Search & Filtering** — Product search, category filters
- [ ] **Reviews & Ratings** — Customer feedback

### Infrastructure (Planned)
- [ ] **Image Storage** — Supabase Storage for product images
- [ ] **Email Notifications** — Order confirmations, status updates
- [ ] **Payment Integration** — Stripe, PayPal, etc.
- [ ] **Analytics** — Sales, traffic, customer insights
- [ ] **Bulk Operations** — Import/export products
- [ ] **API** — Public API for integrations
- [ ] **Mobile App** — React Native app
- [ ] **CDN** — Global content delivery

---

## 📚 Useful Resources

- **Next.js Docs:** https://nextjs.org/docs
- **Supabase Docs:** https://supabase.com/docs
- **Tailwind CSS:** https://tailwindcss.com
- **React 19 Docs:** https://react.dev
- **TypeScript:** https://www.typescriptlang.org/docs

---

## 👨‍💻 Development Tips

### Local Multi-Tenant Testing

Test subdomain routing locally with different slugs:

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test different storefronts
curl -H "Host: rifah.localhost:3000" http://localhost:3000
curl -H "Host: other-store.localhost:3000" http://localhost:3000

# Or edit /etc/hosts (macOS/Linux) or C:\Windows\System32\drivers\etc\hosts (Windows)
127.0.0.1 rifah.localhost
127.0.0.1 other-store.localhost
# Then visit http://rifah.localhost:3000
```

### Debugging Tenant Resolution

Add debug logs in `proxy.ts`:

```typescript
console.log("Host:", host);
console.log("Hostname:", hostname);
console.log("Resolved slug:", tenantSlug);
console.log("Tenant mode:", overrideSlug ? "override" : "subdomain");
```

### Database Exploration

Query Supabase directly:

```bash
# List all stores
npx supabase db push  # Apply migrations first
supabase functions invoke query-stores  # TBD
```

---

## 📞 Contact & Support

For questions or issues:
1. Check this documentation
2. Review database schema comments (SQL migrations)
3. Check existing GitHub issues
4. Create a new issue with details

---

**Last Updated:** January 2026  
**Project Status:** Early Development (MVP Phase)
