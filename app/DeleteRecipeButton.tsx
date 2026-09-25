"use client";

import { useState } from "react";
import { AppIcon } from "./AppIcon";
import { useCart } from "./cart-context";
import styles from "./DeleteRecipeButton.module.css";

type DeleteRecipeButtonProps = {
  recipeId: string;
  recipeTitle?: string;
};

export function DeleteRecipeButton({ recipeId, recipeTitle }: DeleteRecipeButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { removeFromCart } = useCart();

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      const params = new URLSearchParams({ id: recipeId });
      const res = await fetch(`/api/delete-recipe?${params}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? "Delete failed");
      }
      removeFromCart(recipeId);
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setIsDeleting(false);
    }
  }

  if (showConfirm) {
    return (
      <div className={styles.confirmGroup}>
        <span className={styles.confirmText}>
          Delete {recipeTitle ?? "recipe"}?
        </span>
        <button
          type="button"
          className={styles.confirmButton}
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label="Confirm delete"
        >
          {isDeleting ? "Deleting..." : "Yes"}
        </button>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
          aria-label="Cancel delete"
        >
          Cancel
        </button>
        {error ? (
          <span className={styles.confirmText} role="alert">
            {error}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={styles.deleteButton}
      aria-label={`Delete ${recipeTitle ?? "recipe"} permanently`}
      onClick={() => setShowConfirm(true)}
    >
      <AppIcon name="trash" />
    </button>
  );
}
