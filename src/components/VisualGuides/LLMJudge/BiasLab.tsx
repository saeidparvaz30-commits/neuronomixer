"use client";

import React from "react";
import { CorpusItem, JUDGE_MODEL } from "./types";
import {
  AgreementStats,
  ItemVerdict,
  JudgeSettings,
  POSITION_MAX_BONUS,
  SELF_PREF_MAX_BONUS,
  VERBOSITY_MAX_BONUS,
  kappaLabel,
} from "./judge";
import SliderRow from "./SliderRow";

const JUDGE_COLOR = "#ec4899";

export type BiasKey = "positionBias" | "verbosityBias" | "selfPreference";

type Props = {
  settings: JudgeSettings;
  onBiasChange: (key: BiasKey, value: number) => void;
  stats: AgreementStats;
  unbiasedStats: AgreementStats;
  verdicts: readonly ItemVerdict[];
  flippedIds: readonly number[];
  corpus: readonly CorpusItem[];
};

function KappaBar({
  label,
  stats,
  color,
}: {
  label: string;
  stats: AgreementStats;
  color: string;
}) {
  const width = Math.max(0, Math.min(1, stats.kappa)) * 100;
  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="text-[11px] text-[#94a3b8]">{label}</span>
        <span className="text-[13px] font-mono font-bold" style={{ color }}>
          {stats.kappa.toFixed(2)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#1e293b] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
      <p className="text-[10px] text-[#475569] mt-1">
        agreement {stats.agree}/{stats.total} · pe {stats.pe.toFixed(2)} ·{" "}
        {kappaLabel(stats.kappa)}
      </p>
    </div>
  );
}

export default function BiasLab({
  settings,
  onBiasChange,
  stats,
  unbiasedStats,
  verdicts,
  flippedIds,
  corpus,
}: Props) {
  const itemById = new Map(corpus.map((c) => [c.id, c]));
  const verdictById = new Map(verdicts.map((v) => [v.itemId, v]));
  const delta = stats.kappa - unbiasedStats.kappa;
  const agreeDelta = stats.agree - unbiasedStats.agree;
  const biasesActive =
    settings.positionBias > 0 || settings.verbosityBias > 0 || settings.selfPreference > 0;

  return (
    <div>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
        Real LLM judges carry documented, systematic biases. Each slider injects one into
        the scoring function as a bonus on the 0 to 1 quality scale, so you can watch
        exactly how much distortion it takes to corrupt the verdicts above. The kappa
        comparison below always shows your biased judge against the unbiased judge at the
        same strictness. Keep one eye on pe: position bias herds the judge toward Answer
        1, the side this panel already favors on 8 of 12 items, so chance agreement rises
        and kappa falls faster than the raw agreement rate does. That gap is the whole
        argument for reporting kappa instead of agreement.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <SliderRow
            id="bias-position"
            label="Position bias"
            description={`Adds up to +${POSITION_MAX_BONUS.toFixed(2)} to whichever answer is shown first. Real judges favor one position, which is why careful evals grade every pair twice with the order swapped.`}
            value={settings.positionBias}
            onChange={(v) => onBiasChange("positionBias", v)}
            accent={JUDGE_COLOR}
          />
          <SliderRow
            id="bias-verbosity"
            label="Verbosity bias"
            description={`Adds up to +${VERBOSITY_MAX_BONUS.toFixed(2)} to the longer answer, scaled by how much longer it is. Padding starts beating substance.`}
            value={settings.verbosityBias}
            onChange={(v) => onBiasChange("verbosityBias", v)}
            accent={JUDGE_COLOR}
          />
          <SliderRow
            id="bias-self"
            label="Self-preference"
            description={`Adds up to +${SELF_PREF_MAX_BONUS.toFixed(2)} to answers written by ${JUDGE_MODEL}, the judge's own model. Also called preference leakage when judge and contestant share training lineage.`}
            value={settings.selfPreference}
            onChange={(v) => onBiasChange("selfPreference", v)}
            accent={JUDGE_COLOR}
          />
        </div>

        <div>
          <div className="rounded-xl border border-[#1e293b] p-4 mb-3">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-3">
              Kappa, biased vs unbiased
            </p>
            <KappaBar
              label="Unbiased judge (same strictness)"
              stats={unbiasedStats}
              color="var(--color-accent)"
            />
            <KappaBar label="Your judge (with biases)" stats={stats} color={JUDGE_COLOR} />
            <p className="text-[11px] text-[#94a3b8]" aria-live="polite">
              Kappa change:{" "}
              <span
                className="font-mono font-bold"
                style={{
                  color:
                    delta < 0 ? "#ef4444" : delta > 0 ? "var(--color-success)" : "#94a3b8",
                }}
              >
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(2)}
              </span>{" "}
              · agreement change:{" "}
              <span className="font-mono font-bold">
                {agreeDelta >= 0 ? "+" : ""}
                {agreeDelta}
              </span>{" "}
              · {flippedIds.length} verdict{flippedIds.length === 1 ? "" : "s"} flipped
            </p>
          </div>

          {flippedIds.length > 0 && (
            <div className="rounded-xl border border-[var(--color-warning)]/40 p-4 mb-3">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-2">
                Flipped by your biases
              </p>
              <ul className="space-y-1.5">
                {flippedIds.map((id) => {
                  const item = itemById.get(id);
                  const verdict = verdictById.get(id);
                  if (!item || !verdict) return null;
                  return (
                    <li key={id} className="text-[11px] text-[#94a3b8]">
                      <span className="font-mono text-[var(--color-warning)]">
                        #{item.id} {item.topic}:
                      </span>{" "}
                      now prefers {verdict.choice === "first" ? "Answer 1" : "Answer 2"}
                      {verdict.agrees ? " (accidentally agreeing with the panel)" : ""}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {biasesActive && delta > 1e-9 && (
            <div className="rounded-xl border border-[#3bb4a4]/40 p-4 mb-3">
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                A bias just <span className="text-[#3bb4a4] font-semibold">raised</span>{" "}
                the kappa. On a small corpus a bias can accidentally align with the truth,
                here the longer answer happens to be the better one on the item it
                flipped. It is still a bias: it got more agreement for the wrong reason,
                and on the next corpus it will cut the other way. Keep dialing and watch
                it turn.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[#1e293b] p-4 mt-3">
        <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-2">
          How eval teams fight these biases
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] text-[#94a3b8] leading-relaxed list-disc list-inside">
          <li>
            Position: grade every pair twice with the order swapped and average, or
            randomize positions.
          </li>
          <li>
            Verbosity: instruct the judge to ignore length, or apply length-controlled
            scoring.
          </li>
          <li>
            Self-preference: use a judge from a different model family than the systems
            being graded.
          </li>
          <li>
            All of them: keep a human-labeled calibration set and report kappa against it,
            exactly like this page does.
          </li>
        </ul>
      </div>
    </div>
  );
}
