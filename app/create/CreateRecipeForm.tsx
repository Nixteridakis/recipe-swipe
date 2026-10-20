"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AppIcon } from "@/app/AppIcon";
import { formatFailedFetchMessage } from "@/lib/api-error-message";
import styles from "./page.module.css";

type Category = { _id: string; name: string };
type IngredientRow = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  referenceId?: string;
  originalName?: string;
};
type InstructionRow = { id: string; text: string };

export type EditableRecipe = {
  _id: string;
  title?: string;
  slug: string;
  description?: string;
  sourceUrl?: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  imageUrl?: string;
  categoryIds: string[];
  ingredients: Array<{ name: string; quantity: number; unit?: string; referenceId?: string }>;
  instructions: string[];
};

const UNITS = [
  ["", "No unit"], ["piece", "piece(s)"], ["cup", "cup(s)"], ["tbsp", "tablespoon(s)"],
  ["tsp", "teaspoon(s)"], ["g", "gram(s)"], ["kg", "kilogram(s)"], ["oz", "ounce(s)"],
  ["lb", "pound(s)"], ["ml", "milliliter(s)"], ["l", "liter(s)"], ["pinch", "pinch"],
  ["clove", "clove(s)"], ["bunch", "bunch"], ["can", "can(s)"], ["package", "package"],
] as const;

let nextRowId = 0;
const rowId = (type: string) => `${type}-${Date.now()}-${nextRowId++}`;
const newIngredient = (): IngredientRow => ({ id: rowId("ingredient"), name: "", quantity: "", unit: "" });
const newInstruction = (): InstructionRow => ({ id: rowId("instruction"), text: "" });

export function CreateRecipeForm({
  categories,
  initialRecipe,
}: {
  categories: Category[];
  initialRecipe?: EditableRecipe;
}) {
  const router = useRouter();
  const isEditing = Boolean(initialRecipe);
  const [ingredients, setIngredients] = useState<IngredientRow[]>(() =>
    initialRecipe?.ingredients.length
      ? initialRecipe.ingredients.map((ingredient, index) => ({
          id: `ingredient-${index}`,
          name: ingredient.name,
          quantity: String(ingredient.quantity),
          unit: ingredient.unit ?? "",
          referenceId: ingredient.referenceId,
          originalName: ingredient.name,
        }))
      : [{ id: "ingredient-0", name: "", quantity: "", unit: "" }],
  );
  const [instructions, setInstructions] = useState<InstructionRow[]>(() =>
    initialRecipe?.instructions.length
      ? initialRecipe.instructions.map((text, index) => ({ id: `instruction-${index}`, text }))
      : [{ id: "instruction-0", text: "" }],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateIngredient(id: string, field: keyof Omit<IngredientRow, "id">, value: string) {
    setIngredients((rows) => rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function updateInstruction(id: string, text: string) {
    setInstructions((rows) => rows.map((row) => (row.id === id ? { ...row, text } : row)));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    if (initialRecipe) form.set("recipeId", initialRecipe._id);
    form.set(
      "ingredients",
      JSON.stringify(
        ingredients
          .filter((row) => row.name.trim())
          .map(({ name, quantity, unit, referenceId, originalName }) => ({
            name,
            quantity,
            unit,
            ...(referenceId && name.trim() === originalName?.trim() ? { referenceId } : {}),
          })),
      ),
    );
    form.set(
      "instructions",
      JSON.stringify(instructions.map((row) => row.text.trim()).filter(Boolean)),
    );
    form.set("categoryIds", JSON.stringify(form.getAll("categoryId")));
    const instructionValues = instructions.map((row) => row.text.trim()).filter(Boolean);
    const instructionsUnchanged =
      initialRecipe?.instructions.length === instructionValues.length &&
      initialRecipe.instructions.every((step, index) => step === instructionValues[index]);
    form.set("preserveInstructions", String(Boolean(initialRecipe && instructionsUnchanged)));
    form.delete("categoryId");

    try {
      const response = await fetch("/api/create-manual-recipe", {
        method: isEditing ? "PATCH" : "POST",
        body: form,
      });
      const body = await response.text();
      if (!response.ok) {
        setError(formatFailedFetchMessage(body, response.status));
        return;
      }
      const result = JSON.parse(body) as { slug?: string };
      if (!result.slug) throw new Error("The server did not return the saved recipe.");
      router.push(`/recipe/${result.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The recipe could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <Link href={initialRecipe ? `/recipe/${initialRecipe.slug}` : "/"} className={styles.backLink}>
        <AppIcon name="arrow-right" className={styles.backIcon} />
        {initialRecipe ? "Back to recipe" : "Back to recipes"}
      </Link>

      <header className={styles.hero}>
        <div>
          <span className={styles.kicker}>{isEditing ? "Refine the recipe" : "Kitchen notebook"}</span>
          <h1 className={styles.title}>{isEditing ? "Edit recipe" : "Create a recipe"}</h1>
          <p className={styles.lead}>
            {isEditing
              ? "Adjust the details, ingredients, and method without starting over."
              : "Write it once, then keep it ready for every shop and every service."}
          </p>
        </div>
        <span className={styles.heroNumber}>01</span>
      </header>

      <form className={styles.form} onSubmit={submit}>
        <section className={styles.card}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionNumber}>01</span>
            <div><h2>Recipe details</h2><p>The essentials shown on the recipe page.</p></div>
          </div>
          <div className={styles.fieldGrid}>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Recipe name *</span>
              <input name="title" required placeholder="Roasted tomato orzo" defaultValue={initialRecipe?.title} />
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Description</span>
              <textarea name="description" rows={3} placeholder="A short introduction to the dish..." defaultValue={initialRecipe?.description} />
            </label>
            <label className={styles.field}>
              <span>Servings *</span>
              <input name="servings" required type="number" min="1" step="1" defaultValue={initialRecipe?.servings ?? 4} />
            </label>
            <label className={styles.field}>
              <span>Prep time (minutes)</span>
              <input name="prepTime" type="number" min="0" step="1" defaultValue={initialRecipe?.prepTime} />
            </label>
            <label className={styles.field}>
              <span>Cook time (minutes)</span>
              <input name="cookTime" type="number" min="0" step="1" defaultValue={initialRecipe?.cookTime} />
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Source URL</span>
              <input name="sourceUrl" type="url" placeholder="https://..." defaultValue={initialRecipe?.sourceUrl} />
            </label>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionNumber}>02</span>
            <div><h2>Ingredients</h2><p>Add quantities as the recipe uses them.</p></div>
          </div>
          <div className={styles.rows}>
            {ingredients.map((ingredient, index) => (
              <div className={styles.ingredientRow} key={ingredient.id}>
                <span className={styles.rowIndex}>{String(index + 1).padStart(2, "0")}</span>
                <label className={styles.compactField}>
                  <span>Quantity</span>
                  <input type="number" min="0" step="any" required value={ingredient.quantity} onChange={(e) => updateIngredient(ingredient.id, "quantity", e.target.value)} />
                </label>
                <label className={styles.compactField}>
                  <span>Unit</span>
                  <select value={ingredient.unit} onChange={(e) => updateIngredient(ingredient.id, "unit", e.target.value)}>
                    {UNITS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className={`${styles.compactField} ${styles.ingredientName}`}>
                  <span>Ingredient</span>
                  <input required value={ingredient.name} placeholder="Cherry tomatoes" onChange={(e) => updateIngredient(ingredient.id, "name", e.target.value)} />
                </label>
                <button type="button" className={styles.removeRow} aria-label={`Remove ingredient ${index + 1}`} disabled={ingredients.length === 1} onClick={() => setIngredients((rows) => rows.filter((row) => row.id !== ingredient.id))}>
                  <AppIcon name="close" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className={styles.addRow} onClick={() => setIngredients((rows) => [...rows, newIngredient()])}>
            <AppIcon name="plus" /> Add ingredient
          </button>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionNumber}>03</span>
            <div><h2>Method</h2><p>Keep each instruction focused on one step.</p></div>
          </div>
          <div className={styles.rows}>
            {instructions.map((instruction, index) => (
              <div className={styles.instructionRow} key={instruction.id}>
                <span className={styles.stepIndex}>{index + 1}</span>
                <label className={styles.instructionField}>
                  <span>Step {index + 1}</span>
                  <textarea required rows={2} value={instruction.text} onChange={(e) => updateInstruction(instruction.id, e.target.value)} />
                </label>
                <button type="button" className={styles.removeRow} aria-label={`Remove step ${index + 1}`} disabled={instructions.length === 1} onClick={() => setInstructions((rows) => rows.filter((row) => row.id !== instruction.id))}>
                  <AppIcon name="close" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className={styles.addRow} onClick={() => setInstructions((rows) => [...rows, newInstruction()])}>
            <AppIcon name="plus" /> Add step
          </button>
        </section>

        <div className={styles.splitCards}>
          <section className={styles.card}>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionNumber}>04</span>
              <div><h2>Image</h2><p>Upload a file or paste an image URL.</p></div>
            </div>
            {initialRecipe?.imageUrl ? (
              <div className={styles.currentImage}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={initialRecipe.imageUrl} alt="Current recipe" />
                <label>
                  <input type="checkbox" name="removeImage" value="true" />
                  Remove current image
                </label>
              </div>
            ) : null}
            <label className={styles.fileDrop}>
              <AppIcon name="plus" />
              <span>Choose image</span>
              <small>JPG, PNG, WebP or GIF, up to 10 MB</small>
              <input name="imageFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
            </label>
            <div className={styles.or}><span>or</span></div>
            <label className={styles.field}>
              <span>Image URL</span>
              <input name="imageUrl" type="url" placeholder="https://.../dish.jpg" />
            </label>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionNumber}>05</span>
              <div><h2>Categories</h2><p>Choose all that fit.</p></div>
            </div>
            <div className={styles.categoryGrid}>
              {categories.map((category) => (
                <label className={styles.category} key={category._id}>
                  <input
                    type="checkbox"
                    name="categoryId"
                    value={category._id}
                    defaultChecked={initialRecipe?.categoryIds.includes(category._id)}
                  />
                  <span>{category.name}</span>
                </label>
              ))}
              {!categories.length ? <p className={styles.muted}>No categories are available yet.</p> : null}
            </div>
          </section>
        </div>

        <section className={styles.submitCard}>
          <div className={styles.submitCopy}>
            <strong>{isEditing ? "Ready to save?" : "Ready to cook?"}</strong>
            <span>{isEditing ? "Your changes will update this recipe." : "The recipe will be saved directly to your collection."}</span>
          </div>
          <button className={styles.submitButton} type="submit" disabled={isSaving}>
            <AppIcon name="chef-hat" /> {isSaving ? "Saving recipe..." : isEditing ? "Save changes" : "Create recipe"}
          </button>
        </section>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </form>
    </main>
  );
}
