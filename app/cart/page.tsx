"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { client } from "@/sanity/lib/client";
import { recipesByIdsQuery } from "@/sanity/lib/queries";
import {
  areLikelySameIngredient,
  canonicalizeIngredientName,
  isPantryStaple,
  quantityInBaseUnit,
  resolveUnit,
} from "@/lib/ingredient-normalization";
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
  canonicalName: string;
  name: string;
  category: string;
  /** Raw Sanity category slug for composition buckets */
  categorySlug?: string;
  measurements: Array<{
    key: string;
    quantity: number;
    unit: string;
    group: string;
  }>;
  recipes: Set<string>;
  pantryStaple: boolean;
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

function formatMeasurement(
  measurement: AggregatedIngredient["measurements"][number],
  totalMeasurements: number,
) {
  const hasMeaningfulUnit = Boolean(measurement.unit);
  const isWholeNumber = Number.isInteger(measurement.quantity);
  const shouldHideUnitlessWhole = !hasMeaningfulUnit && isWholeNumber;
  if (shouldHideUnitlessWhole) return "";

  const unitLabel = measurement.unit ? ` ${measurement.unit}` : "";
  const qtyLabel =
    measurement.quantity > 0 ? `${formatQuantity(measurement.quantity)}${unitLabel}` : "Quantity TBD";
  if (totalMeasurements <= 1) return qtyLabel;
  return `${qtyLabel}${measurement.group === "unknown" ? "" : ` (${measurement.group})`}`;
}

function deriveInitialQtyMultiplier(item: AggregatedIngredient) {
  if (item.measurements.length !== 1) return 1;
  const onlyMeasurement = item.measurements[0];
  if (!onlyMeasurement) return 1;
  if (onlyMeasurement.unit) return 1;
  if (!Number.isInteger(onlyMeasurement.quantity)) return 1;
  return Math.max(1, onlyMeasurement.quantity);
}

function buildLegacyAggregatedItems(recipes: ShoppingRecipe[]) {
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
        existing.measurements[0].quantity += quantity;
        existing.recipes.add(recipe._id);
        continue;
      }
      map.set(key, {
        id: key,
        ingredientId,
        canonicalName: canonicalizeIngredientName(ingredientName),
        name: ingredientName,
        category,
        categorySlug: ing.ingredient?.category,
        measurements: [{ key, quantity, unit, group: resolveUnit(unit).group }],
        recipes: new Set([recipe._id]),
        pantryStaple: isPantryStaple(ingredientName),
      });
    }
  }

  return Array.from(map.values())
    .map((item) => {
      const unitConflict = (ingredientUnits.get(item.ingredientId)?.size ?? 0) > 1;
      if (!unitConflict || item.measurements.length > 1) return item;
      item.measurements[0].group = unitConflict ? "mixed" : item.measurements[0].group;
      return item;
    })
    .sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });
}

function resolveAggressiveCanonicalKey(
  baseCanonical: string,
  canonicalKeys: string[],
) {
  for (const existing of canonicalKeys) {
    if (existing === baseCanonical) return existing;
    if (areLikelySameIngredient(existing, baseCanonical)) return existing;
  }
  canonicalKeys.push(baseCanonical);
  return baseCanonical;
}

function buildNormalizedAggregatedItems(recipes: ShoppingRecipe[]) {
  const ingredientsMap = new Map<string, AggregatedIngredient>();
  const knownCanonicalKeys: string[] = [];

  for (const recipe of recipes) {
    for (const ing of recipe.ingredients ?? []) {
      const ingredientName = ing.ingredient?.name?.trim();
      if (!ingredientName) continue;
      const baseCanonical = canonicalizeIngredientName(ingredientName);
      if (!baseCanonical) continue;

      const canonicalName = resolveAggressiveCanonicalKey(baseCanonical, knownCanonicalKeys);
      const category = normalizeCategory(ing.ingredient?.category);
      const quantity = typeof ing.quantity === "number" && Number.isFinite(ing.quantity) ? ing.quantity : 0;
      const normalizedQuantity = quantityInBaseUnit(quantity, ing.unit, canonicalName);
      const measurementKey = `${normalizedQuantity.group}::${normalizedQuantity.baseUnit || normalizedQuantity.unit || "unitless"}`;

      const existingIngredient = ingredientsMap.get(canonicalName);
      if (!existingIngredient) {
        ingredientsMap.set(canonicalName, {
          id: canonicalName,
          ingredientId: ing.ingredient?._id ?? canonicalName,
          canonicalName,
          name: ingredientName,
          category,
          categorySlug: ing.ingredient?.category,
          measurements: [
            {
              key: measurementKey,
              quantity: normalizedQuantity.quantity,
              unit: normalizedQuantity.baseUnit || normalizedQuantity.unit,
              group: normalizedQuantity.group,
            },
          ],
          recipes: new Set([recipe._id]),
          pantryStaple: isPantryStaple(canonicalName),
        });
        continue;
      }

      existingIngredient.recipes.add(recipe._id);
      if (existingIngredient.category === "Other" && category !== "Other") {
        existingIngredient.category = category;
        existingIngredient.categorySlug = ing.ingredient?.category;
      }
      if (ingredientName.length < existingIngredient.name.length) {
        existingIngredient.name = ingredientName;
      }

      const existingMeasurement = existingIngredient.measurements.find(
        (measurement) => measurement.key === measurementKey,
      );
      if (existingMeasurement) {
        existingMeasurement.quantity += normalizedQuantity.quantity;
      } else {
        existingIngredient.measurements.push({
          key: measurementKey,
          quantity: normalizedQuantity.quantity,
          unit: normalizedQuantity.baseUnit || normalizedQuantity.unit,
          group: normalizedQuantity.group,
        });
      }
    }
  }

  return Array.from(ingredientsMap.values())
    .map((item) => ({
      ...item,
      measurements: item.measurements.sort((a, b) => a.key.localeCompare(b.key)),
    }))
    .sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });
}

export default function CartPage() {
  const { items, removeFromCart, clearCart } = useCart();
  const useLegacyAggregation = process.env.NEXT_PUBLIC_CART_LEGACY_AGGREGATION === "true";
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [showPantry, setShowPantry] = useState(false);
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

  const aggregatedItems = useMemo(
    () => (useLegacyAggregation ? buildLegacyAggregatedItems(recipes) : buildNormalizedAggregatedItems(recipes)),
    [recipes, useLegacyAggregation],
  );

  const visibleItems = useMemo(
    () =>
      aggregatedItems.filter(
        (item) => !hidden[item.id] && (showPantry || !item.pantryStaple),
      ),
    [aggregatedItems, hidden, showPantry],
  );

  const hiddenPantryCount = useMemo(
    () => aggregatedItems.filter((item) => !hidden[item.id] && item.pantryStaple).length,
    [aggregatedItems, hidden],
  );

  const groupedItems = useMemo(() => {
    const grouped = new Map<string, AggregatedIngredient[]>();
    for (const item of visibleItems) {
      if (!grouped.has(item.category)) grouped.set(item.category, []);
      grouped.get(item.category)?.push(item);
    }
    return Array.from(grouped.entries());
  }, [visibleItems]);

  useEffect(() => {
    setQuantities((prev) => {
      const next = { ...prev };
      for (const item of visibleItems) {
        if (next[item.id] == null) next[item.id] = deriveInitialQtyMultiplier(item);
      }
      return next;
    });
  }, [visibleItems]);

  const itemCountLabel = `${String(visibleItems.length).padStart(2, "0")} ITEMS`;

  const composition = useMemo(() => {
    let produce = 0;
    let protein = 0;
    let pantry = 0;
    for (const item of visibleItems) {
      const b = compositionBucket(item.categorySlug);
      if (b === "produce") produce += 1;
      else if (b === "protein") protein += 1;
      else pantry += 1;
    }
    const total = produce + protein + pantry;
    return { produce, protein, pantry, total };
  }, [visibleItems]);

  const plantCount = useMemo(() => {
    let sum = 0;
    for (const item of visibleItems) {
      if (compositionBucket(item.categorySlug) !== "produce") continue;
      sum += quantities[item.id] ?? 1;
    }
    return Math.min(PLANTS_WEEK_GOAL, sum);
  }, [visibleItems, quantities]);

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
            {!isLoading && !visibleItems.length ? (
              <p className={styles.emptyCopy}>No ingredients found for selected recipes.</p>
            ) : null}
            {!isLoading && hiddenPantryCount > 0 ? (
              <button
                type="button"
                className={styles.clearAllButton}
                onClick={() => setShowPantry((prev) => !prev)}
              >
                {showPantry
                  ? "Hide pantry staples"
                  : `Show pantry staples (${hiddenPantryCount})`}
              </button>
            ) : null}

            {groupedItems.map(([category, group]) => (
              <section key={category} className={styles.group}>
                <h3 className={styles.groupTitle}>{category}</h3>
                <ul className={styles.list}>
                  {group.map((item) => (
                    <li key={item.id} className={styles.item}>
                      <div className={styles.itemBody}>
                        <p className={styles.itemTitle}>{item.name}</p>
                        {(() => {
                          const detailParts = item.measurements
                            .map((measurement) =>
                              formatMeasurement(measurement, item.measurements.length),
                            )
                            .filter(Boolean);
                          const details = detailParts.join(" + ");
                          const showMultipleUnitsHint =
                            item.measurements.length > 1 && detailParts.length > 0;
                          if (!details && !showMultipleUnitsHint) return null;
                          return (
                            <p className={styles.itemSubtitle}>
                              {details}
                              {showMultipleUnitsHint ? " · Multiple units used" : ""}
                            </p>
                          );
                        })()}
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
