"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PoolingConfig, PoolingStep } from "./types";
import { buildAllSteps, applyPooling, getOutputSize } from "./poolingLogic";

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

const CELL_SIZE = 34;
const CELL_GAP = 2;

function cellColor(value: number): string {
  const normalized = value / 255;
  const lightness = Math.round(10 + normalized * 60);
  return `hsl(210, 15%, ${lightness}%)`;
}

function outputCellColor(value: number): string {
  const normalized = Math.min(value, 255) / 255;
  const lightness = Math.round(10 + normalized * 60);
  return `hsl(160, 40%, ${lightness}%)`;
}

function getPoolingLabel(config: PoolingConfig): string {
  switch (config.type) {
    case "max":
      return "max";
    case "average":
      return "avg";
    case "min":
      return "min";
    case "l2":
      return "l2";
  }
}

type Props = {
  config: PoolingConfig;
  grid?: number[][];
};

export default function PoolingVisualizer({ config, grid = DEFAULT_GRID }: Props) {
  const steps = buildAllSteps(grid, config);
  const outputGrid = applyPooling(grid, config);
  const outputSize = getOutputSize(grid.length, config.kernelSize, config.stride);

  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStep: PoolingStep | undefined = steps[stepIndex];

  const stopPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startPlay = useCallback(() => {
    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= steps.length - 1) {
          stopPlay();
          return prev;
        }
        return prev + 1;
      });
    }, 600);
  }, [steps.length, stopPlay]);

  useEffect(() => {
    stopPlay();
    setStepIndex(0);
  }, [config, stopPlay]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function handlePrev() {
    stopPlay();
    setStepIndex((p) => Math.max(0, p - 1));
  }

  function handleNext() {
    stopPlay();
    setStepIndex((p) => Math.min(steps.length - 1, p + 1));
  }

  function handleTogglePlay() {
    if (isPlaying) {
      stopPlay();
    } else {
      if (stepIndex >= steps.length - 1) setStepIndex(0);
      startPlay();
    }
  }

  function handleReset() {
    stopPlay();
    setStepIndex(0);
  }

  const totalCellSize = CELL_SIZE + CELL_GAP;
  const gridPixels = grid.length * totalCellSize - CELL_GAP;
  const outGridPixels = outputSize * totalCellSize - CELL_GAP;

  const activeSet = new Set(
    currentStep ? currentStep.windowCells.map(([r, c]) => `${r},${c}`) : []
  );

  const windowLeft = currentStep
    ? currentStep.windowCells[0][1] * totalCellSize
    : 0;
  const windowTop = currentStep
    ? currentStep.windowCells[0][0] * totalCellSize
    : 0;
  const windowSize = config.kernelSize * totalCellSize - CELL_GAP;

  const flatPatch = currentStep ? currentStep.inputPatch.flat() : [];
  const opLabel = getPoolingLabel(config);
  const formulaStr = currentStep
    ? `${opLabel}([${flatPatch.join(", ")}]) = ${currentStep.outputValue}`
    : "";

  return (
    <div className="flex flex-col gap-5">
      {/* Main grids */}
      <div className="flex flex-col xl:flex-row gap-6 items-start justify-center">
        {/* Input grid */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
            Input (8&times;8)
          </span>
          <div
            className="relative flex-shrink-0"
            style={{ width: gridPixels, height: gridPixels }}
          >
            {/* Cells */}
            {grid.map((row, r) =>
              row.map((val, c) => {
                const isActive = activeSet.has(`${r},${c}`);
                return (
                  <div
                    key={`${r},${c}`}
                    className="absolute rounded-sm flex items-center justify-center text-[9px] font-mono font-bold transition-all"
                    style={{
                      left: c * totalCellSize,
                      top: r * totalCellSize,
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      background: cellColor(val),
                      color: val > 180 ? "#0f172a" : "#f1f5f9",
                      outline: isActive ? "2px solid var(--color-warning)" : "none",
                      outlineOffset: "-1px",
                      zIndex: isActive ? 2 : 1,
                    }}
                  >
                    {val}
                  </div>
                );
              })
            )}

            {/* Sliding window rect */}
            {currentStep && (
              <motion.div
                className="absolute pointer-events-none rounded-sm"
                animate={{
                  left: windowLeft,
                  top: windowTop,
                  width: windowSize,
                  height: windowSize,
                }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                style={{
                  border: "2px dashed #3bb4a4",
                  boxShadow: "0 0 8px rgba(59,180,164,0.4)",
                  zIndex: 10,
                }}
              />
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center xl:mt-[60px] text-[#475569] text-2xl font-bold select-none">
          <span className="hidden xl:block">&rarr;</span>
          <span className="block xl:hidden">&darr;</span>
        </div>

        {/* Computation panel */}
        <AnimatePresence mode="wait">
          {currentStep && (
            <motion.div
              key={`${currentStep.row}-${currentStep.col}-${config.type}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-3 bg-[#1e293b]/60 border border-white/[0.07] rounded-xl p-4 min-w-[200px]"
            >
              <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                Window [{currentStep.row},{currentStep.col}]
              </span>

              {/* Patch grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${config.kernelSize}, ${CELL_SIZE}px)`,
                  gap: CELL_GAP,
                }}
              >
                {currentStep.inputPatch.flat().map((v, i) => (
                  <div
                    key={i}
                    className="rounded-sm flex items-center justify-center text-[10px] font-mono font-bold"
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      background: cellColor(v),
                      color: v > 180 ? "#0f172a" : "#f1f5f9",
                      outline: "2px solid var(--color-warning)",
                      outlineOffset: "-1px",
                    }}
                  >
                    {v}
                  </div>
                ))}
              </div>

              {/* Operation formula */}
              <div className="w-full rounded-lg bg-[#0f172a] border border-white/[0.06] px-3 py-2">
                <p className="text-[11px] font-mono text-[#94a3b8] leading-relaxed break-all">
                  {formulaStr}
                </p>
              </div>

              {/* Output value badge */}
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#94a3b8]">Output:</span>
                <span
                  className="text-lg font-extrabold"
                  style={{ color: "#3bb4a4" }}
                >
                  {currentStep.outputValue}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Arrow */}
        <div className="flex items-center xl:mt-[60px] text-[#475569] text-2xl font-bold select-none">
          <span className="hidden xl:block">&rarr;</span>
          <span className="block xl:hidden">&darr;</span>
        </div>

        {/* Output grid */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
            Output ({outputSize}&times;{outputSize})
          </span>
          <div
            className="relative flex-shrink-0"
            style={{ width: outGridPixels, height: outGridPixels }}
          >
            {outputGrid.map((row, r) =>
              row.map((val, c) => {
                const isDone =
                  currentStep &&
                  (r < currentStep.row ||
                    (r === currentStep.row && c <= currentStep.col));
                const isCurrent =
                  currentStep && r === currentStep.row && c === currentStep.col;
                return (
                  <div
                    key={`out-${r},${c}`}
                    className="absolute rounded-sm flex items-center justify-center text-[9px] font-mono font-bold transition-all"
                    style={{
                      left: c * totalCellSize,
                      top: r * totalCellSize,
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      background: isDone
                        ? outputCellColor(val)
                        : "rgba(30,41,59,0.6)",
                      color: isDone && val > 150 ? "#0f172a" : "#f1f5f9",
                      outline: isCurrent ? "2px solid #3bb4a4" : "none",
                      outlineOffset: "-1px",
                      opacity: isDone ? 1 : 0.3,
                    }}
                  >
                    {isDone ? val : ""}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[12px] text-[#475569]">
          Step {stepIndex + 1} / {steps.length}
        </span>
        <div className="flex-1 min-w-[120px] h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#a855f7] to-[#3bb4a4]"
            animate={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-[12px] text-[#475569]">
          {Math.round(((stepIndex + 1) / steps.length) * 100)}%
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handlePrev}
          disabled={stepIndex === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all disabled:opacity-30"
          style={{ borderColor: "rgba(255,255,255,0.1)", color: "#94a3b8" }}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10 3L5 8l5 5V3z" />
          </svg>
          Prev
        </button>

        <button
          onClick={handleNext}
          disabled={stepIndex >= steps.length - 1}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all disabled:opacity-30"
          style={{ borderColor: "rgba(255,255,255,0.1)", color: "#94a3b8" }}
        >
          Next
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6 3l5 5-5 5V3z" />
          </svg>
        </button>

        <button
          onClick={handleTogglePlay}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: isPlaying ? "rgba(168,85,247,0.2)" : "rgba(59,180,164,0.2)",
            border: `1px solid ${isPlaying ? "#a855f7" : "#3bb4a4"}`,
            color: isPlaying ? "#a855f7" : "#3bb4a4",
          }}
        >
          {isPlaying ? (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="3" width="4" height="10" />
                <rect x="9" y="3" width="4" height="10" />
              </svg>
              Pause
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 3l9 5-9 5V3z" />
              </svg>
              Auto-Play
            </>
          )}
        </button>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all"
          style={{ borderColor: "rgba(255,255,255,0.1)", color: "#94a3b8" }}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3a5 5 0 1 0 4.546 2.914l-1.44.835A3.5 3.5 0 1 1 8 4.5V3z" />
            <path d="M8 3l3-1-1 3L8 3z" />
          </svg>
          Reset
        </button>
      </div>
    </div>
  );
}
