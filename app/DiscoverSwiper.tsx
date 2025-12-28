"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AppIcon } from "./AppIcon";
import { useCart } from "./cart-context";
import styles from "./discover-swiper.module.css";

type DiscoverRecipe = {
  _id: string;
  title?: string;
  slug?: { current?: string };
  description?: string;
  image?: { _type: string; asset: { _ref: string; _type: string } };
  prepTime?: number;
  categories?: { _id: string; name: string; slug?: { current?: string } }[];
};

type DiscoverSwiperProps = {
  recipes: DiscoverRecipe[];
  imageByRef: Record<string, string>;
};

function shuffledIndices(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

export function DiscoverSwiper({ recipes, imageByRef }: DiscoverSwiperProps) {
  const { addToCart } = useCart();
  const cards = useMemo(() => recipes, [recipes]);
  const [order, setOrder] = useState<number[]>(() => shuffledIndices(cards.length));
  const [cursor, setCursor] = useState(0);
  const cardsSignature = useMemo(() => cards.map((card) => card._id).join("|"), [cards]);

  const currentIndex = order[cursor];
  const nextIndex = order[(cursor + 1) % Math.max(order.length, 1)];
  const afterNextIndex = order[(cursor + 2) % Math.max(order.length, 1)];

  const current = currentIndex != null ? cards[currentIndex] : null;
  const next = nextIndex != null ? cards[nextIndex] : null;
  const afterNext = afterNextIndex != null ? cards[afterNextIndex] : null;

  useEffect(() => {
    setOrder(shuffledIndices(cards.length));
    setCursor(0);
  }, [cards.length, cardsSignature]);

  function advance() {
    if (!cards.length) return;
    const nextCursor = cursor + 1;
    if (nextCursor < order.length) {
      setCursor(nextCursor);
      return;
    }

    // Full randomized pass completed. Generate a fresh wildcard order.
    setOrder(shuffledIndices(cards.length));
    setCursor(0);
  }

  function previous() {
    if (!cards.length) return;
    setCursor((prev) => (prev === 0 ? Math.max(order.length - 1, 0) : prev - 1));
  }

  function addCurrentToCart() {
    if (!current) return;
    addToCart({
      _id: current._id,
      title: current.title,
      slug: current.slug,
      imageRef: current.image?.asset?._ref,
    });
  }

  if (!current) {
    return (
      <section className={styles.empty}>
        <h1 className={styles.emptyTitle}>No recipes yet.</h1>
        <p className={styles.emptyCopy}>
          Create recipes in Studio first, then Discover will become swipe-ready.
        </p>
        <Link href="/studio" className={styles.emptyLink}>
          Open Studio
        </Link>
      </section>
    );
  }

  const currentImageRef = current.image?.asset?._ref;
  const currentImage = currentImageRef ? imageByRef[currentImageRef] : null;
  const categoryLabel =
    current.categories && current.categories.length > 0
      ? current.categories
          .map((category) => category.name)
          .filter(Boolean)
          .join(" · ")
      : "Uncategorized";

  return (
    <section className={styles.wrap}>
      <div className={styles.canvas}>
        {afterNext ? <div className={styles.stackThree} /> : null}
        {next ? <div className={styles.stackTwo} /> : null}

        <div className={styles.leftCue} aria-hidden="true">
          <AppIcon name="arrow-right" className={styles.cueIconLeft} />
          <span>Dismiss</span>
        </div>
        <div className={styles.rightCue} aria-hidden="true">
          <AppIcon name="arrow-right" className={styles.cueIconRight} />
          <span>Keep</span>
        </div>

        <article className={styles.card}>
          <div className={styles.media}>
            {currentImage ? (
              <Image
                fill
                src={currentImage}
                alt={current.title ?? "Recipe"}
                sizes="(max-width: 768px) 92vw, 420px"
                className={styles.image}
                priority
              />
            ) : (
              <div className={styles.imageFallback} />
            )}
            <div className={styles.overlay} />
          </div>

          <div className={styles.body}>
            <div className={styles.badges}>
              <span className={styles.categoryBadge}>{categoryLabel}</span>
              <span className={styles.countBadge}>
                {cards.length} card{cards.length === 1 ? "" : "s"} / cycle
              </span>
            </div>

            <h1 className={styles.title}>{current.title ?? "Untitled recipe"}</h1>
            <p className={styles.description}>
              {current.description ??
                "Wildcard recipe feed. Keep flicking to run through the full randomized set."}
            </p>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.actionGhost}
                onClick={previous}
                aria-label="Previous recipe"
              >
                <AppIcon name="close" className={styles.actionIcon} />
              </button>
              <button
                type="button"
                className={styles.actionSoft}
                onClick={() => {
                  addCurrentToCart();
                  advance();
                }}
                aria-label="Next recipe"
              >
                <AppIcon name="star" className={styles.actionIcon} />
              </button>
              <Link
                href={
                  current.slug?.current
                    ? `/recipe/${encodeURIComponent(current.slug.current)}`
                    : "/recipes"
                }
                className={styles.actionPrimary}
                aria-label="Open recipe"
                onClick={addCurrentToCart}
              >
                <AppIcon name="heart" className={styles.actionIconLarge} />
              </Link>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
