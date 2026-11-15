# Gifty

The build of the Direction B styled boards ("Styled wireframes (Direction B)", design artifact 4476dcbf…).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Structure
- `src/styles/tokens.css`: design tokens (palette, fonts, radii) as CSS variables. Don't add colours outside them.
- `src/styles/components.css`: shared components (button, chip, card, modal, menu, toast, meter, tabs).
- `src/components/`: app shell (side nav, cart widget on every screen), icons, UI primitives.
- `src/features/<area>/`: one folder per area (home, lists, people, cart, checkout, purchases, explore, settings).
- `src/store/AppStore.tsx`: client state (people, occasions, shortlist, cart, purchases) and the derived cart summary.
- `src/lib/api.ts`: a thin API layer. It serves sample data from `src/data/` today. Swap it for the product source and Shopify UCP later.
- `src/lib/format.ts`: currency and date formatting. The open currency rule lives here (Home total uses plain `$`, line items use `CA$`).

## Board states, linkable by URL
| Board | URL |
|---|---|
| 04a start / 04 all types | `/lists/christmas-2026/mom` · `/lists/christmas-2026/dad` |
| 04d one type · 04g search | `?type=brewing` · `?q=pour-over` |
| 05a–05d | `?state=loading` · `?state=empty` · `?state=limited` · `?state=demo` |
| 06a product drawer | `?product=kettle` |
| 09c1–09c4 cart problems | `/cart?issue=price-changed` · `code-expired` · `out-of-stock` · `delivery-miss` |
| 10a checkout | `/cart?checkout=1` |
| 09b · 09g | `/cart/savings` · `/cart/saved` |
