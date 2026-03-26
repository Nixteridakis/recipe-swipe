import type { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";
import { recipesQuery } from "@/sanity/lib/queries";
import { DiscoverSwiper } from "../DiscoverSwiper";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "Discover Recipes | Brasserie",
  description: "Flick through wildcard recipe cards in randomized cycles.",
};

type DiscoverRecipe = {
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

export default async function DiscoverPage() {
  const recipes = (await client.fetch(recipesQuery)) as DiscoverRecipe[];
  const imageByRef: Record<string, string> = {};

  for (const recipe of recipes) {
    const image = recipe.image;
    const imageRef = image?.asset?._ref;
    if (image && imageRef && !imageByRef[imageRef]) {
      imageByRef[imageRef] = urlFor(image).width(900).height(1200).url();
    }
  }

  return (
    <main className={styles.main}>
      <DiscoverSwiper recipes={recipes} imageByRef={imageByRef} />
    </main>
  );
}

