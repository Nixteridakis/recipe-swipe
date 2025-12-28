# Recipe Book Importer – Chrome extension

Extracts the JSON-LD `Recipe` from the current tab and can send it to your Recipe Book app (no 403, since the page is already loaded in your browser).

## Load in Chrome

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `chrome-extension/`

## Use

1. Open a recipe page (e.g. akispetretzikis.com)
2. Click the extension icon
3. Set **Recipe Book API** to your app URL (default `http://localhost:3000`)
4. Click **Extract recipe**
5. **Copy JSON** or **Send to Recipe Book** (POSTs to `/api/parse-recipe` with `{ url, recipe }`)

The app normalizes the recipe (ingredients, instructions, times) and returns the same preview shape; you can later wire “Send” to create the recipe in Sanity.
