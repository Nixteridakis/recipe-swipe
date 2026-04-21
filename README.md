# Recipe Swipe

A modern recipe app built with Next.js and Sanity, focused on fast recipe discovery, rich recipe detail pages, and a practical ingredient cart workflow.

## Highlights

- Swipe-style discovery flow for exploring recipes
- Category-aware recipe cards and browsing
- Recipe detail pages with ingredients and instructions
- Ingredient/cart page with quantity controls and check states
- Sanity-powered content model for recipes, categories, and ingredients
- Recipe import flow to speed up content creation

## Screenshots

### Discover

![Discover](docs/screenshots/swipe_cards.webp)

### Recipe book

![Ingredients Cart](docs/screenshots/all_recipes.webp)

### Shopping Cart

![Shopping cart](docs/screenshots/shopping_cart.webp)

## Tech Stack

- **Framework:** Next.js 16, React 19, TypeScript
- **CMS:** Sanity (`next-sanity`, `@sanity/image-url`)
- **Styling:** CSS Modules (+ Sass available)
- **Runtime/Env:** Varlock integration for typed env loading

## App Routes

- `/` — Discover
- `/recipes` — Recipes listing
- `/recipe/[slug]` — Recipe detail
- `/cart` — Ingredient cart
- `/import` — Recipe import
- `/studio` — Sanity Studio

## Getting Started

### 1) Install dependencies

```bash
pnpm install
```

### 2) Configure environment

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=your_dataset
SANITY_WRITE_TOKEN=your_sanity_write_token
```

### 3) Run the app

```bash
pnpm run dev
```

Open app at http://localhost:3000
Open sanity studio at http://localhost:3000/studio

## Netlify Production

### 1) Connect and Build

- Connect the repo to Netlify.
- Build command: `pnpm run build`
- Publish directory: `.next`
- Node version: `20` (configured in `netlify.toml`)

### 2) Required Environment Variables (Netlify UI)

- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SANITY_API_VERSION` (optional, defaults in code)
- `SANITY_WRITE_TOKEN` (required for `/api/create-recipe`)

Optional:
- `NEXT_PUBLIC_APP_URL` (if omitted, production extension zip generation falls back to Netlify `URL` / `DEPLOY_PRIME_URL`)

### 3) Sanity CORS Checklist

In Sanity project API settings, allow these origins:
- local: `http://localhost:3000`
- production: your Netlify site URL (and custom domain if used)

### 4) Smoke Tests After Deploy

- App root loads: `GET /`
- Recipe detail loads: `GET /recipe/<existing-slug>`
- Cart route loads: `GET /cart`
- Import route loads: `GET /import`
- Health endpoint reports Sanity connectivity:

```bash
curl -s https://<your-netlify-site>/api/health
```

Expected:
- `ok: true`
- `sanity: "reachable"`
