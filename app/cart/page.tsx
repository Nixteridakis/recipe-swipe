"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { client } from "@/sanity/lib/client";
import { recipesByIdsQuery } from "@/sanity/lib/queries";
import { AppIcon } from "../AppIcon";
import { useCart } from "../cart-context";
import { CompositionRing } from "./CompositionRing";
import styles from "./page.module.css";

type ShoppingIngredient = {
  _key: string;
  quantity?: number;
  unit?: string;
  ingredient?: {
    _id?: string;
    name?: string;
    /** Sanity slug: produce, meat-seafood, pantry, etc. */
    category?: string;
  };
};

type ShoppingRecipe = {
  _id: string;
  title?: string;
  ingredients?: ShoppingIngredient[];
};

type AggregatedIngredient = {
  id: string;
  ingredientId: string;
  name: string;
  category: string;
  /** Raw Sanity category slug for composition buckets */
  categorySlug?: string;
  unit: string;
  quantity: number;
  recipes: Set<string>;
  unitConflict: boolean;
};

function normalizeUnit(unit?: string) {
  return (unit ?? "").trim().toLowerCase();
}

function normalizeCategory(category?: string) {
  const c = (category ?? "").trim();
  return c ? c[0].toUpperCase() + c.slice(1) : "Other";
}

const PLANTS_WEEK_GOAL = 30;

/** Map ingredient category slugs to the three composition segments (prototype). */
function compositionBucket(
  slug?: string,
): "produce" | "protein" | "pantry" {
  const s = (slug ?? "").toLowerCase();
  if (s === "produce") return "produce";
  if (s === "meat-seafood" || s === "dairy") return "protein";
  return "pantry";
}

function formatQuantity(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

export default function CartPage() {
  const { items, removeFromCart, clearCart } = useCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [recipes, setRecipes] = useState<ShoppingRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!items.length) {
        setRecipes([]);
        return;
      }
      setIsLoading(true);
      try {
        const next = (await client.fetch(recipesByIdsQuery, {
          ids: items.map((item) => item._id),
        })) as ShoppingRecipe[];
        setRecipes(Array.isArray(next) ? next : []);
      } catch {
        setRecipes([]);
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [items]);

  const aggregatedItems = useMemo(() => {
    const map = new Map<string, AggregatedIngredient>();
    const ingredientUnits = new Map<string, Set<string>>();

    for (const recipe of recipes) {
      for (const ing of recipe.ingredients ?? []) {
        const ingredientName = ing.ingredient?.name?.trim();
        if (!ingredientName) continue;
        const ingredientId = ing.ingredient?._id ?? ingredientName.toLowerCase();
        const unit = normalizeUnit(ing.unit);
        const quantity = typeof ing.quantity === "number" && Number.isFinite(ing.quantity) ? ing.quantity : 0;
        const key = `${ingredientId}::${unit || "unitless"}`;
        const category = normalizeCategory(ing.ingredient?.category);

        if (!ingredientUnits.has(ingredientId)) ingredientUnits.set(ingredientId, new Set());
        ingredientUnits.get(ingredientId)?.add(unit || "unitless");

        const existing = map.get(key);
        if (existing) {
          existing.quantity += quantity;
          existing.recipes.add(recipe._id);
          continue;
        }
        map.set(key, {
          id: key,
          ingredientId,
          name: ingredientName,
          category,
          categorySlug: ing.ingredient?.category,
          unit,
          quantity,
          recipes: new Set([recipe._id]),
          unitConflict: false,
        });
      }
    }

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        unitConflict: (ingredientUnits.get(item.ingredientId)?.size ?? 0) > 1,
      }))
      .filter((item) => !hidden[item.id])
      .sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.name.localeCompare(b.name);
      });
  }, [recipes, hidden]);

  const groupedItems = useMemo(() => {
    const grouped = new Map<string, AggregatedIngredient[]>();
    for (const item of aggregatedItems) {
      if (!grouped.has(item.category)) grouped.set(item.category, []);
      grouped.get(item.category)?.push(item);
    }
    return Array.from(grouped.entries());
  }, [aggregatedItems]);

  useEffect(() => {
    setQuantities((prev) => {
      const next = { ...prev };
      for (const item of aggregatedItems) {
        if (next[item.id] == null) next[item.id] = 1;
      }
      return next;
    });
  }, [aggregatedItems]);

  const itemCountLabel = `${String(aggregatedItems.length).padStart(2, "0")} ITEMS`;

  const composition = useMemo(() => {
    let produce = 0;
    let protein = 0;
    let pantry = 0;
    for (const item of aggregatedItems) {
      const b = compositionBucket(item.categorySlug);
      if (b === "produce") produce += 1;
      else if (b === "protein") protein += 1;
      else pantry += 1;
    }
    const total = produce + protein + pantry;
    return { produce, protein, pantry, total };
  }, [aggregatedItems]);

  const plantCount = useMemo(() => {
    let sum = 0;
    for (const item of aggregatedItems) {
      if (compositionBucket(item.categorySlug) !== "produce") continue;
      sum += quantities[item.id] ?? 1;
    }
    return Math.min(PLANTS_WEEK_GOAL, sum);
  }, [aggregatedItems, quantities]);

  const plantsPercent = Math.round((plantCount / PLANTS_WEEK_GOAL) * 100);

  function updateQty(itemId: string, delta: number) {
    setQuantities((prev) => {
      const current = prev[itemId] ?? 1;
      return { ...prev, [itemId]: Math.max(1, current + delta) };
    });
  }

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>Your recipe basket</h1>
          <div className={styles.recipeTags}>
            {items.map((item) => (
              <div key={item._id} className={styles.recipeChip}>
                <span className={styles.recipeChipLabel} title={item.title}>
                  {item.title ?? "Untitled"}
                </span>
                <button
                  type="button"
                  className={styles.recipeChipRemove}
                  onClick={() => removeFromCart(item._id)}
                  aria-label={`Remove ${item.title ?? "recipe"} from basket`}
                >
                  <AppIcon name="close" className={styles.recipeChipRemoveIcon} />
                </button>
              </div>
            ))}
            {!items.length ? (
              <span className={styles.recipeTagMuted}>No recipes selected yet</span>
            ) : null}
            <Link href="/" className={styles.addRecipeButton}>
              Add recipe +
            </Link>
          </div>
        </div>
        <div className={styles.heroVisual} />
      </section>

      {items.length === 0 ? (
        <section className={styles.empty}>
          <p>No selected recipes yet.</p>
          <Link href="/" className={styles.backLink}>
            Go to Discover
          </Link>
        </section>
      ) : (
        <section className={styles.layoutGrid}>
          <div className={styles.itemsColumn}>
            <div className={styles.itemsHeader}>
              <div className={styles.sectionHeading}>
                <h2 className={styles.sectionTitle}>Ingredients</h2>
                <p className={styles.sectionMeta}>{itemCountLabel}</p>
              </div>
            </div>

            {isLoading ? <p className={styles.emptyCopy}>Building shopping list...</p> : null}
            {!isLoading && !aggregatedItems.length ? (
              <p className={styles.emptyCopy}>No ingredients found for selected recipes.</p>
            ) : null}

            {groupedItems.map(([category, group]) => (
              <section key={category} className={styles.group}>
                <h3 className={styles.groupTitle}>{category}</h3>
                <ul className={styles.list}>
                  {group.map((item) => (
                    <li key={item.id} className={styles.item}>
                      <div className={styles.itemBody}>
                        <p className={styles.itemTitle}>{item.name}</p>
                        <p className={styles.itemSubtitle}>
                          {item.quantity > 0
                            ? `${formatQuantity(item.quantity)}${item.unit ? ` ${item.unit}` : ""}`
                            : "Quantity TBD"}
                          {item.unitConflict ? " · Multiple units used" : ""}
                        </p>
                      </div>

                      <div className={styles.qtyControl}>
                        <button
                          type="button"
                          className={styles.qtyButton}
                          onClick={() => updateQty(item.id, -1)}
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className={styles.qtyValue}>x{quantities[item.id] ?? 1}</span>
                        <button
                          type="button"
                          className={styles.qtyButton}
                          onClick={() => updateQty(item.id, 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => setHidden((prev) => ({ ...prev, [item.id]: true }))}
                        aria-label="Remove from shopping list"
                      >
                        <AppIcon
                          name="trash"
                          className={styles.removeIcon}
                          strokeWidth={2.25}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <aside className={styles.sideColumn}>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryTitle}>Cart Insight</h3>

              <div className={styles.compositionBlock}>
                <p className={styles.insightKicker}>Culinary Composition</p>
                <CompositionRing composition={composition} />
                <div className={styles.compositionLegend}>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendSwatch} ${styles.legendProduce}`} />
                    <span className={styles.legendText}>Produce</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendSwatch} ${styles.legendProtein}`} />
                    <span className={styles.legendText}>Protein</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendSwatch} ${styles.legendPantry}`} />
                    <span className={styles.legendText}>Pantry</span>
                  </div>
                </div>
              </div>

              <div className={styles.plantsBlock}>
                <p className={styles.insightKicker}>30 Plants a Week</p>
                <div className={styles.plantsHead}>
                  <span className={styles.plantsFraction}>
                    {plantCount}{" "}
                    <span className={styles.plantsGoal}>
                      / {PLANTS_WEEK_GOAL}
                    </span>
                  </span>
                  <span className={styles.plantsPct}>{plantsPercent}% Reached</span>
                </div>
                <div className={styles.plantsTrack}>
                  <div
                    className={styles.plantsFill}
                    style={{ width: `${plantsPercent}%` }}
                  />
                </div>
                <p className={styles.plantsHint}>
                  You&apos;re {plantsPercent}% of the way to your weekly goal!
                </p>
              </div>

              <button type="button" className={styles.checkoutButton}>
                Checkout Items
              </button>
            </div>

            <div className={styles.sideActions}>
              <button type="button" className={styles.clearAllButton} onClick={clearCart}>
                Clear cart
              </button>
              <Link href="/" className={styles.backLink}>
                Back to Discover
              </Link>
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}
