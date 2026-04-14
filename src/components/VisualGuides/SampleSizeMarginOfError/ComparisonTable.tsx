"use client";

import React, { useMemo } from "react";
import { ConfidenceLevel, computeSampleSize } from "./types";

interface Props {
  confidenceLevel: ConfidenceLevel;
  p: number;
  currentMOE: number;
  costPerSurvey: number;
}

const MOE_TARGETS = [1, 2, 3, 5, 10];

function nearestMOE(moe: number): number {
  let best = MOE_TARGETS[0];
  let bestDist = Math.abs(moe - best);
  for (const t of MOE_TARGETS) {
    const d = Math.abs(moe - t);
    if (d < bestDist) {
      bestDist = d;
      best = t;
    }
  }
  return best;
}

export default function ComparisonTable({
  confidenceLevel,
  p,
  currentMOE,
  costPerSurvey,
}: Props) {
  const highlighted = nearestMOE(currentMOE);

  const rows = useMemo(
    () =>
      MOE_TARGETS.map((moe) => {
        const n = computeSampleSize(moe, confidenceLevel, p);
        const cost = n * costPerSurvey;
        const days = Math.ceil(n / 100);
        return { moe, n, cost, days };
      }),
    [confidenceLevel, p, costPerSurvey]
  );

  function fmt(n: number): string {
    return n.toLocaleString("en-US");
  }

  function fmtCost(n: number): string {
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  }

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <p className="text-[13px] font-bold text-white mb-1">
        MOE Comparison Table
      </p>
      <p className="text-[11px] text-[#94a3b8] mb-4">
        Based on {confidenceLevel}% confidence, p = {Math.round(p * 100)}%.
        Highlighted row matches your current MOE setting.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]" role="table">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th
                scope="col"
                className="text-left py-2 pr-3 text-[10px] font-semibold uppercase tracking-[1px] text-[#475569]"
              >
                MOE
              </th>
              <th
                scope="col"
                className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-[1px] text-[#475569]"
              >
                Required n
              </th>
              <th
                scope="col"
                className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-[1px] text-[#475569]"
              >
                Cost
              </th>
              <th
                scope="col"
                className="text-right py-2 pl-3 text-[10px] font-semibold uppercase tracking-[1px] text-[#475569]"
              >
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ moe, n, cost, days }) => {
              const isHighlighted = moe === highlighted;
              return (
                <tr
                  key={moe}
                  className={`border-b border-white/[0.03] transition-colors ${
                    isHighlighted
                      ? "bg-[#d4af37]/10"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  <td className="py-2.5 pr-3">
                    <span
                      className={`font-bold ${
                        isHighlighted ? "text-[#d4af37]" : "text-white"
                      }`}
                    >
                      ±{moe}%
                    </span>
                    {isHighlighted && (
                      <span className="ml-1.5 text-[9px] text-[#d4af37] bg-[#d4af37]/20 rounded px-1 py-0.5">
                        current
                      </span>
                    )}
                  </td>
                  <td
                    className={`text-right py-2.5 px-3 font-mono ${
                      isHighlighted ? "text-[#d4af37]" : "text-[#f1f5f9]"
                    }`}
                  >
                    {fmt(n)}
                  </td>
                  <td className="text-right py-2.5 px-3 text-[#94a3b8]">
                    {fmtCost(cost)}
                  </td>
                  <td className="text-right py-2.5 pl-3 text-[#94a3b8]">
                    {days} {days === 1 ? "day" : "days"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Key insight */}
      <div className="mt-4 pt-3 border-t border-white/[0.06]">
        <p className="text-[11px] text-[#94a3b8]">
          <span className="text-[#d4af37] font-semibold">Key insight:</span>{" "}
          Halving MOE quadruples sample size — precision is expensive.
        </p>
      </div>
    </div>
  );
}
