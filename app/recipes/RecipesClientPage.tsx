"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { urlFor } from "@/sanity/lib/image";
import { AddToCartButton } from "../AddToCartButton";
import { AppIcon } from "../AppIcon";
import type { Category, Recipe } from "./page";
import styles from "./page.module.css";

type RecipesClientPageProps = {
  recipes: Recipe[];
  categories: Category[];
};

export function RecipesClientPage({ recipes, categories }: RecipesClientPageProps) {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? undefined;

  const filteredRecipes = useMemo(
    () =>
      category && category.trim()
        ? recipes.filter((recipe) =>
            recipe.categories?.some((recipeCategory) => recipeCategory.slug?.current === category),
          )
        : recipes,
    [recipes, category],
  );

  const categoryFilters = useMemo(
    () => [
      {
        id: "all",
        label: "All",
        slug: undefined as string | undefined,
        image: recipes[0]?.image,
      },
      ...categories.map((sanityCategory) => {
        const categorySlug = sanityCategory.slug?.current;
        const previewRecipe = categorySlug
          ? recipes.find((recipe) =>
              recipe.categories?.some(
                (recipeCategory) => recipeCategory.slug?.current === categorySlug,
              ),
            )
          : undefined;

        return {
          id: categorySlug ?? sanityCategory._id,
          label: sanityCategory.name,
          slug: categorySlug,
          image: sanityCategory.image ?? previewRecipe?.image,
        };
      }),
    ],
    [recipes, categories],
  );

  const featuredRecipe = filteredRecipes[0] ?? null;
  const supportingRecipes = filteredRecipes.slice(1, 7);

  return (
    <main className={styles.main}>
      <section className={styles.filterSection}>
        <div className={styles.filterBar} role="tablist" aria-label="Recipe categories">
          {categoryFilters.map((filter) => {
            const isActive = (!category && filter.slug == null) || category === filter.slug;
            const imageUrl = filter.image
              ? urlFor(filter.image).width(160).height(160).url()
              : null;

            return (
              <Link
                key={filter.id}
                href={filter.slug ? `/?category=${encodeURIComponent(filter.slug)}` : "/"}
                className={`${styles.filterChip} ${isActive ? styles.filterChipActive : ""}`}
                role="tab"
                aria-selected={isActive}
              >
                <span className={styles.filterImageWrap}>
                  {imageUrl ? (
                    <Image
                      fill
                      src={imageUrl}
                      alt={filter.label}
                      sizes="96px"
                      className={styles.filterImage}
                    />
                  ) : (
                    <span className={styles.filterImageFallback} />
                  )}
                </span>
                <span className={styles.filterLabel}>{filter.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {filteredRecipes.length === 0 ? (
        <section className={styles.emptyState}>
          <span className={styles.kicker}>No Recipes Found</span>
          <h2 className={styles.emptyTitle}>Nothing in this category yet.</h2>
          <p className={styles.empty}>
            Try another category from Discover, or add recipes in{" "}
            <Link href="/studio" className={styles.inlineLink}>
              /studio
            </Link>
            .
          </p>
          <Link href="/" className={styles.secondaryAction}>
            Show all recipes
          </Link>
        </section>
      ) : (
        <section className={styles.grid}>
          {featuredRecipe ? (
            <article className={styles.featuredCard}>
              <AddToCartButton
                className={styles.quickAddButton}
                recipe={{
                  _id: featuredRecipe._id,
                  title: featuredRecipe.title,
                  slug: featuredRecipe.slug,
                  imageRef: featuredRecipe.image?.asset?._ref,
                }}
              />
              <Link
                href={
                  featuredRecipe.slug?.current ? `/recipe/${featuredRecipe.slug.current}` : "/"
                }
                className={styles.featuredLink}
              >
                {featuredRecipe.image ? (
                  <div className={styles.featuredImageWrap}>
                    <Image
                      fill
                      priority
                      src={urlFor(featuredRecipe.image).width(1200).height(900).url()}
                      alt={featuredRecipe.title ?? "Featured recipe"}
                      sizes="(max-width: 1100px) 100vw, 800px"
                      className={styles.featuredImage}
                    />
                  </div>
                ) : (
                  <div className={styles.featuredImageFallback} />
                )}

                <div className={styles.featuredOverlay}>
                  {featuredRecipe.categories?.[0]?.name ? (
                    <span className={styles.featuredBadge}>
                      {featuredRecipe.categories[0].name}
                    </span>
                  ) : null}
                  <h2 className={styles.featuredTitle}>
                    {featuredRecipe.title ?? "Untitled recipe"}
                  </h2>
                  {featuredRecipe.description ? (
                    <p className={styles.featuredDescription}>
                      {featuredRecipe.description}
                    </p>
                  ) : null}
                  <div className={styles.featuredMeta}>
                    {featuredRecipe.prepTime != null ? (
                      <span>
                        <AppIcon name="clock" className={styles.metaIcon} />
                        Prep {featuredRecipe.prepTime} min
                      </span>
                    ) : null}
                    {featuredRecipe.cookTime != null ? (
                      <span>
                        <AppIcon name="sparkles" className={styles.metaIcon} />
                        Cook {featuredRecipe.cookTime} min
                      </span>
                    ) : null}
                    {featuredRecipe.servings != null ? (
                      <span>
                        <AppIcon name="user" className={styles.metaIcon} />
                        {featuredRecipe.servings} servings
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            </article>
          ) : null}

          <aside className={styles.editorialCard}>
            <span className={styles.kicker}>Discover Flow</span>
            <h2 className={styles.editorialTitle}>Need inspiration first?</h2>
            <p className={styles.editorialText}>
              Jump back to Discover to flick through wildcard category cards and come
              back here filtered.
            </p>
            <div className={styles.editorialLinks}>
              <Link href="/discover" className={styles.cardAction}>
                <span>Open discover</span>
                <AppIcon name="arrow-right" className={styles.actionIcon} />
              </Link>
            </div>
          </aside>

          <ul className={styles.list}>
            {supportingRecipes.map((recipe) => {
              const imageUrl = recipe.image
                ? urlFor(recipe.image).width(600).height(700).url()
                : null;
              const imageRef = recipe.image?.asset?._ref;

              return (
                <li key={recipe._id} className={styles.card}>
                  <AddToCartButton
                    className={styles.quickAddButton}
                    recipe={{
                      _id: recipe._id,
                      title: recipe.title,
                      slug: recipe.slug,
                      imageRef,
                    }}
                  />
                  <Link
                    href={recipe.slug?.current ? `/recipe/${recipe.slug.current}` : "/"}
                    className={styles.cardLink}
                  >
                    <div className={styles.imageWrapper}>
                      {imageUrl ? (
                        <Image
                          fill
                          src={imageUrl}
                          alt={recipe.title ?? "Recipe"}
                          sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 360px"
                          className={styles.cardImage}
                        />
                      ) : (
                        <div className={styles.cardImageFallback} />
                      )}
                      {recipe.categories?.[0]?.name ? (
                        <span className={styles.cardBadge}>
                          {recipe.categories[0].name}
                        </span>
                      ) : null}
                    </div>

                    <div className={styles.cardBody}>
                      <h3 className={styles.cardTitle}>
                        {recipe.title ?? "(Untitled)"}
                      </h3>
                      {recipe.description ? (
                        <p className={styles.cardDescription}>{recipe.description}</p>
                      ) : null}
                      <div className={styles.cardMeta}>
                        {recipe.prepTime != null ? <span>{recipe.prepTime} min prep</span> : null}
                        {recipe.cookTime != null ? <span>{recipe.cookTime} min cook</span> : null}
                        {recipe.servings != null ? <span>{recipe.servings} servings</span> : null}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}

