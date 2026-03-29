export const runtime = "nodejs";

import { createClient } from "next-sanity";
import { NextResponse } from "next/server";
import { createHash } from "crypto";

import { apiVersion, dataset, projectId } from "@/sanity/env";

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

type CreateRecipeBody = {
  url?: unknown;
  recipe?: unknown;
};

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function slugify(input: string) {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return (base || "untitled").slice(0, 96);
}

function sha1(input: string) {
  return createHash("sha1").update(input).digest("hex");
}

function clampIntegerAtLeastOne(n: number) {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.round(n));
}

const ALLOWED_UNIT_VALUES = new Set([
  "piece",
  "cup",
  "tbsp",
  "tsp",
  "g",
  "kg",
  "oz",
  "lb",
  "ml",
  "l",
  "pinch",
  "clove",
  "bunch",
  "can",
  "package",
]);

function normalizeSanityUnit(unit: unknown): string | undefined {
  if (typeof unit !== "string") return undefined;
  const u = unit.trim();
  if (!u) return undefined;
  return ALLOWED_UNIT_VALUES.has(u) ? u : undefined;
}

function computeIngredientQuantity(ing: ParsedIngredient) {
  const min = ing.quantityMin;
  const max = ing.quantityMax;
  if (min != null && max != null) {
    // Average ranges; keep it simple for now.
    return (min + max) / 2;
  }
  if (min != null) return min;
  if (max != null) return max;

  // Sanity schema requires quantity.
  const name = ing.item.toLowerCase();
  if (name.includes("salt") || name.includes("pepper")) return 1;
  return 1;
}

function instructionsToPortableText(steps: string[]) {
  return steps
    .map((text, idx) => ({ text, idx }))
    .filter(({ text }) => text.trim().length > 0)
    .map(({ text, idx }) => ({
      _type: "block",
      style: "normal",
      markDefs: [],
      _key: `step-${idx}-${sha1(text).slice(0, 10)}`,
      children: [
        {
          _type: "span",
          text,
          _key: `span-${idx}-${sha1(text).slice(0, 10)}`,
        },
      ],
    }));
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as CreateRecipeBody | null;
  const url = typeof body?.url === "string" ? body.url : null;
  const rawRecipe = body?.recipe;

  if (!url || !isRecord(rawRecipe)) {
    return cors(
      NextResponse.json(
        {
          error: "bad_request",
          message: "Something was wrong with the save request. Go back to Import and parse the recipe again.",
        },
        { status: 400 }
      )
    );
  }

  const recipe = rawRecipe as ParsedRecipe;
  if (typeof recipe.title !== "string" || recipe.title.trim().length === 0) {
    recipe.title = "Untitled recipe";
  }
  const title = recipe.title;
  const recipeId = `recipe-import-${sha1(url)}`;
  const desiredSlug = slugify(title);

  const writeToken = process.env.SANITY_WRITE_TOKEN;
  if (!writeToken) {
    return cors(
      NextResponse.json(
        {
          error: "missing_write_token",
          message:
            "Recipe saving isn’t configured: add SANITY_WRITE_TOKEN to the server environment (e.g. .env.local) so Studio can create documents.",
        },
        { status: 500 }
      )
    );
  }

  const writeClient = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token: writeToken,
  });

  const ingredientLines = Array.isArray(recipe.ingredients)
    ? recipe.ingredients
    : [];

  const ingredientNames = Array.from(
    new Set(
      ingredientLines
        .map((i) => i.item?.trim())
        .filter((x): x is string => Boolean(x))
    )
  );

  const existingIngredients: { _id: string; name: string }[] =
    ingredientNames.length > 0
      ? await writeClient.fetch(
          '*[_type == "ingredient" && name in $names]{_id, name}',
          { names: ingredientNames }
        )
      : [];

  const ingredientIdByName = new Map(
    existingIngredients.map((x) => [x.name, x._id] as const)
  );

  const ingredientsToCreate = ingredientNames.filter(
    (name) => !ingredientIdByName.has(name)
  );

  // Create missing ingredients with deterministic IDs so the recipe can reference them immediately.
  for (const name of ingredientsToCreate) {
    const firstMatch = ingredientLines.find((i) => i.item === name);
    const unit = normalizeSanityUnit(firstMatch?.unit) ?? "piece";

    const ingredientId = `ingredient-import-${sha1(name)}`;
    ingredientIdByName.set(name, ingredientId);

    await writeClient.create({
      _id: ingredientId,
      _type: "ingredient",
      name,
      category: "other",
      defaultUnit: unit,
    });
  }

  const ingredientsForRecipe = ingredientLines
    .map((ing, idx) => {
      const ingredientName = ing.item?.trim();
      if (!ingredientName) return null;

      const ingredientRefId = ingredientIdByName.get(ingredientName);
      if (!ingredientRefId) return null;

      const quantity = computeIngredientQuantity(ing);
      const unit = normalizeSanityUnit(ing.unit);

      return {
        _key: `ing-${idx}-${sha1(`${ingredientName}-${quantity}`).slice(0, 12)}`,
        ingredient: { _type: "reference", _ref: ingredientRefId },
        quantity,
        ...(unit ? { unit } : {}),
      };
    })
    .filter(
      (x): x is {
        _key: string;
        ingredient: { _type: "reference"; _ref: string };
        quantity: number;
        unit?: string;
      } => x != null
    );

  const recipeBlocks = instructionsToPortableText(
    Array.isArray(recipe.instructions) ? recipe.instructions : []
  );

  let imageRef: { _type: "image"; asset: { _type: "reference"; _ref: string } } | null = null;
  const imageUrl = Array.isArray(recipe.image) && typeof recipe.image[0] === "string" ? recipe.image[0] : null;
  if (imageUrl) {
    try {
      const imgRes = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RecipeBook/1.0)",
          Accept: "image/*",
        },
      });
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const contentType = imgRes.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
        const ext = contentType.replace("image/", "") || "jpg";
        const asset = await writeClient.assets.upload("image", buffer, {
          filename: `${desiredSlug}.${ext}`,
          contentType: contentType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
        });
        imageRef = { _type: "image", asset: { _type: "reference", _ref: asset._id } };
      }
    } catch {
      // leave imageRef null if fetch/upload fails
    }
  }

  const recipeDoc = {
    _id: recipeId,
    _type: "recipe",
    title,
    slug: { _type: "slug", current: desiredSlug },
    description: typeof recipe.description === "string" ? recipe.description : undefined,
    sourceUrl: url,
    ...(imageRef ? { image: imageRef } : {}),
    servings: clampIntegerAtLeastOne(recipe.servings ?? 1),
    ...(recipe.prepTimeMin != null ? { prepTime: recipe.prepTimeMin } : {}),
    ...(recipe.cookTimeMin != null ? { cookTime: recipe.cookTimeMin } : {}),
    ingredients: ingredientsForRecipe,
    instructions: recipeBlocks,
  };

  const existingRecipe = await writeClient.fetch(
    '*[_id == $id][0]{_id}',
    { id: recipeId }
  );

  let updated = false;
  if (existingRecipe?._id) {
    await writeClient
      .patch(recipeId)
      .set({
        title,
        slug: { _type: "slug", current: desiredSlug },
        description: recipeDoc.description,
        sourceUrl: url,
        servings: recipeDoc.servings,
        ...(imageRef ? { image: imageRef } : {}),
        ...(recipe.prepTimeMin != null ? { prepTime: recipe.prepTimeMin } : {}),
        ...(recipe.cookTimeMin != null ? { cookTime: recipe.cookTimeMin } : {}),
        ingredients: ingredientsForRecipe,
        instructions: recipeBlocks,
      })
      .commit();
    updated = true;
  } else {
    await writeClient.create(recipeDoc);
  }

  return cors(
    NextResponse.json({
      ok: true,
      recipeId,
      slug: desiredSlug,
      updated,
    })
  );
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

