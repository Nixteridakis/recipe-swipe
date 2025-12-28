"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppIcon } from "../AppIcon";
import { useCart } from "../cart-context";
import styles from "./page.module.css";

export default function CartPage() {
  const { items, removeFromCart, clearCart } = useCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setQuantities((prev) => {
      const next = { ...prev };
      for (const item of items) {
        if (next[item._id] == null) next[item._id] = 1;
      }
      return next;
    });
    setChecked((prev) => {
      const next = { ...prev };
      for (const item of items) {
        if (next[item._id] == null) next[item._id] = false;
      }
      return next;
    });
  }, [items]);

  const itemCountLabel = `${String(items.length).padStart(2, "0")} ITEMS`;
  const totalUnits = items.reduce((total, item) => total + (quantities[item._id] ?? 1), 0);
  const checkedCount = items.reduce((total, item) => total + (checked[item._id] ? 1 : 0), 0);
  const estimatedCost = totalUnits * 6.5;
  const organicCount = items.length ? Math.round((checkedCount / items.length) * 100) : 0;

  function updateQty(recipeId: string, delta: number) {
    setQuantities((prev) => {
      const current = prev[recipeId] ?? 1;
      return { ...prev, [recipeId]: Math.max(1, current + delta) };
    });
  }

  function toggleChecked(recipeId: string) {
    setChecked((prev) => ({ ...prev, [recipeId]: !prev[recipeId] }));
  }

  function clearChecked() {
    for (const item of items) {
      if (checked[item._id]) removeFromCart(item._id);
    }
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

            <ul className={styles.list}>
              {items.map((item) => (
                <li
                  key={item._id}
                  className={`${styles.item} ${checked[item._id] ? styles.itemChecked : ""}`}
                >
                  <button
                    type="button"
                    className={styles.checkButton}
                    onClick={() => toggleChecked(item._id)}
                    aria-pressed={checked[item._id]}
                  />
                  <div className={styles.itemBody}>
                    <p className={styles.itemTitle}>{item.title ?? "Untitled recipe"}</p>
                    <p className={styles.itemSubtitle}>Traditional</p>
                  </div>

                  <div className={styles.qtyControl}>
                    <button
                      type="button"
                      className={styles.qtyButton}
                      onClick={() => updateQty(item._id, -1)}
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className={styles.qtyValue}>x{quantities[item._id] ?? 1}</span>
                    <button
                      type="button"
                      className={styles.qtyButton}
                      onClick={() => updateQty(item._id, 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => removeFromCart(item._id)}
                    aria-label="Remove from cart"
                  >
                    <AppIcon name="trash" className={styles.removeIcon} />
                  </button>
                </li>
              ))}
            </ul>
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
