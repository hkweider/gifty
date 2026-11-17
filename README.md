# Gifty

Gifty helps you find and buy gifts for the people in your life. Add the people you shop for and their occasions, get gift ideas based on what they like, compare products, keep a shortlist, and check out.

## What it does

- **People and occasions:** keep track of who you're buying for, their interests, and a budget for each occasion.
- **Gift ideas:** suggestions based on each person's interests, plus search. Products come live from the Shopify Catalog (via UCP), with real prices, photos, options and stock.
- **Product details:** pick a colour or size and see the price, whether it's in stock, and whether it ships to Canada.
- **Chat:** ask questions about a product, or describe what you want ("something personal, under $60") and the ideas update.
- **Lists, cart and checkout:** shortlist ideas, compare up to three, then check out with each store.

## Run it on your computer

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173.

## Settings

Put these in a `.env` file in this folder (copy `.env.example`). Never commit `.env`.

| Setting | What it's for |
| --- | --- |
| `ANTHROPIC_API_KEY` | Turns on the chat. Without it, chat shows a "not set up" message. |
| `SHOPIFY_UCP_TOKEN` | Optional. A Shopify Catalog API key, for higher usage limits. |
| `UCP_AGENT_PROFILE` | Optional. The link to your app's UCP agent profile. |

Restart `npm run dev` after changing `.env`.

## Put it online

**Vercel (recommended):** connect this GitHub repo to a Vercel project. Add the same settings under **Settings → Environment Variables**, then redeploy. Vercel runs the small server that talks to the APIs, so your keys stay private.

**GitHub Pages:** a static version deploys automatically on every push to `main` (turn it on in the repo's **Settings → Pages**, source: GitHub Actions). It has no server, so chat is off there. Never add keys to this version.

## Where things are

| Folder | What's in it |
| --- | --- |
| `src/features/` | One folder per screen area: home, gift lists, people, cart, checkout, purchases, explore, settings |
| `src/components/` | Shared pieces: side menu, cart widget, buttons, pop-ups |
| `src/styles/` | Colours, fonts and shared styles |
| `src/data/` | Sample data |
| `server/` | The server code that calls the product catalog (UCP) and the chat (Claude API) |
| `api/` | The same server code, packaged for Vercel |
