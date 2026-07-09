"use client";

import React from "react";
import { EvalTask, POOL, sliceById } from "./types";
import {
  pct,
  rawPassRate,
  sliceBreakdown,
  stratifiedPassRate,
  truePoolPassRate,
} from "./stats";

type Props = {
  tasks: readonly EvalTask[];
  skewThreshold: number;
  gateHit: boolean;
};

function ShareBar({
  value,
  color,
  label,
}: {
  value: number;
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[#475569] w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-[#1e293b] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, value * 100)}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-mono text-[#94a3b8] w-11 text-right shrink-0">
        {pct(value, 0)}
      </span>
    </div>
  );
}

export default function StratificationPanel({
  tasks,
  skewThreshold,
  gateHit,
}: Props) {
  const breakdown = sliceBreakdown(tasks);
  const raw = rawPassRate(tasks);
  const strat = stratifiedPassRate(tasks);
  const truth = truePoolPassRate();
  const divergence =
    raw !== null && strat.estimate !== null
      ? Math.abs(raw - strat.estimate)
      : null;

  return (
    <div>
      {/* Composition: sample vs production */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        {breakdown.map((s) => (
          <div key={s.id} className="rounded-xl border border-[#1e293b] p-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: s.color }}
                aria-hidden="true"
              />
              <p className="text-[12px] font-semibold text-white">{s.label}</p>
              <span className="ml-auto text-[10px] font-mono text-[#475569]">
                {s.sampleCount} sampled
              </span>
            </div>
            <div className="flex flex-col gap-1.5 mb-2">
              <ShareBar value={s.productionShare} color="#334155" label="production" />
              <ShareBar value={s.sampleShare} color={s.color} label="your set" />
            </div>
            <p className="text-[10px] text-[#475569]">
              slice pass rate in your set:{" "}
              <span className="font-mono text-[#94a3b8]">
                {s.samplePassRate === null ? "no data" : pct(s.samplePassRate)}
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* Estimates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Raw average of your set
          </p>
          <p className="text-2xl font-black font-mono text-[var(--color-accent)]">
            {raw === null ? "?" : pct(raw)}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            Treats every sampled task equally, whatever slice it came from.
          </p>
        </div>
        <div
          className="rounded-xl border p-3"
          style={{ borderColor: gateHit ? "var(--cat-accent)" : "#1e293b" }}
        >
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Production-weighted (stratified)
          </p>
          <p className="text-2xl font-black font-mono text-[var(--cat-accent)]">
            {strat.estimate === null ? "n/a" : pct(strat.estimate)}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            {strat.estimate === null
              ? `Needs at least one task per slice. Missing: ${strat.missing
                  .map((id) => sliceById(id).label)
                  .join(", ")}.`
              : "Per-slice pass rates weighted by real traffic shares."}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] border-dashed p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Simulation truth
          </p>
          <p className="text-2xl font-black font-mono text-[#94a3b8]">{pct(truth)}</p>
          <p className="text-[10px] text-[#475569] mt-1">
            True production pass rate over all {POOL.length} tasks. Hidden in real
            life; shown here because this is a simulation.
          </p>
        </div>
      </div>

      {/* Divergence readout */}
      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: gateHit ? "var(--cat-accent)" : "#1e293b",
          background: gateHit ? "rgba(236, 72, 153, 0.06)" : "transparent",
        }}
        aria-live="polite"
      >
        {divergence === null ? (
          <p className="text-[12px] text-[#94a3b8] leading-relaxed">
            Once every slice has at least one task, the two estimators appear
            side by side. Then skew your set: add 25 tasks from a single
            category above and watch them split apart.
          </p>
        ) : (
          <p className="text-[12px] text-[#94a3b8] leading-relaxed">
            Raw vs weighted estimate:{" "}
            <span className="font-mono font-bold text-[var(--cat-accent)]">
              {(divergence * 100).toFixed(1)} pts apart
            </span>
            .{" "}
            {gateHit ? (
              <span className="font-semibold text-[var(--cat-accent)]">
                Skew caught ✓
              </span>
            ) : (
              `Push it to ${Math.round(
                skewThreshold * 100
              )} points or more by over-sampling one slice (try + 25 from a single category).`
            )}{" "}
            The raw average answers &quot;how good is the model on the set I
            happened to collect&quot;; the weighted one answers &quot;how good
            is it on the traffic I actually serve&quot;.
          </p>
        )}
      </div>
    </div>
  );
}
