"use client";

import React from "react";
import {
  ROWS,
  ColKey,
  NumKey,
  NUM_KEYS,
  VALID_ZONES,
  summarizeColumns,
  valueCounts,
  numericValues,
  mean,
} from "./data";

interface Props {
  expandedCol: ColKey | null;
  onExpand: (col: ColKey | null) => void;
  onFlagZone: (value: string) => void;
  flagFeedback: { value: string; correct: boolean } | null;
  foundMislabel: boolean;
}

const COL_DESC: Record<ColKey, string> = {
  reading_id: "unit-assigned reading identifier",
  zone: "warehouse zone the sensor hangs in",
  temp_c: "air temperature, degrees Celsius",
  humidity_pct: "relative humidity, percent",
  voc_ppb: "volatile organic compounds, parts per billion",
  battery_v: "sensor battery voltage",
};

export default function SchemaPanel({
  expandedCol,
  onExpand,
  onFlagZone,
  flagFeedback,
  foundMislabel,
}: Props) {
  const summaries = summarizeColumns(ROWS);
  const zoneCounts = valueCounts(ROWS, "zone");
  const idSummary = summaries.find((s) => s.key === "reading_id");

  const numDetail = (key: NumKey) => {
    const vals = numericValues(ROWS, key, false);
    return {
      min: Math.min(...vals),
      mean: mean(vals),
      max: Math.max(...vals),
      n: vals.length,
    };
  };

  return (
    <div>
      <p className="text-[13px] font-semibold text-white mb-2">
        Step 1: What are you holding?
      </p>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
        Before any chart, ask the boring questions: how many rows, how many columns,
        what type is each column, and how many distinct values does it take? The
        deployment manifest says this warehouse has exactly four zones: north, south,
        east, and west. Inspect each column and compare what the data says against
        what the manifest promises. If a categorical column has more distinct values
        than it should, one of them is lying.
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="rounded-xl border border-[#1e293b] px-4 py-2.5">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide">Rows</p>
          <p className="text-xl font-black font-mono text-white">{ROWS.length}</p>
        </div>
        <div className="rounded-xl border border-[#1e293b] px-4 py-2.5">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide">Columns</p>
          <p className="text-xl font-black font-mono text-white">{summaries.length}</p>
        </div>
        <div className="rounded-xl border border-[#1e293b] px-4 py-2.5">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide">
            Unique reading_id
          </p>
          <p className="text-xl font-black font-mono text-white">
            {idSummary ? idSummary.unique : 0}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#1e293b]">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#1e293b] text-left text-[#94a3b8]">
              <th className="px-3 py-2 font-semibold">column</th>
              <th className="px-3 py-2 font-semibold">dtype</th>
              <th className="px-3 py-2 font-semibold">non-null</th>
              <th className="px-3 py-2 font-semibold">unique</th>
              <th className="px-3 py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s, i) => (
              <tr
                key={s.key}
                className={i % 2 === 0 ? "bg-[#0f172a]" : "bg-[#162032]"}
              >
                <td className="px-3 py-2 font-mono text-[#f1f5f9]">{s.key}</td>
                <td className="px-3 py-2 font-mono text-[#94a3b8]">{s.dtype}</td>
                <td className="px-3 py-2 font-mono text-[#94a3b8]">
                  {s.nonNull} / {ROWS.length}
                </td>
                <td className="px-3 py-2 font-mono text-[#94a3b8]">{s.unique}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => onExpand(expandedCol === s.key ? null : s.key)}
                    aria-expanded={expandedCol === s.key}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-[#334155] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  >
                    {expandedCol === s.key ? "Hide" : "Inspect"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {expandedCol && (
        <div className="mt-4 rounded-xl border border-[#334155] bg-[#162032] p-4">
          <p className="text-[11px] text-[#475569] mb-2">
            <span className="font-mono text-[#94a3b8]">{expandedCol}</span>:{" "}
            {COL_DESC[expandedCol]}
          </p>

          {expandedCol === "zone" && (
            <div>
              <p className="text-[12px] text-[#94a3b8] mb-3">
                Distinct values with counts. The manifest allows {VALID_ZONES.length}{" "}
                zones. This column has {zoneCounts.length}. Flag the value that should
                not exist.
              </p>
              <div className="flex flex-wrap gap-2">
                {zoneCounts.map((vc) => {
                  const isBadFlagged =
                    foundMislabel && flagFeedback?.correct && flagFeedback.value === vc.value;
                  return (
                    <button
                      key={vc.value}
                      onClick={() => onFlagZone(vc.value)}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-mono border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                      style={{
                        borderColor: isBadFlagged ? "var(--color-warning)" : "#334155",
                        color: isBadFlagged ? "var(--color-warning)" : "#f1f5f9",
                      }}
                    >
                      {vc.value}{" "}
                      <span className="text-[#475569]">({vc.count})</span>
                    </button>
                  );
                })}
              </div>
              {flagFeedback && (
                <p
                  className="text-[12px] mt-3 font-semibold"
                  style={{
                    color: flagFeedback.correct
                      ? "var(--color-success)"
                      : "#94a3b8",
                  }}
                >
                  {flagFeedback.correct
                    ? `Caught it: "${flagFeedback.value}" appears ${
                        zoneCounts.find((z) => z.value === flagFeedback.value)?.count ?? 0
                      } time(s) and is not in the manifest. Likely a hand-entered typo of "south".`
                    : `"${flagFeedback.value}" is in the manifest and appears ${
                        zoneCounts.find((z) => z.value === flagFeedback.value)?.count ?? 0
                      } times. That one is legitimate; look for a value the manifest does not allow.`}
                </p>
              )}
            </div>
          )}

          {expandedCol === "reading_id" && (
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              {idSummary ? idSummary.unique : 0} unique ids across {ROWS.length} rows.
              When an id column has fewer unique values than the table has rows, some
              rows share an id. That is not proof of duplication by itself, but it is
              exactly the kind of note you write down now and chase in the duplicates
              step.
            </p>
          )}

          {NUM_KEYS.includes(expandedCol as NumKey) &&
            (() => {
              const d = numDetail(expandedCol as NumKey);
              return (
                <div className="flex flex-wrap gap-4 text-[12px] font-mono">
                  <span className="text-[#94a3b8]">
                    min <span className="text-[#f1f5f9]">{d.min.toFixed(1)}</span>
                  </span>
                  <span className="text-[#94a3b8]">
                    mean <span className="text-[#f1f5f9]">{d.mean.toFixed(1)}</span>
                  </span>
                  <span className="text-[#94a3b8]">
                    max <span className="text-[#f1f5f9]">{d.max.toFixed(1)}</span>
                  </span>
                  <span className="text-[#94a3b8]">
                    n <span className="text-[#f1f5f9]">{d.n}</span>
                  </span>
                </div>
              );
            })()}

          {expandedCol === "humidity_pct" && (
            <p className="text-[11px] text-[#475569] mt-2 leading-relaxed">
              A relative humidity of {Math.min(...numericValues(ROWS, "humidity_pct", false)).toFixed(0)}{" "}
              percent is physically impossible. Note it down; the missingness step
              will explain what it really is.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
