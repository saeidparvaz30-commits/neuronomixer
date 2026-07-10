"use client";

import React, { useRef } from "react";
import { GRID, grayFill } from "./vitMath";

interface Props {
  pixels: number[];
  patchSize: number;
  selectedIndex: number | null;
  onPaintCell: (x: number, y: number) => void;
}

/**
 * 24x24 drawable grayscale surface rendered as SVG. Pointer drawing only;
 * the preset buttons next to it are the keyboard-operable alternative for
 * changing the image, and the patch inspector provides exact pixel values
 * as text.
 */
export default function PixelCanvas({
  pixels,
  patchSize,
  selectedIndex,
  onPaintCell,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const painting = useRef(false);

  function cellFromEvent(e: React.PointerEvent<SVGSVGElement>): {
    x: number;
    y: number;
  } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * GRID);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * GRID);
    if (x < 0 || x >= GRID || y < 0 || y >= GRID) return null;
    return { x, y };
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    painting.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const cell = cellFromEvent(e);
    if (cell) onPaintCell(cell.x, cell.y);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!painting.current) return;
    const cell = cellFromEvent(e);
    if (cell) onPaintCell(cell.x, cell.y);
  }

  function handlePointerUp() {
    painting.current = false;
  }

  const per = GRID / patchSize;
  const selRow = selectedIndex !== null ? Math.floor(selectedIndex / per) : -1;
  const selCol = selectedIndex !== null ? selectedIndex % per : -1;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${GRID} ${GRID}`}
      className="w-full max-w-[336px] aspect-square rounded-xl border border-[#334155] touch-none cursor-crosshair select-none"
      role="img"
      aria-label={`Drawable ${GRID} by ${GRID} pixel image. Draw with the pointer, or use the preset buttons as a keyboard alternative. Exact pixel values appear in the patch inspector below.`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      shapeRendering="crispEdges"
    >
      {pixels.map((v, i) => {
        const x = i % GRID;
        const y = Math.floor(i / GRID);
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={1}
            height={1}
            fill={grayFill(v)}
          />
        );
      })}
      {/* Patch boundaries */}
      {Array.from({ length: per - 1 }, (_, k) => {
        const pos = (k + 1) * patchSize;
        return (
          <g key={k} style={{ stroke: "var(--color-accent)" }}>
            <line x1={pos} y1={0} x2={pos} y2={GRID} strokeWidth={0.08} strokeOpacity={0.55} />
            <line x1={0} y1={pos} x2={GRID} y2={pos} strokeWidth={0.08} strokeOpacity={0.55} />
          </g>
        );
      })}
      {/* Selected patch highlight */}
      {selectedIndex !== null && (
        <rect
          x={selCol * patchSize}
          y={selRow * patchSize}
          width={patchSize}
          height={patchSize}
          fill="none"
          style={{ stroke: "var(--color-accent)" }}
          strokeWidth={0.3}
        />
      )}
    </svg>
  );
}
