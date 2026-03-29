# Recipe Book Importer – Chrome extension

Extracts JSON-LD `Recipe` data from the **current tab** and sends it to your Brasserie app. Because the recipe runs in the real browser session, you avoid server-side **403** blocks when importing.

The in-app **Import** page (`/import`) matches this flow: **extension first** (best), **paste URL** (quick), **paste HTML** (fallback when fetch is blocked).

## Load in Chrome

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `chrome-extension/`

## Use (aligned with `/import`)

1. Open your app and set **Recipe Book API** in the extension popup to your site (e.g. `http://localhost:3000` or your production URL).
2. Open a recipe page in another tab (e.g. a site that publishes `Recipe` JSON-LD).
3. Click the extension icon.
4. Click **Extract recipe** to read JSON-LD from the page.
5. Either **Copy JSON** for debugging, or **Send to Recipe Book** — this `POST`s to `/api/parse-recipe` with `{ url, recipe }` (same normalization as the Import page).

After a successful send, open **`/import`** in the app if you want to preview again, or use **Create in Sanity** from the parsed preview when importing from the page.

## Compared to URL-only import

- **Extension**: uses the live DOM / JSON-LD from your session — no bot blocking.
- **Paste URL**: server fetches the URL; some sites return 403 or hide content.
- **Paste HTML** (Import page): paste **View source** HTML when fetch fails; optional URL field improves the stored `sourceUrl` in Sanity when provided.
