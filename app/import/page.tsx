"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AppIcon } from "@/app/AppIcon";
import { formatFailedFetchMessage } from "@/lib/api-error-message";
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
  const [activeParseMode, setActiveParseMode] = useState<"url" | "html">("url");
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<ParsedRecipe | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<{
    recipeId: string;
    slug: string;
    updated: boolean;
  } | null>(null);
  const previewTitleRef = useRef<HTMLHeadingElement | null>(null);

  const isUrlLikelyValid = useMemo(() => {
    if (!url.trim()) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }, [url]);

  useEffect(() => {
    if (!recipe) return;
    previewTitleRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [recipe]);

  async function parseRecipe(mode: "url" | "html") {
    if (mode === "url" && !isUrlLikelyValid) {
      setError("Please enter a valid URL.");
      return;
    }
    if (mode === "html" && !html.trim()) {
      setError("Paste HTML first, then import.");
      return;
    }

    setActiveParseMode(mode);
    setLoading(true);
    setError(null);
    setRecipe(null);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const res = await fetch("/api/parse-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: mode === "html" ? (url.trim() || "https://manual-import.local/pasted-html") : url,
          html: mode === "html" ? html.trim() : undefined,
        }),
      });

      const text = await res.text().catch(() => "");
      if (!res.ok) {
        setError(formatFailedFetchMessage(text, res.status));
        return;
      }

      let data: { recipe?: ParsedRecipe };
      try {
        data = JSON.parse(text) as { recipe?: ParsedRecipe };
      } catch {
        setError("The server returned an unexpected response. Try again.");
        return;
      }
      if (!data.recipe) {
        setError("No recipe was found in the response. Try another URL or paste HTML.");
        return;
      }
      setRecipe(data.recipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse recipe.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await parseRecipe("url");
  }

  async function onParseHtmlClick() {
    await parseRecipe("html");
  }

  async function onCreateRecipe() {
    if (!recipe) return;

    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(null);
    try {
      const res = await fetch("/api/create-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: recipe.sourceUrl || url, recipe }),
      });
      const text = await res.text().catch(() => "");
      if (!res.ok) {
        setCreateError(formatFailedFetchMessage(text, res.status));
        return;
      }

      let data: {
        ok?: boolean;
        recipeId?: string;
        slug?: string;
        updated?: boolean;
      };
      try {
        data = JSON.parse(text) as {
          ok?: boolean;
          recipeId?: string;
          slug?: string;
          updated?: boolean;
        };
      } catch {
        setCreateError("The server returned an unexpected response. Try again.");
        return;
      }
      if (!data.ok || !data.recipeId || !data.slug || typeof data.updated !== "boolean") {
        setCreateError("Could not save the recipe. Try again or check Studio permissions.");
        return;
      }
      setCreateSuccess({
        recipeId: data.recipeId,
        slug: data.slug,
        updated: data.updated,
      });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create recipe.");
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.backLink}>
          <AppIcon name="arrow-right" className={styles.backIcon} />
          <span>Back to recipes</span>
        </Link>
      </div>

      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Add to your Collection</h1>
        <p className={styles.pageLead}>
          Save recipes from across the web into Brasserie. Choose the method that works best for
          you—extension first, then URL, then raw HTML if a site blocks fetching.
        </p>
      </header>

      <section className={styles.extensionCard} aria-labelledby="import-ext-heading">
        <div className={styles.extensionGrid}>
          <div className={styles.extensionCopy}>
            <div className={styles.stepHead}>
              <span className={styles.stepBadge} aria-hidden>
                1
              </span>
              <span className={styles.stepKickerPrimary}>The best way</span>
            </div>
            <h2 id="import-ext-heading" className={styles.cardTitleLg}>
              Use the Brasserie importer extension
            </h2>
            <ul className={styles.extensionList}>
              <li className={styles.extensionListItem}>
                <span className={styles.extensionIconWrap}>
                  <AppIcon name="plus" className={styles.extensionIcon} />
                </span>
                <div>
                  <p className={styles.extensionItemTitle}>Load it in Chrome</p>
                  <p className={styles.extensionItemText}>
                    Open <code className={styles.inlineCode}>chrome://extensions</code>, enable{" "}
                    <strong>Developer mode</strong>, then <strong>Load unpacked</strong> and select
                    the <code className={styles.inlineCode}>chrome-extension/</code> folder from
                    this project.
                  </p>
                </div>
              </li>
              <li className={styles.extensionListItem}>
                <span className={styles.extensionIconWrap}>
                  <AppIcon name="sparkles" className={styles.extensionIcon} />
                </span>
                <div>
                  <p className={styles.extensionItemTitle}>Pin &amp; connect</p>
                  <p className={styles.extensionItemText}>
                    Pin the extension, set <strong>Recipe Book API</strong> to your app URL (e.g.{" "}
                    <code className={styles.inlineCode}>http://localhost:3000</code>), then open
                    any recipe page.
                  </p>
                </div>
              </li>
              <li className={styles.extensionListItem}>
                <span className={styles.extensionIconWrap}>
                  <AppIcon name="chef-hat" className={styles.extensionIcon} />
                </span>
                <div>
                  <p className={styles.extensionItemTitle}>Extract or send</p>
                  <p className={styles.extensionItemText}>
                    Click the extension, use <strong>Extract recipe</strong>, then{" "}
                    <strong>Send to Recipe Book</strong>—it posts JSON-LD to{" "}
                    <code className={styles.inlineCode}>/api/parse-recipe</code> without 403 issues.
                  </p>
                </div>
              </li>
            </ul>
            <p className={styles.extensionFootnote}>
              Full steps: see <code className={styles.inlineCode}>chrome-extension/README.md</code>{" "}
              in the repo.
            </p>
          </div>

          <div className={styles.extensionVisual}>
            <div className={styles.extensionGlow} aria-hidden />
            <div className={styles.extensionMock}>
              <div className={styles.extensionMockInner}>
                <AppIcon name="sparkles" className={styles.extensionMockIcon} />
                <p className={styles.extensionMockLabel}>Recipe JSON-LD from the open tab</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <form className={styles.importGrid} onSubmit={onSubmit}>
        <section className={styles.urlCard}>
          <div className={styles.stepHead}>
            <span className={styles.stepBadge} aria-hidden>
              2
            </span>
            <span className={styles.stepKickerPrimary}>Quick &amp; simple</span>
          </div>
          <h2 className={styles.cardTitleMd}>Paste a recipe URL</h2>
          <p className={styles.cardSub}>
            We fetch the page and read structured data (JSON-LD) for title, photo, ingredients, and
            steps.
          </p>
          <div className={styles.fieldStack}>
            <div className={styles.inputWithIcon}>
              <AppIcon name="sparkles" className={styles.inputIcon} aria-hidden />
              <input
                id="recipeUrl"
                name="recipeUrl"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/recipe/..."
                className={styles.inputPill}
                autoComplete="off"
                spellCheck={false}
                aria-label="Recipe URL"
              />
            </div>
            <button
              type="submit"
              className={styles.btnPrimaryWide}
              disabled={loading || !isUrlLikelyValid}
              aria-disabled={loading || !isUrlLikelyValid}
            >
              <AppIcon name="sparkles" className={styles.btnIcon} />
              <span>{loading && activeParseMode === "url" ? "Parsing…" : "Parse URL"}</span>
            </button>
          </div>
          <div className={styles.infoNote} role="note">
            <AppIcon name="bell" className={styles.infoNoteIcon} />
            <p>
              Paywalled or subscription-only pages may block our server from seeing the full HTML—use
              the extension or paste source below.
            </p>
          </div>
        </section>

        <section className={styles.htmlCard}>
          <div className={styles.stepHead}>
            <span className={`${styles.stepBadge} ${styles.stepBadgeMuted}`} aria-hidden>
              3
            </span>
            <span className={styles.stepKickerMuted}>Technical fallback</span>
          </div>
          <h2 className={styles.cardTitleSm}>Paste source code</h2>
          <p className={styles.cardSub}>
            If the site returns 403 to our fetch—or you saved the page offline—paste the full{" "}
            <code className={styles.inlineCode}>&lt;html&gt;</code> source here.
          </p>
          <label className={styles.monoLabel} htmlFor="pasteHtml">
            HTML code block
          </label>
          <textarea
            id="pasteHtml"
            name="pasteHtml"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="Paste <html> source here…"
            className={styles.textareaMono}
            rows={8}
            spellCheck={false}
          />
          <div className={styles.htmlActions}>
            <span className={styles.helperText}>
              {html.trim().length
                ? `${html.trim().length.toLocaleString()} characters`
                : "Optional: add the real URL above for a better source link in Sanity"}
            </span>
            <button
              type="button"
              className={styles.btnSecondaryWide}
              onClick={onParseHtmlClick}
              disabled={loading || !html.trim()}
              aria-disabled={loading || !html.trim()}
            >
              <AppIcon name="list" className={styles.btnIcon} />
              <span>{loading && activeParseMode === "html" ? "Parsing…" : "Import from HTML"}</span>
            </button>
          </div>
        </section>
      </form>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <div className={styles.tipsGrid}>
        <div className={styles.tip}>
          <AppIcon name="sparkles" className={styles.tipIcon} />
          <div>
            <h3 className={styles.tipTitle}>Hero image</h3>
            <p className={styles.tipText}>
              When the page exposes it, we pull the recipe image from structured data for preview
              and import.
            </p>
          </div>
        </div>
        <div className={styles.tip}>
          <AppIcon name="list" className={styles.tipIcon} />
          <div>
            <h3 className={styles.tipTitle}>Structured ingredients</h3>
            <p className={styles.tipText}>
              Ingredient lines are parsed into quantities and units for your Sanity recipe document.
            </p>
          </div>
        </div>
        <div className={styles.tip}>
          <AppIcon name="star" className={styles.tipIcon} />
          <div>
            <h3 className={styles.tipTitle}>Precision parsing</h3>
            <p className={styles.tipText}>
              Common fractions and units are normalized where possible before save.
            </p>
          </div>
        </div>
      </div>

      {recipe ? (
        <section className={styles.preview} aria-labelledby="preview-heading">
          <div className={styles.previewHeader}>
            <div>
              <span className={styles.previewKicker}>Preview</span>
              <h2 id="preview-heading" ref={previewTitleRef} className={styles.previewTitle}>
                {recipe.title ?? "Untitled"}
              </h2>
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

          <div className={styles.previewActions}>
            <button
              type="button"
              className={styles.btnPrimaryWide}
              onClick={onCreateRecipe}
              disabled={createLoading}
              aria-disabled={createLoading}
            >
              <AppIcon name="plus" className={styles.btnIcon} />
              <span>{createLoading ? "Saving…" : "Create in Sanity"}</span>
            </button>
          </div>

          {createError ? <div className={styles.errorBox}>{createError}</div> : null}
          {createSuccess ? (
            <div className={styles.successBox}>
              {createSuccess.updated ? "Updated" : "Created"} recipe{" "}
              <strong>{recipe.title ?? "Untitled"}</strong>.{" "}
              <Link href={`/recipe/${createSuccess.slug}`} className={styles.successLink}>
                Open recipe page
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
