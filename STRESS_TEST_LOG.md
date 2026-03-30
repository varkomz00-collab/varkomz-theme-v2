# Varkomz Stress Test Log

## Run 1 — 2026-03-30

### Critical Fixes (Site-Breaking)
- None found this run — previous commits already fixed: paginate in layout, empty settings_schema, hardcoded nav, announcement-bar block wiring

### Functional Fixes (Buttons/Links/Nav)
- `sections/main-cart.liquid:6` — "Continue shopping" link was hardcoded to `/collections/all`, replaced with `{{ routes.all_products_collection_url }}` (Shopify native route)

### JavaScript Fixes
- `assets/theme.js:272` — `changeQuantity()` fetch had no `.catch()` — added error handler
- `assets/theme.js:557` — Sticky ATC fetch had no `.catch()` — added error handler
- Console.error statements kept (intentional for debugging cart failures)

### Popup/Modal Fixes
- `sections/newsletter-popup.liquid` — Added `show_popup` checkbox setting (was missing — no way to disable from Shopify admin)
- Wrapped entire popup HTML in `{%- if section.settings.show_popup -%}` guard
- Cookie-based 7-day dismissal, 8s delay, 50% scroll trigger already in place from prior fixes

### Performance Improvements
- `snippets/cart-drawer.liquid` — Added `loading="lazy"` to cart item images
- Removed Google Fonts external link (Shopify CDN handles Jost via font_face filter)
- Total CSS: 48KB, Total JS: 20KB — both under thresholds

### Shopify Compatibility Fixes
- `locales/en.default.json` — Added missing translation keys: `general.collections`, `general.page_not_found`, `general.404_title`, `general.404_message`
- All 8 required files present
- 5 schema groups, 12 settings defined
- All asset references resolve

### CRO/UX Improvements
- Skipped CRO skill application this run (focused on stability first)

### REMAINING ISSUES (MUST LIST AT LEAST 8)
1. **CSS file size (48KB)** — approaching 50KB threshold. Inline `<style>` blocks in 33 section files add more CSS on top. Consider consolidating common patterns into base.css and removing duplicates from sections.
2. **No search page UI** — `templates/search.json` references `main-search` section but search results page likely has minimal styling. Needs Apple-style search results layout.
3. **No 404 page styling** — `sections/main-404.liquid` exists but may have minimal/unstyled content. Needs branded 404 with CTA back to shop.
4. **Cart page UX** — `sections/main-cart.liquid` uses basic table layout. No quantity +/- buttons in the server-rendered version (only in AJAX drawer). Desktop cart page needs Apple-style redesign.
5. **Product page responsive** — `sections/main-product.liquid` has not been audited for mobile layout, touch targets, or image gallery UX on small screens.
6. **Blog/article templates** — `main-article.liquid` and `main-blog.liquid` have not been stress tested. May have styling gaps or missing responsive rules.
7. **Duplicate CSS selectors** — Multiple sections define their own `.page-width`, button, and typography styles that may conflict with base.css. Need CSS specificity audit.
8. **Accessibility (a11y)** — No `aria-live` region for cart count updates. Mega-menu keyboard navigation untested. Focus trap missing from cart drawer and newsletter popup. Color contrast on gray text (#6e6e73 on white) may fail WCAG AA for small text.
9. **No `presets` on most sections** — Sections like `featured-products`, `trust-badges`, `testimonials` lack `presets` in their schema, meaning they can't be added via the Shopify customizer "Add section" button — only via JSON.
10. **Collection carousel on collection page** — `templates/collection.json` includes `collections-carousel` above the product grid but it renders empty cards since no collections are assigned to blocks via the customizer.

### NEXT RUN SHOULD FOCUS ON
- Audit `sections/main-product.liquid` for mobile responsiveness and touch targets
- Audit `sections/main-404.liquid` and `sections/main-search.liquid` for proper styling
- Run accessibility skill — check color contrast, focus management, aria attributes
- Add `presets` to all homepage sections so they're addable from customizer
- CSS specificity audit — check for inline `<style>` blocks conflicting with base.css
- Stress test the cart page (main-cart.liquid) on mobile
