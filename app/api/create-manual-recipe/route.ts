export const runtime = "nodejs";

import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { canonicalizeIngredientName } from "@/lib/ingredient-normalization";
import { fetchPublicImage } from "@/lib/safe-remote-image";
import { getSanityWriteClient } from "@/sanity/lib/write-client";

type IngredientInput = {
  name?: unknown;
  quantity?: unknown;
  unit?: unknown;
};

const ALLOWED_UNITS = new Set([
  "piece", "cup", "tbsp", "tsp", "g", "kg", "oz", "lb", "ml", "l",
  "pinch", "clove", "bunch", "can", "package",
]);
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "untitled-recipe";
}

function hash(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

function parseJsonArray(value: FormDataEntryValue | null): unknown[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function optionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function portableTextSteps(steps: string[]) {
  return steps.map((text, index) => ({
    _type: "block",
    _key: `step-${index}-${hash(text).slice(0, 8)}`,
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: `span-${index}`, text, marks: [] }],
  }));
}

function serverConfigurationError() {
  return NextResponse.json(
    {
      error: "write_not_configured",
      message: "Recipe saving is not configured on this server. Add a valid Sanity write token.",
    },
    { status: 503 },
  );
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "bad_request", message: "Invalid form submission." }, { status: 400 });
  }

  const writeClient = getSanityWriteClient();
  if (!writeClient) return serverConfigurationError();

  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const sourceUrl = String(form.get("sourceUrl") ?? "").trim();
  const imageUrl = String(form.get("imageUrl") ?? "").trim();
  const servings = optionalNumber(form.get("servings"));
  const prepTime = optionalNumber(form.get("prepTime"));
  const cookTime = optionalNumber(form.get("cookTime"));
  const categoryIds = parseJsonArray(form.get("categoryIds")).filter(
    (value): value is string => typeof value === "string" && Boolean(value),
  );
  const instructions = parseJsonArray(form.get("instructions"))
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  const ingredientInputs = parseJsonArray(form.get("ingredients")).filter(
    (value): value is IngredientInput => value !== null && typeof value === "object" && !Array.isArray(value),
  );

  if (!title) {
    return NextResponse.json({ error: "validation", message: "Recipe name is required." }, { status: 400 });
  }
  if (title.length > 160 || description.length > 2_000) {
    return NextResponse.json({ error: "validation", message: "The recipe name or description is too long." }, { status: 400 });
  }
  if (!servings || servings < 1 || !Number.isInteger(servings)) {
    return NextResponse.json({ error: "validation", message: "Servings must be a whole number of at least 1." }, { status: 400 });
  }
  if ((prepTime != null && prepTime < 0) || (cookTime != null && cookTime < 0)) {
    return NextResponse.json({ error: "validation", message: "Preparation and cooking times cannot be negative." }, { status: 400 });
  }

  const ingredients = ingredientInputs
    .map((ingredient) => ({
      name: typeof ingredient.name === "string" ? ingredient.name.trim() : "",
      quantity: Number(ingredient.quantity),
      unit: typeof ingredient.unit === "string" ? ingredient.unit.trim() : "",
    }))
    .filter((ingredient) => ingredient.name);

  if (!ingredients.length || ingredients.some((ingredient) => !Number.isFinite(ingredient.quantity) || ingredient.quantity < 0)) {
    return NextResponse.json(
      { error: "validation", message: "Add at least one ingredient with a valid quantity." },
      { status: 400 },
    );
  }
  if (ingredients.some((ingredient) => !canonicalizeIngredientName(ingredient.name))) {
    return NextResponse.json({ error: "validation", message: "One or more ingredient names are invalid." }, { status: 400 });
  }
  if (ingredients.some((ingredient) => ingredient.unit && !ALLOWED_UNITS.has(ingredient.unit))) {
    return NextResponse.json({ error: "validation", message: "One or more ingredient units are invalid." }, { status: 400 });
  }
  if (!instructions.length) {
    return NextResponse.json({ error: "validation", message: "Add at least one instruction step." }, { status: 400 });
  }

  try {
    const baseSlug = slugify(title);
    const existingSlugs = await writeClient.fetch<string[]>(
      '*[_type == "recipe" && slug.current match $slugPrefix].slug.current',
      { slugPrefix: `${baseSlug}*` },
    );
    let slug = baseSlug;
    let suffix = 2;
    while (existingSlugs.includes(slug)) slug = `${baseSlug}-${suffix++}`;

    const normalizedIngredients = ingredients
      .map((ingredient) => ({ ...ingredient, canonical: canonicalizeIngredientName(ingredient.name) }))
      .filter((ingredient) => ingredient.canonical);
    const canonicals = Array.from(new Set(normalizedIngredients.map((ingredient) => ingredient.canonical)));
    const existingIngredients = await writeClient.fetch<Array<{ _id: string; name: string; canonicalName?: string }>>(
      '*[_type == "ingredient" && (canonicalName in $canonicals || lower(name) in $canonicals)]{_id, name, canonicalName}',
      { canonicals },
    );
    const ingredientIdByCanonical = new Map(
      existingIngredients.map((ingredient) => [
        canonicalizeIngredientName(ingredient.canonicalName ?? ingredient.name),
        ingredient._id,
      ]),
    );

    for (const ingredient of normalizedIngredients) {
      if (ingredientIdByCanonical.has(ingredient.canonical)) continue;
      const ingredientId = `ingredient-manual-${hash(ingredient.canonical)}`;
      await writeClient.createIfNotExists({
        _id: ingredientId,
        _type: "ingredient",
        name: ingredient.name,
        canonicalName: ingredient.canonical,
        category: "other",
        defaultUnit: ingredient.unit || "piece",
      });
      ingredientIdByCanonical.set(ingredient.canonical, ingredientId);
    }

    const ingredientRefs = normalizedIngredients.map((ingredient, index) => ({
      _key: `ingredient-${index}-${hash(`${ingredient.canonical}-${index}`).slice(0, 8)}`,
      ingredient: { _type: "reference", _ref: ingredientIdByCanonical.get(ingredient.canonical) },
      quantity: ingredient.quantity,
      ...(ingredient.unit ? { unit: ingredient.unit } : {}),
    }));

    let image: { _type: "image"; asset: { _type: "reference"; _ref: string } } | undefined;
    const imageFile = form.get("imageFile");
    let imageBuffer: Buffer | undefined;
    let contentType: string | undefined;
    let filename = `${slug}.jpg`;

    if (imageFile instanceof File && imageFile.size > 0) {
      if (imageFile.size > MAX_IMAGE_BYTES || !ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
        return NextResponse.json(
          { error: "validation", message: "Upload a JPG, PNG, WebP, or GIF image smaller than 10 MB." },
          { status: 400 },
        );
      }
      imageBuffer = Buffer.from(await imageFile.arrayBuffer());
      contentType = imageFile.type;
      filename = imageFile.name || filename;
    } else if (imageUrl) {
      const response = await fetchPublicImage(imageUrl);
      const length = Number(response.headers.get("content-length") ?? 0);
      contentType = response.headers.get("content-type")?.split(";")[0];
      if (!response.ok || !contentType || !ALLOWED_IMAGE_TYPES.has(contentType) || length > MAX_IMAGE_BYTES) {
        throw new Error("INVALID_IMAGE_URL");
      }
      imageBuffer = Buffer.from(await response.arrayBuffer());
      if (imageBuffer.byteLength > MAX_IMAGE_BYTES) throw new Error("INVALID_IMAGE_URL");
    }

    if (imageBuffer && contentType) {
      const asset = await writeClient.assets.upload("image", imageBuffer, { filename, contentType });
      image = { _type: "image", asset: { _type: "reference", _ref: asset._id } };
    }

    const validCategoryIds = categoryIds.length
      ? await writeClient.fetch<string[]>('*[_type == "category" && _id in $ids]._id', { ids: categoryIds })
      : [];

    const created = await writeClient.create({
      _id: `recipe-manual-${hash(slug)}`,
      _type: "recipe",
      title,
      slug: { _type: "slug", current: slug },
      ...(description ? { description } : {}),
      ...(sourceUrl ? { sourceUrl } : {}),
      ...(image ? { image } : {}),
      servings,
      ...(prepTime != null ? { prepTime } : {}),
      ...(cookTime != null ? { cookTime } : {}),
      ingredients: ingredientRefs,
      instructions: portableTextSteps(instructions),
      categories: validCategoryIds.map((id) => ({ _type: "reference", _key: hash(id).slice(0, 12), _ref: id })),
    });

    return NextResponse.json({ ok: true, recipeId: created._id, slug });
  } catch (error) {
    console.error("create-manual-recipe failed:", error);
    if (error instanceof Error && error.message === "INVALID_IMAGE_URL") {
      return NextResponse.json(
        { error: "invalid_image", message: "The image URL did not return a supported image smaller than 10 MB." },
        { status: 400 },
      );
    }
    const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
    if (statusCode === 401 || statusCode === 403) return serverConfigurationError();
    return NextResponse.json(
      { error: "create_failed", message: "The recipe could not be saved. Please try again." },
      { status: 500 },
    );
  }
}
