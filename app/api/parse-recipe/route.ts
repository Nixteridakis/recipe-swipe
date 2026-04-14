export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { normalizeUnit as normalizeSharedUnit } from "@/lib/ingredient-normalization";

type ParsedIngredient = {
  item: string;
  quantityMin?: number | null;
  quantityMax?: number | null;
  unit?: string | null;
};

type ParsedRecipe = {
  sourceUrl: string;
  title?: string;
  description?: string;
  image?: string[];
  authorName?: string;
  prepTimeMin?: number | null;
  cookTimeMin?: number | null;
  servings?: number | null;
  ingredients?: ParsedIngredient[];
  instructions?: string[];
};

function decodeHtmlEntities(input: string) {
  // Minimal HTML-entity decoder for common entities seen in JSON-LD text.
  // (We avoid adding dependencies for this first import step.)
  const named: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&quot;": '"',
    "&apos;": "'",
    "&lt;": "<",
    "&gt;": ">",
    "&eacute;": "é",
    "&aacute;": "á",
    "&iacute;": "í",
    "&oacute;": "ó",
    "&uacute;": "ú",
    "&Eacute;": "É",
    "&Aacute;": "Á",
    "&Iacute;": "Í",
    "&Oacute;": "Ó",
    "&Uacute;": "Ú",
    "&auml;": "ä",
    "&euml;": "ë",
    "&i": "i",
    "&ouml;": "ö",
    "&uuml;": "ü",
    "&aring;": "å",
    "&Aring;": "Å",
    "&ccedil;": "ç",
    "&Ccedil;": "Ç",
    "&ntilde;": "ñ",
    "&Ntilde;": "Ñ",
    "&egrave;": "è",
    "&agrave;": "à",
    "&igrave;": "ì",
    "&ograve;": "ò",
    "&ugrave;": "ù",
  };

  function decodeNumericEntity(raw: string) {
    // raw examples: "&#123;" or "&#x1F4A9;"
    const m = raw.match(/^&#(x[0-9a-fA-F]+|[0-9]+);$/);
    if (!m) return raw;
    const body = m[1];
    const codePoint = body.startsWith("x")
      ? Number.parseInt(body.slice(1), 16)
      : Number.parseInt(body, 10);
    if (!Number.isFinite(codePoint)) return raw;
    try {
      return String.fromCodePoint(codePoint);
    } catch {
      return raw;
    }
  }

  return input
    .replace(/(&#[0-9]+;|&#x[0-9a-fA-F]+;)/g, (m) => decodeNumericEntity(m))
    .replace(/&[a-zA-Z]+;/g, (m) => named[m] ?? m)
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseIsoDurationToMinutes(duration?: unknown): number | null {
  if (typeof duration !== "string") return null;
  const m = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!m) return null;
  const hours = m[1] ? Number(m[1]) : 0;
  const minutes = m[2] ? Number(m[2]) : 0;
  // seconds ignored for now (most recipes use H/M anyway)
  return hours * 60 + minutes;
}

function parseNumberLoose(raw: string) {
  const normalized = raw.trim().replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function cleanIngredientItem(rawItem: string) {
  const cleaned = rawItem
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";

  const withoutLeadingUnitWords = cleaned.replace(
    /^(?:tablespoon|tablespoons|teaspoon|teaspoons|tbsp|tsp|cup|cups|gram|grams|kg|g|ml|l)\s+/i,
    "",
  );
  return withoutLeadingUnitWords.startsWith("of ")
    ? withoutLeadingUnitWords.slice(3).trim()
    : withoutLeadingUnitWords.trim();
}

function parseIngredientLine(rawLine: string): ParsedIngredient | null {
  const line = decodeHtmlEntities(rawLine);
  if (!line) return null;

  // Common patterns:
  // "2-3 tablespoon(s) olive oil"
  // "1,5 kilo ossobuco"
  // "1 clove(s) of garlic"
  // "lemon juice"
  const m = line.match(
    /^(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?\s+(.+)$/
  );

  // No leading quantity => whole line is item
  if (!m) {
    const item = cleanIngredientItem(line);
    return { item, quantityMin: null, quantityMax: null, unit: null };
  }

  const qty1 = parseNumberLoose(m[1]);
  const qty2 = m[2] ? parseNumberLoose(m[2]) : null;
  const rest = m[3].trim(); // "unit item..."

  const restParts = rest.split(" ").filter(Boolean);
  const unitCandidate = restParts.shift() ?? "";
  const itemRemainder = restParts.join(" ").trim();

  // If we couldn't identify an item after unit, treat unitCandidate as item.
  if (!itemRemainder) {
    return {
      item: unitCandidate,
      quantityMin: qty2 == null ? qty1 : qty1,
      quantityMax: qty2 == null ? qty1 : qty2,
      unit: null,
    };
  }

  const item = cleanIngredientItem(itemRemainder);
  const unit = normalizeSharedUnit(unitCandidate);

  return {
    item,
    quantityMin: qty2 == null ? qty1 : qty1,
    quantityMax: qty2 == null ? qty1 : qty2,
    unit,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === "string");
  if (typeof value === "string") return [value];
  return [];
}

/** Normalize a raw JSON-LD Recipe node into our ParsedRecipe shape. */
function normalizeJsonLdRecipe(node: Record<string, unknown>): ParsedRecipe {
  const title = typeof node.name === "string" ? node.name : undefined;
  const description =
    typeof node.description === "string" ? node.description : undefined;

  const imageRaw = node.image;
  const image = (() => {
    if (typeof imageRaw === "string") return [imageRaw];
    if (Array.isArray(imageRaw)) {
      return imageRaw.filter((x): x is string => typeof x === "string");
    }
    return undefined;
  })();

  const authorName =
    isRecord(node.author) && typeof node.author.name === "string"
      ? node.author.name
      : undefined;

  const prepTimeMin = parseIsoDurationToMinutes(node.prepTime);
  const cookTimeMin = parseIsoDurationToMinutes(node.cookTime);

  const servings = (() => {
    const yieldRaw = node.recipeYield;
    if (typeof yieldRaw !== "string") return null;
    const m = yieldRaw.match(/^(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?/);
    if (!m) return null;
    const n1 = parseNumberLoose(m[1] ?? "");
    const n2 = m[2] ? parseNumberLoose(m[2]) : null;
    if (n1 == null) return null;
    if (n2 == null) return Math.round(n1);
    return Math.round((n1 + n2) / 2);
  })();

  const ingredientsRaw: string[] = Array.isArray(node.recipeIngredient)
    ? node.recipeIngredient.filter((x): x is string => typeof x === "string")
    : [];

  const ingredients = ingredientsRaw
    .map((line) => parseIngredientLine(line))
    .filter((x): x is ParsedIngredient => x != null);

  const instructionsRaw = node.recipeInstructions;
  const instructions = (() => {
    const steps: string[] = [];
    const pushStep = (s: unknown) => {
      if (typeof s === "string") steps.push(decodeHtmlEntities(s));
      else if (isRecord(s) && typeof s.text === "string") {
        steps.push(decodeHtmlEntities(s.text));
      }
    };
    if (Array.isArray(instructionsRaw)) {
      for (const s of instructionsRaw) pushStep(s);
    } else if (typeof instructionsRaw === "string") {
      steps.push(decodeHtmlEntities(instructionsRaw));
    }
    return steps;
  })();

  return {
    sourceUrl: "",
    title,
    description,
    image,
    authorName,
    prepTimeMin,
    cookTimeMin,
    servings,
    ingredients,
    instructions,
  };
}

function findRecipeInNode(node: unknown, seen?: Set<unknown>): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null;
  const s = seen ?? new Set<unknown>();
  if (s.has(node)) return null;
  s.add(node);

  if (isRecord(node)) {
    const typeList = toStringArray(node["@type"]);
    const isRecipe = typeList.some(
      (t) =>
        t.toLowerCase() === "recipe" || t.toLowerCase().includes("recipe")
    );
    if (isRecipe) return node;
    const main = node.mainEntity;
    if (main && isRecord(main)) {
      const mainTypes = toStringArray(main["@type"]);
      if (mainTypes.some((t) => t.toLowerCase().includes("recipe")))
        return main;
    }
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findRecipeInNode(child, s);
      if (found) return found;
    }
    return null;
  }
  if (isRecord(node)) {
    for (const key of ["@graph", "mainEntity", "itemListElement", "contains"]) {
      const found = findRecipeInNode(node[key], s);
      if (found) return found;
    }
  }
  return null;
}

function extractJsonLdRecipeFromHtml(html: string): ParsedRecipe | null {
  const scripts: string[] = [];
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(html))) {
    scripts.push(match[1]);
  }

  for (const scriptContent of scripts) {
    try {
      const parsed: unknown = JSON.parse(scriptContent.trim());
      const recipeNode = findRecipeInNode(parsed);
      if (recipeNode) return normalizeJsonLdRecipe(recipeNode);
    } catch {
      // ignore invalid JSON-LD scripts
    }
  }

  return null;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    url?: unknown;
    html?: unknown;
    recipe?: unknown;
  } | null;
  const url = typeof body?.url === "string" ? body.url : null;
  const pastedHtml =
    typeof body?.html === "string" && body.html.trim().length > 0
      ? body.html.trim()
      : null;
  const rawRecipe = body?.recipe;

  console.log("[parse-recipe] request", {
    url,
    hasRawRecipe: rawRecipe != null,
    hasPastedHtml: pastedHtml != null,
  });

  if (!url && !pastedHtml) {
    return cors(
      NextResponse.json(
        {
          error: "bad_request",
          message:
            "Add a recipe URL, or paste HTML in the fallback section so we can read structured recipe data.",
        },
        { status: 400 }
      )
    );
  }

  // Extension (or client) sends raw JSON-LD Recipe object — normalize and return
  if (rawRecipe != null && isRecord(rawRecipe)) {
    // Extension DOM fallback may already send a normalized ParsedRecipe object.
    // Detect and return it without trying JSON-LD normalization.
    const looksNormalized =
      (Array.isArray((rawRecipe as any).ingredients) &&
        ((rawRecipe as any).ingredients.length === 0 ||
          typeof (rawRecipe as any).ingredients[0]?.item === "string")) ||
      (Array.isArray((rawRecipe as any).instructions) &&
        ((rawRecipe as any).instructions.length === 0 || typeof (rawRecipe as any).instructions[0] === "string"));

    if (looksNormalized) {
      const recipe = rawRecipe as ParsedRecipe;
      recipe.sourceUrl = url ?? "https://manual-import.local/pasted-html";
      return cors(NextResponse.json({ recipe }));
    }

    const typeList = toStringArray(rawRecipe["@type"]);
    const isRecipe = typeList.some(
      (t) =>
        t.toLowerCase() === "recipe" || t.toLowerCase().includes("recipe")
    );
    if (isRecipe) {
      const recipe = normalizeJsonLdRecipe(rawRecipe);
      recipe.sourceUrl = url ?? "https://manual-import.local/pasted-html";
      console.log(
        "[parse-recipe] normalized recipe (raw JSON-LD)",
        recipe.title,
        {
          ingredients: recipe.ingredients?.length ?? 0,
          instructions: recipe.instructions?.length ?? 0,
          prepTimeMin: recipe.prepTimeMin,
          cookTimeMin: recipe.cookTimeMin,
        }
      );
      return cors(NextResponse.json({ recipe }));
    }
  }

  let html: string;

  if (pastedHtml) {
    html = pastedHtml;
  } else {
    if (!url) {
      return cors(
        NextResponse.json(
          {
            error: "bad_request",
            message:
              "A recipe URL is required when not pasting HTML. Enter the page address or switch to the “Paste source code” section.",
          },
          { status: 400 }
        )
      );
    }
    try {
      const parsedUrl = new URL(url);
      const origin = `${parsedUrl.protocol}//${parsedUrl.host}`;

      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-GB,en;q=0.9,el;q=0.8",
          Referer: origin + "/",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        const isForbidden = res.status === 403;
        const message = isForbidden
          ? "That site blocked our server from loading the page (common with anti-bot or cookie walls). Use the Brasserie Chrome extension while the recipe tab is open, or copy the full page HTML (View source) and paste it under “Paste source code,” then click Import from HTML."
          : `The recipe page returned HTTP ${res.status}, so we couldn’t read it from here. Try again later, use the extension, or paste the page HTML instead.`;
        return cors(
          NextResponse.json(
            {
              error: isForbidden ? "fetch_forbidden" : "fetch_http_error",
              message,
            },
            { status: 400 }
          )
        );
      }

      html = await res.text();
    } catch {
      return cors(
        NextResponse.json(
          {
            error: "fetch_failed",
            message:
              "We couldn’t connect to that URL from the server (network error, DNS, or TLS). Check the link, or use the Chrome extension / pasted HTML so the recipe isn’t fetched by our backend.",
          },
          { status: 400 }
        )
      );
    }
  }

  const recipe = extractJsonLdRecipeFromHtml(html);
  if (!recipe) {
    return cors(
      NextResponse.json(
        {
          error: "no_jsonld_recipe",
          message:
            "We didn’t find schema.org Recipe data (JSON-LD) in that HTML. Many sites still work via the Chrome extension (it reads the live page), or try another URL that publishes machine-readable recipes.",
        },
        { status: 404 }
      )
    );
  }

  recipe.sourceUrl = url ?? "https://manual-import.local/pasted-html";
  console.log(
    "[parse-recipe] normalized recipe (from HTML JSON-LD)",
    recipe.title,
    {
      ingredients: recipe.ingredients?.length ?? 0,
      instructions: recipe.instructions?.length ?? 0,
      prepTimeMin: recipe.prepTimeMin,
      cookTimeMin: recipe.cookTimeMin,
    }
  );
  return cors(NextResponse.json({ recipe }));
}

/** Allow Chrome extension and localhost to call this API. */
function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

