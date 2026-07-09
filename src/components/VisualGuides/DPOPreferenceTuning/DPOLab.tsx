"use client";

import React, { useMemo } from "react";
import {
  COMPLETIONS,
  PAIRS,
  PROMPT,
  REF_LOGITS,
  SERIES_COLORS,
  BETA_MIN,
  BETA_MAX,
  BETA_STEP,
  MIN_STEPS_PER_RUN,
  MAX_STEPS,
  softmax,
  dpoGradient,
  klDivergence,
  implicitRewards,
  pairDiagnostics,
  argmax,
  RunSnapshot,
} from "./dpoMath";

type Props = {
  beta: number;
  onBetaChange: (b: number) => void;
  logits: readonly number[];
  stepCount: number;
  lossHistory: readonly number[];
  onTrain: (n: number) => void;
  onResetPolicy: () => void;
  onSaveRun: () => void;
  savedRuns: readonly RunSnapshot[];
};

const TRAIN_BATCHES = [1, 10, 50] as const;

function LossSparkline({ losses }: { losses: readonly number[] }) {
  const w = 260;
  const h = 56;
  const pad = 4;
  const max = Math.max(...losses);
  const min = Math.min(...losses);
  const range = Math.max(max - min, 1e-6);
  const points = losses
    .map((loss, i) => {
      const x =
        losses.length === 1
          ? w / 2
          : pad + (i / (losses.length - 1)) * (w - 2 * pad);
      const y = pad + ((max - loss) / range) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-14"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={SERIES_COLORS.policy}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function DPOLab({
  beta,
  onBetaChange,
  logits,
  stepCount,
  lossHistory,
  onTrain,
  onResetPolicy,
  onSaveRun,
  savedRuns,
}: Props) {
  const refProbs = useMemo(() => softmax([...REF_LOGITS]), []);
  const probs = useMemo(() => softmax(logits), [logits]);
  const rewards = useMemo(
    () => implicitRewards(logits, REF_LOGITS, beta),
    [logits, beta]
  );
  const grad = useMemo(
    () => dpoGradient(logits, REF_LOGITS, PAIRS, beta),
    [logits, beta]
  );
  const diagnostics = useMemo(
    () => pairDiagnostics(logits, REF_LOGITS, PAIRS, beta),
    [logits, beta]
  );
  const kl = useMemo(() => klDivergence(logits, REF_LOGITS), [logits]);

  const currentLoss = lossHistory[lossHistory.length - 1];
  const topIdx = argmax(probs);
  const maxProb = Math.max(...probs, ...refProbs);
  const atCap = stepCount >= MAX_STEPS;
  const betaLocked = stepCount > 0;

  const winCounts = useMemo(() => {
    const w = new Array<number>(COMPLETIONS.length).fill(0);
    const l = new Array<number>(COMPLETIONS.length).fill(0);
    for (const pair of PAIRS) {
      w[pair.winner] += 1;
      l[pair.loser] += 1;
    }
    return { w, l };
  }, []);

  const allSatisfied = diagnostics.every((d) => d.orderProb > 0.99);

  const saveState = (() => {
    if (savedRuns.length >= 2) return { show: false, enabled: false, label: "" };
    if (stepCount < MIN_STEPS_PER_RUN)
      return {
        show: true,
        enabled: false,
        label: `Train at least ${MIN_STEPS_PER_RUN} steps to save this run`,
      };
    if (savedRuns.length === 1 && Math.abs(savedRuns[0].beta - beta) < 1e-6)
      return {
        show: true,
        enabled: false,
        label: "Run 2 needs a different beta: reset and move the slider",
      };
    return {
      show: true,
      enabled: true,
      label: `Save run ${savedRuns.length + 1} and reset the policy`,
    };
  })();

  const gradLabel = (i: number): { text: string; color: string } => {
    if (Math.abs(grad[i]) < 1e-9) return { text: "no gradient", color: "#475569" };
    return grad[i] < 0
      ? { text: "pushed up ↑", color: "var(--color-success)" }
      : { text: "pushed down ↓", color: "#ef4444" };
  };

  return (
    <div>
      {/* Prompt + preference data */}
      <div className="rounded-xl border border-[#1e293b] p-4 mb-4">
        <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
          The fixed prompt
        </p>
        <p className="text-[13px] font-mono text-[#93c5fd] mb-3">
          &quot;{PROMPT}&quot;
        </p>
        <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-2">
          The preference data (all {PAIRS.length} pairs, authored once, never
          resampled)
        </p>
        <div className="flex flex-wrap gap-2">
          {PAIRS.map((pair) => (
            <span
              key={pair.id}
              className="inline-flex items-center gap-1 rounded-lg border border-[#334155] px-2.5 py-1 text-[11px] font-mono"
              title={pair.rationale}
            >
              <span className="text-[var(--color-success)]">
                {COMPLETIONS[pair.winner].id}
              </span>
              <span className="text-[#475569]">&gt;</span>
              <span className="text-[#ef4444]">{COMPLETIONS[pair.loser].id}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr] gap-4 mb-4">
        <div className="rounded-xl border border-[#1e293b] p-4">
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="dpo-beta"
              className="text-[12px] font-semibold text-white"
            >
              Beta (KL-tether strength)
            </label>
            <span
              className="text-[13px] font-mono font-bold px-2.5 py-0.5 rounded-lg"
              style={{
                color: SERIES_COLORS.policy,
                background: `${SERIES_COLORS.policy}1a`,
              }}
            >
              β = {beta.toFixed(2)}
            </span>
          </div>
          <input
            id="dpo-beta"
            type="range"
            min={BETA_MIN}
            max={BETA_MAX}
            step={BETA_STEP}
            value={beta}
            disabled={betaLocked}
            onChange={(e) => onBetaChange(Number(e.target.value))}
            aria-label="Beta, the KL-tether strength of the DPO loss"
            className="w-full accent-[#ec4899] disabled:opacity-40"
          />
          <div className="flex justify-between text-[10px] text-[#475569] mt-0.5">
            <span>{BETA_MIN.toFixed(2)} loose tether</span>
            <span>{BETA_MAX.toFixed(2)} tight tether</span>
          </div>
          {betaLocked && (
            <p className="text-[10px] text-[var(--color-warning)] mt-2">
              Beta is locked while a run is in progress. Reset the policy to
              change it.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[12px] font-semibold text-white mb-2.5">
            Gradient descent on the real DPO loss
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {TRAIN_BATCHES.map((n) => (
              <button
                key={n}
                onClick={() => onTrain(n)}
                disabled={atCap}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  atCap
                    ? "border border-[#1e293b] text-[#475569] cursor-not-allowed"
                    : "text-[#0a0e1a]"
                }`}
                style={atCap ? undefined : { background: SERIES_COLORS.policy }}
              >
                Step ×{n}
              </button>
            ))}
            <button
              onClick={onResetPolicy}
              disabled={stepCount === 0}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors disabled:opacity-40 disabled:hover:border-[#1e293b] disabled:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              Reset policy
            </button>
          </div>
          {atCap && (
            <p className="text-[10px] text-[var(--color-warning)] mt-2">
              Step cap reached ({MAX_STEPS}). Save the run or reset the policy.
            </p>
          )}
          {saveState.show && (
            <button
              onClick={onSaveRun}
              disabled={!saveState.enabled}
              className={`mt-3 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                saveState.enabled
                  ? "border-[var(--color-success)]/60 text-[var(--color-success)] hover:border-[var(--color-success)]"
                  : "border-[#1e293b] text-[#475569] cursor-not-allowed"
              }`}
            >
              {saveState.label}
            </button>
          )}
        </div>
      </div>

      {/* Readouts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Gradient steps
          </p>
          <p className="text-2xl font-black font-mono text-[#f1f5f9]">
            {stepCount}
          </p>
        </div>
        <div
          className="rounded-xl border p-3"
          style={{ borderColor: `${SERIES_COLORS.policy}66` }}
        >
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            DPO loss
          </p>
          <p
            className="text-2xl font-black font-mono"
            style={{ color: SERIES_COLORS.policy }}
          >
            {currentLoss.toFixed(4)}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            log 2 ≈ 0.6931 at step 0, for every beta
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            KL from reference
          </p>
          <p className="text-2xl font-black font-mono text-[#f1f5f9]">
            {kl.toFixed(3)}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">nats of drift</p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Current favorite
          </p>
          <p className="text-2xl font-black font-mono text-[var(--color-accent)]">
            {COMPLETIONS[topIdx].id}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            at {(100 * probs[topIdx]).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Loss curve */}
      <div className="rounded-xl border border-[#1e293b] p-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide">
            Loss curve (every point recomputed from the logits)
          </p>
          {allSatisfied && (
            <span className="text-[10px] font-semibold text-[var(--color-success)]">
              all pairs &gt; 99% satisfied: updates have nearly stopped
            </span>
          )}
        </div>
        <LossSparkline losses={lossHistory} />
      </div>

      {/* Distribution bars */}
      <p className="text-[12px] font-semibold text-white mb-2">
        Policy distribution over the {COMPLETIONS.length} completions
      </p>
      <div className="flex flex-col gap-2 mb-4">
        {COMPLETIONS.map((c, i) => {
          const push = gradLabel(i);
          const isTop = i === topIdx;
          return (
            <div
              key={c.id}
              className="rounded-xl border p-3"
              style={{
                borderColor: isTop ? "var(--color-accent)" : "#1e293b",
              }}
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1.5">
                <span
                  className="inline-flex w-5 h-5 items-center justify-center rounded-md text-[11px] font-bold text-[#0a0e1a]"
                  style={{ background: SERIES_COLORS.policy }}
                >
                  {c.id}
                </span>
                <span className="text-[10px] text-[#475569]">{c.quality}</span>
                {winCounts.w[i] > 0 && (
                  <span className="text-[10px] font-semibold text-[var(--color-success)]">
                    preferred in {winCounts.w[i]}
                  </span>
                )}
                {winCounts.l[i] > 0 && (
                  <span className="text-[10px] font-semibold text-[#ef4444]">
                    dispreferred in {winCounts.l[i]}
                  </span>
                )}
                {winCounts.w[i] === 0 && winCounts.l[i] === 0 && (
                  <span className="text-[10px] text-[#475569]">
                    in no pair
                  </span>
                )}
                <span
                  className="text-[10px] font-semibold ml-auto"
                  style={{ color: push.color }}
                >
                  {push.text}
                </span>
              </div>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed mb-2">
                {c.text}
              </p>
              <div className="grid grid-cols-[28px_1fr_120px] items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-[#475569]">ref</span>
                <div className="h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${((100 * refProbs[i]) / maxProb).toFixed(2)}%`,
                      backgroundColor: SERIES_COLORS.reference,
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[#475569]">
                  {(100 * refProbs[i]).toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-[28px_1fr_120px] items-center gap-2">
                <span
                  className="text-[10px] font-mono"
                  style={{ color: SERIES_COLORS.policy }}
                >
                  now
                </span>
                <div className="h-2.5 rounded-full bg-[#1e293b] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${((100 * probs[i]) / maxProb).toFixed(2)}%`,
                      backgroundColor: SERIES_COLORS.policy,
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[#f1f5f9]">
                  {(100 * probs[i]).toFixed(1)}%
                  <span
                    className="ml-1.5"
                    style={{
                      color:
                        rewards[i] > 1e-9
                          ? "var(--color-success)"
                          : rewards[i] < -1e-9
                            ? "#ef4444"
                            : "#475569",
                    }}
                  >
                    r={rewards[i] >= 0 ? "+" : ""}
                    {rewards[i].toFixed(2)}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-[#475569] leading-relaxed mb-5">
        r is DPO&apos;s implicit reward, β·log(π/π_ref), recomputed from the
        current logits. Note H: it appears in no pair, so its logit receives
        exactly zero gradient, yet its probability still shrinks because
        softmax renormalizes as the winners grow.
      </p>

      {/* Per-pair diagnostics */}
      <p className="text-[12px] font-semibold text-white mb-2">
        Per-pair diagnostics
      </p>
      <div className="rounded-xl border border-[#1e293b] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#1e293b] text-left">
                <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                  pair
                </th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                  why
                </th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                  margin m
                </th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                  σ(m) satisfied
                </th>
                <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                  grad weight σ(−m)
                </th>
              </tr>
            </thead>
            <tbody>
              {diagnostics.map((d, i) => (
                <tr
                  key={d.pair.id}
                  style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
                >
                  <td className="px-3 py-2 font-mono whitespace-nowrap">
                    <span className="text-[var(--color-success)]">
                      {COMPLETIONS[d.pair.winner].id}
                    </span>
                    <span className="text-[#475569]"> &gt; </span>
                    <span className="text-[#ef4444]">
                      {COMPLETIONS[d.pair.loser].id}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-[#94a3b8]">
                    {d.pair.rationale}
                  </td>
                  <td className="px-3 py-2 font-mono text-[#f1f5f9]">
                    {d.margin.toFixed(3)}
                  </td>
                  <td className="px-3 py-2 font-mono text-[#f1f5f9]">
                    {(100 * d.orderProb).toFixed(1)}%
                  </td>
                  <td
                    className="px-3 py-2 font-mono font-semibold"
                    style={{
                      color:
                        d.gradWeight > 0.25
                          ? "var(--color-warning)"
                          : "#475569",
                    }}
                  >
                    {d.gradWeight.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-[#475569] leading-relaxed mt-3">
        The gradient weight σ(−m) is DPO&apos;s built-in curriculum: pairs the
        policy currently gets wrong push hardest, and pairs it already
        satisfies fade toward zero. When every σ(m) passes 99%, training has
        effectively converged for this beta.
      </p>
    </div>
  );
}
