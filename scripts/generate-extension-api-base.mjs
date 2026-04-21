/**
 * Writes chrome-extension/api-base.js.
 *
 * Usage:
 *   node scripts/generate-extension-api-base.mjs
 *   EXTENSION_ZIP_MODE=production node scripts/generate-extension-api-base.mjs
 *
 * See package.json: zip:extension (local) vs build (production zip).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const mode = process.env.EXTENSION_ZIP_MODE === "production" ? "production" : "local";

function readEnvLocal(key) {
  const envPath = path.join(root, ".env.local");
  try {
    const raw = fs.readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      if (k !== key) continue;
      let v = t.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      return v;
    }
  } catch {
    return null;
  }
  return null;
}

let base;
let sourceHint;

if (mode === "production") {
  base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    readEnvLocal("NEXT_PUBLIC_APP_URL") ||
    null;
  if (!base) {
    console.warn(
      "[extension] NEXT_PUBLIC_APP_URL not set — production zip will use http://localhost:3000. Set NEXT_PUBLIC_APP_URL for a real deploy URL."
    );
    base = "http://localhost:3000";
  }
  sourceHint =
    "NEXT_PUBLIC_APP_URL or Netlify URL/DEPLOY_PRIME_URL (pnpm run build regenerates this zip + api-base.js)";
} else {
  base =
    process.env.NEXT_LOCAL_APP_URL ||
    readEnvLocal("NEXT_LOCAL_APP_URL") ||
    "http://localhost:3000";
  sourceHint = "NEXT_LOCAL_APP_URL (default http://localhost:3000) — pnpm run zip:extension";
}

base = String(base).replace(/\/$/, "");

const modeComment =
  mode === "production"
    ? "production zip (runs after next build)"
    : "local dev zip (pnpm run zip:extension)";

const out = `/**
 * Default Recipe Book API origin (no trailing slash).
 * Mode: ${modeComment}
 * Source: ${sourceHint}
 */
var RECIPE_BOOK_API_BASE = ${JSON.stringify(base)};
`;

const outPath = path.join(root, "chrome-extension", "api-base.js");
fs.writeFileSync(outPath, out, "utf8");
process.stdout.write(`[extension:${mode}] ${outPath} → ${base}\n`);
