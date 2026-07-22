"use client";

import React from "react";
import {
  CategoryCount,
  CATEGORY_COLORS,
  CANONICAL_COUNTRIES,
  markEdgeWhitespace,
} from "./types";

interface Props {
  counts: readonly CategoryCount[];
  rawDistinct: number;
  totalRows: number;
}

export default function CategoryChart({ counts, rawDistinct, totalRows }: Props) {
  const maxCount = Math.max(1, ...counts.map((c) => c.count));
  const converged = counts.length === CANONICAL_COUNTRIES.length && counts.every((c) => c.canonical);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
        <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8]">
          What the country column believes right now
        </p>
        <p
          className="text-[11px] font-mono font-bold"
          style={{ color: converged ? "var(--color-success)" : "var(--color-warning)" }}
        >
          {counts.length} distinct value{counts.length === 1 ? "" : "s"}
        </p>
      </div>
      <p className="text-[11px] text-[#475569] leading-relaxed mb-4">
        The raw export claims {rawDistinct} categories. Only {CANONICAL_COUNTRIES.length}{" "}
        countries actually answered this survey. Every bar is a live count over the{" "}
        {totalRows} rows.
      </p>
      <div className="flex flex-col gap-1.5">
        {counts.map((c) => {
          const widthPct = (c.count / maxCount) * 100;
          const color = c.canonical ? CATEGORY_COLORS[c.value] ?? "#94a3b8" : "#475569";
          return (
            <div key={c.value} className="flex items-center gap-2">
              <span
                className={`w-[128px] shrink-0 font-mono text-[11px] truncate ${
                  c.canonical ? "text-[#f1f5f9]" : "text-[#94a3b8]"
                }`}
                title={`"${c.value}"`}
              >
                &quot;{markEdgeWhitespace(c.value)}&quot;
              </span>
              <div className="relative h-4 flex-1 rounded bg-[#1e293b] overflow-hidden">
                <span
                  className="absolute top-0 bottom-0 left-0 rounded-sm transition-all duration-500"
                  style={{ background: color, width: `${widthPct}%` }}
                />
              </div>
              <span className="w-[56px] shrink-0 text-right font-mono text-[11px] text-[#94a3b8]">
                {c.count}
                {c.canonical ? " ✓" : ""}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-[#475569] mt-3 leading-relaxed">
        Colored bars marked ✓ are canonical labels ({CANONICAL_COUNTRIES.join(", ")}); gray
        bars are impostors created by whitespace, capitalization, or synonyms. Any chart,
        filter, or groupby built on this column right now would treat each bar as its own
        country.
      </p>
    </div>
  );
}
