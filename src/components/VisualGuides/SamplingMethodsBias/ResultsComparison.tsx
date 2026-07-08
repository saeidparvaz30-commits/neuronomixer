"use client";

import React from "react";
import { PopulationUnit } from "./types";

interface Props {
  population: PopulationUnit[];
  populationMean: number;
  populationSD: number;
  currentSample: PopulationUnit[];
  sampleMean: number;
  sampleSD: number;
}

function pctError(sample: number, truth: number): number {
  if (truth === 0) return 0;
  return Math.abs((sample - truth) / truth) * 100;
}

function errorColor(pct: number): string {
  if (pct < 5) return "#3bb4a4";
  if (pct < 10) return "#d4af37";
  return "#ef4444";
}

interface RowProps {
  label: string;
  popVal: string;
  sampleVal: string;
  diff: number;
  diffLabel: string;
}

function CompareRow({ label, popVal, sampleVal, diff, diffLabel }: RowProps) {
  const color = errorColor(diff);
  return (
    <tr className="border-b border-white/[0.04] last:border-0">
      <td className="py-2.5 pr-3 text-[12px] text-[#94a3b8] font-medium">{label}</td>
      <td className="py-2.5 pr-3 text-[12px] font-mono text-white text-right">{popVal}</td>
      <td className="py-2.5 pr-3 text-[12px] font-mono text-white text-right">{sampleVal}</td>
      <td className="py-2.5 text-right">
        <span
          className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
          style={{ color, background: color + "18" }}
        >
          {diffLabel}
        </span>
      </td>
    </tr>
  );
}

export default function ResultsComparison({
  population,
  populationMean,
  populationSD,
  currentSample,
  sampleMean,
  sampleSD,
}: Props) {
  if (currentSample.length === 0) {
    return (
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
          Results Comparison
        </p>
        <p className="text-[13px] text-[#334155] text-center py-8">
          Draw a sample to see results here.
        </p>
      </div>
    );
  }

  const popGroupA = population.filter(u => u.group === "A").length;
  const popGroupB = population.length - popGroupA;
  const popPctA = (popGroupA / population.length) * 100;
  const popPctB = (popGroupB / population.length) * 100;

  const sampleGroupA = currentSample.filter(u => u.group === "A").length;
  const sampleGroupB = currentSample.length - sampleGroupA;
  const samplePctA = (sampleGroupA / currentSample.length) * 100;
  const samplePctB = (sampleGroupB / currentSample.length) * 100;

  const meanPctErr = pctError(sampleMean, populationMean);
  const sdPctErr = pctError(sampleSD, populationSD);
  const pctAErr = Math.abs(samplePctA - popPctA);
  const pctBErr = Math.abs(samplePctB - popPctB);

  const meanDiff = sampleMean - populationMean;
  const sign = meanDiff >= 0 ? "+" : "";
  const pctSign = meanDiff >= 0 ? "above" : "below";

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">
        Results Comparison
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[380px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="pb-2 pr-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#334155]">
                Metric
              </th>
              <th className="pb-2 pr-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[#3bb4a4]">
                Population (true)
              </th>
              <th className="pb-2 pr-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                Sample (n={currentSample.length})
              </th>
              <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
                Diff
              </th>
            </tr>
          </thead>
          <tbody>
            <CompareRow
              label="Mean"
              popVal={populationMean.toFixed(2)}
              sampleVal={sampleMean.toFixed(2)}
              diff={meanPctErr}
              diffLabel={`${sign}${meanDiff.toFixed(2)} (${meanPctErr.toFixed(1)}%)`}
            />
            <CompareRow
              label="SD"
              popVal={populationSD.toFixed(2)}
              sampleVal={sampleSD.toFixed(2)}
              diff={sdPctErr}
              diffLabel={`${sdPctErr.toFixed(1)}% err`}
            />
            <CompareRow
              label="% Group A"
              popVal={`${popPctA.toFixed(1)}%`}
              sampleVal={`${samplePctA.toFixed(1)}%`}
              diff={pctAErr}
              diffLabel={`±${pctAErr.toFixed(1)}pp`}
            />
            <CompareRow
              label="% Group B"
              popVal={`${popPctB.toFixed(1)}%`}
              sampleVal={`${samplePctB.toFixed(1)}%`}
              diff={pctBErr}
              diffLabel={`±${pctBErr.toFixed(1)}pp`}
            />
          </tbody>
        </table>
      </div>

      {/* Interpretation text */}
      <div
        className="mt-4 rounded-xl px-4 py-3 border"
        style={{
          borderColor: errorColor(meanPctErr) + "40",
          background: errorColor(meanPctErr) + "0d",
        }}
      >
        <p className="text-[12px] text-[#94a3b8] leading-relaxed">
          Your sample mean{" "}
          <span className="font-semibold text-white">{sampleMean.toFixed(2)}</span> is{" "}
          <span className="font-semibold" style={{ color: errorColor(meanPctErr) }}>
            {meanPctErr.toFixed(1)}%
          </span>{" "}
          {pctSign} the true mean{" "}
          <span className="font-semibold text-white">{populationMean.toFixed(2)}</span>.
          {meanPctErr >= 10 && (
            <span className="text-[#ef4444]">
              {" "}This level of error suggests sampling bias. Try a different method.
            </span>
          )}
          {meanPctErr >= 5 && meanPctErr < 10 && (
            <span className="text-[var(--color-accent)]">
              {" "}Moderate error: consider a larger sample or a different method.
            </span>
          )}
          {meanPctErr < 5 && (
            <span className="text-[#3bb4a4]">
              {" "}Good estimate: within 5% of the true value.
            </span>
          )}
        </p>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-4 mt-3">
        {[
          { color: "#3bb4a4", label: "< 5% error" },
          { color: "var(--color-accent)", label: "5–10% error" },
          { color: "#ef4444", label: "≥ 10% error" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-[10px] text-[#475569]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
