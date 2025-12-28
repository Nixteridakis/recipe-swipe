"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { DiscoverSwiper } from "./DiscoverSwiper";
import styles from "./discover-experience.module.css";

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

type CategoryFilter = {
  id: string;
  label: string;
  slug?: string;
  imageUrl?: string | null;
};

type DiscoverExperienceProps = {
  recipes: DiscoverRecipe[];
  imageByRef: Record<string, string>;
};

export function DiscoverExperience({ recipes, imageByRef }: DiscoverExperienceProps) {
  const [activeFilter, setActiveFilter] = useState("all");

  const categoryFilters = useMemo<CategoryFilter[]>(() => {
    const categoryMap = new Map<string, CategoryFilter>();

    for (const recipe of recipes) {
      const imageRef = recipe.image?.asset?._ref;
      const imageUrl = imageRef ? imageByRef[imageRef] : null;

      for (const category of recipe.categories ?? []) {
        const slug = category.slug?.current;
        const id = slug ? `cat-${slug}` : `cat-${category._id}`;
        if (categoryMap.has(id)) continue;

        categoryMap.set(id, {
          id,
          label: category.name,
          slug,
          imageUrl,
        });
      }
    }

    return [
      {
        id: "all",
        label: "All",
        imageUrl: recipes[0]?.image?.asset?._ref
          ? imageByRef[recipes[0].image.asset._ref]
          : null,
      },
      ...Array.from(categoryMap.values()),
    ];
  }, [recipes, imageByRef]);

  const filteredRecipes = useMemo(() => {
    if (activeFilter === "all") return recipes;

    const selected = categoryFilters.find((filter) => filter.id === activeFilter);
    if (!selected?.slug) return recipes;

    return recipes.filter((recipe) =>
      recipe.categories?.some((category) => category.slug?.current === selected.slug),
    );
  }, [activeFilter, categoryFilters, recipes]);

  return (
    <section className={styles.section}>
      <div className={styles.filterBar} role="tablist" aria-label="Recipe category filters">
        {categoryFilters.map((filter) => {
          const isActive = filter.id === activeFilter;
          return (
            <button
              key={filter.id}
              type="button"
              className={`${styles.filterChip} ${isActive ? styles.filterChipActive : ""}`}
              onClick={() => setActiveFilter(filter.id)}
              role="tab"
              aria-selected={isActive}
            >
              <span className={styles.filterImageWrap}>
                {filter.imageUrl ? (
                  <Image
                    fill
                    src={filter.imageUrl}
                    alt={filter.label}
                    sizes="96px"
                    className={styles.filterImage}
                  />
                ) : (
                  <span className={styles.filterImageFallback} />
                )}
              </span>
              <span className={styles.filterLabel}>{filter.label}</span>
            </button>
          );
        })}
      </div>

      <DiscoverSwiper recipes={filteredRecipes} imageByRef={imageByRef} />
    </section>
  );
}
