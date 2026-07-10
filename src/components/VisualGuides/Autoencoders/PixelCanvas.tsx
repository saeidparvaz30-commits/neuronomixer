"use client";

import React, { useCallback, useRef } from "react";
import { IMG_SIZE, PRESETS } from "./autoencoderMath";
import { grayShade } from "./PixelGrid";

const VIEW = 176;
const CELL = VIEW / IMG_SIZE; // 22

type Mode = "draw" | "erase";

interface Props {
  pixels: readonly number[];
  mode: Mode;
  onModeChange: (m: Mode) => void;
  /** Paint one cell to the current mode's value. */
  onPaint: (index: number) => void;
  /** Load a preset glyph by index into PRESETS. */
  onPreset: (presetIndex: number) => void;
  /** Which preset the canvas currently shows, or null after freehand edits. */
  activePreset: number | null;
  onClear: () => void;
}

/**
 * The drawable 8x8 input canvas. Pointer users paint cells directly;
 * keyboard users have a full alternative path through the preset digit
 * buttons and the Clear button (all real inputs to the same model).
 */
export default function PixelCanvas({
  pixels,
  mode,
  onModeChange,
  onPaint,
  onPreset,
  activePreset,
  onClear,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const paintingRef = useRef(false);

  const cellFromEvent = useCallback((clientX: number, clientY: number): number | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const c = Math.floor(((clientX - rect.left) / rect.width) * IMG_SIZE);
    const r = Math.floor(((clientY - rect.top) / rect.height) * IMG_SIZE);
    if (c < 0 || c >= IMG_SIZE || r < 0 || r >= IMG_SIZE) return null;
    return r * IMG_SIZE + c;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.preventDefault();
      svgRef.current?.setPointerCapture(e.pointerId);
      paintingRef.current = true;
      const idx = cellFromEvent(e.clientX, e.clientY);
      if (idx !== null) onPaint(idx);
    },
    [cellFromEvent, onPaint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!paintingRef.current) return;
      const idx = cellFromEvent(e.clientX, e.clientY);
      if (idx !== null) onPaint(idx);
    },
    [cellFromEvent, onPaint]
  );

  const stopPainting = useCallback(() => {
    paintingRef.current = false;
  }, []);

  return (
    <div>
      <div className="flex items-start gap-4 flex-wrap">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="w-full max-w-[176px] rounded-lg border border-[#334155] cursor-crosshair"
          style={{ touchAction: "none" }}
          role="img"
          aria-label="Drawable 8 by 8 input image. Drag to paint pixels. Keyboard users: use the preset digit buttons and the Clear button below."
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopPainting}
          onPointerCancel={stopPainting}
          onPointerLeave={stopPainting}
        >
          {pixels.map((v, i) => {
            const r = Math.floor(i / IMG_SIZE);
            const c = i % IMG_SIZE;
            return (
              <rect
                key={i}
                x={c * CELL}
                y={r * CELL}
                width={CELL}
                height={CELL}
                fill={grayShade(v)}
                stroke="#1e293b"
                strokeWidth={0.5}
              />
            );
          })}
        </svg>

        <div className="flex-1 min-w-[180px] space-y-3">
          <div>
            <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
              Brush
            </p>
            <div className="flex gap-2" role="radiogroup" aria-label="Brush mode">
              {(["draw", "erase"] as const).map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => onModeChange(m)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors ${
                    mode === m
                      ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[#d4af37]/10"
                      : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
                  }`}
                >
                  {m === "draw" ? "Draw" : "Erase"}
                </button>
              ))}
              <button
                onClick={onClear}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
              Preset digits (keyboard path)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p, i) => (
                <button
                  key={p.id}
                  aria-pressed={activePreset === i}
                  aria-label={`Load preset digit ${p.label}`}
                  onClick={() => onPreset(i)}
                  className={`w-8 h-8 rounded-lg text-[13px] font-mono font-bold border transition-colors ${
                    activePreset === i
                      ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[#d4af37]/10"
                      : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-[#475569] leading-relaxed">
            Draw your own shape or load a preset. The network reconstructs whatever
            is on this canvas, live.
          </p>
        </div>
      </div>
    </div>
  );
}
