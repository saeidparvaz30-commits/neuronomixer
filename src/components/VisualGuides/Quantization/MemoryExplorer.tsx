"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  DEVICE_REFS,
  PARAM_MAX,
  PARAM_MIN,
  PRECISION_OPTIONS,
  formatGB,
  weightsMemoryGB,
  type PrecisionId,
} from "./types";

interface Props {
  paramsB: number;
  precision: PrecisionId;
  challengeDone: boolean;
  onParamsChange: (v: number) => void;
  onPrecisionChange: (p: PrecisionId) => void;
}

const QUICK_SIZES = [1, 8, 70, 180];

export default function MemoryExplorer({
  paramsB,
  precision,
  challengeDone,
  onParamsChange,
  onPrecisionChange,
}: Props) {
  const opt = PRECISION_OPTIONS.find((p) => p.id === precision) ?? PRECISION_OPTIONS[0];
  const memGB = weightsMemoryGB(paramsB, opt.bytesPerParam);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      {/* Model size slider */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
          <label htmlFor="quant-params-slider" className="text-[12px] font-semibold text-[#94a3b8]">
            Model size:{" "}
            <span className="text-white font-mono">{paramsB}B parameters</span>
          </label>
          <div className="flex items-center gap-1.5">
            {QUICK_SIZES.map((s) => (
              <button
                key={s}
                onClick={() => onParamsChange(s)}
                aria-label={`Set model size to ${s} billion parameters`}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                  paramsB === s
                    ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                    : "border-[#1e293b] text-[#475569] hover:border-[#334155] hover:text-[#94a3b8]"
                }`}
              >
                {s}B
              </button>
            ))}
          </div>
        </div>
        <input
          id="quant-params-slider"
          type="range"
          min={PARAM_MIN}
          max={PARAM_MAX}
          step={1}
          value={paramsB}
          onChange={(e) => onParamsChange(Number(e.target.value))}
          className="w-full h-2 cursor-pointer"
          style={{ accentColor: "var(--color-accent)" }}
          aria-label="Model size in billions of parameters"
        />
        <div className="flex justify-between text-[10px] text-[#475569] mt-1">
          <span>{PARAM_MIN}B</span>
          <span>{PARAM_MAX}B</span>
        </div>
      </div>

      {/* Precision radiogroup */}
      <div className="mb-5">
        <p className="text-[12px] font-semibold text-[#94a3b8] mb-2">Weight precision</p>
        <div
          role="radiogroup"
          aria-label="Weight precision"
          className="inline-flex flex-wrap rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1"
        >
          {PRECISION_OPTIONS.map((p) => {
            const isActive = precision === p.id;
            return (
              <button
                key={p.id}
                role="radio"
                aria-checked={isActive}
                aria-label={`${p.label}, ${p.bytesPerParam} bytes per parameter`}
                onClick={() => onPrecisionChange(p.id)}
                className={`relative px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] ${
                  isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="quant-precision-pill"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: "var(--color-accent)" }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">
                  {p.label}
                  <span className={`ml-1 font-normal ${isActive ? "opacity-70" : "text-[#475569]"}`}>
                    {p.bytesPerParam} B
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-[#475569]">{opt.note}</p>
      </div>

      {/* Computed footprint */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#1e293b] p-4 flex flex-col justify-center">
          <p className="text-[11px] text-[#475569] font-mono mb-1">
            {paramsB}B params × {opt.bytesPerParam} bytes/param
          </p>
          <p className="text-4xl font-black text-white">
            {formatGB(memGB)}
            <span className="text-base font-semibold ml-1.5 text-[#94a3b8]">GB</span>
          </p>
          <p className="text-[11px] text-[#475569] mt-2 leading-relaxed">
            Weights only, with 1 GB = 10<sup>9</sup> bytes. The KV cache, activations, and
            framework overhead all add more on top of this number.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
            Fits on (weights alone)
          </p>
          {DEVICE_REFS.map((d) => {
            const fits = memGB <= d.capacityGB;
            return (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-xl border border-[#1e293b] px-3.5 py-2.5 gap-3"
              >
                <span className="text-[12px] text-[#94a3b8]">{d.label}</span>
                <span className="text-[12px] font-semibold flex items-center gap-2 whitespace-nowrap">
                  <span className="text-[#475569] font-mono">
                    {formatGB(memGB)} / {d.capacityGB} GB
                  </span>
                  {fits ? (
                    <span style={{ color: "var(--color-success)" }}>✓ Fits</span>
                  ) : (
                    <span style={{ color: "var(--color-warning)" }}>✗ Too big</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Challenge chip */}
      <div
        className="mt-4 rounded-xl border px-4 py-3 text-[12px] leading-relaxed"
        style={
          challengeDone
            ? { borderColor: "var(--color-success)", color: "var(--color-success)" }
            : { borderColor: "#334155", color: "#94a3b8" }
        }
      >
        {challengeDone ? (
          <span>✓ Challenge complete: you found a setting where a 70B-class model fits in 24 GB.</span>
        ) : (
          <span>
            Challenge: find a setting where a model of 70B parameters or more fits on the 24 GB
            consumer GPU.
          </span>
        )}
      </div>
    </div>
  );
}
