export type UnitGroup = "mass" | "volume" | "count" | "unitless" | "unknown";

type UnitDef = {
  canonical: string;
  group: UnitGroup;
  toBase: number;
  baseUnit: string;
};

const UNIT_DEFS: Record<string, UnitDef> = {
  g: { canonical: "g", group: "mass", toBase: 1, baseUnit: "g" },
  gram: { canonical: "g", group: "mass", toBase: 1, baseUnit: "g" },
  grams: { canonical: "g", group: "mass", toBase: 1, baseUnit: "g" },
  kg: { canonical: "kg", group: "mass", toBase: 1000, baseUnit: "g" },
  kilo: { canonical: "kg", group: "mass", toBase: 1000, baseUnit: "g" },
  kilogram: { canonical: "kg", group: "mass", toBase: 1000, baseUnit: "g" },
  kilograms: { canonical: "kg", group: "mass", toBase: 1000, baseUnit: "g" },
  oz: { canonical: "oz", group: "mass", toBase: 28.3495, baseUnit: "g" },
  ounce: { canonical: "oz", group: "mass", toBase: 28.3495, baseUnit: "g" },
  ounces: { canonical: "oz", group: "mass", toBase: 28.3495, baseUnit: "g" },
  lb: { canonical: "lb", group: "mass", toBase: 453.592, baseUnit: "g" },
  lbs: { canonical: "lb", group: "mass", toBase: 453.592, baseUnit: "g" },
  pound: { canonical: "lb", group: "mass", toBase: 453.592, baseUnit: "g" },
  pounds: { canonical: "lb", group: "mass", toBase: 453.592, baseUnit: "g" },

  ml: { canonical: "ml", group: "volume", toBase: 1, baseUnit: "ml" },
  milliliter: { canonical: "ml", group: "volume", toBase: 1, baseUnit: "ml" },
  milliliters: { canonical: "ml", group: "volume", toBase: 1, baseUnit: "ml" },
  l: { canonical: "l", group: "volume", toBase: 1000, baseUnit: "ml" },
  liter: { canonical: "l", group: "volume", toBase: 1000, baseUnit: "ml" },
  liters: { canonical: "l", group: "volume", toBase: 1000, baseUnit: "ml" },
  litre: { canonical: "l", group: "volume", toBase: 1000, baseUnit: "ml" },
  litres: { canonical: "l", group: "volume", toBase: 1000, baseUnit: "ml" },
  tsp: { canonical: "tsp", group: "volume", toBase: 5, baseUnit: "ml" },
  teaspoon: { canonical: "tsp", group: "volume", toBase: 5, baseUnit: "ml" },
  teaspoons: { canonical: "tsp", group: "volume", toBase: 5, baseUnit: "ml" },
  tbsp: { canonical: "tbsp", group: "volume", toBase: 15, baseUnit: "ml" },
  tablespoon: { canonical: "tbsp", group: "volume", toBase: 15, baseUnit: "ml" },
  tablespoons: { canonical: "tbsp", group: "volume", toBase: 15, baseUnit: "ml" },
  cup: { canonical: "cup", group: "volume", toBase: 240, baseUnit: "ml" },
  cups: { canonical: "cup", group: "volume", toBase: 240, baseUnit: "ml" },

  piece: { canonical: "piece", group: "count", toBase: 1, baseUnit: "piece" },
  pieces: { canonical: "piece", group: "count", toBase: 1, baseUnit: "piece" },
  clove: { canonical: "clove", group: "count", toBase: 1, baseUnit: "clove" },
  cloves: { canonical: "clove", group: "count", toBase: 1, baseUnit: "clove" },
  bunch: { canonical: "bunch", group: "count", toBase: 1, baseUnit: "bunch" },
  can: { canonical: "can", group: "count", toBase: 1, baseUnit: "can" },
  package: { canonical: "package", group: "count", toBase: 1, baseUnit: "package" },
  pinch: { canonical: "pinch", group: "count", toBase: 1, baseUnit: "pinch" },
  leaves: { canonical: "leaf", group: "count", toBase: 1, baseUnit: "leaf" },
  leaf: { canonical: "leaf", group: "count", toBase: 1, baseUnit: "leaf" },
};

const NOISE_TOKENS = new Set([
  "fresh",
  "optional",
  "drained",
  "chopped",
  "diced",
  "minced",
  "sliced",
  "to",
  "taste",
  "handful",
  "of",
]);

const PANTRY_STAPLES = new Set([
  "salt",
  "pepper",
  "water",
  "olive oil",
  "oil",
  "black pepper",
  "sea salt",
]);

const INGREDIENT_ALIASES: Record<string, string> = {
  onions: "onion",
  carrots: "carrot",
  "bbq sauce": "barbecue sauce",
  "black beans": "black bean",
  "chickpeas, drained": "chickpea",
  chickpeas: "chickpea",
  "sea salt": "salt",
  peppers: "pepper",
  "olive oils": "olive oil",
};

const UNSAFE_FUZZY_PAIRS = new Set([
  "lemon::lime",
  "lime::lemon",
  "pepper::black pepper",
  "black pepper::pepper",
]);

function stripAccents(input: string) {
  return input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function stripLeadingMeasurement(input: string) {
  return input.replace(
    /^\s*[\d¼½¾⅓⅔⅛⅜⅝⅞./-]+\s*(?:x\s*)?(?:\b[a-zA-Z]+(?:\(s\))?\b\s*){0,3}/,
    "",
  );
}

function singularizeToken(token: string) {
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith("ses") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) {
    return token.slice(0, -1);
  }
  return token;
}

export function canonicalizeIngredientName(raw: string | undefined | null) {
  const start = stripLeadingMeasurement(stripAccents((raw ?? "").toLowerCase()));
  const cleaned = start
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[,+/]/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  const tokens = cleaned
    .split(" ")
    .map((token) => singularizeToken(token))
    .filter((token) => token && !NOISE_TOKENS.has(token));
  const base = tokens.join(" ").trim();
  if (!base) return "";
  return INGREDIENT_ALIASES[base] ?? base;
}

export function normalizeUnit(raw: string | undefined | null) {
  const unit = stripAccents((raw ?? "").trim().toLowerCase())
    .replace(/\(s\)\s*$/i, "")
    .replace(/[.]+$/g, "");
  if (!unit) return "";
  return UNIT_DEFS[unit]?.canonical ?? unit;
}

export function resolveUnit(raw: string | undefined | null) {
  const normalized = normalizeUnit(raw);
  if (!normalized) {
    return { normalized: "", group: "unitless" as UnitGroup, baseUnit: "", toBase: 1 };
  }
  const def = UNIT_DEFS[normalized];
  if (!def) {
    return { normalized, group: "unknown" as UnitGroup, baseUnit: normalized, toBase: 1 };
  }
  return {
    normalized: def.canonical,
    group: def.group,
    baseUnit: def.baseUnit,
    toBase: def.toBase,
  };
}

export function isPantryStaple(name: string | undefined | null) {
  const canonical = canonicalizeIngredientName(name);
  return PANTRY_STAPLES.has(canonical);
}

export function quantityInBaseUnit(
  quantity: number,
  unit: string | undefined | null,
  ingredientName: string | undefined | null,
) {
  const resolved = resolveUnit(unit);
  let nextQuantity = quantity;
  let group = resolved.group;
  let baseUnit = resolved.baseUnit;

  // Water is safe to convert 1g ~= 1ml.
  if (
    canonicalizeIngredientName(ingredientName) === "water" &&
    (resolved.normalized === "g" || resolved.normalized === "kg")
  ) {
    group = "volume";
    baseUnit = "ml";
  }

  if (resolved.group === "mass" || resolved.group === "volume") {
    nextQuantity *= resolved.toBase;
  }

  return {
    quantity: nextQuantity,
    unit: resolved.normalized,
    group,
    baseUnit,
  };
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: b.length + 1 }, () =>
    new Array<number>(a.length + 1).fill(0),
  );

  for (let i = 0; i <= b.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[b.length][a.length];
}

function tokenSet(input: string) {
  return new Set(input.split(" ").filter(Boolean));
}

function jaccard(a: Set<string>, b: Set<string>) {
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function areLikelySameIngredient(aRaw: string, bRaw: string) {
  const a = canonicalizeIngredientName(aRaw);
  const b = canonicalizeIngredientName(bRaw);
  if (!a || !b) return false;
  if (a === b) return true;
  if (UNSAFE_FUZZY_PAIRS.has(`${a}::${b}`)) return false;

  const aTokens = tokenSet(a);
  const bTokens = tokenSet(b);
  const overlap = jaccard(aTokens, bTokens);
  const editDistance = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  const editSimilarity = maxLen === 0 ? 0 : 1 - editDistance / maxLen;

  if (overlap >= 0.75 && editSimilarity >= 0.6) return true;
  if (editSimilarity >= 0.86) return true;
  return false;
}
