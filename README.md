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
- `server/ucp.ts`: Shopify UCP client (server side): Global Catalog search, product details, and merchant carts.
- `server/apiPlugin.ts`: mounts `/api/catalog/search`, `/api/catalog/product` and `/api/carts` on the Vite dev/preview server. The handlers are framework-agnostic; reuse them in your production server.
- `src/lib/api.ts`: client API layer. Live Shopify data by default; sample data from `src/data/` when built with `VITE_DATA=sample`.
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

## Shopify (UCP)
- **Find gifts** searches Shopify's [Global Catalog](https://shopify.dev/docs/agents/catalog/global-catalog) (`search_catalog`), using the person's profile as buyer intent and the list budget as a price filter. Only CAD-priced results are shown, so cart totals add up. If the live search fails, the page shows the designed "Live results are unavailable" demo state (05d).
- **Checkout** keeps the design's one step per store: for each live store, the server calls that merchant's [Cart MCP](https://shopify.dev/docs/agents/carts-and-checkout/cart-mcp) `create_cart`, then the app opens the cart's `continue_url` (the store's own checkout) in a new tab. If the Cart MCP call fails, it falls back to a standard Shopify cart permalink. Gifty never takes payment.
- Sample items (the seeded cart and shortlist) still use simulated stores and checkout steps.

Server environment variables (all optional):

| Variable | Purpose |
|---|---|
| `UCP_AGENT_PROFILE` | URL of your agent's UCP profile. Defaults to Shopify's hosted example profile; host your own before launch. |
| `SHOPIFY_UCP_TOKEN` | Bearer token from Dev Dashboard → Catalogs. Without it, requests use the Anonymous tier: lowest, shared rate limits, not meant for production. |

Static preview build (no server, sample data):

```bash
VITE_DATA=sample VITE_HASH_ROUTER=1 npx vite build --base ./
```

In a network-restricted environment (such as a Claude cloud sandbox), start the dev server with `NODE_USE_ENV_PROXY=1 npm run dev` so the server's requests use the proxy.

## Hosting on GitHub Pages
`.github/workflows/pages.yml` builds and deploys on every push to `main`. One-time setup: repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.

GitHub Pages is static, so that build (`VITE_DIRECT_UCP=1`) calls Shopify's UCP endpoints straight from the browser. They allow cross-origin requests, but only in the Anonymous tier: never add an API token to a static build. Once you have a token, host the `/api` routes on a server instead.

## Hosting on Vercel
Vercel serves the built site and runs the `/api` routes as serverless functions (`api/`), using the same UCP client as the dev server. `vercel.json` sends all other paths to the app. Optional environment variables in Vercel → Settings → Environment Variables: `SHOPIFY_UCP_TOKEN` and `UCP_AGENT_PROFILE` (server-side only, safe there).
