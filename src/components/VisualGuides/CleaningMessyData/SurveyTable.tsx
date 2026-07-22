"use client";

import React from "react";
import { CleanRow, CleanCell, markEdgeWhitespace } from "./types";

interface Props {
  rows: readonly CleanRow[];
  anyStepOn: boolean;
}

function cellClasses(status: CleanCell["status"]): string {
  switch (status) {
    case "changed":
      return "text-[var(--color-accent)]";
    case "unparsed":
      return "text-[#ef4444]";
    case "missing":
      return "text-[#a855f7]";
    default:
      return "text-[#f1f5f9]";
  }
}

function CellView({ cell }: { cell: CleanCell }) {
  return (
    <div className="flex flex-col">
      <span className={`font-mono text-[12px] ${cellClasses(cell.status)}`}>
        {markEdgeWhitespace(cell.display)}
        {cell.status === "unparsed" && (
          <span className="ml-1.5 text-[9px] font-sans font-semibold uppercase tracking-wide text-[#ef4444] border border-[#ef4444]/40 rounded px-1 py-px align-middle">
            unparsed
          </span>
        )}
        {cell.status === "missing" && (
          <span className="ml-1.5 text-[9px] font-sans font-semibold uppercase tracking-wide text-[#a855f7] border border-[#a855f7]/40 rounded px-1 py-px align-middle">
            missing
          </span>
        )}
      </span>
      {cell.status === "changed" && (
        <span className="font-mono text-[10px] text-[#475569] line-through">
          {markEdgeWhitespace(cell.raw)}
        </span>
      )}
    </div>
  );
}

export default function SurveyTable({ rows, anyStepOn }: Props) {
  const cleanCount = rows.filter((r) => r.clean).length;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <p className="text-[13px] font-semibold text-white">
          survey_export.csv: {rows.length} rows
          {anyStepOn ? ", with your current steps applied" : ", exactly as they arrived"}
        </p>
        <div className="flex items-center gap-3 text-[10px] text-[#94a3b8] flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block bg-[var(--color-accent)]" aria-hidden="true" />
            changed by a step
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block bg-[#ef4444]" aria-hidden="true" />
            still unparsed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block bg-[#a855f7]" aria-hidden="true" />
            missing value
          </span>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-xl border border-[#1e293b]">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#1e293b]">
              <th scope="col" className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                #
              </th>
              <th scope="col" className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                country
              </th>
              <th scope="col" className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                signup_date
              </th>
              <th scope="col" className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                hours_per_week
              </th>
              <th scope="col" className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                row status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}>
                <td className="px-3 py-1.5 font-mono text-[11px] text-[#475569]">{r.id}</td>
                <td className="px-3 py-1.5">
                  <CellView cell={r.country} />
                </td>
                <td className="px-3 py-1.5">
                  <CellView cell={r.date} />
                </td>
                <td className="px-3 py-1.5">
                  <CellView cell={r.hours} />
                </td>
                <td className="px-3 py-1.5">
                  {r.clean ? (
                    <span className="text-[10px] font-semibold text-[var(--color-success)]">clean ✓</span>
                  ) : (
                    <span className="text-[10px] text-[#475569]">needs work</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-[#475569] mt-3 leading-relaxed">
        The ␣ mark makes leading and trailing spaces visible; they are real characters in
        the data. A row counts as clean when its country is one of the three canonical
        labels, its date parses, and its hours value is a real number: right now that is{" "}
        {cleanCount} of {rows.length} rows
        {anyStepOn ? ", with your current steps applied." : ", before any cleaning."}
      </p>
    </div>
  );
}
