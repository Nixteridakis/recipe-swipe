"use client";

import { useState } from "react";
import { annulusSectorPath } from "./compositionRingPaths";
import styles from "./page.module.css";

const VIEW = 100;
const CX = 50;
const CY = 50;
const R_OUT = 48;
const R_IN = 33;

const SEGMENTS = [
  { key: "produce" as const, label: "Produce", color: "#F0642F" },
  { key: "protein" as const, label: "Protein", color: "#4E211E" },
  { key: "pantry" as const, label: "Pantry", color: "#d8c2bb" },
];

type Composition = { produce: number; protein: number; pantry: number; total: number };

type Props = { composition: Composition };

export function CompositionRing({ composition }: Props) {
  const [hoverKey, setHoverKey] = useState<(typeof SEGMENTS)[number]["key"] | null>(null);

  const { produce, protein, pantry, total } = composition;

  const sliceData = (() => {
    if (!total) {
      const d = annulusSectorPath(CX, CY, R_OUT, R_IN, 0, 359.98);
      return [{ key: "empty" as const, label: "", color: "#d8c2bb", d, count: 0 }];
    }

    let angle = 0;
    const out: {
      key: (typeof SEGMENTS)[number]["key"] | "empty";
      label: string;
      color: string;
      d: string;
      count: number;
    }[] = [];

    const counts = { produce, protein, pantry } as const;
    for (const seg of SEGMENTS) {
      const count = counts[seg.key];
      if (count <= 0) continue;
      const span = (count / total) * 360;
      const d = annulusSectorPath(CX, CY, R_OUT, R_IN, angle, angle + span);
      angle += span;
      if (d) out.push({ key: seg.key, label: seg.label, color: seg.color, d, count });
    }
    return out;
  })();

  const tooltipLabel =
    hoverKey && composition[hoverKey] > 0
      ? SEGMENTS.find((s) => s.key === hoverKey)?.label ?? ""
      : "";

  return (
    <div
      className={styles.compositionRingOuter}
      onMouseLeave={() => setHoverKey(null)}
    >
      {tooltipLabel ? (
        <span className={styles.ringTooltip} role="tooltip">
          {tooltipLabel}
        </span>
      ) : null}

      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className={styles.compositionSvg}
        aria-hidden
      >
        {sliceData.map((slice) =>
          slice.key === "empty" ? (
            <path key="empty" d={slice.d} fill={slice.color} className={styles.compositionSegmentEmpty} />
          ) : (
            <g
              key={slice.key}
              className={styles.compositionSegmentGroup}
              onMouseEnter={() => {
                if (slice.key !== "empty") setHoverKey(slice.key);
              }}
            >
              <title>{slice.label}</title>
              <path d={slice.d} fill={slice.color} className={styles.compositionSegmentPath} />
            </g>
          ),
        )}
      </svg>

      <div className={styles.compositionRingInner} aria-hidden>
        <span className={styles.compositionCount}>{composition.total}</span>
        <span className={styles.compositionLabel}>Ingredients</span>
      </div>
    </div>
  );
}
