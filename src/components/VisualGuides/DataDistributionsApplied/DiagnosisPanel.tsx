"use client";

import React from "react";
import type { Dataset, Diagnosis } from "./data";

interface Props {
  dataset: Dataset;
  diagnosis: Diagnosis;
  opened: boolean;
  onOpen: () => void;
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "success" | "accent";
}) {
  const color =
    tone === "warning"
      ? "var(--color-warning)"
      : tone === "success"
        ? "var(--color-success)"
        : tone === "accent"
          ? "var(--color-accent)"
          : "#f1f5f9";
  return (
    <div className="rounded-xl border border-[#1e293b] p-3">
      <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">{label}</p>
      <p className="text-[15px] font-mono font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

const VERDICTS: Record<Dataset["id"], string> = {
  transactions:
    "Classic right skew: the bulk of orders sit low and a long tail of big orders pulls the mean above the median. This is what multiplicative processes (prices, incomes, order values) usually look like. Flip on the log scale above and watch the shape become roughly symmetric.",
  response:
    "Heavy-tailed: most requests are fast, but the tail does not fade politely. The rare slow requests are more than an order of magnitude slower, so the mean and the tail percentiles are dominated by a handful of observations. Averages are the wrong summary for latency.",
  heights:
    "Two peaks means two populations sharing one column. No single center describes this data; the overall mean lands in the valley where almost nobody actually is. Use the reveal above to recompute the histogram per hidden group.",
  sensor:
    "That isolated bar is not data, it is a failure code. The device writes -999 when a read fails, and every summary statistic computed over the raw column silently includes it. This spike is a bug to fix upstream, not a signal to model.",
  returns:
    "Zero-inflated: a huge spike at exactly zero next to a small count distribution. Two processes are mixed here: whether a customer returns anything at all, and how many items they return when they do. One count model fit to the whole column will get both wrong.",
};

export default function DiagnosisPanel({ dataset, diagnosis, opened, onOpen }: Props) {
  const d = diagnosis;
  const f = dataset.fmt;

  if (!opened) {
    return (
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 flex flex-col items-start gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8]">
          Diagnosis
        </p>
        <p className="text-[12px] text-[#94a3b8] leading-relaxed">
          Read the histogram first. What shape do you see, and what process could have
          generated it? Then run the diagnosis to check your read against the computed
          statistics.
        </p>
        <button
          onClick={onOpen}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Run the diagnosis
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8]">
          Diagnosis
        </p>
        <span className="text-[11px] font-semibold text-[var(--color-accent)]">
          {dataset.shapeLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <Stat label="Mean" value={f(d.mean)} tone="warning" />
        <Stat label="Median" value={f(d.median)} tone="success" />
        <Stat
          label="Mean vs median"
          value={`${d.divergencePct >= 0 ? "+" : ""}${d.divergencePct.toFixed(1)}%`}
          tone={Math.abs(d.divergencePct) > 15 ? "warning" : "default"}
        />
        <Stat label="Skewness" value={d.skew.toFixed(2)} />
      </div>

      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
        {VERDICTS[dataset.id]}
      </p>

      {/* What breaks downstream: computed demo per shape */}
      <div className="rounded-xl border border-[#334155] bg-[#162032] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[var(--color-warning)] mb-2">
          What breaks downstream
        </p>

        {dataset.id === "transactions" && d.logSkew !== undefined && (
          <p className="text-[12px] text-[#94a3b8] leading-relaxed">
            Budget per customer using the mean ({f(d.mean)}) and you overstate the typical
            customer (median {f(d.median)}) by {d.divergencePct.toFixed(0)} percent,
            computed from this column. Skewness is {d.skew.toFixed(2)} on the raw dollars
            but only {d.logSkew.toFixed(2)} after log10: model the log, or use quantiles.
          </p>
        )}

        {dataset.id === "response" &&
          d.p95 !== undefined &&
          d.p99 !== undefined &&
          d.fracAboveMeanPct !== undefined && (
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              The median request takes {f(d.median)}, but p95 is {f(d.p95)} and p99 is{" "}
              {f(d.p99)}, all computed from this column. An SLA or timeout set near the
              mean ({f(d.mean)}) is already exceeded by {d.fracAboveMeanPct.toFixed(1)}{" "}
              percent of requests. Latency budgets live in the tail percentiles, never in
              the average.
            </p>
          )}

        {dataset.id === "heights" &&
          d.groupMeans !== undefined &&
          d.pctNearOverall !== undefined &&
          d.pctNearGroup !== undefined && (
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              Only {d.pctNearOverall.toFixed(1)} percent of players are within 3 cm of the
              overall mean ({f(d.mean)}), versus {d.pctNearGroup.toFixed(1)} percent within
              3 cm of their own squad&apos;s mean (
              {d.groupMeans.map((g) => `${g.name} ${f(g.mean)}`).join(", ")}). Any model
              that assumes one center, from z-scores to k-means with k=1 thinking, will
              describe a player who barely exists.
            </p>
          )}

        {dataset.id === "sensor" &&
          d.meanClean !== undefined &&
          d.sentinelCount !== undefined && (
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              {d.sentinelCount} of {dataset.values.length} rows are -999 failure codes.
              They drag the raw mean to {f(d.mean)}, while the mean of the valid readings
              is {f(d.meanClean)}: a computed shift of{" "}
              {(d.meanClean - d.mean).toFixed(1)} degrees. Every dashboard, anomaly
              threshold, and model trained on the raw column inherits that corruption.
              Decode sentinels to missing values before any statistics.
            </p>
          )}

        {dataset.id === "returns" &&
          d.zeroSharePct !== undefined &&
          d.meanNonzero !== undefined &&
          d.predictedZeroSharePct !== undefined && (
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              {d.zeroSharePct.toFixed(1)} percent of customers returned nothing, but a
              single Poisson model with rate equal to the column mean (
              {d.mean.toFixed(2)}) predicts only {d.predictedZeroSharePct.toFixed(1)}{" "}
              percent zeros, both computed from this column. Customers who do return
              items average {d.meanNonzero.toFixed(2)} returns. Model the two processes
              separately (hurdle or zero-inflated models), or the fit fails at zero.
            </p>
          )}
      </div>
    </div>
  );
}
