"use client";

import { useMemo } from "react";
import { AppIcon } from "./AppIcon";
import { useCart } from "./cart-context";

type AddToCartButtonProps = {
  recipe: {
    _id: string;
    title?: string;
    slug?: { current?: string };
    imageRef?: string;
  };
  className?: string;
};

export function AddToCartButton({ recipe, className }: AddToCartButtonProps) {
  const { items, addToCart } = useCart();
  const isInCart = useMemo(
    () => items.some((item) => item._id === recipe._id),
    [items, recipe._id],
  );

  return (
    <button
      type="button"
      className={className}
      aria-label={isInCart ? "Already in shopping cart" : "Add recipe to shopping cart"}
      aria-pressed={isInCart}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (isInCart) return;
        addToCart(recipe);
      }}
    >
      <AppIcon name={isInCart ? "bag" : "plus"} />
    </button>
  );
}
