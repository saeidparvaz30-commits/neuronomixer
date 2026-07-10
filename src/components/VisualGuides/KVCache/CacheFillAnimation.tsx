"use client";

import React from "react";
import {
  TOKENS,
  PROMPT_LEN,
  TOY,
  TOY_BYTES_PER_CELL,
  toyCacheBytes,
  formatBytes,
} from "./kvMath";

interface Props {
  /** Number of positions currently cached (0..TOKENS.length). */
  step: number;
  playing: boolean;
  onPlayPause: () => void;
  onStep: () => void;
  onRestart: () => void;
}

const N = TOKENS.length;

/**
 * Memory grid: one row per layer, one column per position. Each cell is the
 * K and V vectors for all heads at that (layer, position). Prefill fills the
 * prompt columns in one pass; decode fills one column per generated token.
 */
export default function CacheFillAnimation({
  step,
  playing,
  onPlayPause,
  onStep,
  onRestart,
}: Props) {
  const done = step >= N;
  const phase = step === 0 ? "Ready" : step <= PROMPT_LEN ? "Prefill" : done ? "Done" : "Decode";
  const bytesNow = toyCacheBytes(step);
  const perToken = TOY.layers * TOY_BYTES_PER_CELL;

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={onPlayPause}
          disabled={done}
          className="px-4 py-1.5 rounded-lg text-[12px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {playing ? "Pause" : step === 0 ? "Generate" : "Resume"}
        </button>
        <button
          onClick={onStep}
          disabled={done || playing}
          className="px-4 py-1.5 rounded-lg text-[12px] font-semibold border border-[#334155] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Step
        </button>
        <button
          onClick={onRestart}
          disabled={step === 0}
          className="px-4 py-1.5 rounded-lg text-[12px] font-semibold border border-[#334155] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Restart
        </button>
        <span className="text-[11px] text-[#475569] ml-auto">
          Toy model: {TOY.layers} layers, {TOY.heads} heads, head dim {TOY.headDim}, FP16
        </span>
      </div>

      {/* Status line (text equivalent of the grid state) */}
      <p className="text-[12px] text-[#94a3b8] mb-3">
        <span
          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide mr-2 ${
            phase === "Prefill"
              ? "bg-[#3bb4a4]/15 text-[#3bb4a4]"
              : phase === "Decode"
              ? "bg-[#d4af37]/15 text-[var(--color-accent)]"
              : phase === "Done"
              ? "bg-[#22c55e]/15 text-[var(--color-success)]"
              : "bg-[#1e293b] text-[#475569]"
          }`}
        >
          {phase}
        </span>
        {step} of {N} positions cached, {formatBytes(bytesNow)} of{" "}
        {formatBytes(toyCacheBytes(N))} total.{" "}
        {step > PROMPT_LEN && !done && (
          <>
            The new query computes K/V once for itself, then reads all {step} cached
            positions per layer instead of recomputing them.
          </>
        )}
        {done && <>Cache full: every position was computed exactly once.</>}
      </p>

      {/* Token row */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[640px]">
          <div
            className="grid gap-[3px] mb-1"
            style={{ gridTemplateColumns: `56px repeat(${N}, minmax(0, 1fr))` }}
          >
            <span className="text-[9px] text-[#475569] self-end pb-0.5">token</span>
            {TOKENS.map((tok, i) => (
              <span
                key={i}
                className={`text-[9px] text-center truncate font-mono ${
                  i < step ? "text-white" : "text-[#475569]"
                } ${i === step - 1 && !done && step > 0 ? "font-bold" : ""}`}
                title={tok}
              >
                {tok}
              </span>
            ))}
          </div>

          {/* Memory grid, one row per layer */}
          <div
            role="img"
            aria-label={`KV cache memory grid: ${TOY.layers} layers by ${N} positions, ${step} of ${N} positions filled, ${formatBytes(bytesNow)} used`}
          >
            {Array.from({ length: TOY.layers }, (_, layer) => (
              <div
                key={layer}
                className="grid gap-[3px] mb-[3px]"
                style={{ gridTemplateColumns: `56px repeat(${N}, minmax(0, 1fr))` }}
              >
                <span className="text-[9px] font-mono text-[#475569] self-center">
                  layer {layer + 1}
                </span>
                {Array.from({ length: N }, (_, pos) => {
                  const filled = pos < step;
                  const isPrompt = pos < PROMPT_LEN;
                  const isNewest = pos === step - 1 && step > 0 && !done;
                  return (
                    <div
                      key={pos}
                      className="h-4 rounded-[3px] transition-colors duration-300"
                      style={{
                        background: filled
                          ? isPrompt
                            ? "#3bb4a4"
                            : "var(--color-accent)"
                          : "#1e293b",
                        opacity: filled ? (isNewest ? 1 : 0.75) : 1,
                        outline: isNewest ? "1px solid #f1f5f9" : "none",
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-2 text-[10px] text-[#94a3b8]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[3px] bg-[#3bb4a4] inline-block" /> prompt
              (prefill, one parallel pass)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[3px] bg-[var(--color-accent)] inline-block" />{" "}
              generated (decode, one column per token)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[3px] bg-[#1e293b] inline-block border border-[#334155]" />{" "}
              empty
            </span>
          </div>
        </div>
      </div>

      {/* Computed per-cell math */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">One cell (layer x position)</p>
          <p className="text-[13px] font-mono font-bold text-white">
            {formatBytes(TOY_BYTES_PER_CELL)}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            2 tensors x {TOY.heads} heads x {TOY.headDim} dims x 2 B
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">One token (all layers)</p>
          <p className="text-[13px] font-mono font-bold text-white">{formatBytes(perToken)}</p>
          <p className="text-[10px] text-[#475569] mt-1">
            {formatBytes(TOY_BYTES_PER_CELL)} x {TOY.layers} layers, written once, never
            recomputed
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">Cache now</p>
          <p className="text-[13px] font-mono font-bold text-[var(--color-accent)]">
            {formatBytes(bytesNow)}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            {formatBytes(perToken)} x {step} cached positions
          </p>
        </div>
      </div>
      <p className="text-[10px] text-[#475569] mt-2">
        Token strings are illustrative; the grid mechanics and every byte count are computed
        from the toy configuration above.
      </p>
    </div>
  );
}
