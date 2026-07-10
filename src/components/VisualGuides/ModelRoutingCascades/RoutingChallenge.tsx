"use client";

import React, { useMemo } from "react";
import { TierParams, QuerySample } from "./types";
import { simulateCascade } from "./cascadeMath";

type Props = {
  stream: readonly QuerySample[];
  tiers: readonly TierParams[];
  threshold: number;
  pick: number | null;
  solved: boolean;
  onPick: (option: number, correct: boolean) => void;
};

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export default function RoutingChallenge({
  stream,
  tiers,
  threshold,
  pick,
  solved,
  onPick,
}: Props) {
  // Feedback numbers are computed by running the cascade on the same stream
  // at the same threshold, once calibrated and once miscalibrated.
  const demo = useMemo(() => {
    const healthy = simulateCascade(stream, tiers, threshold, 1);
    const broken = simulateCascade(stream, tiers, threshold, 0.3);
    return { healthy, broken };
  }, [stream, tiers, threshold]);

  const options: { label: string; correct: boolean; feedback: string }[] = [
    {
      label: "Quality is fine: answers only ship when confidence is high",
      correct: false,
      feedback: `That is the trap. On this exact stream at threshold ${threshold.toFixed(
        2
      )}, dropping calibration from 1.0 to 0.3 moves true accuracy from ${pct(
        demo.healthy.accuracy
      )} to ${pct(
        demo.broken.accuracy
      )}, while the average confidence of accepted answers reads ${
        demo.broken.dashboardConfidence === null
          ? "high"
          : demo.broken.dashboardConfidence.toFixed(3)
      }. High confidence is a claim, not a measurement.`,
    },
    {
      label:
        "Nothing yet: confidence is the router's own self-estimate, so quality may have silently dropped",
      correct: true,
      feedback: `Correct. Confidence and cost are the router grading its own homework. On this stream at threshold ${threshold.toFixed(
        2
      )}, a calibration drift from 1.0 to 0.3 cuts true accuracy from ${pct(
        demo.healthy.accuracy
      )} to ${pct(demo.broken.accuracy)} while cost falls from ${demo.healthy.avgCost.toFixed(
        2
      )} to ${demo.broken.avgCost.toFixed(
        2
      )} units and confidence stays at ${
        demo.broken.dashboardConfidence === null
          ? "a high value"
          : demo.broken.dashboardConfidence.toFixed(3)
      }. Every visible metric improves. The only defense is routinely scoring a sample of accepted answers against ground truth.`,
    },
    {
      label: "Quality has improved: rising confidence means the models got better",
      correct: false,
      feedback: `Backwards, and this simulation shows why: rising confidence with falling cost is exactly the signature of decaying calibration. Here, the same dashboard pattern comes from true accuracy dropping to ${pct(
        demo.broken.accuracy
      )} (from ${pct(
        demo.healthy.accuracy
      )}) as overconfident answers slip past the gate. Confidence going up tells you nothing without ground truth.`,
    },
  ];

  return (
    <div>
      <div className="rounded-xl border border-[#1e293b] bg-[#162032] p-4 mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[var(--color-accent)] mb-2">
          The Question
        </p>
        <p className="text-[15px] font-semibold text-white">
          Two weeks after launch, your router dashboard reads: cost per query down,
          average accepted-answer confidence at an all-time high, zero alerts.
        </p>
        <p className="text-[11px] text-[#94a3b8] mt-1">
          What do you actually know about answer quality?
        </p>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {options.map((opt, i) => {
          const isPicked = pick === i;
          const isCorrectPick = isPicked && opt.correct;
          return (
            <button
              key={i}
              aria-pressed={isPicked}
              onClick={() => onPick(i, opt.correct)}
              className={`text-left px-4 py-2.5 rounded-xl text-[13px] font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                isCorrectPick
                  ? "border-[var(--color-success)] text-[var(--color-success)]"
                  : isPicked
                    ? "border-[var(--color-warning)] text-[var(--color-warning)]"
                    : "border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#334155]"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div aria-live="polite">
        {pick !== null && (
          <div
            className={`rounded-xl border p-4 ${
              options[pick].correct
                ? "border-[var(--color-success)]/50"
                : "border-[var(--color-warning)]/50"
            }`}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wide mb-1.5"
              style={{
                color: options[pick].correct
                  ? "var(--color-success)"
                  : "var(--color-warning)",
              }}
            >
              {options[pick].correct ? "Solved" : "Try another answer"}
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              {options[pick].feedback}
            </p>
          </div>
        )}
        {pick === null && !solved && (
          <p className="text-[11px] text-[#475569]">
            Pick an answer to get feedback computed from the simulation.
          </p>
        )}
      </div>
    </div>
  );
}
