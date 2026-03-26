"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { client } from "@/sanity/lib/client";
import { recipesByIdsQuery } from "@/sanity/lib/queries";
import { AppIcon } from "../AppIcon";
import { useCart } from "../cart-context";
import styles from "./page.module.css";

type ShoppingIngredient = {
  _key: string;
  quantity?: number;
  unit?: string;
  ingredient?: {
    _id?: string;
    name?: string;
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

function formatQuantity(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

export default function CartPage() {
  const { items, removeFromCart, clearCart } = useCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
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
    setChecked((prev) => {
      const next = { ...prev };
      for (const item of aggregatedItems) {
        if (next[item.id] == null) next[item.id] = false;
      }
      return next;
    });
  }, [aggregatedItems]);

  const itemCountLabel = `${String(aggregatedItems.length).padStart(2, "0")} ITEMS`;
  const totalUnits = aggregatedItems.reduce(
    (total, item) => total + (quantities[item.id] ?? 1),
    0,
  );
  const checkedCount = aggregatedItems.reduce(
    (total, item) => total + (checked[item.id] ? 1 : 0),
    0,
  );
  const estimatedCost = totalUnits * 6.5;
  const organicCount = aggregatedItems.length
    ? Math.round((checkedCount / aggregatedItems.length) * 100)
    : 0;

  function updateQty(itemId: string, delta: number) {
    setQuantities((prev) => {
      const current = prev[itemId] ?? 1;
      return { ...prev, [itemId]: Math.max(1, current + delta) };
    });
  }

  function toggleChecked(itemId: string) {
    setChecked((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }

  function clearChecked() {
    setHidden((prev) => {
      const next = { ...prev };
      for (const item of aggregatedItems) {
        if (checked[item.id]) next[item.id] = true;
      }
      return next;
    });
  }

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.kicker}>Shopping Cart</span>
          <h1 className={styles.title}>Culinary Provisions</h1>
          <p className={styles.subTitle}>
            Build your ingredient run from the recipes you liked in Discover.
          </p>
          <div className={styles.recipeTags}>
            {items.slice(0, 4).map((item) => (
              <span key={item._id} className={styles.recipeTag}>
                {item.title ?? "Untitled"}
              </span>
            ))}
            {!items.length ? (
              <span className={styles.recipeTagMuted}>No recipes selected yet</span>
            ) : null}
            <Link href="/recipes" className={styles.addRecipeButton}>
              Add Recipe +
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
              <button type="button" className={styles.clearCheckedButton} onClick={clearChecked}>
                Clear checked
              </button>
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
                    <li
                      key={item.id}
                      className={`${styles.item} ${checked[item.id] ? styles.itemChecked : ""}`}
                    >
                      <button
                        type="button"
                        className={styles.checkButton}
                        onClick={() => toggleChecked(item.id)}
                        aria-pressed={checked[item.id]}
                      />
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
                        <AppIcon name="trash" className={styles.removeIcon} />
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
              <div className={styles.summaryRow}>
                <span>Estimated cost</span>
                <strong>${estimatedCost.toFixed(2)}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Total units</span>
                <strong>{totalUnits}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Organic count</span>
                <strong>{organicCount}%</strong>
              </div>

              <button type="button" className={styles.checkoutButton}>
                Checkout Items
              </button>
            </div>

            <div className={styles.essentialsCard}>
              <h3 className={styles.essentialsTitle}>Missing Essentials?</h3>
              <div className={styles.essentialList}>
                <button type="button" className={styles.essentialItem}>
                  <span className={styles.essentialIconWrap}>
                    <AppIcon name="sparkles" className={styles.essentialIcon} />
                  </span>
                  <span className={styles.essentialText}>
                    <strong>White Wine Vinegar</strong>
                    <small>Aids acid balance</small>
                  </span>
                  <AppIcon name="plus" className={styles.essentialAddIcon} />
                </button>
                <button type="button" className={styles.essentialItem}>
                  <span className={styles.essentialIconWrap}>
                    <AppIcon name="sparkles" className={styles.essentialIcon} />
                  </span>
                  <span className={styles.essentialText}>
                    <strong>Fresh Thyme</strong>
                    <small>Herbaceous aroma</small>
                  </span>
                  <AppIcon name="plus" className={styles.essentialAddIcon} />
                </button>
              </div>
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
