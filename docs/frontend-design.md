# Frontend design brief

This document is the source of truth for frontend visual and interaction design decisions. Update it as decisions are made and when the implemented design changes. Keep architecture and route ownership in [Project Architecture](../PROJECT_ARCHITECTURE.md); this guide describes the intended experience and design system.

## Design goals

- Make independent fashion stores feel recognizable while keeping shopping familiar across tenants.
- Make browsing, choosing a variant, adding to cart, and placing an order clear on small screens.
- Give store owners an efficient interface for their current product and inventory tasks.
- Keep customer-facing design aligned with what the platform and database currently support.
- Preserve tenant boundaries and the existing route, data, and authorization responsibilities.

## Agreed product direction

### Storefront identity

- The storefront should feel editorial, confident, image-led, smooth, trustworthy, local, and mobile-first.
- Use a warm neutral platform base (off-white, charcoal, soft sand) and restrained store-specific accents. Product photography, whitespace, and typography should provide the visual emphasis.
- Use an expressive serif/display face for headings and a clear sans-serif for body and controls. Support Urdu-script customer content through the font stack even though the initial interface copy is Roman Urdu and English.
- Give each tenant a distinct identity through its logo or text wordmark, store name, and controlled theme accent. Avoid making separate stores feel like platform sub-brands with different navigation patterns.
- Avoid cluttered marketplace patterns, neon sale colors, heavy shadows, generic template styling, and motion that delays shopping.

### Storefront shopping priorities

1. Fast product scanning in a consistent, image-led grid. Keep card copy to product name and PKR price, with a clear textual stock state.
2. Make COD, delivery information, prices, sizes, and a WhatsApp contact action easy to find on product detail pages.
3. Make product detail more immersive with a swipeable image gallery, smooth variant selection, and optional zoom.
4. Keep promotions restrained: sale price, strikethrough previous price, and a small sale label only.

Product images are expected to vary in quality, orientation, lighting, and count. Use a consistent 4:5 catalog frame with deliberate cropping, compressed responsive images, lazy loading, and a graceful missing-image treatment. Product detail can show the full image with gallery/zoom where available. A seller photo guide should recommend natural light, a plain background, and three angles. Treat store logos as optional and use a text wordmark fallback.

**Image provider:** use Cloudinary for product image storage/delivery and responsive transformations. The owner upload flow should offer a 4:5 crop preview while preserving the original; storefront derivatives should request appropriately sized, quality/format-optimized images. Before upload implementation, define server-side upload authorization, tenant-scoped asset identifiers, allowed file types/size, and deletion behavior. Cloudinary secrets must remain server-side. No image upload behavior is implemented yet.

### Audience, devices, and performance

- Primary audience: Pakistani shoppers around 18–40, often arriving from Instagram, Facebook, or a WhatsApp share to a local seller.
- Design first for a 360px-wide mid-range or budget Android phone; desktop is secondary.
- Expect variable 4G/3G, weak signal, and interrupted sessions. Prioritize compressed WebP/AVIF, lazy images, skeletons, small JavaScript bundles, resilient cart persistence, and fast perceived response.
- Motion should be short, purposeful, lightweight on weak hardware, and disabled or reduced under `prefers-reduced-motion`.

### Locale, tone, and copy

- Initial currency is PKR, rendered without decimals (for example, `Rs 4,500`). Multi-currency is out of scope for v1. Storefront and owner dashboards use the shared PKR formatter.
- Storefront language is friendly Roman Urdu mixed naturally with common English commerce terms such as cart, size, order, delivery, WhatsApp, and sale. Address shoppers as “aap”. Keep spelling consistent (for example, “karein”, “se”, “hain”).
- Use playful, Gen Z-friendly language for headings, empty states, buttons, and successful moments. Use plain, unambiguous language for prices, sizes, stock, delivery, COD totals, and checkout-blocking errors. No jokes or emoji in blocking errors; emoji are light and mainly for success or sold-out moments.
- Owner admin copy uses simple Roman Urdu and English with a calm, work-focused tone. Keep jokes and slang out of owner workflows.
- English-only product/platform copy is not the target direction. Urdu script and Roman Urdu must still render correctly in user-provided product names, addresses, and notes. Full Urdu translation and right-to-left interface support are deferred beyond v1.
- Keep customer-facing strings centralized (planned `lib/copy.ts`) so spelling and tone stay consistent and a later plain-English option is possible.

Sample storefront copy:

| Moment          | Copy                                                            |
| --------------- | --------------------------------------------------------------- |
| Browse CTA      | Chalo, kuch acha sa dhoondte hain                               |
| Buy             | Abhi khareedo                                                   |
| Add to cart     | Cart mein daalo                                                 |
| Empty cart      | Cart khali hai! Kuch pasand aaye to cart mein daal dein.        |
| Size selector   | Apna size chunein                                               |
| Out of stock    | Ye wala sold out ho gaya 😭                                     |
| Low stock       | Sirf 2 bachay hain, jaldi karein                                |
| City            | Aap kahan se hain?                                              |
| Address         | Delivery kahan karni hai?                                       |
| COD explanation | Cash on Delivery: maal aaye, phir paisay dein                   |
| Checkout intro  | Bas thori si details, aur order aap ka!                         |
| Order confirmed | Order place ho gaya! 🎉 Seller jald WhatsApp par confirm karega |

Have a native Roman Urdu speaker review final copy before release.

### Accessibility and navigation

- Minimum 44px touch targets, comfortable thumb spacing, body text of at least 16px, strong contrast, visible focus, labeled fields, and meaningful product-image alt text.
- Never communicate stock state by color alone.
- Keep a simple top bar with store identity, search, and cart count. Put mobile filters in a bottom sheet or drawer rather than a desktop-style sidebar.
- Keep the product-page add-to-cart and WhatsApp actions sticky and visible on mobile. Aim for no more than two taps from landing to product and three from product to checkout.
- Checkout is guest-only: short customer details, Pakistani phone formats (`03XX-XXXXXXX` or `+92`), visible COD and total before order submission, and actionable errors such as “Sorry, ye size abhi available nahi. Koi aur size try karein?”
- Order confirmation should offer an “Open WhatsApp” action with a prefilled message to the seller.

### First-pass design tokens

These are starting values for the platform layer, not locked brand colors. Tenant accents can override the accent token after contrast validation. Keep the neutral base stable across stores.

| Token             | Initial value         | Use                                               |
| ----------------- | --------------------- | ------------------------------------------------- |
| Canvas            | `#F7F5F1`             | Warm page background                              |
| Surface           | `#FFFFFF`             | Product cards, forms, sheets                      |
| Ink               | `#25211E`             | Primary text and high-contrast controls           |
| Muted text        | `#716960`             | Secondary metadata                                |
| Border            | `#E7E0D7`             | Quiet separators and control outlines             |
| Sand              | `#D6C7B8`             | Low emphasis decorative/secondary surfaces        |
| Accent fallback   | `#39332E`             | Neutral fallback when a store has no valid accent |
| Sale surface/text | `#F3E5DF` / `#6B3E36` | Restrained sale label                             |

- **Typography:** editorial serif/display face for headings, clean sans for interface/body, and an Urdu-script-capable fallback for user-generated content. Prefer self-hosted/local font assets to keep rendering reliable on weak networks; exact font files remain to be chosen.
- **Type scale:** body and form text 16px minimum; product name 16–18px; price 18px; secondary labels 14px minimum; mobile page heading about 32px and desktop about 48px.
- **Layout:** 16px mobile page gutter, 32–40px desktop gutter, content max width around 1280px; two product columns at 360px with 12px gap, expanding to four columns on wide screens with 20–24px gaps.
- **Controls:** 44px minimum touch targets (prefer 48px for primary actions); 10–12px control/card radius; avoid excessive pills and nested cards.
- **Motion:** 160–240ms for feedback and panel transitions, with restrained easing. Add-to-cart may use a brief spring-like scale/confirmation; avoid layout shifts and long entrance animations. Honor reduced-motion preferences.
- **Dynamic accent safety:** validate tenant accent contrast and choose a legible foreground. Do not use accent color alone to indicate stock, selection, or errors.

### WhatsApp actions (required behavior, planned for implementation)

WhatsApp is a working contact and order-coordination path, not a decorative CTA. Keep it in these places:

- **Product detail:** visible contact action in the product information area and persistent mobile action bar. Open the store's WhatsApp destination with a prefilled product/variant inquiry. Keep Add to cart as a separate action that uses the site's COD checkout.
- **Checkout confirmation:** offer “WhatsApp par baat karein” / “Open WhatsApp” to send the seller an order-confirmation message after the site has recorded the order.
- **Owner order detail:** the orders interface offers “Message customer on WhatsApp” to the customer phone with a prefilled confirmation.

All actions must open a valid WhatsApp deep link with a correctly encoded destination and message; the UI must not imply that a WhatsApp handoff created or confirmed an order. The current `stores` schema has no WhatsApp destination field, so the product CTA and owner settings need a data/API decision before implementation. Use the saved store contact for seller-directed messages and the order's validated customer phone for owner-directed messages.

## Initial screen blueprints

These are the first design targets. They describe content order and behavior; detailed visual tokens are resolved in Phase 0 and then applied consistently.

### Tenant catalog — `/`

1. Compact top bar: store logo or text wordmark, search action/input, cart icon and item count.
2. Optional small store intro/collection heading; keep the first product row close to the top on mobile.
3. Mobile filter/sort trigger opens a bottom sheet; desktop may use a compact horizontal control row.
4. Consistent two-column 4:5 product grid at 360px; image first, then short name, PKR price/sale price, and textual stock state. Keep badges to sale only.
5. Skeleton card grid while data loads; restrained empty-store and no-results states.

### Product detail — `/products/[id]`

1. Swipeable product gallery with thumbnails/position indicator where useful; preserve a clear path to zoom.
2. Name, PKR price and sale treatment, explicit stock text, and size/color choices in a scan-friendly order.
3. Delivery/COD reassurance and store contact action near the purchase controls.
4. Sticky bottom actions on mobile: Add to cart and WhatsApp contact, with safe-area padding and no overlap with browser controls.
5. Add-to-cart gives quick tactile feedback without blocking continued browsing; unavailable sizes have clear disabled states and text.

### Cart and guest COD checkout — `/cart`, `/checkout`

1. Cart rows prioritize thumbnail, name/variant, price, quantity controls, and remove; show a clear subtotal.
2. Checkout is a short single-column form, with customer name, phone, city, address, optional notes, and a persistent order total/COD label.
3. On narrow phones, actions remain reachable and the keyboard does not obscure the active field or submit action.
4. Success state confirms the order was submitted and presents the seller WhatsApp follow-up. Validation and stock errors explain what the shopper can do next.

### Store-branded login — `/login`

Use the store logo or text wordmark, store name, theme accent, and a focused sign-in form. Wrong-tenant session recovery should remain clear and calm. Keep the page branded without turning it into a storefront or exposing other stores.

### Owner admin — `/dashboard/*` (future route expansion)

Use a consistent admin shell across tenants, with store identity and a limited accent in the header. On mobile, put primary navigation in a compact menu/bottom navigation and make order status actions one-tap and thumb reachable. Orders should become the daily landing view when the orders route exists; the current route remains product management until then.

### Libaas Online root landing page — root domain only

Create a simple platform sales page: confident hero and one-line pitch, a few feature highlights, and contact/WhatsApp CTA. Do not show a store directory. Keep this platform page visually related to the storefront system while making it clear it is not a tenant shop.

## Architecture-aligned design phases

Work through these phases in order. Resolve the relevant open decisions before implementing a phase. A phase may be revisited when research or implementation reveals a needed change.

### Phase 0 — Design direction and constraints (direction agreed; token values provisional)

**Architecture context:** `PROJECT_ARCHITECTURE.md`, `docs/ui-and-components.md`, `app/globals.css`, `app/layout.tsx`.

**Design status:** product direction, audience, visual references, copy tone, accessibility goals, and tenant-branding approach are agreed and recorded below. Initial neutral tokens are drafted; exact font assets and contrast-safe tenant accent behavior remain implementation refinements. Separate platform-wide design tokens from store-specific brand values.

**Deliverables:** approved design principles, visual direction, initial tokens, typography and imagery rules, and explicit out-of-scope items.

### Phase 1 — Shared shell and tenant-aware foundations

**Architecture context:** `proxy.ts`, `app/layout.tsx`, `app/page.tsx`, `lib/queries/index.ts`, `components/storefront/cart-context.tsx`.

**Design:** root-domain versus tenant storefront entry, tenant header/navigation/footer, responsive container and spacing rules, store identity, loading/empty/error states, cart access, and a simple Libaas Online sales landing page (hero, one-line pitch, feature highlights, contact/WhatsApp CTA; no public store directory). Define how store theme data maps to a safe, constrained visual theme.

**Guardrails:** host-based tenant resolution remains authoritative; do not imply that tenant theme values affect authorization or data scope. Cart behavior remains origin/tenant aware.

**Deliverables:** shared storefront shell, responsive navigation behavior, tenant-brand application rules, and shell state designs.

**First implementation pass:** `StorefrontShell` now wraps tenant catalog, product, cart, and checkout routes; owner login/dashboard remain separate. The shared header shows the store logo/name, a GET catalog search, and hydrated cart count. Public theme handling accepts a six-digit `primaryColor` and safe logo URL, with a contrast-selected foreground and neutral fallback. The root route now has a platform landing page separate from tenant catalogs. Configure optional server-only `PLATFORM_WHATSAPP_NUMBER` to activate its WhatsApp contact CTA; without it, the CTA stays on-page. Phase 1 is started; verify and refine the design on real mobile/desktop viewports before considering it complete.

### Phase 2 — Catalog and product discovery

**Architecture context:** `app/page.tsx`, `app/products/[id]/page.tsx`, `components/storefront/product-variant-selector.tsx`, `lib/queries/index.ts`.

**Design:** catalog hierarchy, fast-scanning product card, fixed 4:5 image frame, restrained sale treatment, stock text, mobile filter drawer, product detail gallery/zoom, variant selection, persistent mobile add-to-cart and WhatsApp actions, and add-to-cart feedback. Define no-store, empty-catalog, unavailable-product, and missing-image states. Keep customer order submission in the existing checkout flow; a product WhatsApp action is for direct seller contact.

**Deliverables:** catalog and product-detail layouts, component states, image guidance, and mobile/desktop behavior.

**First implementation pass:** the catalog now has consistent 4:5 cards, PKR prices, Roman Urdu browse/empty copy, stock text, and a mobile availability filter sheet. Cloudinary-hosted product images receive crop/size, automatic format, and quality delivery transforms; other remote HTTPS image sources are left unchanged. Product detail now has selectable thumbnails, swipe navigation, a photo count, and a zoom overlay, plus variant selection and a sticky mobile add-to-cart action. WhatsApp placement remains planned and must become a working seller contact action when its destination data is available; it is not represented as working yet. Sale treatment is omitted because the current product model has no sale price. Phase 2 implementation is started; responsive/accessibility review remains part of Phase 5.

### Phase 3 — Cart and checkout

**Architecture context:** `app/cart/page.tsx`, `app/checkout/page.tsx`, `app/api/checkout/route.ts`, `components/storefront/cart-client-page.tsx`, `components/storefront/cart-summary.tsx`, `components/storefront/checkout-form.tsx`, `components/storefront/cart-context.tsx`.

**Design:** cart editing/removal, subtotal and stock messaging, checkout form hierarchy, validation, submission/loading states, success confirmation with a prefilled WhatsApp follow-up, recoverable errors, and empty cart. Checkout is guest-only and COD. No online payment or customer accounts. The target checkout includes name, Pakistani phone, city, address, and optional notes. The current schema has one `customer_address` field; for v1 the UI stores city and address as labeled lines in that field. Delivery fee display/calculation still needs a product decision because current checkout totals are item totals only.

**Deliverables:** end-to-end shopping flow, form and feedback states, keyboard behavior, and small-screen checkout layout.

**First implementation pass:** cart and checkout now use the PKR formatter, Roman Urdu customer copy, clearer variant labels, touch-sized quantity controls, and unavailable-cart cleanup. Checkout scopes preview product reads to the active current-store product, validates Pakistani mobile number formats in the interface, and collects city separately from street address while composing both into the existing `customer_address` field. The summary labels Cash on Delivery and states that delivery charges are not included in the item total. The mobile checkout bar keeps the COD total and submit action visible. Existing `/api/checkout` and database RPC contracts remain unchanged. A seller WhatsApp confirmation action is still pending the store contact field; the success page does not claim that a WhatsApp message was sent. City is stored as labeled text in the existing address field; a dedicated city column would require a later schema/API migration.

### Phase 4 — Owner sign-in and dashboard

**Architecture context:** `app/login/page.tsx`, `app/dashboard/products/page.tsx`, `app/dashboard/orders/page.tsx`, `components/owner/login-form.tsx`, `components/owner/owner-dashboard-shell.tsx`, `components/owner/products-dashboard.tsx`, `components/owner/orders-dashboard.tsx`.

**Design:** store-branded login with store logo/name/accent; a consistent admin experience lightly accented by that store's identity. Beyond the existing product/variant work, the requested future workflows are: orders list with newest pending first and status filters; one-tap status updates (`Pending → Confirmed → Shipped → Delivered`, or `Cancelled`); order detail with a prefilled WhatsApp action; inline stock and active/inactive controls; phone-photo upload with crop; and basic store name/logo/WhatsApp settings.

**Architecture dependencies:** the database has the five order statuses and owner-scoped order RLS. `stores` has logo and JSON theme config but no WhatsApp contact field or settings UI. Product image URLs are represented in `product_images`, but there is no upload/crop flow or storage configuration represented in the current component map. City is not a separate order column. Analytics, customer accounts, bulk import, and advanced reporting remain out of scope.

**First implementation pass:** login is branded with the current store identity and safe accent. Products and orders share a lightly branded admin shell. Product and variant creation remain available; owners can toggle product visibility and edit stock inline. The orders page lists up to 100 recent tenant-owned orders with pending-first ordering, status filters, item/customer details, status actions, and an encoded WhatsApp link to message the customer. Both server pages retain owner and tenant checks, and writes continue through the authenticated Supabase session and RLS. Owner prices now use PKR. Cloudinary upload/cropping and store contact settings remain deferred pending upload authorization/lifecycle and a WhatsApp destination field decision. No schema migration was needed for this pass.

**Deliverables:** owner shell and responsive product workflow.

### Phase 5 — Responsive, accessibility, and implementation review

**Architecture context:** all routes and shared components in `app/` and `components/`.

**Review:** keyboard access, visible focus, semantic structure, contrast, text zoom, reduced motion, touch targets, responsive breakpoints, image loading, long product names, validation errors, and tenant-specific branding edge cases.

**First implementation pass:** Added focus entry, Escape handling, tab containment, and focus return for the mobile catalog filter sheet and product-image zoom dialog. Improved touch/input sizing for owner and storefront forms, labeled product quantity, announced login errors, and increased catalog product name, price, and stock text to the agreed minimum sizes. The review was code-based; visual checks across real devices, screen readers, and narrow viewport zoom remain release QA tasks.

**Deliverables:** reviewed state inventory and issues resolved or documented before release.

## Decisions and remaining refinements

Product-owner decisions are recorded below. Keep refining implementation-level details here as they are resolved, especially font assets, dynamic accent validation, WhatsApp destination storage, upload authorization, checkout city/delivery fee, and exact responsive breakpoints.

| Topic                                                       | Decision                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand personality and references                            | Editorial/confident, tactile, trustworthy/local, mobile-first, store-specific. References: Khaadi, Sapphire, Zara, COS, optional Aritzia.                                                                                                                                                          |
| Color and typography direction                              | Warm off-white/charcoal/sand base; one restrained tenant accent; expressive serif/display headings with clean sans body. Avoid neon, heavy shadows, and clutter.                                                                                                                                   |
| Storefront merchandising priorities                         | Fast scanning first; trust, COD and WhatsApp next; immersive product detail; minimal sale treatment.                                                                                                                                                                                               |
| Store logo, theme, and product image availability           | Logo may be low quality or absent; use text wordmark fallback. Tenant accents/branding are light inputs. Product photos vary; use 4:5 grid frame and seller photo guide.                                                                                                                           |
| Product image provider                                      | Cloudinary for uploads, storage/delivery, and responsive image transformations; upload authorization and asset lifecycle must be designed before implementation.                                                                                                                                   |
| WhatsApp placement and behavior                             | Product detail contact action (pending store destination field), post-checkout seller follow-up (pending store destination field), and implemented owner order-detail customer contact. Each action must use a working, encoded WhatsApp deep link; it is not a substitute for recording an order. |
| Owner dashboard relationship to storefront brand            | Login is store-branded. Admin is consistent across stores, with logo/name and accent only.                                                                                                                                                                                                         |
| Root-domain landing page included in first design           | Yes: platform pitch, feature highlights, contact/WhatsApp CTA, no store directory.                                                                                                                                                                                                                 |
| Primary shopper, devices, and network constraints           | Pakistani shopper, usually arriving from social/WhatsApp, 360px Android-first, variable 3G/4G. Optimize image weight, JS, and perceived speed.                                                                                                                                                     |
| Language, currency, accessibility, and checkout preferences | PKR/no decimals; Roman Urdu + English storefront voice, “aap”, simple admin copy; Urdu-script content support; 44px targets, 16px body, contrast/focus/labels/alt text. Guest COD checkout and Pakistani phone formats.                                                                            |

## Change log

- 2026-10-12: Created the design brief and phased plan from the current route/component architecture.
- 2026-10-12: Recorded product-owner direction for visual identity, merchandising, audience, localization, accessibility, root landing page, and future owner workflows. PKR and Roman Urdu/English are design targets; implementation and remaining schema/API gaps are recorded in the relevant phase notes above.
- 2026-10-12: Implemented the first Phase 4 owner experience: branded login, shared dashboard shell, product visibility and stock controls, order listing/status changes, and customer WhatsApp links. Updated route/component/API maps; upload and store WhatsApp settings remain pending explicit data/security design.
- 2026-10-12: Phase 5 code review improved keyboard handling for dialogs, form control sizing and labeling, login error announcements, and mobile catalog text sizes. Real-device and assistive-technology review remains outstanding.
- 2026-10-12: Added Cloudinary as the planned product image provider, preserved working WhatsApp actions as build requirements, and added first-pass route-level screen blueprints.
- 2026-10-12: Started Phase 2 with PKR customer storefront formatting, mobile availability filters, Cloudinary delivery transformations, and interactive product gallery/zoom. Sale pricing and WhatsApp seller links remain blocked on current schema support.
- 2026-10-12: Started Phase 3 with Roman Urdu cart/checkout copy, tenant-scoped checkout previews, Pakistani mobile validation, city plus full address captured in the existing address field, visible COD totals, and delivery-charge disclosure. Checkout API and database schema remain unchanged.
