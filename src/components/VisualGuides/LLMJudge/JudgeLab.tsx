"use client";

import React from "react";
import { Choice, CorpusItem } from "./types";
import {
  AgreementStats,
  ItemVerdict,
  RubricWeights,
  kappaLabel,
} from "./judge";
import SliderRow from "./SliderRow";

const JUDGE_COLOR = "#ec4899";
const PANEL_COLOR = "#3bb4a4";

type Props = {
  strictness: number;
  onStrictnessChange: (v: number) => void;
  weights: RubricWeights;
  verdicts: readonly ItemVerdict[];
  stats: AgreementStats;
  flippedIds: readonly number[];
  corpus: readonly CorpusItem[];
  biasesActive: boolean;
};

const KAPPA_BANDS = [
  { label: "Slight", range: "0.00 to 0.20" },
  { label: "Fair", range: "0.21 to 0.40" },
  { label: "Moderate", range: "0.41 to 0.60" },
  { label: "Substantial", range: "0.61 to 0.80" },
  { label: "Almost perfect", range: "0.81 to 1.00" },
];

function ChoiceChip({ choice, color }: { choice: Choice; color: string }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border"
      style={{ color, borderColor: `${color}66` }}
    >
      {choice === "first" ? "A1" : "A2"}
    </span>
  );
}

function ScoreCell({ score }: { score: ItemVerdict["first"] }) {
  const bonus = score.positionBonus + score.verbosityBonus + score.selfBonus;
  return (
    <span className="font-mono text-[11px] text-[#94a3b8]">
      {score.base.toFixed(2)}
      {bonus > 0 && (
        <span style={{ color: JUDGE_COLOR }}> +{bonus.toFixed(2)}</span>
      )}
    </span>
  );
}

export default function JudgeLab({
  strictness,
  onStrictnessChange,
  weights,
  verdicts,
  stats,
  flippedIds,
  corpus,
  biasesActive,
}: Props) {
  const itemById = new Map(corpus.map((c) => [c.id, c]));

  return (
    <div>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
        Now the judge takes over on all {corpus.length} questions. Ours is a deterministic
        rubric scorer standing in for an LLM judge: it reads each answer&apos;s rubric
        features, weights them, and picks the higher score, so every number below is
        exactly computable. Strictness reallocates weight between facts and polish, the
        same way a judge prompt saying &quot;prioritize factual accuracy&quot; changes an
        LLM judge&apos;s behavior.
      </p>

      <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto mb-5">
{`quality(answer) = (wAcc*accuracy/4 + wCov*coverage/3 + wCla*clarity/3) / (wAcc + wCov + wCla)
verdict         = the higher-scoring answer (an exact tie goes to Answer 1)

po (observed)   = items where judge matches the panel / total items
pe (chance)     = pJ1*pH1 + pJ2*pH2   from each rater's marginal pick rates
Cohen's kappa   = (po - pe) / (1 - pe)`}
      </pre>

      <SliderRow
        id="judge-strictness"
        label="Judge strictness"
        description="Low strictness rewards polish over facts; high strictness cares almost only about accuracy. Watch which verdicts change at the extremes."
        value={strictness}
        onChange={onStrictnessChange}
      />
      <div className="flex flex-wrap gap-2 mb-5">
        {(
          [
            ["accuracy", weights.accuracy],
            ["coverage", weights.coverage],
            ["clarity", weights.clarity],
          ] as const
        ).map(([name, w]) => (
          <span
            key={name}
            className="text-[10px] font-mono px-2 py-1 rounded-lg border border-[#1e293b] text-[#94a3b8]"
          >
            {name} x{w.toFixed(2)}
          </span>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Agreement with panel
          </p>
          <p className="text-2xl font-black font-mono text-[#f1f5f9]">
            {stats.agree}/{stats.total}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            {(stats.rate * 100).toFixed(0)}% raw agreement
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-accent)]/40 p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Cohen&apos;s kappa
          </p>
          <p
            className="text-2xl font-black font-mono"
            style={{ color: stats.kappa < 0.4 ? "#ef4444" : "var(--color-accent)" }}
          >
            {stats.kappa.toFixed(2)}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            corrects out pe = {stats.pe.toFixed(2)} chance agreement
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Reading the kappa
          </p>
          <p className="text-[15px] font-bold text-[#f1f5f9] mt-1">
            {kappaLabel(stats.kappa)}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            per the Landis and Koch (1977) convention
          </p>
        </div>
      </div>

      {/* Kappa bands legend */}
      <div className="flex flex-wrap gap-2 mb-5">
        {KAPPA_BANDS.map((b) => (
          <span
            key={b.label}
            className="text-[10px] px-2 py-1 rounded-lg border border-[#1e293b] text-[#475569]"
          >
            <span className="text-[#94a3b8] font-semibold">{b.label}</span> {b.range}
          </span>
        ))}
      </div>

      <p className="text-[11px] text-[#475569] leading-relaxed mb-4">
        Why kappa and not just agreement? Raw agreement can be bought without skill. This
        panel prefers Answer 1 on 8 of the 12 items, so a broken judge that always picks
        Answer 1 scores 8/12 raw agreement while reading nothing, and its kappa is
        exactly 0. Kappa estimates the agreement the two raters would reach by chance
        from their marginal pick rates (the pe above, which shifts live as the sliders
        change the judge&apos;s behavior) and only credits agreement earned beyond that.
        Two settings with the same raw agreement can carry different kappas.
      </p>

      {/* Verdict table */}
      <div className="rounded-xl border border-[#1e293b] overflow-hidden">
        <div className="px-4 py-2.5 bg-[#1e293b] flex items-center justify-between">
          <p className="text-[12px] font-semibold text-white">
            All {corpus.length} verdicts, live
          </p>
          <span className="text-[11px] text-[#94a3b8] font-mono">
            {biasesActive ? "includes your bias settings" : "unbiased"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#1e293b] text-left">
                {["#", "question", "score A1", "score A2", "judge", "panel", "match"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {verdicts.map((v, i) => {
                const item = itemById.get(v.itemId);
                if (!item) return null;
                const flipped = flippedIds.includes(v.itemId);
                return (
                  <tr
                    key={v.itemId}
                    style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
                  >
                    <td className="px-3 py-2 font-mono text-[#475569]">{item.id}</td>
                    <td className="px-3 py-2 text-[#f1f5f9]">
                      {item.topic}
                      {flipped && (
                        <span className="ml-2 text-[10px] font-semibold text-[var(--color-warning)]">
                          flipped
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <ScoreCell score={v.first} />
                    </td>
                    <td className="px-3 py-2">
                      <ScoreCell score={v.second} />
                    </td>
                    <td className="px-3 py-2">
                      <ChoiceChip choice={v.choice} color={JUDGE_COLOR} />
                    </td>
                    <td className="px-3 py-2">
                      <ChoiceChip choice={item.human} color={PANEL_COLOR} />
                    </td>
                    <td className="px-3 py-2">
                      {v.agrees ? (
                        <span className="text-[10px] font-semibold text-[var(--color-success)]">
                          ✓ match
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-[#ef4444]">
                          ✗ miss
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-[#475569] mt-3 leading-relaxed" aria-live="polite">
        {stats.agree} of {stats.total} verdicts match the panel, kappa{" "}
        {stats.kappa.toFixed(2)} ({kappaLabel(stats.kappa).toLowerCase()}). Pink bonus
        numbers in the score columns are bias points added on top of the rubric score.
      </p>
    </div>
  );
}
