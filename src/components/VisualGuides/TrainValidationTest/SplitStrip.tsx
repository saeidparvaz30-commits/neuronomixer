"use client";

import React, { useRef, useCallback } from "react";
import {
  N_SAMPLES,
  MIN_TRAIN,
  MIN_VAL,
  MIN_TEST,
} from "./splitMath";

export const TRAIN_COLOR = "#1e5d8a";
export const VAL_COLOR = "#3bb4a4";
export const TEST_COLOR = "#a855f7";

interface Props {
  b1: number;
  b2: number;
  onChange: (b1: number, b2: number) => void;
}

interface HandleProps {
  value: number;
  min: number;
  max: number;
  label: string;
  valueText: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onMove: (next: number) => void;
}

function BoundaryHandle({
  value,
  min,
  max,
  label,
  valueText,
  containerRef,
  onMove,
}: HandleProps) {
  const dragging = useRef(false);

  const moveFromClientX = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const raw = Math.round(((clientX - rect.left) / rect.width) * N_SAMPLES);
      onMove(Math.min(Math.max(raw, min), max));
    },
    [containerRef, onMove, min, max]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    let next: number | null = null;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = value - 1;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = value + 1;
    else if (e.key === "PageDown") next = value - 5;
    else if (e.key === "PageUp") next = value + 5;
    else if (e.key === "Home") next = min;
    else if (e.key === "End") next = max;
    if (next === null) return;
    e.preventDefault();
    onMove(Math.min(Math.max(next, min), max));
  };

  const leftPct = ((value / N_SAMPLES) * 100).toFixed(3);

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-orientation="horizontal"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      onKeyDown={handleKeyDown}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        moveFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging.current) moveFromClientX(e.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      className="absolute -top-2 -bottom-2 w-5 -translate-x-1/2 cursor-ew-resize touch-none flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded"
      style={{ left: `${leftPct}%` }}
    >
      <div className="w-[6px] h-full rounded-full bg-[#f1f5f9] border border-[#334155] shadow-[0_0_0_3px_rgba(15,23,42,0.85)] flex flex-col items-center justify-center gap-[3px]">
        <span className="w-[2px] h-[2px] rounded-full bg-[#475569]" />
        <span className="w-[2px] h-[2px] rounded-full bg-[#475569]" />
        <span className="w-[2px] h-[2px] rounded-full bg-[#475569]" />
      </div>
    </div>
  );
}

/**
 * The draggable (and keyboard-adjustable) split strip. One cell per sample,
 * in the dataset's already-shuffled order; contiguous blocks are train,
 * validation, and test.
 */
export default function SplitStrip({ b1, b2, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const nTrain = b1;
  const nVal = b2 - b1;
  const nTest = N_SAMPLES - b2;

  const regions = [
    {
      name: "Train",
      n: nTrain,
      color: TRAIN_COLOR,
      shape: "circle",
      role: "fits the parameters",
    },
    {
      name: "Validation",
      n: nVal,
      color: VAL_COLOR,
      shape: "diamond",
      role: "chooses between models",
    },
    {
      name: "Test",
      n: nTest,
      color: TEST_COLOR,
      shape: "square",
      role: "one honest read at the end",
    },
  ];

  return (
    <div>
      <div className="relative pt-2 pb-2" ref={containerRef}>
        <div
          className="flex gap-px h-12 rounded-lg overflow-hidden"
          aria-hidden="true"
        >
          {Array.from({ length: N_SAMPLES }, (_, i) => (
            <div
              key={i}
              className="flex-1 min-w-0"
              style={{
                background: i < b1 ? TRAIN_COLOR : i < b2 ? VAL_COLOR : TEST_COLOR,
                opacity: 0.85,
              }}
            />
          ))}
        </div>
        <BoundaryHandle
          value={b1}
          min={MIN_TRAIN}
          max={b2 - MIN_VAL}
          label="Train and validation boundary"
          valueText={`${b1} samples in train, ${b2 - b1} in validation`}
          containerRef={containerRef}
          onMove={(next) => onChange(next, b2)}
        />
        <BoundaryHandle
          value={b2}
          min={b1 + MIN_VAL}
          max={N_SAMPLES - MIN_TEST}
          label="Validation and test boundary"
          valueText={`${b2 - b1} samples in validation, ${N_SAMPLES - b2} in test`}
          containerRef={containerRef}
          onMove={(next) => onChange(b1, next)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
        {regions.map((r) => (
          <div
            key={r.name}
            className="rounded-xl border border-[#1e293b] px-3 py-2.5 flex items-center gap-3"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              aria-hidden="true"
              className="shrink-0"
            >
              {r.shape === "circle" && (
                <circle cx="7" cy="7" r="5.5" fill={r.color} />
              )}
              {r.shape === "diamond" && (
                <path d="M7 1 L13 7 L7 13 L1 7 Z" fill={r.color} />
              )}
              {r.shape === "square" && (
                <rect x="1.5" y="1.5" width="11" height="11" fill={r.color} />
              )}
            </svg>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[#f1f5f9]">
                {r.name}{" "}
                <span className="font-mono text-[11px] text-[#94a3b8]">
                  n={r.n} ({((r.n / N_SAMPLES) * 100).toFixed(1)}%)
                </span>
              </p>
              <p className="text-[11px] text-[#475569]">{r.role}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[#475569] mt-2 leading-relaxed">
        Drag a handle, or focus it and use the arrow keys (PageUp / PageDown
        move 5 samples). Minimum sizes: {MIN_TRAIN} train, {MIN_VAL}{" "}
        validation, {MIN_TEST} test.
      </p>
    </div>
  );
}
