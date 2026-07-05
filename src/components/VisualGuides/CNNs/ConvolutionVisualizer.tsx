"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FilterDefinition, SampleImage } from "./types";

interface ConvolutionVisualizerProps {
  filter: FilterDefinition;
  image: SampleImage;
  onOutputReady?: (display: number[][], raw: number[][]) => void;
}

function kernelDivisor(kernel: number[][]): number {
  const kernelSum = kernel.flat().reduce((a, b) => a + b, 0);
  // Averaging kernels (e.g. Gaussian blur, sum = 16) are normalized by their
  // sum so the response stays in the input's 0-1 range.
  return kernelSum > 1 ? kernelSum : 1;
}

/**
 * True convolution response: pixels scaled to 0-1, element-wise multiplied by
 * the kernel and summed (divided by the kernel sum for averaging kernels).
 * No display rescaling happens here; values can be negative.
 */
function convolve(grid: number[][], kernel: number[][]): number[][] {
  const rows = grid.length;
  const cols = grid[0].length;
  const kSize = kernel.length;
  const outRows = rows - kSize + 1;
  const outCols = cols - kSize + 1;
  const output: number[][] = [];
  const divisor = kernelDivisor(kernel);

  for (let r = 0; r < outRows; r++) {
    const row: number[] = [];
    for (let c = 0; c < outCols; c++) {
      let sum = 0;
      for (let kr = 0; kr < kSize; kr++) {
        for (let kc = 0; kc < kSize; kc++) {
          sum += (grid[r + kr][c + kc] / 255) * kernel[kr][kc];
        }
      }
      row.push(sum / divisor);
    }
    output.push(row);
  }
  return output;
}

function minMaxNormalize(grid: number[][]): number[][] {
  const flat = grid.flat();
  const min = Math.min(...flat);
  const max = Math.max(...flat);
  const range = max - min || 1;
  return grid.map((row) => row.map((v) => ((v - min) / range) * 255));
}

const CELL = 32;
const OUT_CELL = 36;
const ALL_POSITIONS: [number, number][] = [];
for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) ALL_POSITIONS.push([r, c]);

export default function ConvolutionVisualizer({
  filter,
  image,
  onOutputReady,
}: ConvolutionVisualizerProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const rawOutput = useMemo(() => convolve(image.grid, filter.kernel), [image.grid, filter.kernel]);
  const normOutput = useMemo(() => minMaxNormalize(rawOutput), [rawOutput]);

  useEffect(() => {
    onOutputReady?.(normOutput, rawOutput);
  }, [normOutput, rawOutput, onOutputReady]);

  // Reset step when filter/image changes
  useEffect(() => {
    setStepIdx(0);
    setIsPlaying(false);
  }, [filter.id, image.id]);

  const currentPos = ALL_POSITIONS[stepIdx] ?? [0, 0];
  const [hr, hc] = currentPos;

  const divisor = kernelDivisor(filter.kernel);
  const rawResponse = rawOutput[hr]?.[hc] ?? 0;
  const displayVal = normOutput[hr]?.[hc] ?? 0;

  const step = useCallback(() => {
    setStepIdx((prev) => (prev + 1) % ALL_POSITIONS.length);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(step, 400);
    return () => clearInterval(id);
  }, [isPlaying, step]);

  function pixelColor(v: number): string {
    const c = Math.round(v);
    return `rgb(${c},${c},${c})`;
  }

  function outputPixelColor(v: number): string {
    const c = Math.round(v);
    return `rgb(${c},${c},${c})`;
  }

  const patchVals = useMemo(() => {
    const patch: number[][] = [];
    for (let kr = 0; kr < 3; kr++) {
      const row: number[] = [];
      for (let kc = 0; kc < 3; kc++) {
        row.push(image.grid[hr + kr]?.[hc + kc] ?? 0);
      }
      patch.push(row);
    }
    return patch;
  }, [hr, hc, image.grid]);

  const dotProduct = useMemo(() => {
    let sum = 0;
    for (let kr = 0; kr < 3; kr++) {
      for (let kc = 0; kc < 3; kc++) {
        sum += (patchVals[kr][kc] / 255) * filter.kernel[kr][kc];
      }
    }
    return sum;
  }, [patchVals, filter.kernel]);

  return (
    <div className="bg-[#1e293b]/60 border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-white">Convolution Visualizer</h3>
        <div className="flex gap-2">
          <button
            onClick={step}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0f172a] border border-white/10 text-white hover:border-white/20 transition-all"
          >
            Step →
          </button>
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
            style={
              isPlaying
                ? { background: "#d4af3720", borderColor: "#d4af3760", color: "#d4af37" }
                : { background: "#3bb4a420", borderColor: "#3bb4a460", color: "#3bb4a4" }
            }
          >
            {isPlaying ? "Pause" : "Auto-Play"}
          </button>
          <button
            onClick={() => { setStepIdx(0); setIsPlaying(false); }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0f172a] border border-white/10 text-[#94a3b8] hover:text-white transition-all"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-[#0f172a] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: filter.color }}
            animate={{ width: `${((stepIdx + 1) / ALL_POSITIONS.length) * 100}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
        <span className="text-[10px] text-[#94a3b8] font-mono whitespace-nowrap">
          {stepIdx + 1} / {ALL_POSITIONS.length}
        </span>
      </div>

      {/* Grids side by side */}
      <div className="flex gap-6 flex-wrap items-start justify-center">
        {/* Input grid */}
        <div>
          <p className="text-[11px] text-[#94a3b8] mb-2 font-medium">
            Input (8×8) — <span className="text-white">{image.label}</span>
          </p>
          <div className="relative inline-block">
            <div
              className="grid gap-0.5"
              style={{ gridTemplateColumns: `repeat(8, ${CELL}px)` }}
            >
              {image.grid.map((row, r) =>
                row.map((val, c) => {
                  const inPatch =
                    r >= hr && r < hr + 3 && c >= hc && c < hc + 3;
                  return (
                    <div
                      key={`${r}-${c}`}
                      className="rounded-sm transition-all duration-150"
                      style={{
                        width: CELL,
                        height: CELL,
                        background: pixelColor(val),
                        outline: inPatch ? `2px solid #f97316` : "none",
                        outlineOffset: "-1px",
                        zIndex: inPatch ? 10 : 0,
                        position: "relative",
                      }}
                    />
                  );
                })
              )}
            </div>
            {/* Sliding 3x3 window overlay */}
            <AnimatePresence>
              <motion.div
                key={`window-${hr}-${hc}`}
                className="absolute pointer-events-none"
                style={{
                  left: hc * (CELL + 2),
                  top: hr * (CELL + 2),
                  width: 3 * CELL + 2 * 2,
                  height: 3 * CELL + 2 * 2,
                  border: "2.5px solid #f97316",
                  borderRadius: 4,
                  boxShadow: "0 0 12px #f9731660",
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", bounce: 0.25, duration: 0.3 }}
              />
            </AnimatePresence>
          </div>
          <p className="text-[10px] text-[#475569] mt-1.5 text-center">
            Orange box = current 3×3 patch. Stride = 1, no padding, which is
            why the 8×8 input shrinks to a 6×6 output.
          </p>
        </div>

        {/* Arrow */}
        <div className="flex items-center self-center">
          <span className="text-2xl" style={{ color: filter.color }}>→</span>
        </div>

        {/* Output grid */}
        <div>
          <p className="text-[11px] text-[#94a3b8] mb-2 font-medium">
            Output (6×6) — <span style={{ color: filter.color }}>{filter.label}</span>
          </p>
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(6, ${OUT_CELL}px)` }}
          >
            {normOutput.map((row, r) =>
              row.map((val, c) => {
                const isActive = r === hr && c === hc;
                return (
                  <div
                    key={`out-${r}-${c}`}
                    className="rounded-sm transition-all duration-150 flex items-center justify-center"
                    style={{
                      width: OUT_CELL,
                      height: OUT_CELL,
                      background: outputPixelColor(val),
                      outline: isActive ? `2.5px solid #22c55e` : "none",
                      outlineOffset: "-1px",
                    }}
                  >
                    {isActive && (
                      <span className="text-[9px] font-bold text-white drop-shadow-lg">
                        {Math.round(val)}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <p className="text-[10px] text-[#475569] mt-1.5 text-center">
            Green border = current output cell
          </p>
        </div>
      </div>

      {/* Computation breakdown */}
      <div className="bg-[#0f172a]/80 border border-white/[0.07] rounded-xl p-3">
        <p className="text-[10px] text-[#94a3b8] uppercase tracking-wide font-semibold mb-2">
          Computation at position ({hr},{hc})
        </p>
        <div className="flex gap-3 items-center flex-wrap">
          {/* Patch values (scaled to 0-1 so they match the sum shown) */}
          <div>
            <p className="text-[9px] text-[#475569] mb-1 text-center">Patch (÷255)</p>
            <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(3, 28px)" }}>
              {patchVals.map((row, kr) =>
                row.map((v, kc) => (
                  <div
                    key={`p-${kr}-${kc}`}
                    className="w-7 h-7 flex items-center justify-center text-[8px] font-mono rounded-sm"
                    style={{ background: pixelColor(v), color: v > 127 ? "#000" : "#fff" }}
                  >
                    {(v / 255).toFixed(1)}
                  </div>
                ))
              )}
            </div>
          </div>
          <span className="text-[#94a3b8] text-sm font-bold">⊙</span>
          {/* Kernel values */}
          <div>
            <p className="text-[9px] text-[#475569] mb-1 text-center">Kernel</p>
            <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(3, 28px)" }}>
              {filter.kernel.map((row, kr) =>
                row.map((v, kc) => (
                  <div
                    key={`k-${kr}-${kc}`}
                    className="w-7 h-7 flex items-center justify-center text-[9px] font-mono rounded-sm border"
                    style={
                      v > 0
                        ? { background: "rgba(59,180,164,0.3)", borderColor: "#3bb4a460", color: "#fff" }
                        : v < 0
                        ? { background: "rgba(239,68,68,0.3)", borderColor: "#ef444460", color: "#fff" }
                        : { background: "#1e293b", borderColor: "rgba(255,255,255,0.08)", color: "#94a3b8" }
                    }
                  >
                    {v}
                  </div>
                ))
              )}
            </div>
          </div>
          <span className="text-[#94a3b8] text-sm font-bold">=</span>
          {/* Result */}
          <div className="flex flex-col items-center">
            <p className="text-[9px] text-[#475569] mb-1">Sum</p>
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center border"
              style={{ background: "#1e293b", borderColor: "#22c55e60" }}
            >
              <span className="text-xs font-bold text-[#22c55e]">
                {dotProduct.toFixed(3)}
              </span>
            </div>
          </div>
          {divisor > 1 && (
            <div className="flex flex-col items-center">
              <p className="text-[9px] text-[#475569] mb-1">÷ {divisor} (kernel sum)</p>
              <div
                className="w-14 h-14 rounded-lg flex items-center justify-center border"
                style={{ background: "#1e293b", borderColor: "#22c55e60" }}
              >
                <span className="text-xs font-bold text-[#22c55e]">
                  {rawResponse.toFixed(3)}
                </span>
              </div>
            </div>
          )}
          <div className="flex flex-col items-center">
            <p className="text-[9px] text-[#475569] mb-1">→ Display (0–255)</p>
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center border"
              style={{
                background: outputPixelColor(displayVal),
                borderColor: "#22c55e60",
              }}
            >
              <span
                className="text-xs font-bold drop-shadow-lg"
                style={{ color: displayVal > 127 ? "#000" : "#fff" }}
              >
                {Math.round(displayVal)}
              </span>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-[#475569] mt-2">
          Element-wise multiply → sum{divisor > 1 ? ` → ÷${divisor} (averaging kernel)` : ""} → the
          whole output map is then min-max rescaled to 0–255 purely for display.
        </p>
      </div>
    </div>
  );
}
