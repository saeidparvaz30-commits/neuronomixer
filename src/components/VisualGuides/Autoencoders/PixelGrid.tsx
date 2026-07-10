"use client";

import { IMG_SIZE } from "./autoencoderMath";

/**
 * Grayscale shade for a pixel value in [0, 1]: interpolates between the
 * background token #0f172a and the text token #f1f5f9. Components are
 * rounded to integers so SSR and client render byte-identical markup.
 */
export function grayShade(v: number): string {
  const c = Math.max(0, Math.min(1, v));
  const r = Math.round(15 + c * (241 - 15));
  const g = Math.round(23 + c * (245 - 23));
  const b = Math.round(42 + c * (249 - 42));
  return `rgb(${r},${g},${b})`;
}

/**
 * Error shade for an absolute pixel error in [0, 1]: interpolates between
 * the background token #0f172a and the red token #ef4444.
 */
export function errorShade(e: number): string {
  const c = Math.max(0, Math.min(1, e));
  const r = Math.round(15 + c * (239 - 15));
  const g = Math.round(23 + c * (68 - 23));
  const b = Math.round(42 + c * (68 - 42));
  return `rgb(${r},${g},${b})`;
}

const VIEW = 176;
const CELL = VIEW / IMG_SIZE; // 22

interface Props {
  values: readonly number[];
  shade: (v: number) => string;
  ariaLabel: string;
}

/** Static 8x8 pixel grid rendered as pure SVG rects. */
export default function PixelGrid({ values, shade, ariaLabel }: Props) {
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="w-full max-w-[176px] rounded-lg border border-[#1e293b]"
      role="img"
      aria-label={ariaLabel}
    >
      {values.map((v, i) => {
        const r = Math.floor(i / IMG_SIZE);
        const c = i % IMG_SIZE;
        return (
          <rect
            key={i}
            x={c * CELL}
            y={r * CELL}
            width={CELL}
            height={CELL}
            fill={shade(v)}
          />
        );
      })}
    </svg>
  );
}
