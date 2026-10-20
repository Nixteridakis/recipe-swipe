import { revalidatePath } from "next/cache";

export function revalidateRecipePages(slug?: string) {
  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/discover");

  if (slug) revalidateRecipePath(slug);
}

export function revalidateRecipePath(slug: string) {
  revalidatePath(`/recipe/${slug}`);
  revalidatePath(`/recipe/${slug}/edit`);
}
