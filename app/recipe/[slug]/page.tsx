import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortableText } from "@portabletext/react";
import type { TypedObject } from "@portabletext/types";
import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";
import { recipeBySlugQuery } from "@/sanity/lib/queries";
import { AppIcon } from "@/app/AppIcon";
import styles from "./page.module.css";

type RecipeIngredient = {
  _key: string;
  quantity: number;
  unit?: string;
  ingredient?: {
    _id: string;
    name: string;
    category?: string;
    defaultUnit?: string;
  };
};

type Recipe = {
  _id: string;
  title?: string;
  slug?: { _type: "slug"; current: string };
  description?: string;
  sourceUrl?: string;
  image?: { _type: string; asset: { _ref: string; _type: string } };
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  ingredients?: RecipeIngredient[];
  instructions?: TypedObject[];
  categories?: { _id: string; name: string; slug?: { current: string } }[];
};

async function getRecipeBySlug(slug: string) {
  return (await client.fetch(recipeBySlugQuery, { slug })) as Recipe | null;
}

const portableTextComponents = {
  block: {
    normal: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote>{children}</blockquote>
    ),
  },
  list: {
    number: ({ children }: { children?: React.ReactNode }) => (
      <ol>{children}</ol>
    ),
    bullet: ({ children }: { children?: React.ReactNode }) => (
      <ul>{children}</ul>
    ),
  },
  listItem: {
    number: ({ children }: { children?: React.ReactNode }) => (
      <li>{children}</li>
    ),
    bullet: ({ children }: { children?: React.ReactNode }) => (
      <li>{children}</li>
    ),
  },
  marks: {
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong>{children}</strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => <em>{children}</em>,
  },
};

function formatIngredient(ing: RecipeIngredient): string {
  const name = ing.ingredient?.name ?? "Unknown";
  const parts: string[] = [];
  if (ing.quantity != null && ing.quantity > 0) {
    parts.push(ing.quantity.toString());
  }
  if (ing.unit) {
    parts.push(ing.unit);
  }
  return parts.length ? `${parts.join(" ")} ${name}` : name;
}

function extractInstructionSteps(instructions?: TypedObject[]): string[] {
  if (!Array.isArray(instructions)) return [];

  return instructions.flatMap((block) => {
    if (!block || typeof block !== "object" || !("children" in block)) {
      return [];
    }

    const children = (block as { children?: Array<{ text?: string }> }).children;
    if (!Array.isArray(children)) return [];

    const text = children
      .map((child) => child.text ?? "")
      .join("")
      .replace(/\s+/g, " ")
      .trim();

    return text ? [text] : [];
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);

  if (!recipe) {
    return {
      title: "Recipe Not Found | Brasserie",
      description: "This Brasserie recipe could not be found.",
    };
  }

  return {
    title: recipe.title ? `${recipe.title} | Brasserie` : "Recipe | Brasserie",
    description:
      recipe.description ?? "Editorial recipe details, ingredients, and preparation steps.",
  };
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);

  if (!recipe) {
    notFound();
  }

  const imageUrl = recipe.image
    ? urlFor(recipe.image).width(800).height(450).url()
    : null;
  const instructionSteps = extractInstructionSteps(recipe.instructions);

  return (
    <main className={styles.main}>
      <Link href="/" className={styles.backLink}>
        <AppIcon name="arrow-right" className={styles.backIcon} />
        <span>Back to recipes</span>
      </Link>

      <article className={styles.article}>
        <header className={styles.hero}>
          {imageUrl ? (
            <div className={styles.heroImageWrap}>
              <Image
                fill
                src={imageUrl}
                alt={recipe.title ?? "Recipe"}
                sizes="(max-width: 1100px) 100vw, 1200px"
                priority
                className={styles.heroImage}
              />
            </div>
          ) : (
            <div className={styles.heroFallback} />
          )}

          <div className={styles.heroOverlay}>
            <div className={styles.heroCard}>
              {recipe.categories?.[0]?.name ? (
                <span className={styles.categoryTag}>{recipe.categories[0].name}</span>
              ) : null}
              <h1 className={styles.title}>{recipe.title ?? "Untitled recipe"}</h1>
              {recipe.description ? (
                <p className={styles.description}>{recipe.description}</p>
              ) : null}
              <div className={styles.meta}>
                {recipe.prepTime != null ? (
                  <span>
                    <AppIcon name="clock" className={styles.metaIcon} />
                    Prep {recipe.prepTime} min
                  </span>
                ) : null}
                {recipe.cookTime != null ? (
                  <span>
                    <AppIcon name="sparkles" className={styles.metaIcon} />
                    Cook {recipe.cookTime} min
                  </span>
                ) : null}
                {recipe.servings != null ? (
                  <span>
                    <AppIcon name="user" className={styles.metaIcon} />
                    {recipe.servings} servings
                  </span>
                ) : null}
              </div>
              {recipe.sourceUrl ? (
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.sourceLink}
                >
                  <span>Open source</span>
                  <AppIcon name="arrow-right" className={styles.metaIcon} />
                </a>
              ) : null}
            </div>
          </div>
        </header>

        <div className={styles.contentGrid}>
          <aside className={styles.sidebar}>
            <section className={styles.ingredientsCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionAccent} />
                <h2 className={styles.sectionTitle}>Ingredients</h2>
              </div>
              {recipe.ingredients?.length ? (
                <ul className={styles.ingredientList}>
                  {recipe.ingredients.map((ing) => (
                    <li key={ing._key} className={styles.ingredientItem}>
                      <span className={styles.ingredientBullet}>
                        <AppIcon name="sparkles" className={styles.ingredientBulletIcon} />
                      </span>
                      <span>{formatIngredient(ing)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.emptyCopy}>No ingredients have been added yet.</p>
              )}
            </section>

            <section className={styles.noteCard}>
              <span className={styles.noteLabel}>Kitchen Note</span>
              <p className={styles.noteText}>
                Use the ingredient list as your mise en place. The layout follows the
                prototype split: ingredients stay anchored while the method carries the
                editorial rhythm.
              </p>
            </section>
          </aside>

          <section className={styles.instructionsColumn}>
            <div className={styles.instructionsIntro}>
              <span className={styles.kicker}>Preparation Steps</span>
              <h2 className={styles.instructionsTitle}>Cook it clean, step by step.</h2>
            </div>

            {instructionSteps.length ? (
              <ol className={styles.steps}>
                {instructionSteps.map((step, index) => (
                  <li key={`${step.slice(0, 48)}-${step.length}`} className={styles.step}>
                    <span className={styles.stepNumber}>{index + 1}</span>
                    <div className={styles.stepBody}>
                      <h3 className={styles.stepTitle}>Step {index + 1}</h3>
                      <p className={styles.stepText}>{step}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : recipe.instructions?.length ? (
              <div className={styles.prose}>
                <PortableText
                  value={recipe.instructions}
                  components={portableTextComponents}
                />
              </div>
            ) : (
              <p className={styles.emptyCopy}>No instructions have been added yet.</p>
            )}
          </section>
        </div>
      </article>
    </main>
  );
}
