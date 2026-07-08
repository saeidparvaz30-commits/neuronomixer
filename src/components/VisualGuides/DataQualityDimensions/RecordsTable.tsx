"use client";

import React from "react";
import { CustomerRow, FieldName, GROUND_TRUTH_IDS } from "./data";

interface Props {
  rows: CustomerRow[];
  /** dataset row index -> columns flagged by the active rules */
  cellFlags: ReadonlyMap<number, ReadonlySet<FieldName>>;
}

const HEADERS: Array<{ key: FieldName; label: string }> = [
  { key: "name", label: "name" },
  { key: "email", label: "email" },
  { key: "country", label: "country" },
  { key: "phone", label: "phone" },
  { key: "signupDate", label: "signupDate" },
  { key: "lastUpdated", label: "lastUpdated" },
];

export default function RecordsTable({ rows, cellFlags }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#1e293b]">
      <table className="w-full border-collapse text-[11px] font-mono whitespace-nowrap">
        <thead>
          <tr className="bg-[#1e293b] text-[#94a3b8] text-left">
            <th className="px-3 py-2 font-semibold">#</th>
            <th className="px-3 py-2 font-semibold">id</th>
            {HEADERS.map((h) => (
              <th key={h.key} className="px-3 py-2 font-semibold">
                {h.label}
              </th>
            ))}
            <th className="px-3 py-2 font-semibold">verified</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const flagged = cellFlags.get(i);
            return (
              <tr
                key={`${r.id}-${i}`}
                style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
              >
                <td className="px-3 py-1.5 text-[#475569]">{i + 1}</td>
                <td className="px-3 py-1.5 text-[#94a3b8]">{r.id}</td>
                {HEADERS.map((h) => {
                  const v = r[h.key];
                  const isFlagged = flagged?.has(h.key) ?? false;
                  return (
                    <td
                      key={h.key}
                      className="px-3 py-1.5"
                      style={
                        isFlagged
                          ? {
                              background: "rgba(249, 115, 22, 0.12)",
                              boxShadow: "inset 0 0 0 1px var(--color-warning)",
                            }
                          : undefined
                      }
                    >
                      {v === null ? (
                        <span className="italic text-[#ef4444]">null</span>
                      ) : (
                        <span className={isFlagged ? "text-[var(--color-warning)]" : "text-[#f1f5f9]"}>
                          {v}
                          {isFlagged && (
                            <span className="ml-1 not-italic" aria-label="flagged by a rule">
                              ⚠
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-1.5">
                  {GROUND_TRUTH_IDS.has(r.id) ? (
                    <span className="text-[#3bb4a4]">yes</span>
                  ) : (
                    <span className="text-[#475569]">no</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
