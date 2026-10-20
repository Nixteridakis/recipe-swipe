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
  allowRemove?: boolean;
};

export function AddToCartButton({ recipe, className, allowRemove = false }: AddToCartButtonProps) {
  const { items, addToCart, removeFromCart } = useCart();
  const isInCart = useMemo(
    () => items.some((item) => item._id === recipe._id),
    [items, recipe._id],
  );

  return (
    <button
      type="button"
      className={className}
      aria-label={
        isInCart
          ? allowRemove
            ? "Remove recipe from recipe book"
            : "Recipe is in recipe book"
          : "Add recipe to recipe book"
      }
      aria-pressed={isInCart}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (isInCart && allowRemove) {
          removeFromCart(recipe._id);
        } else if (!isInCart) {
          addToCart(recipe);
        }
      }}
    >
      <AppIcon name={isInCart ? "bag" : "plus"} />
    </button>
  );
}
