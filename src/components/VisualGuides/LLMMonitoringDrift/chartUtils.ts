/** Pure SVG-geometry helpers shared by the guide's charts. No React imports. */

export interface Extent {
  min: number;
  max: number;
}

/** Extent of a series padded by `pad` fraction of the range. */
export function paddedExtent(values: readonly number[], pad = 0.15): Extent {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!isFinite(min) || !isFinite(max)) return { min: 0, max: 1 };
  const range = max - min || Math.abs(max) || 1;
  return { min: min - range * pad, max: max + range * pad };
}

export function xScale(t: number, n: number, width: number): number {
  return n <= 1 ? 0 : (t / (n - 1)) * width;
}

export function yScale(v: number, ext: Extent, height: number): number {
  const span = ext.max - ext.min || 1;
  return height - ((v - ext.min) / span) * height;
}

/** SVG polyline path for a series within a width x height box. */
export function linePath(
  values: readonly number[],
  ext: Extent,
  width: number,
  height: number
): string {
  if (values.length === 0) return "";
  return values
    .map((v, t) => {
      const x = xScale(t, values.length, width).toFixed(2);
      const y = yScale(v, ext, height).toFixed(2);
      return `${t === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}
