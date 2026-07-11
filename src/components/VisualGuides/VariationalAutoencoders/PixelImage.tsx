import React from "react";
import { IMG_SIZE } from "./vaeMath";

/**
 * Renders a 64-pixel grayscale image as an SVG grid. Fill colors are
 * integer-quantized so SSR and client HTML agree byte for byte.
 * Ramp: background token #0f172a (15,23,42) to text token #f1f5f9 (241,245,249).
 */
export function pixelColor(v: number): string {
  const t = Math.min(1, Math.max(0, v));
  const r = Math.round(15 + t * (241 - 15));
  const g = Math.round(23 + t * (245 - 23));
  const b = Math.round(42 + t * (249 - 42));
  return `rgb(${r},${g},${b})`;
}

interface Props {
  pixels: readonly number[];
  ariaLabel: string;
  className?: string;
}

export default function PixelImage({ pixels, ariaLabel, className }: Props) {
  return (
    <svg
      viewBox={`0 0 ${IMG_SIZE} ${IMG_SIZE}`}
      className={className}
      role="img"
      aria-label={ariaLabel}
      shapeRendering="crispEdges"
    >
      {pixels.map((v, i) => {
        const r = Math.floor(i / IMG_SIZE);
        const c = i % IMG_SIZE;
        return (
          <rect
            key={i}
            x={c}
            y={r}
            width={1}
            height={1}
            fill={pixelColor(v)}
          />
        );
      })}
    </svg>
  );
}
