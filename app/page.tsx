import type { Metadata } from "next";
import { Suspense } from "react";
import { client } from "@/sanity/lib/client";
import { categoriesQuery, recipesQuery } from "@/sanity/lib/queries";
import { RecipesClientPage } from "./recipes/RecipesClientPage";

export const metadata: Metadata = {
  title: "Recipes | Brasserie",
  description: "Browse the full recipe layout view.",
};

export type Recipe = {
  _id: string;
  title?: string;
  slug?: { _type: "slug"; current: string };
  description?: string;
  image?: { _type: string; asset: { _ref: string; _type: string } };
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  categories?: { _id: string; name: string; slug?: { current: string } }[];
};

export type Category = {
  _id: string;
  name: string;
  slug?: { current?: string };
  image?: { _type: string; asset: { _ref: string; _type: string } };
};

export default async function RecipesPage() {
  const recipes = (await client.fetch(recipesQuery)) as Recipe[];
  const categories = (await client.fetch(categoriesQuery)) as Category[];

  return (
    <Suspense fallback={null}>
      <RecipesClientPage recipes={recipes} categories={categories} />
    </Suspense>
  );
}
