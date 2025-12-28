"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartRecipe = {
  _id: string;
  title?: string;
  slug?: { current?: string };
  imageRef?: string;
};

type CartContextValue = {
  items: CartRecipe[];
  addToCart: (recipe: CartRecipe) => void;
  removeFromCart: (recipeId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "recipe-book-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartRecipe[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as CartRecipe[];
      if (Array.isArray(parsed)) {
        setItems(parsed);
      }
    } catch {
      // ignore invalid storage and start fresh
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addToCart: (recipe) => {
        setItems((prev) =>
          prev.some((item) => item._id === recipe._id) ? prev : [recipe, ...prev],
        );
      },
      removeFromCart: (recipeId) => {
        setItems((prev) => prev.filter((item) => item._id !== recipeId));
      },
      clearCart: () => {
        setItems([]);
      },
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
