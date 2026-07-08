"use client";

import { useEffect, useRef } from "react";
import { applyPooling } from "./poolingLogic";
import { PoolingConfig } from "./types";

const DEFAULT_GRID = [
  [120, 80, 200, 150, 30, 180, 90, 210],
  [60, 240, 70, 110, 220, 40, 160, 50],
  [190, 30, 140, 80, 170, 250, 20, 130],
  [100, 160, 50, 230, 90, 60, 200, 70],
  [40, 200, 180, 20, 140, 100, 50, 220],
  [230, 70, 110, 190, 60, 180, 140, 30],
  [80, 150, 60, 100, 210, 40, 170, 90],
  [170, 20, 220, 50, 80, 160, 30, 240],
];

const MAX_CONFIG: PoolingConfig = { type: "max", kernelSize: 2, stride: 2 };
const AVG_CONFIG: PoolingConfig = { type: "average", kernelSize: 2, stride: 2 };

const CELL_SIZE = 42;
const CELL_GAP = 3;

function cellBg(value: number, type: "max" | "average"): string {
  const normalized = Math.min(value, 255) / 255;
  if (type === "max") {
    const l = Math.round(15 + normalized * 55);
    return `hsl(171, 60%, ${l}%)`;
  } else {
    const l = Math.round(15 + normalized * 55);
    return `hsl(207, 60%, ${l}%)`;
  }
}

function cellTextColor(value: number): string {
  const normalized = value / 255;
  return normalized > 0.55 ? "#0f172a" : "#f1f5f9";
}

type MiniGridProps = {
  grid: number[][];
  type: "max" | "average";
};

function MiniGrid({ grid, type }: MiniGridProps) {
  const size = grid.length;
  const totalCell = CELL_SIZE + CELL_GAP;
  const totalPx = size * totalCell - CELL_GAP;

  return (
    <div className="relative flex-shrink-0" style={{ width: totalPx, height: totalPx }}>
      {grid.map((row, r) =>
        row.map((val, c) => (
          <div
            key={`${r},${c}`}
            className="absolute rounded flex items-center justify-center text-[11px] font-mono font-bold"
            style={{
              left: c * totalCell,
              top: r * totalCell,
              width: CELL_SIZE,
              height: CELL_SIZE,
              background: cellBg(val, type),
              color: cellTextColor(val),
            }}
          >
            {val}
          </div>
        ))
      )}
    </div>
  );
}

type Props = {
  onVisible?: () => void;
};

export default function SideBySideComparison({ onVisible }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);

  const maxOutput = applyPooling(DEFAULT_GRID, MAX_CONFIG);
  const avgOutput = applyPooling(DEFAULT_GRID, AVG_CONFIG);

  useEffect(() => {
    if (!onVisible || firedRef.current) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !firedRef.current) {
          firedRef.current = true;
          onVisible();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible]);

  return (
    <div ref={ref} className="flex flex-col gap-4">
      {/* Header */}
      <p className="text-[13px] text-[#94a3b8] leading-relaxed">
        Same 8&times;8 input, same 2&times;2 kernel, stride 2 &rarr; 4&times;4 output.{" "}
        <span className="text-white font-semibold">Max Pooling</span> retains sharp features
        (higher peak values);{" "}
        <span className="text-[#93c5fd] font-semibold">Average Pooling</span> is smoother
        (values blend together).
      </p>

      {/* Side by side */}
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Max */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#3bb4a4]" />
            <span className="text-sm font-semibold text-[#3bb4a4]">Max Pooling</span>
            <span className="text-[11px] text-[#475569]">2&times;2, stride 2</span>
          </div>
          <MiniGrid grid={maxOutput} type="max" />
          <p className="text-[11px] text-[#94a3b8] text-center max-w-[200px]">
            Preserves strongest activations. Sharper contrast.
          </p>
        </div>

        {/* Divider */}
        <div className="hidden sm:flex items-center self-stretch">
          <div className="w-px h-full bg-white/[0.06] mx-2" />
          <span className="text-[11px] font-bold text-[#475569] -rotate-90 whitespace-nowrap px-2">
            vs
          </span>
          <div className="w-px h-full bg-white/[0.06] mx-2" />
        </div>

        {/* Average */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#1e5d8a]" />
            <span className="text-sm font-semibold text-[#93c5fd]">Average Pooling</span>
            <span className="text-[11px] text-[#475569]">2&times;2, stride 2</span>
          </div>
          <MiniGrid grid={avgOutput} type="average" />
          <p className="text-[11px] text-[#94a3b8] text-center max-w-[200px]">
            Blends values together. Smoother, lower peaks.
          </p>
        </div>
      </div>

      {/* Value range comparison */}
      <div className="grid grid-cols-2 gap-3 mt-1">
        {[
          {
            label: "Max Pooling range",
            grid: maxOutput,
            color: "#3bb4a4",
          },
          {
            label: "Average Pooling range",
            grid: avgOutput,
            color: "#93c5fd",
          },
        ].map(({ label, grid, color }) => {
          const flat = grid.flat();
          const min = Math.min(...flat);
          const max = Math.max(...flat);
          const mean = Math.round(flat.reduce((a, b) => a + b, 0) / flat.length);
          return (
            <div
              key={label}
              className="rounded-lg bg-[#0f172a] border border-white/[0.06] p-3"
            >
              <p className="text-[11px] font-semibold mb-2" style={{ color }}>
                {label}
              </p>
              <div className="flex gap-3 text-[11px] text-[#94a3b8]">
                <span>
                  Min: <b className="text-white">{min}</b>
                </span>
                <span>
                  Max: <b className="text-white">{max}</b>
                </span>
                <span>
                  Mean: <b className="text-white">{mean}</b>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
