# UI and component map

The app uses Next.js App Router pages. `app/layout.tsx` wraps all route content in `CartProvider`, so cart state is available across pages in the current app.

Tenant catalog, product, cart, and checkout pages are wrapped in `components/storefront/storefront-shell.tsx`. Its shared `storefront-header.tsx` provides the store logo/name, product search, and live cart count; owner routes and platform admin pages do not use the storefront shell.

## Storefront components

- `components/storefront/cart-context.tsx`: client-side cart state, stable quantity mutation callbacks, localStorage persistence, and item count.
- `components/storefront/product-variant-selector.tsx`: variant selection and add-to-cart interaction on product details.
- `components/storefront/cart-client-page.tsx`: client cart page composition with editorial item rows, stock messaging, quantity controls, Cash on Delivery summary, and stale-item/load-error states.
- `components/storefront/cart-summary.tsx`: reusable cart summary/navigation UI.
- `components/storefront/checkout-form.tsx`: resolves active cart items within the current tenant, collects Pakistani customer details (including city plus delivery address), validates the customer phone format, posts to `/api/checkout`, and shows COD, loading/error, and confirmation states.
- `app/checkout/page.tsx`: presents a balanced checkout introduction with COD reassurance and cart/store navigation beside the heading before the guest order form.
- `components/storefront/storefront-shell.tsx`: applies validated tenant theme tokens around the storefront header, route content, and tenant footer.
- `components/storefront/storefront-header.tsx`: responsive tenant identity, catalog search form, and cart count navigation.
- `components/storefront/catalog-filters.tsx`: availability filters with compact desktop links and a mobile bottom sheet.
- `components/storefront/product-gallery.tsx`: selected product image, swipe and thumbnail navigation, position indicator, and zoom dialog.
- `components/ui/toast-provider.tsx`: app-wide top-center pill notifications for successful actions, informational updates, and errors, with individual dismiss controls and automatic dismissal.
- `components/ui/app-icon.tsx`: shared icon wrapper for the tree-shakeable Lucide set, with consistent light strokes and decorative icons hidden from assistive technology; action buttons keep their visible text labels.
- `lib/cloudinary-image.ts`: applies Cloudinary crop/size/automatic format and quality transformations only for `res.cloudinary.com` delivery URLs; other sources pass through unchanged.
- `lib/format-currency.ts`: shared customer-facing PKR formatter with no decimals.
- `lib/storefront-theme.ts`: accepts six-digit hex accent colors and safe HTTPS/local logo URLs from the public store config; selects a readable text color for the accent.

Server pages load the current store and pass store/product data into client components when interactivity is required. Owner overview uses a warm, restrained hero, store metrics, and direct catalog/order shortcuts. The product table scrolls horizontally on narrow screens; product creation, editing, and variant entry happen in keyboard-accessible dialogs.

## Owner components

- `components/admin/root-login-panel.tsx`: switches between the root store-owner portal and admin sign-in, with a link back to the public landing page.
- `components/owner/login-form.tsx`: Supabase Auth sign-in form with tenant/store context.
- `components/owner/store-owner-portal-link.tsx`: collects a store slug on the root login page and sends the browser to that store host before sign-in.
- `components/owner/owner-dashboard-shell.tsx`: shared store-branded dashboard navbar with flat section links, active underline, and integrated sign-out action.
- `components/ui/reveal.tsx`: optional once-only intersection reveal for nonessential marketing content; the server-rendered content remains visible when JavaScript or motion support is unavailable.
- `components/ui/tilt-card.tsx`: small pointer-driven perspective treatment, active only for fine hover pointers with reduced motion off; touch and reduced-motion layouts stay flat.
- `app/dashboard/page.tsx`: host-aware overview cards for platform store totals/recent stores or an owner's product and order counts with links to detailed pages.
- `components/owner/products-dashboard.tsx`: product inventory table with image, price, variant/stock details, and a three-dot row action popup; centered native dialogs for product create/edit and per-product variant creation, with a compact heading and independently scrolling form body so actions remain visible; selected product photo names appear in the upload picker; optimized photo upload, visibility toggle, and inline stock edits.
- `components/owner/orders-dashboard.tsx`: filter recent orders, inspect customer/order details, update allowed order statuses, and open a prefilled customer WhatsApp message.

Both dashboard server pages perform the server-side user and owner-store checks before rendering. Keep those access gates and corresponding RLS policies in place if the UI is reorganized. Product, variant, and image-record writes use authenticated sessions; owner policies constrain writes to owned records. Product photo uploads pass through an owner-checked route that stores optimized WebP images in the store's Cloudinary folder and inserts the resulting public URL through the same RLS-scoped session.

Root `/login` uses a distinct owner/admin mode switch and a centered desktop split composition; tenant `/login` remains a store-branded sign-in screen and uses the validated accent plus a wordmark fallback. Storefront shell styling applies the same neutral tokens to catalog, product, cart, and checkout surfaces. The platform landing uses the marketing-only reveal and tilt primitives; dashboard data views remain flat and restrained.

## Current UI conventions

- Tailwind CSS utility classes are used directly in components; global design tokens and shared shell styles live in `app/globals.css`.
- Root-domain visitors see the public platform landing page; its login page supports platform admin sign-in and routes store owners to their store host. Authenticated admins see the platform overview; tenant visitors see the catalog and authenticated owners see their store overview.
- Cart state is read from `localStorage` after hydration, then persisted, so server-rendered cart counts start consistently and existing carts are not overwritten during hydration.
- Storefront and owner prices use the shared `Rs 4,500` PKR format without decimals.
- The cart presents item rows beside a COD subtotal summary, stacking the summary below items on mobile.
- Cart data stores variant IDs and quantities; product names/prices/stock are resolved for display within the current tenant. Missing or inactive cart variants are pruned; load failures preserve the cart. Final prices and stock are recalculated at checkout by the database RPC.
- Customer prices use PKR with no decimals. The COD total is the item subtotal; delivery charges are not currently modeled. Checkout combines the separately entered city and address as labeled lines in the existing `customer_address` value.
- Cart, checkout, product/variant/inventory, order-status, and owner sign-in mutations report success or errors through the shared toast surface. Toasts are screen-reader announced and use a short transform/opacity entrance that is disabled for reduced motion.
- Lucide outline icons mark common navigation, product, stock, delivery, status, and feedback actions across storefront, owner, and platform admin views. Icons share a restrained stroke weight; labels remain visible, decorative icons are hidden from assistive technology, and loading spinners stop under reduced motion.
- Platform store create/update and root admin sign-in/sign-out query results also surface through the same toast system.
- Cart storage currently uses one localStorage key (`libaas-storefront-cart`). Browser storage is origin-scoped, so distinct tenant subdomains have separate storage. If changing tenant/cart boundaries or persistence, document the expected behavior and migration impact.

When adding a shared component, list its responsibility here and link it from the route that uses it in [Project structure](project-structure.md). Describe observable UI behavior, not every styling class.
