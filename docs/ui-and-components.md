# UI and component map

The app uses Next.js App Router pages. `app/layout.tsx` wraps all route content in `CartProvider`, so cart state is available across pages in the current app.

## Storefront components

- `components/storefront/cart-context.tsx`: client-side cart state, quantity mutations, localStorage persistence, and item count.
- `components/storefront/product-variant-selector.tsx`: variant selection and add-to-cart interaction on product details.
- `components/storefront/cart-client-page.tsx`: client cart page composition and cart item display.
- `components/storefront/cart-summary.tsx`: reusable cart summary/navigation UI.
- `components/storefront/checkout-form.tsx`: resolves cart details for display, collects customer data, posts to `/api/checkout`, and shows confirmation/error state.

Server pages load the current store and pass store/product data into client components when interactivity is required.

## Owner components

- `components/owner/login-form.tsx`: Supabase Auth sign-in form with tenant/store context.
- `components/owner/products-dashboard.tsx`: client UI to create products and variants, display product/variant inventory, and sign out.

`app/dashboard/products/page.tsx` performs the server-side user and owner-store checks before rendering the dashboard. Keep that access gate in place if the UI is reorganized.

## Current UI conventions

- Tailwind CSS utility classes are used directly in components; global styles live in `app/globals.css`.
- UI currency formatting currently uses `Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' })`.
- Cart data stores variant IDs and quantities; product names/prices are resolved for display. Final prices and stock are recalculated at checkout by the database RPC.
- Cart storage currently uses one localStorage key (`libaas-storefront-cart`). Browser storage is origin-scoped, so distinct tenant subdomains have separate storage. If changing tenant/cart boundaries or persistence, document the expected behavior and migration impact.

When adding a shared component, list its responsibility here and link it from the route that uses it in [Project structure](project-structure.md). Describe observable UI behavior, not every styling class.
