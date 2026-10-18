# UI and component map

The app uses Next.js App Router pages. `app/layout.tsx` wraps all route content in `CartProvider`, so cart state is available across pages in the current app.

Tenant catalog, product, cart, and checkout pages are wrapped in `components/storefront/storefront-shell.tsx`. Its shared `storefront-header.tsx` provides the store logo/name, product search, and live cart count; owner routes and platform admin pages do not use the storefront shell.

## Storefront components

- `components/storefront/cart-context.tsx`: client-side cart state, stable quantity mutation callbacks, localStorage persistence, and item count.
- `components/storefront/product-variant-selector.tsx`: variant selection and add-to-cart interaction on product details.
- `components/storefront/cart-client-page.tsx`: client cart page composition, current tenant product/variant details, quantity controls, and stale-item/load-error states.
- `components/storefront/cart-summary.tsx`: reusable cart summary/navigation UI.
- `components/storefront/checkout-form.tsx`: resolves active cart items within the current tenant, collects Pakistani customer details (including city plus delivery address), validates the customer phone format, posts to `/api/checkout`, and shows COD, loading/error, and confirmation states.
- `components/storefront/storefront-shell.tsx`: applies validated tenant theme tokens around the storefront header, route content, and tenant footer.
- `components/storefront/storefront-header.tsx`: responsive tenant identity, catalog search form, and cart count navigation.
- `components/storefront/catalog-filters.tsx`: availability filters with compact desktop links and a mobile bottom sheet.
- `components/storefront/product-gallery.tsx`: selected product image, swipe and thumbnail navigation, position indicator, and zoom dialog.
- `lib/cloudinary-image.ts`: applies Cloudinary crop/size/automatic format and quality transformations only for `res.cloudinary.com` delivery URLs; other sources pass through unchanged.
- `lib/format-currency.ts`: shared customer-facing PKR formatter with no decimals.
- `lib/storefront-theme.ts`: accepts six-digit hex accent colors and safe HTTPS/local logo URLs from the public store config; selects a readable text color for the accent.

Server pages load the current store and pass store/product data into client components when interactivity is required.

## Owner components

- `components/owner/login-form.tsx`: Supabase Auth sign-in form with tenant/store context.
- `components/owner/owner-dashboard-shell.tsx`: lightly store-branded owner navigation and sign-out shell shared by dashboard routes.
- `app/dashboard/page.tsx`: host-aware overview cards for platform store totals/recent stores or an owner's product and order counts with links to detailed pages.
- `components/owner/products-dashboard.tsx`: create products and variants, list inventory, toggle storefront visibility, and edit variant stock inline.
- `components/owner/orders-dashboard.tsx`: filter recent orders, inspect customer/order details, update allowed order statuses, and open a prefilled customer WhatsApp message.

Both dashboard server pages perform the server-side user and owner-store checks before rendering. Keep those access gates and corresponding RLS policies in place if the UI is reorganized. Product writes and order status changes use the authenticated browser session; owner policies constrain writes to owned records.

## Current UI conventions

- Tailwind CSS utility classes are used directly in components; global design tokens and shared shell styles live in `app/globals.css`.
- Root-domain visitors go to admin login and authenticated admins see the platform overview; tenant visitors see the catalog and authenticated owners see their store overview.
- Cart state is read from `localStorage` after hydration, then persisted, so server-rendered cart counts start consistently and existing carts are not overwritten during hydration.
- Storefront and owner prices use the shared `Rs 4,500` PKR format without decimals.
- Cart data stores variant IDs and quantities; product names/prices/stock are resolved for display within the current tenant. Missing or inactive cart variants are pruned; load failures preserve the cart. Final prices and stock are recalculated at checkout by the database RPC.
- Customer prices use PKR with no decimals. The COD total is the item subtotal; delivery charges are not currently modeled. Checkout combines the separately entered city and address as labeled lines in the existing `customer_address` value.
- Cart storage currently uses one localStorage key (`libaas-storefront-cart`). Browser storage is origin-scoped, so distinct tenant subdomains have separate storage. If changing tenant/cart boundaries or persistence, document the expected behavior and migration impact.

When adding a shared component, list its responsibility here and link it from the route that uses it in [Project structure](project-structure.md). Describe observable UI behavior, not every styling class.
