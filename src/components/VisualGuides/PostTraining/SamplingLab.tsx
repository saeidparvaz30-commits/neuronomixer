"use client";

import React from "react";
import {
  StageId,
  SERIES_COLORS,
  SAMPLE_COUNT,
  distinctCount,
} from "./postTrainingMath";

interface Props {
  stage: StageId;
  onStageChange: (stage: StageId) => void;
  samples: string[];
  sampledFrom: StageId | null;
  sampledStages: ReadonlySet<StageId>;
  onDraw: () => void;
  contextDisplay: string;
}

const STAGE_OPTIONS: { id: StageId; label: string }[] = [
  { id: "base", label: "Base model" },
  { id: "sft", label: "After SFT blend" },
  { id: "assistant", label: "After preference stage" },
];

/**
 * Draws seeded samples from the selected stage's current distribution so the
 * diversity difference between stages is visible in actual outputs, not just
 * in the entropy number.
 */
export default function SamplingLab({
  stage,
  onStageChange,
  samples,
  sampledFrom,
  sampledStages,
  onDraw,
  contextDisplay,
}: Props) {
  const distinct = distinctCount(samples);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div role="radiogroup" aria-label="Model stage to sample from" className="flex flex-wrap gap-2">
          {STAGE_OPTIONS.map((opt) => {
            const active = stage === opt.id;
            const visited = sampledStages.has(opt.id);
            return (
              <button
                key={opt.id}
                role="radio"
                aria-checked={active}
                onClick={() => onStageChange(opt.id)}
                className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold border transition-colors ${
                  active
                    ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[#d4af37]/5"
                    : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
                }`}
              >
                {opt.label}
                {visited && <span className="ml-1.5 text-[10px] text-[var(--color-success)]">sampled</span>}
              </button>
            );
          })}
        </div>
        <button
          onClick={onDraw}
          className="px-4 py-2 rounded-xl text-[12px] font-bold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
        >
          Draw {SAMPLE_COUNT} samples
        </button>
      </div>

      {samples.length === 0 ? (
        <p className="text-[12px] text-[#475569] leading-relaxed">
          No samples drawn yet. Pick a stage and draw: each click samples {SAMPLE_COUNT} next words
          for the context {contextDisplay} from that stage&apos;s current distribution, using a
          seeded deterministic generator that advances on every draw.
        </p>
      ) : (
        <div>
          <p className="text-[11px] text-[#475569] mb-2">
            {SAMPLE_COUNT} draws from{" "}
            <span
              className="font-semibold"
              style={{ color: sampledFrom ? SERIES_COLORS[sampledFrom] : "#94a3b8" }}
            >
              {STAGE_OPTIONS.find((o) => o.id === sampledFrom)?.label ?? ""}
            </span>{" "}
            for the context {contextDisplay}: {distinct} distinct {distinct === 1 ? "word" : "words"}.
          </p>
          <ul className="flex flex-wrap gap-2" aria-label="Sampled next words">
            {samples.map((w, i) => (
              <li
                key={`${w}-${i}`}
                className="px-2.5 py-1 rounded-lg border border-[#1e293b] bg-[#1e293b]/40 font-mono text-[12px] text-[#f1f5f9]"
              >
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
