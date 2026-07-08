"use client";

import React from "react";
import { ROWS, DupInfo, summarizeColumns } from "./data";

interface Props {
  dupInfo: DupInfo | null;
  onRunCheck: () => void;
}

export default function DuplicatesPanel({ dupInfo, onRunCheck }: Props) {
  const idSummary = summarizeColumns(ROWS).find((s) => s.key === "reading_id");
  const uniqueIds = idSummary ? idSummary.unique : 0;

  return (
    <div>
      <p className="text-[13px] font-semibold text-white mb-2">
        Step 4: Is every row really a new observation?
      </p>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
        Step 1 left a note: {uniqueIds} unique ids across {ROWS.length} rows. Time to
        chase it. An exact-duplicate scan serializes every row (all columns,
        including the id) and counts rows whose full content already appeared
        earlier. Duplicates usually enter in batches: an ingestion job that ran
        twice, a retried upload, a copy-paste in a spreadsheet. They silently
        double-weight those observations in every average, histogram, and model you
        build afterwards.
      </p>

      <button
        onClick={onRunCheck}
        className="mb-4 px-4 py-2 rounded-xl text-[12px] font-semibold border border-[#334155] text-[#f1f5f9] hover:border-[#d4af37] hover:text-[#d4af37] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      >
        Run exact-duplicate scan
      </button>

      {dupInfo === null ? (
        <p className="text-[11px] text-[#475569]">
          The scan compares all {ROWS.length} rows. Run it.
        </p>
      ) : (
        <div>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="rounded-xl border border-[#1e293b] px-4 py-2.5">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide">
                Exact duplicates
              </p>
              <p
                className="text-xl font-black font-mono"
                style={{
                  color: dupInfo.count > 0 ? "var(--color-warning)" : "var(--color-success)",
                }}
              >
                {dupInfo.count}
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] px-4 py-2.5">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide">
                Rows if deduplicated
              </p>
              <p className="text-xl font-black font-mono text-white">
                {ROWS.length - dupInfo.count}
              </p>
            </div>
          </div>

          {dupInfo.count > 0 && (
            <>
              <div className="overflow-x-auto rounded-xl border border-[#1e293b] max-w-md">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-[#1e293b] text-left text-[#94a3b8]">
                      <th className="px-3 py-2 font-semibold">reading_id</th>
                      <th className="px-3 py-2 font-semibold">first seen (row)</th>
                      <th className="px-3 py-2 font-semibold">re-appears (row)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dupInfo.entries.map((e, i) => (
                      <tr
                        key={`${e.id}-${e.dupRow}`}
                        className={i % 2 === 0 ? "bg-[#0f172a]" : "bg-[#162032]"}
                      >
                        <td className="px-3 py-2 font-mono text-[#f1f5f9]">{e.id}</td>
                        <td className="px-3 py-2 font-mono text-[#94a3b8]">{e.firstRow}</td>
                        <td className="px-3 py-2 font-mono text-[var(--color-warning)]">
                          {e.dupRow}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed mt-3">
                Notice the pattern: the duplicated ids are consecutive and they
                re-appear as one contiguous block. That is the fingerprint of a
                batch ingested twice, not of {dupInfo.count} independent accidents.
                Writing down the shape of a problem, not just its count, is what
                lets you fix the cause instead of the symptom.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
