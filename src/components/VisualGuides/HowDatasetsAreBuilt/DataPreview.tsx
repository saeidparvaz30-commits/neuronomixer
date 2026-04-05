"use client";

import React from "react";

type HighlightType = "error" | "fixed" | "new";

type DataPreviewProps = {
  columns: { key: string; label: string; type?: string }[];
  rows: Record<string, string | number | null>[];
  highlights?: { row: number; col: string; type: HighlightType }[];
  compact?: boolean;
  caption?: string;
};

const HIGHLIGHT_STYLES: Record<HighlightType, string> = {
  error: "bg-[#ef4444]/10 text-[#fca5a5]",
  fixed: "bg-[#3bb4a4]/10 text-[#6ee7b7]",
  new:   "bg-[#3b82f6]/10 text-[#93c5fd]",
};

function DataPreviewInner({ columns, rows, highlights = [], compact = false, caption }: DataPreviewProps) {
  const pad  = compact ? "px-2 py-1" : "px-3 py-2";
  const size = compact ? "text-[11px]" : "text-[12px]";

  function getHL(ri: number, key: string): HighlightType | null {
    return highlights.find((h) => h.row === ri && h.col === key)?.type ?? null;
  }

  return (
    <div className="rounded-xl border border-[#1e293b] overflow-hidden overflow-x-auto">
      <table className="w-full border-collapse min-w-max">
        {caption && (
          <caption className="text-[11px] text-[#94a3b8] text-left px-3 py-1 bg-[#0f172a] border-b border-[#1e293b] caption-top">
            {caption}
          </caption>
        )}
        <thead>
          <tr className="bg-[#1e293b]">
            {columns.map((col) => (
              <th key={col.key} scope="col" className={`${pad} text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8] text-left whitespace-nowrap`}>
                {col.label}
                {col.type && <span className="ml-1 text-[9px] font-normal text-[#475569] normal-case">:{col.type}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-[#0f172a]" : "bg-[#1e293b]/20"}>
              {columns.map((col) => {
                const hl  = getHL(ri, col.key);
                const val = row[col.key];
                return (
                  <td key={col.key} className={`${pad} ${size} whitespace-nowrap ${hl ? HIGHLIGHT_STYLES[hl] : "text-[#f1f5f9]"}`}>
                    {val === null ? <span className="italic text-[#475569]">null</span> : String(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const DataPreview = React.memo(DataPreviewInner);
export default DataPreview;
