"use client";

import React from "react";
import { COMPLETIONS, SERIES_COLORS, argmax, RunSnapshot } from "./dpoMath";

type Props = {
  runs: readonly RunSnapshot[];
  correctIds: readonly string[];
  pick: string | null;
  onPick: (id: string) => void;
  solved: boolean;
};

export function RunCard({ run }: { run: RunSnapshot }) {
  const topIdx = argmax(run.probs);
  return (
    <div className="rounded-xl border border-[#1e293b] p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] font-semibold text-white">{run.label}</p>
        <span
          className="text-[12px] font-mono font-bold px-2 py-0.5 rounded-lg"
          style={{
            color: SERIES_COLORS.policy,
            background: `${SERIES_COLORS.policy}1a`,
          }}
        >
          β = {run.beta.toFixed(2)}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <dt className="text-[#475569]">Gradient steps</dt>
        <dd className="font-mono text-[#f1f5f9] text-right">{run.steps}</dd>
        <dt className="text-[#475569]">Final DPO loss</dt>
        <dd className="font-mono text-[#f1f5f9] text-right">
          {run.finalLoss.toFixed(4)}
        </dd>
        <dt className="text-[#475569]">KL from reference</dt>
        <dd className="font-mono font-bold text-[var(--color-warning)] text-right">
          {run.kl.toFixed(3)} nats
        </dd>
        <dt className="text-[#475569]">Top completion</dt>
        <dd className="font-mono text-[#f1f5f9] text-right">
          {COMPLETIONS[topIdx].id} at {(100 * run.probs[topIdx]).toFixed(1)}%
        </dd>
      </dl>
    </div>
  );
}

/**
 * Final gate: after two runs at different betas, the user reads their own
 * recorded numbers and says which run stayed closer to the reference model.
 * Correctness is decided by the actual computed KL values, never asserted.
 */
export default function BetaChallenge({
  runs,
  correctIds,
  pick,
  onPick,
  solved,
}: Props) {
  const picked = runs.find((r) => r.id === pick) ?? null;
  const wrongPick = picked !== null && !correctIds.includes(picked.id);

  return (
    <div>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
        Both runs trained on the same six preference pairs, so both learned the
        same ordering. Beta and step count together decided how much drift that
        cost. Based on your recorded numbers above: which run&apos;s final
        policy stayed closer to the reference model?
      </p>
      <div
        role="radiogroup"
        aria-label="Which run stayed closer to the reference model"
        className="flex flex-wrap gap-3 mb-3"
      >
        {runs.map((run) => {
          const isPicked = pick === run.id;
          const isCorrectPick = isPicked && correctIds.includes(run.id);
          return (
            <button
              key={run.id}
              role="radio"
              aria-checked={isPicked}
              onClick={() => onPick(run.id)}
              disabled={solved}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                isCorrectPick
                  ? "border-[var(--color-success)] text-[var(--color-success)]"
                  : isPicked
                    ? "border-[#ef4444] text-[#ef4444]"
                    : "border-[#334155] text-white hover:border-[#d4af37]"
              } ${solved && !isPicked ? "opacity-50" : ""}`}
            >
              {run.label} (β = {run.beta.toFixed(2)})
            </button>
          );
        })}
      </div>
      {solved && picked && (
        <div className="rounded-xl border border-[var(--color-success)]/40 p-4">
          <p className="text-[12px] text-[var(--color-success)] font-semibold mb-1">
            Correct.
          </p>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            {runs
              .map((r) => `${r.label} ended at KL ${r.kl.toFixed(3)}`)
              .join("; ")}
            . Beta scales how hard the preference signal pulls against the
            implicit KL anchor, so it shapes the whole trajectory rather than
            fixing the endpoint. A high beta pushes harder per step early on,
            then saturates: small log-ratio shifts already satisfy every pair,
            and drift stalls. A low beta pushes gently but keeps drifting long
            after the ordering is learned. Where a run ends therefore depends
            on both beta and step count: on short runs the higher beta usually
            sits further from the reference, on long runs it usually settles
            closer, and at this lab&apos;s settings the ordering can even
            invert at the step cap. Your numbers above are the ground truth
            for your two runs.
          </p>
        </div>
      )}
      {wrongPick && !solved && (
        <div className="rounded-xl border border-[#ef4444]/40 p-4">
          <p className="text-[12px] text-[#ef4444] font-semibold mb-1">
            Not this one.
          </p>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            Compare the &quot;KL from reference&quot; values on the two run
            cards: closer to the reference means lower KL. Pick again.
          </p>
        </div>
      )}
    </div>
  );
}
