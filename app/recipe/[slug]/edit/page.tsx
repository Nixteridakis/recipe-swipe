import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { TypedObject } from "@portabletext/types";
import { CreateRecipeForm, type EditableRecipe } from "@/app/create/CreateRecipeForm";
import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";
import { categoriesQuery, recipeBySlugQuery } from "@/sanity/lib/queries";

type RecipeResult = {
  _id: string;
  title?: string;
  slug?: { current?: string };
  description?: string;
  sourceUrl?: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  image?: { _type: string; asset: { _ref: string; _type: string } };
  categories?: Array<{ _id: string }>;
  ingredients?: Array<{
    quantity?: number;
    unit?: string;
    ingredient?: { _id?: string; name?: string };
  }>;
  instructions?: TypedObject[];
};

type Category = { _id: string; name: string };

function instructionText(instructions?: TypedObject[]) {
  if (!Array.isArray(instructions)) return [];
  return instructions.flatMap((block) => {
    if (!block || typeof block !== "object" || !("children" in block)) return [];
    const children = (block as { children?: Array<{ text?: string }> }).children;
    if (!Array.isArray(children)) return [];
    const text = children.map((child) => child.text ?? "").join("").trim();
    return text ? [text] : [];
  });
}

export const metadata: Metadata = {
  title: "Edit Recipe | Brasserie",
};

export default async function EditRecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [recipe, categories] = await Promise.all([
    client.withConfig({ useCdn: false }).fetch(
      recipeBySlugQuery,
      { slug },
      { cache: "no-store" },
    ) as Promise<RecipeResult | null>,
    client.fetch(categoriesQuery) as Promise<Category[]>,
  ]);

  if (!recipe) notFound();

  const editableRecipe: EditableRecipe = {
    _id: recipe._id,
    title: recipe.title,
    slug: recipe.slug?.current ?? slug,
    description: recipe.description,
    sourceUrl: recipe.sourceUrl,
    servings: recipe.servings,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    imageUrl: recipe.image ? urlFor(recipe.image).width(480).height(360).url() : undefined,
    categoryIds: recipe.categories?.map((category) => category._id) ?? [],
    ingredients:
      recipe.ingredients?.flatMap((ingredient) =>
        ingredient.ingredient?.name
          ? [{
              name: ingredient.ingredient.name,
              quantity: ingredient.quantity ?? 0,
              unit: ingredient.unit,
              referenceId: ingredient.ingredient._id,
            }]
          : [],
      ) ?? [],
    instructions: instructionText(recipe.instructions),
  };

  return <CreateRecipeForm categories={categories} initialRecipe={editableRecipe} />;
}
