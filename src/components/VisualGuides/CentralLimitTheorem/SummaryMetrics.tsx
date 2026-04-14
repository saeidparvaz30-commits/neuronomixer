"use client";

import React from "react";
import { mean as calcMean, stdDev } from "./types";

interface SummaryMetricsProps {
  sampleSize: number;
  sampleMeans: number[];
  populationSD: number;
}

interface MetricRowProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  matchIndicator?: "good" | "off" | null;
}

function MetricRow({ label, value, sub, highlight, matchIndicator }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
      <div>
        <p className="text-[10px] text-[#475569] leading-tight">{label}</p>
        {sub && <p className="text-[8px] text-[#334155] leading-tight mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        {matchIndicator === "good" && (
          <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" title="Good match" />
        )}
        {matchIndicator === "off" && (
          <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" title="Not matching yet" />
        )}
        <span
          className="text-[12px] font-mono font-bold"
          style={{ color: highlight ? "#d4af37" : "#f1f5f9" }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

export default function SummaryMetrics({
  sampleSize,
  sampleMeans,
  populationSD,
}: SummaryMetricsProps) {
  const N = sampleMeans.length;
  const empiricalMean = N > 0 ? calcMean(sampleMeans) : 0;
  const empiricalSD = N > 0 ? stdDev(sampleMeans) : 0;
  const theoreticalSE = populationSD / Math.sqrt(sampleSize);

  const seMatchGood =
    N >= 30 &&
    theoreticalSE > 0 &&
    Math.abs(empiricalSD - theoreticalSE) / theoreticalSE < 0.1;

  const seMatchIndicator: "good" | "off" | null =
    N < 30 ? null : seMatchGood ? "good" : "off";

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-5">
      <h2 className="text-[13px] font-bold text-white mb-0.5">Summary Metrics</h2>
      <p className="text-[10px] text-[#475569] mb-4">
        CLT predicts: SE ={" "}
        <span className="font-mono text-[#d4af37]">σ/√n</span>. Watch it converge.
      </p>

      <div>
        <MetricRow
          label="Sample size"
          sub="n — values per draw"
          value={String(sampleSize)}
        />
        <MetricRow
          label="Samples drawn"
          sub="N — total draws"
          value={String(N)}
        />
        <MetricRow
          label="Empirical mean of means"
          sub="x̄̄ — average sample mean"
          value={N > 0 ? empiricalMean.toFixed(2) : "—"}
        />
        <MetricRow
          label="Empirical SD of means"
          sub="Observed spread of x̄"
          value={N > 0 ? empiricalSD.toFixed(2) : "—"}
          matchIndicator={seMatchIndicator}
        />
        <MetricRow
          label="Theoretical SE"
          sub="σ/√n — CLT prediction"
          value={theoreticalSE.toFixed(2)}
          highlight
        />
      </div>

      {N >= 30 && (
        <div
          className="mt-3 rounded-xl p-2.5 text-[9px] leading-relaxed transition-all duration-500"
          style={{
            background: seMatchGood ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
            border: `1px solid ${seMatchGood ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
            color: seMatchGood ? "#22c55e" : "#ef4444",
          }}
        >
          {seMatchGood
            ? "Empirical SD is within 10% of theoretical SE — the CLT is working!"
            : `Difference: ${Math.abs(((empiricalSD - theoreticalSE) / theoreticalSE) * 100).toFixed(1)}% off — draw more samples to converge.`}
        </div>
      )}

      {N < 30 && N > 0 && (
        <p className="text-[9px] text-[#334155] mt-3">
          Draw at least 30 samples to compare empirical vs theoretical SE.
        </p>
      )}
      {N === 0 && (
        <p className="text-[9px] text-[#334155] mt-3">
          Metrics will appear as you draw samples.
        </p>
      )}
    </div>
  );
}
