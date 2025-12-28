"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { AppIcon } from "@/app/AppIcon";
import styles from "./page.module.css";

type ParsedIngredient = {
  item: string;
  quantityMin?: number | null;
  quantityMax?: number | null;
  unit?: string | null;
};

type ParsedRecipe = {
  sourceUrl: string;
  title?: string;
  description?: string;
  image?: string[];
  authorName?: string;
  prepTimeMin?: number | null;
  cookTimeMin?: number | null;
  servings?: number | null;
  ingredients?: ParsedIngredient[];
  instructions?: string[];
};

export default function ImportRecipePage() {
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<ParsedRecipe | null>(null);

  const isUrlLikelyValid = useMemo(() => {
    if (!url.trim()) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }, [url]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isUrlLikelyValid) {
      setError("Please enter a valid URL.");
      return;
    }

    setLoading(true);
    setError(null);
    setRecipe(null);

    try {
      const res = await fetch("/api/parse-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          html: html.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { recipe?: ParsedRecipe };
      if (!data.recipe) throw new Error("No recipe found in that URL.");
      setRecipe(data.recipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse recipe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.backLink}>
          <AppIcon name="arrow-right" className={styles.backIcon} />
          <span>Back to recipes</span>
        </Link>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>Import Flow</span>
          <h1 className={styles.title}>Turn a recipe URL into editorial content.</h1>
          <p className={styles.subTitle}>
            Paste a recipe page URL. If the site blocks fetches with `403`, drop the
            full HTML source into the fallback field and parse from that instead.
          </p>
        </div>

        <div className={styles.heroCard}>
          <span className={styles.cardLabel}>Fallback</span>
          <p className={styles.heroCardText}>
            Open the recipe page, view source, copy everything, paste it below. The
            parser will prefer the raw HTML when provided.
          </p>
        </div>
      </section>

      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.formSection}>
          <label className={styles.label} htmlFor="recipeUrl">
            Recipe URL
          </label>
          <div className={styles.urlRow}>
            <input
              id="recipeUrl"
              name="recipeUrl"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/recipe/..."
              className={styles.input}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              className={styles.button}
              disabled={loading}
              aria-disabled={loading}
            >
              <AppIcon name="sparkles" className={styles.buttonIcon} />
              <span>{loading ? "Parsing..." : "Parse"}</span>
            </button>
          </div>
        </div>

        <div className={styles.formSection}>
          <label className={styles.label} htmlFor="pasteHtml">
            Paste HTML
          </label>
          <textarea
            id="pasteHtml"
            name="pasteHtml"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="If the URL fetch is blocked, open the recipe page in your browser, View Source (Ctrl+U / Cmd+Option+U), copy everything, and paste here."
            className={styles.textarea}
            rows={10}
            spellCheck={false}
          />
        </div>
      </form>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      {recipe ? (
        <section className={styles.preview}>
          <div className={styles.previewHeader}>
            <div>
              <span className={styles.kicker}>Parsed Preview</span>
              <h2 className={styles.previewTitle}>{recipe.title ?? "Untitled"}</h2>
              {recipe.authorName ? (
                <div className={styles.metaRow}>{recipe.authorName}</div>
              ) : null}
            </div>

            {recipe.image?.[0] ? (
              <div className={styles.previewImageWrap}>
                <img
                  src={recipe.image[0]}
                  alt={recipe.title ?? "Recipe image"}
                  className={styles.previewImage}
                />
              </div>
            ) : null}
          </div>

          {recipe.description ? (
            <p className={styles.description}>{recipe.description}</p>
          ) : null}

          <div className={styles.stats}>
            {recipe.servings != null ? <span>{recipe.servings} servings</span> : null}
            {recipe.prepTimeMin != null ? <span>Prep {recipe.prepTimeMin} min</span> : null}
            {recipe.cookTimeMin != null ? <span>Cook {recipe.cookTimeMin} min</span> : null}
          </div>

          <div className={styles.grid}>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Ingredients</h3>
              <ul className={styles.list}>
                {(recipe.ingredients ?? []).map((ing) => {
                  const qty =
                    ing.quantityMin != null && ing.quantityMax != null
                      ? ing.quantityMin === ing.quantityMax
                        ? ing.quantityMin
                        : `${ing.quantityMin}-${ing.quantityMax}`
                      : ing.quantityMin != null
                        ? ing.quantityMin
                        : null;

                  const parts: string[] = [];
                  if (qty != null) parts.push(String(qty));
                  if (ing.unit) parts.push(ing.unit);
                  parts.push(ing.item);

                  return (
                    <li
                      key={`${ing.item}-${ing.unit ?? ""}-${ing.quantityMin ?? ""}-${ing.quantityMax ?? ""}`}
                      className={styles.listItem}
                    >
                      <span className={styles.listItemBullet}>
                        <AppIcon name="sparkles" className={styles.listItemIcon} />
                      </span>
                      <span>{parts.join(" ")}</span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Instructions</h3>
              <ol className={styles.proseList}>
                {(recipe.instructions ?? []).map((step, idx) => (
                  <li key={`${step.slice(0, 48)}-${step.length}`} className={styles.stepItem}>
                    <span className={styles.stepNumber}>{idx + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <div className={styles.debugBox}>
            Source URL: <code>{recipe.sourceUrl}</code>
          </div>
        </section>
      ) : null}
    </main>
  );
}

