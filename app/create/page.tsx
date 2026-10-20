import type { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import { categoriesQuery } from "@/sanity/lib/queries";
import { CreateRecipeForm } from "./CreateRecipeForm";

export const metadata: Metadata = {
  title: "Create Recipe | Brasserie",
  description: "Add a recipe directly to your Brasserie collection.",
};

type Category = {
  _id: string;
  name: string;
};

export default async function CreateRecipePage() {
  const categories = (await client.fetch(categoriesQuery)) as Category[];
  return <CreateRecipeForm categories={categories} />;
}
