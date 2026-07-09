"use client";

import React, { useMemo } from "react";
import { N_PUBLIC, leaderboardRows } from "./benchmarkMath";
import { PUBLIC_SERIES, PRIVATE_SERIES } from "./types";

type Props = {
  audited: ReadonlySet<string>;
  onAudit: (modelId: string) => void;
};

function gapColor(gapPts: number): string {
  if (gapPts >= 5) return "var(--color-warning)";
  if (gapPts <= 1) return "var(--color-success)";
  return "#f1f5f9";
}

export default function LeaderboardAudit({ audited, onAudit }: Props) {
  const rows = useMemo(() => leaderboardRows(), []);

  const auditedRows = rows.filter((r) => audited.has(r.model.id));
  const pubOrder = [...auditedRows].sort((a, b) => b.publicPct - a.publicPct);
  const privOrder = [...auditedRows].sort((a, b) => b.privatePct - a.privatePct);
  const rankFlip =
    auditedRows.length >= 2 && pubOrder[0].model.id !== privOrder[0].model.id;

  return (
    <div>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
        Four synthetic models, ranked by their public leaderboard score. All four
        are simulated: we defined each model&apos;s true skill and how much of the
        public test set leaked into its training data, then computed both scores
        from the item outcomes. The leaderboard only shows the public number. Audit
        a model to run it on the private held-out set.
      </p>

      <div className="rounded-xl border border-[#1e293b] overflow-hidden mb-4">
        <div className="px-4 py-2.5 bg-[#1e293b] flex items-center justify-between">
          <p className="text-[12px] font-semibold text-white">
            Simulated public leaderboard
          </p>
          <span className="text-[11px] text-[#94a3b8] font-mono">
            {audited.size} of {rows.length} audited
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#1e293b] text-left">
                {[
                  "rank",
                  "model",
                  "public score",
                  "private score",
                  "gap",
                  "leaked share",
                  "audit",
                ].map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isAudited = audited.has(row.model.id);
                return (
                  <tr
                    key={row.model.id}
                    style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
                  >
                    <td className="px-3 py-2.5 font-mono text-[#f1f5f9]">
                      #{row.publicRank}
                      {isAudited && (
                        <span
                          className="ml-1.5 text-[10px]"
                          style={{ color: PRIVATE_SERIES }}
                        >
                          (#{row.privateRank} private)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[#f1f5f9] font-semibold">
                      {row.model.name}
                      <span className="ml-1.5 text-[10px] font-normal text-[#475569]">
                        simulated
                      </span>
                    </td>
                    <td
                      className="px-3 py-2.5 font-mono font-bold"
                      style={{ color: PUBLIC_SERIES }}
                    >
                      {row.publicPct}%
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      {isAudited ? (
                        <span style={{ color: PRIVATE_SERIES }} className="font-bold">
                          {row.privatePct}%
                        </span>
                      ) : (
                        <span className="text-[#475569]">?</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      {isAudited ? (
                        <span style={{ color: gapColor(row.gapPts) }}>
                          {row.gapPts > 0 ? "+" : ""}
                          {row.gapPts} pts
                        </span>
                      ) : (
                        <span className="text-[#475569]">?</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      {isAudited ? (
                        <span
                          style={{
                            color:
                              row.model.contamination > 0.25
                                ? "var(--color-warning)"
                                : "#94a3b8",
                          }}
                        >
                          {Math.round(row.model.contamination * 100)}% of{" "}
                          {N_PUBLIC}
                        </span>
                      ) : (
                        <span className="text-[#475569]">?</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => onAudit(row.model.id)}
                        disabled={isAudited}
                        aria-pressed={isAudited}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                          isAudited
                            ? "border-[var(--color-success)]/50 text-[var(--color-success)] cursor-default"
                            : "border-[#334155] text-[#94a3b8] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                        }`}
                      >
                        {isAudited ? "Audited" : "Audit"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div aria-live="polite">
        {auditedRows.length >= 2 && (
          <div
            className={`rounded-xl border p-4 ${
              rankFlip
                ? "border-[var(--color-warning)]/40"
                : "border-[#334155]"
            }`}
          >
            <p
              className="text-[11px] font-semibold mb-1.5 uppercase tracking-wide"
              style={{
                color: rankFlip ? "var(--color-warning)" : "#94a3b8",
              }}
            >
              {rankFlip ? "Rank flip detected" : "Order holds, gaps do not"}
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              {rankFlip ? (
                <>
                  Among the models you audited, {pubOrder[0].model.name} leads on
                  the public set ({pubOrder[0].publicPct}% vs{" "}
                  {pubOrder[pubOrder.length - 1].publicPct}%), but on the private
                  held-out set {privOrder[0].model.name} comes out on top (
                  {privOrder[0].privatePct}% vs{" "}
                  {privOrder[privOrder.length - 1].privatePct}%). The leaderboard
                  ranking and the capability ranking are different orderings.
                </>
              ) : (
                <>
                  The models you audited keep the same order on both sets, but look
                  at the gap column: it shows how much of each public score is leak
                  inflation rather than skill. Audit the rest of the board to see
                  whether the top spot survives a private re-test.
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
