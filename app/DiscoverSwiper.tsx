"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Keyboard, Mousewheel } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import { AppIcon } from "./AppIcon";
import { useCart } from "./cart-context";
import styles from "./discover-swiper-clean.module.css";

type DiscoverRecipe = {
  _id: string;
  title?: string;
  slug?: { current?: string };
  description?: string;
  image?: { _type: string; asset: { _ref: string; _type: string } };
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

function shuffledIds(cards: DiscoverRecipe[]): string[] {
  return shuffledIndices(cards.length).map((index) => cards[index]._id);
}

function reconcileDeck(
  deck: { order: string[]; cursor: number },
  cards: DiscoverRecipe[],
): { order: string[]; cursor: number } {
  const availableIds = new Set(cards.map((card) => card._id));
  const kept = deck.order.filter((id) => availableIds.has(id));
  const missing = cards.map((card) => card._id).filter((id) => !kept.includes(id));
  const missingShuffled = shuffledIndices(missing.length).map((index) => missing[index]);
  const order = [...kept, ...missingShuffled];
  if (order.length === 0) return { order: [], cursor: 0 };
  return { order, cursor: Math.min(deck.cursor, order.length - 1) };
}

export function DiscoverSwiper({ recipes, imageByRef }: DiscoverSwiperProps) {
  const { addToCart, items } = useCart();
  const swiperRef = useRef<SwiperType | null>(null);
  const actionLockRef = useRef(false);

  const cartIds = useMemo(() => new Set(items.map((item) => item._id)), [items]);
  const cards = useMemo(
    () => recipes.filter((recipe) => !cartIds.has(recipe._id)),
    [recipes, cartIds],
  );

  const [deck, setDeck] = useState<{ order: string[]; cursor: number }>(() => ({
    order: shuffledIds(cards),
    cursor: 0,
  }));
  const activeDeck = useMemo(() => reconcileDeck(deck, cards), [deck, cards]);
  const cardsById = useMemo(() => new Map(cards.map((card) => [card._id, card])), [cards]);

  const currentId = activeDeck.order[activeDeck.cursor];
  const nextId = activeDeck.order[(activeDeck.cursor + 1) % Math.max(activeDeck.order.length, 1)];
  const afterNextId =
    activeDeck.order[(activeDeck.cursor + 2) % Math.max(activeDeck.order.length, 1)];

  const current = currentId ? cardsById.get(currentId) ?? null : null;
  const next = nextId ? cardsById.get(nextId) ?? null : null;
  const afterNext = afterNextId ? cardsById.get(afterNextId) ?? null : null;

  function advance() {
    if (!cards.length) return;
    setDeck((prev) => {
      const normalized = reconcileDeck(prev, cards);
      const nextCursor = normalized.cursor + 1;
      if (nextCursor < normalized.order.length) {
        return { ...normalized, cursor: nextCursor };
      }
      return { order: shuffledIds(cards), cursor: 0 };
    });
  }

  function previous() {
    if (!cards.length) return;
    setDeck((prev) => {
      const normalized = reconcileDeck(prev, cards);
      return {
        ...normalized,
        cursor: normalized.cursor === 0 ? Math.max(normalized.order.length - 1, 0) : normalized.cursor - 1,
      };
    });
  }

  function keepCurrent() {
    if (!current) return;
    addToCart({
      _id: current._id,
      title: current.title,
      slug: current.slug,
      imageRef: current.image?.asset?._ref,
    });
    advance();
  }

  function dismissCurrent() {
    advance();
  }

  function commitByDirection(direction: "left" | "right") {
    if (direction === "right") {
      keepCurrent();
    } else {
      dismissCurrent();
    }
  }

  useEffect(() => {
    if (!swiperRef.current) return;
    swiperRef.current.slideTo(1, 0, false);
    actionLockRef.current = false;
  }, [current?._id]);

  function handleSlideCommit(swiper: SwiperType) {
    if (actionLockRef.current) return;
    if (swiper.activeIndex === 1) return;
    actionLockRef.current = true;
    const direction: "left" | "right" = swiper.activeIndex > 1 ? "right" : "left";
    commitByDirection(direction);

    // Always recenter and unlock, even if state updates resolve later.
    requestAnimationFrame(() => {
      swiper.slideTo(1, 0, false);
      actionLockRef.current = false;
    });
  }

  if (!current) {
    const hasRecipes = recipes.length > 0;
    return (
      <section className={styles.empty}>
        <h1 className={styles.emptyTitle}>
          {hasRecipes ? "All discovered recipes are in your cart." : "No recipes yet."}
        </h1>
        <p className={styles.emptyCopy}>
          {hasRecipes
            ? "Remove a recipe from cart to bring it back into Discover."
            : "Create recipes in Studio first, then Discover will become swipe-ready."}
        </p>
        <Link href={hasRecipes ? "/cart" : "/studio"} className={styles.emptyLink}>
          {hasRecipes ? "Open Cart" : "Open Studio"}
        </Link>
      </section>
    );
  }

  const currentImageRef = current.image?.asset?._ref;
  const currentImage = currentImageRef ? imageByRef[currentImageRef] : null;
  const nextImageRef = next?.image?.asset?._ref;
  const nextImage = nextImageRef ? imageByRef[nextImageRef] : null;
  const afterNextImageRef = afterNext?.image?.asset?._ref;
  const afterNextImage = afterNextImageRef ? imageByRef[afterNextImageRef] : null;
  const categoryLabel =
    current.categories && current.categories.length > 0
      ? current.categories.map((category) => category.name).filter(Boolean).join(" · ")
      : "Uncategorized";

  return (
    <section className={styles.wrap}>
      <div className={styles.canvas}>
        {afterNext ? (
          <article className={`${styles.previewCard} ${styles.previewThree}`} aria-hidden="true">
            <div className={styles.media}>
              {afterNextImage ? (
                <Image
                  fill
                  src={afterNextImage}
                  alt=""
                  sizes="(max-width: 768px) 84vw, 390px"
                  className={styles.image}
                />
              ) : (
                <div className={styles.imageFallback} />
              )}
              <div className={styles.previewOverlay} />
            </div>
          </article>
        ) : null}
        {next ? (
          <article className={`${styles.previewCard} ${styles.previewTwo}`} aria-hidden="true">
            <div className={styles.media}>
              {nextImage ? (
                <Image
                  fill
                  src={nextImage}
                  alt=""
                  sizes="(max-width: 768px) 88vw, 405px"
                  className={styles.image}
                />
              ) : (
                <div className={styles.imageFallback} />
              )}
              <div className={styles.previewOverlay} />
            </div>
          </article>
        ) : null}

        <div className={styles.swiperShell}>
          <Swiper
            className={styles.swiperViewport}
            modules={[Mousewheel, Keyboard, A11y]}
            slidesPerView={1}
            initialSlide={1}
            speed={420}
            threshold={18}
            resistanceRatio={0.85}
            keyboard={{ enabled: true }}
            mousewheel={{
              forceToAxis: true,
              sensitivity: 0.65,
              thresholdDelta: 18,
              releaseOnEdges: false,
            }}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
              swiper.slideTo(1, 0, false);
            }}
            onAfterInit={(swiper) => {
              swiper.slideTo(1, 0, false);
            }}
            onSlideChangeTransitionEnd={handleSlideCommit}
          >
            <SwiperSlide className={styles.swiperSlide}>
              <button type="button" className={styles.sideAction} onClick={dismissCurrent}>
                <AppIcon name="close" className={styles.actionIcon} />
                <span>Dismiss</span>
              </button>
            </SwiperSlide>

            <SwiperSlide className={styles.swiperSlide}>
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
                      className={styles.actionPrimary}
                      aria-label="Keep recipe"
                      onClick={keepCurrent}
                    >
                      <AppIcon name="heart" className={styles.actionIconLarge} />
                    </button>
                  </div>
                </div>
              </article>
            </SwiperSlide>

            <SwiperSlide className={styles.swiperSlide}>
              <button type="button" className={styles.sideAction} onClick={keepCurrent}>
                <AppIcon name="heart" className={styles.actionIcon} />
                <span>Keep</span>
              </button>
            </SwiperSlide>
          </Swiper>
        </div>
      </div>
    </section>
  );
}
