/** Donut sector in SVG viewBox coordinates (y-down), angles in degrees clockwise from 12 o'clock. */
export function annulusSectorPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  degStart: number,
  degEnd: number,
): string {
  const rad = Math.PI / 180;
  const sweep = degEnd - degStart;
  if (sweep <= 0.02) return "";
  const clampedEnd = degStart + Math.min(sweep, 359.98);

  const pt = (r: number, deg: number) => {
    const x = cx + r * Math.sin(deg * rad);
    const y = cy - r * Math.cos(deg * rad);
    return [x, y] as const;
  };

  const [xo1, yo1] = pt(outerR, degStart);
  const [xo2, yo2] = pt(outerR, clampedEnd);
  const [xi1, yi1] = pt(innerR, degStart);
  const [xi2, yi2] = pt(innerR, clampedEnd);

  const delta = clampedEnd - degStart;
  const large = delta > 180 ? 1 : 0;

  return [
    `M ${xo1} ${yo1}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${xo2} ${yo2}`,
    `L ${xi2} ${yi2}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${xi1} ${yi1}`,
    "Z",
  ].join(" ");
}
