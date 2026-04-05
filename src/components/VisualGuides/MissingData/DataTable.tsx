"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Row, Strategy, STRATEGY_META } from "./types";

type Props = {
  rows: Row[];
  strategy: Strategy;
};

function fmt(v: number | null): string {
  if (v === null) return "null";
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

function DataTableInner({ rows, strategy }: Props) {
  const meta      = strategy ? STRATEGY_META[strategy] : null;
  const imputeClr = meta?.color ?? "#3bb4a4";

  const visibleRows = strategy === "drop-rows" ? rows.filter((r) => !r.dropped) : rows;
  const rowCount    = visibleRows.length;

  const COLS: { key: keyof Row; label: string }[] = [
    { key: "id",       label: "ID"        },
    { key: "featureA", label: "Feature_A" },
    { key: "featureB", label: "Feature_B" },
    { key: "featureC", label: "Feature_C" },
    { key: "target",   label: "Target"    },
  ];

  function cellStyle(row: Row, key: keyof Row) {
    const isImputed =
      (key === "featureA" && row.imputed?.featureA) ||
      (key === "featureB" && row.imputed?.featureB);

    const wasNull =
      !strategy &&
      ((key === "featureA" && row.featureA === null) ||
       (key === "featureB" && row.featureB === null));

    if (isImputed)
      return {
        bg:    `bg-[${imputeClr}]/10`,
        text:  "text-[#f1f5f9]",
        extra: `ring-1 ring-inset ring-[${imputeClr}]/30`,
      };
    if (wasNull)
      return {
        bg:    "bg-[#ef4444]/10",
        text:  "text-[#fca5a5]",
        extra: "animate-pulse",
      };
    return { bg: "", text: "text-[#f1f5f9]", extra: "" };
  }

  return (
    <div>
      {/* Row count badge */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-[#94a3b8]">
          {strategy ? (
            <>
              After{" "}
              <span className="font-semibold" style={{ color: meta?.color }}>
                {meta?.label}
              </span>
            </>
          ) : (
            "Original Dataset"
          )}
        </p>
        <motion.span
          key={rowCount}
          initial={{ scale: 1.25, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-[11px] font-semibold text-white bg-[#1e293b] px-2 py-0.5 rounded-lg"
        >
          {rowCount} rows
        </motion.span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#1e293b]">
        <table className="w-full border-collapse min-w-max">
          <caption className="sr-only">
            Dataset with missing values — {rowCount} rows displayed
          </caption>
          <thead>
            <tr className="bg-[#1e293b]">
              {COLS.map((c) => (
                <th key={c.key} scope="col" className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8] text-left whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {visibleRows.map((row, ri) => (
                <motion.tr
                  key={row.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className={ri % 2 === 0 ? "bg-[#0f172a]" : "bg-[#1e293b]/20"}
                >
                  {COLS.map((col) => {
                    const rawVal = row[col.key];
                    const isNull =
                      !strategy &&
                      (col.key === "featureA" || col.key === "featureB") &&
                      rawVal === null;

                    const isImputed =
                      (col.key === "featureA" && row.imputed?.featureA) ||
                      (col.key === "featureB" && row.imputed?.featureB);

                    return (
                      <td
                        key={col.key}
                        aria-label={isNull ? "Missing value" : undefined}
                        className={`px-3 py-2 text-[12px] whitespace-nowrap transition-colors ${
                          isNull
                            ? "bg-[#ef4444]/10 text-[#fca5a5] animate-pulse"
                            : "text-[#f1f5f9]"
                        }`}
                        style={
                          isImputed
                            ? {
                                background: imputeClr + "18",
                                color: "#f1f5f9",
                                boxShadow: `inset 0 0 0 1px ${imputeClr}44`,
                              }
                            : undefined
                        }
                      >
                        {isImputed ? (
                          <motion.span
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: ri * 0.04 }}
                          >
                            {fmt(rawVal as number | null)}
                          </motion.span>
                        ) : isNull ? (
                          <span className="italic text-[#fca5a5]">null</span>
                        ) : (
                          fmt(rawVal as number | null)
                        )}
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Null cell legend */}
      <div className="flex flex-wrap gap-3 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#ef4444]/30 border border-[#ef4444]/50" />
          <span className="text-[10px] text-[#94a3b8]">Null cell</span>
        </div>
        {strategy && strategy !== "drop-rows" && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: imputeClr + "30", border: `1px solid ${imputeClr}66` }} />
            <span className="text-[10px] text-[#94a3b8]">Imputed value</span>
          </div>
        )}
      </div>
    </div>
  );
}

const DataTable = React.memo(DataTableInner);
export default DataTable;
