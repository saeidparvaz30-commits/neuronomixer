"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BenchmarkMix,
  LEADERBOARD_MODELS,
  saturationScores,
  saturationSpread,
} from "./benchmarkMath";
import { BAR_SERIES } from "./types";

type Props = {
  mix: BenchmarkMix;
  onMixChange: (mix: BenchmarkMix) => void;
};

const MIX_OPTIONS: { id: BenchmarkMix; label: string; blurb: string }[] = [
  {
    id: "legacy",
    label: "Legacy set (easy items)",
    blurb:
      "Item difficulties sit far below every model's skill. Everyone answers almost everything: the benchmark is saturated.",
  },
  {
    id: "frontier",
    label: "Frontier set (hard items)",
    blurb:
      "Item difficulties overlap the models' skill range, so genuine skill differences show up as score differences.",
  },
];

export default function SaturationPanel({ mix, onMixChange }: Props) {
  const scores = useMemo(() => saturationScores(mix), [mix]);
  const spread = useMemo(() => saturationSpread(mix), [mix]);
  const skillSpreadPts = useMemo(() => {
    const skills = LEADERBOARD_MODELS.map((m) => m.trueSkill);
    return Math.round((Math.max(...skills) - Math.min(...skills)) * 100);
  }, []);
  const active = MIX_OPTIONS.find((o) => o.id === mix) ?? MIX_OPTIONS[0];

  return (
    <div>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
        Same four models, zero contamination, two different item mixes. The models
        span {skillSpreadPts} points of true skill. Whether the benchmark can show
        that depends entirely on how hard its items are.
      </p>

      {/* Mix toggle */}
      <div
        className="inline-flex flex-wrap rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1 mb-3"
        role="radiogroup"
        aria-label="Benchmark item mix"
      >
        {MIX_OPTIONS.map((o) => {
          const isActive = mix === o.id;
          return (
            <button
              key={o.id}
              role="radio"
              aria-checked={isActive}
              onClick={() => onMixChange(o.id)}
              className={`relative px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="bl-mix-pill"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: "var(--color-accent)" }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">{o.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">{active.blurb}</p>

      {/* Score bars */}
      <div className="rounded-xl border border-[#1e293b] p-4 mb-4">
        <div className="flex flex-col gap-3">
          {scores.map((s) => {
            const model = LEADERBOARD_MODELS.find((m) => m.id === s.modelId);
            return (
              <div key={s.modelId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-semibold text-[#f1f5f9]">
                    {s.name}
                    <span className="ml-1.5 text-[10px] font-normal text-[#475569]">
                      true skill {model ? Math.round(model.trueSkill * 100) : "?"}%
                    </span>
                  </span>
                  <span className="text-[12px] font-mono font-bold text-[#f1f5f9]">
                    {s.pct}%
                  </span>
                </div>
                <div className="h-3 rounded-full bg-[#1e293b] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${s.pct}%`, background: BAR_SERIES }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-[#475569] mt-3" aria-live="polite">
          Clean scores on the {mix === "legacy" ? "legacy" : "frontier"} mix: top
          minus bottom is {spread} points.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Spread on this mix
          </p>
          <p className="text-2xl font-black font-mono text-[#f1f5f9]">{spread} pts</p>
          <p className="text-[10px] text-[#475569] mt-1">
            across {skillSpreadPts} points of true skill difference
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            On a saturated benchmark the whole field piles up near the ceiling, and
            the tiny differences that remain are the same size as sampling noise. A
            model that tops a saturated leaderboard has proven very little.
          </p>
        </div>
      </div>
    </div>
  );
}
