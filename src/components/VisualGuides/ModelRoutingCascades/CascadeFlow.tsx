"use client";

import React from "react";
import { TierParams, SimResult, HARD_DIFFICULTY, TIER_COLORS } from "./types";

type Props = {
  sim: SimResult;
  tiers: readonly TierParams[];
  threshold: number;
};

function difficultyBand(d: number): { label: string; color: string } {
  if (d < 0.4) return { label: "easy", color: "var(--color-success)" };
  if (d < HARD_DIFFICULTY) return { label: "medium", color: "var(--color-warning)" };
  return { label: "hard", color: "#ef4444" };
}

export default function CascadeFlow({ sim, tiers, threshold }: Props) {
  const total = sim.routed.length;
  // Queries that reach tier t: everything not answered by an earlier tier.
  const reached = tiers.map((_, t) =>
    sim.tierCounts.slice(t).reduce((s, c) => s + c, 0)
  );
  const sample = sim.routed.slice(0, 10);

  return (
    <div>
      {/* Tier cards with escalation arrows */}
      <div className="flex flex-col md:flex-row items-stretch gap-3 mb-5">
        {tiers.map((tier, t) => {
          const acc = sim.tierAccuracy[t];
          const share = total === 0 ? 0 : sim.tierCounts[t] / total;
          return (
            <React.Fragment key={tier.id}>
              <div
                className="flex-1 rounded-xl border p-4"
                style={{ borderColor: `${TIER_COLORS[t]}66` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-bold" style={{ color: TIER_COLORS[t] }}>
                    {tier.name}
                  </p>
                  <span className="text-[10px] text-[#475569] font-mono">
                    {tier.cost.toFixed(1)} units/query
                  </span>
                </div>
                <p className="text-2xl font-black font-mono text-[#f1f5f9]">
                  {sim.tierCounts[t]}
                  <span className="text-[12px] font-semibold text-[#475569]">
                    {" "}
                    / {total} answered ({(share * 100).toFixed(0)}%)
                  </span>
                </p>
                <p className="text-[11px] text-[#94a3b8] mt-1">
                  {acc === null
                    ? "answered none"
                    : `${(acc * 100).toFixed(1)}% of its answers correct`}
                </p>
                <p className="text-[10px] text-[#475569] mt-1">
                  {reached[t]} quer{reached[t] === 1 ? "y" : "ies"} reached this tier
                  {t === tiers.length - 1 ? " (always answers)" : ""}
                </p>
              </div>
              {t < tiers.length - 1 && (
                <div
                  className="flex md:flex-col items-center justify-center gap-1 px-1"
                  aria-hidden="true"
                >
                  <span className="text-[#475569] text-lg hidden md:block">→</span>
                  <span className="text-[#475569] text-lg md:hidden">↓</span>
                  <span className="text-[10px] text-[#94a3b8] font-mono whitespace-nowrap">
                    {reached[t + 1]} escalated
                  </span>
                  <span className="text-[9px] text-[#475569] whitespace-nowrap">
                    conf &lt; {threshold.toFixed(2)}
                  </span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Sample of the stream */}
      <div className="rounded-xl border border-[#1e293b] overflow-hidden">
        <div className="px-4 py-2.5 bg-[#1e293b] flex items-center justify-between">
          <p className="text-[12px] font-semibold text-white">
            first 10 queries of the stream, routed live
          </p>
          <span className="text-[11px] text-[#94a3b8] font-mono">{total} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#1e293b] text-left">
                {["#", "difficulty", "answered by", "confidence", "outcome"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sample.map((r, i) => {
                const band = difficultyBand(r.difficulty);
                return (
                  <tr
                    key={r.index}
                    style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
                  >
                    <td className="px-3 py-2 font-mono text-[#475569]">{r.index + 1}</td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-[#f1f5f9]">
                        {r.difficulty.toFixed(2)}
                      </span>{" "}
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: band.color }}
                      >
                        {band.label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-md border"
                        style={{
                          color: TIER_COLORS[r.answeredBy],
                          borderColor: `${TIER_COLORS[r.answeredBy]}55`,
                        }}
                      >
                        {tiers[r.answeredBy].name}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[#94a3b8]">
                      {r.confidence === null ? (
                        <span className="italic text-[#475569]">final tier</span>
                      ) : (
                        r.confidence.toFixed(2)
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.correct ? (
                        <span className="text-[11px] font-semibold text-[var(--color-success)]">
                          ✓ correct
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-[#ef4444]">
                          ✗ wrong
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
    </div>
  );
}
