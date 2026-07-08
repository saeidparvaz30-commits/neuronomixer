"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import {
  TRANSACTIONS,
  GROUP_COLORS,
  AGG_LABELS,
  pivot,
  formatAgg,
  type AggFn,
  type ValueCol,
} from "./types";

const PIVOT_FNS: readonly AggFn[] = ["count", "sum", "mean"];

const RADIO_BTN =
  "px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]";

function radioClass(active: boolean): string {
  return `${RADIO_BTN} ${
    active
      ? "bg-[var(--color-accent)] text-[#0a0e1a]"
      : "bg-[#1e293b] text-[#94a3b8] hover:text-white"
  }`;
}

interface Props {
  built: boolean;
  onBuild: () => void;
}

export default function PivotSection({ built, onBuild }: Props) {
  const { card } = useGuideMotion();
  const [fn, setFn] = useState<AggFn>("sum");
  const [valueCol, setValueCol] = useState<ValueCol>("revenue");

  const pv = useMemo(() => pivot(TRANSACTIONS, "region", "product", fn, valueCol), [fn, valueCol]);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-6">
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
        One grouping column answers &quot;per region&quot;. Two grouping columns answer
        &quot;per region, per product&quot;: split first by region, then split each region
        bucket again by product. Laid out as a grid, with one grouping on the rows and the
        other on the columns, this is exactly a pivot table.
      </p>

      {!built ? (
        <button
          onClick={onBuild}
          className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Build the region × product pivot
        </button>
      ) : (
        <AnimatePresence>
          <motion.div variants={card} initial="hidden" animate="visible">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#475569] uppercase tracking-wide">
                  Cell aggregate
                </span>
                <div role="radiogroup" aria-label="Pivot cell aggregate" className="flex gap-1.5">
                  {PIVOT_FNS.map((f) => (
                    <button
                      key={f}
                      role="radio"
                      aria-checked={fn === f}
                      onClick={() => setFn(f)}
                      className={radioClass(fn === f)}
                    >
                      {AGG_LABELS[f]}
                    </button>
                  ))}
                </div>
              </div>
              <div
                className="flex items-center gap-2"
                style={{ opacity: fn === "count" ? 0.45 : 1 }}
              >
                <span className="text-[11px] text-[#475569] uppercase tracking-wide">
                  Of column
                </span>
                <div role="radiogroup" aria-label="Pivot value column" className="flex gap-1.5">
                  {(["revenue", "units"] as const).map((v) => (
                    <button
                      key={v}
                      role="radio"
                      aria-checked={valueCol === v}
                      aria-disabled={fn === "count"}
                      disabled={fn === "count"}
                      onClick={() => setValueCol(v)}
                      className={radioClass(valueCol === v && fn !== "count")}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="border-collapse text-[12px] font-mono min-w-[420px]">
                <thead>
                  <tr className="bg-[#1e293b]">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8] border border-[#334155]">
                      region \ product
                    </th>
                    {pv.colKeys.map((ck) => (
                      <th
                        key={ck}
                        className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[#f1f5f9] border border-[#334155]"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: GROUP_COLORS.product[ck] }}
                            aria-hidden="true"
                          />
                          {ck}
                        </span>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8] border border-[#334155]">
                      all products
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pv.rowKeys.map((rk, i) => (
                    <tr key={rk} style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}>
                      <td className="px-3 py-2 border border-[#334155] text-[#f1f5f9]">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: GROUP_COLORS.region[rk] }}
                            aria-hidden="true"
                          />
                          {rk}
                        </span>
                      </td>
                      {pv.cells[i].map((c, j) => (
                        <td
                          key={pv.colKeys[j]}
                          className="px-3 py-2 text-right border border-[#334155] text-[#f1f5f9]"
                        >
                          {c === null ? "∅" : formatAgg(fn, valueCol, c)}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right border border-[#334155] text-[var(--color-accent)]">
                        {formatAgg(fn, valueCol, pv.rowTotals[i])}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#1e293b]">
                    <td className="px-3 py-2 border border-[#334155] text-[#94a3b8]">
                      all regions
                    </td>
                    {pv.colTotals.map((c, j) => (
                      <td
                        key={pv.colKeys[j]}
                        className="px-3 py-2 text-right border border-[#334155] text-[var(--color-accent)]"
                      >
                        {formatAgg(fn, valueCol, c)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right border border-[#334155] text-[var(--color-accent)] font-bold">
                      {formatAgg(fn, valueCol, pv.grand)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-[#475569] mt-3 leading-relaxed max-w-[720px]">
              Each cell is {AGG_LABELS[fn].toLowerCase()}
              {fn === "count" ? "" : ` of ${valueCol}`} over the transactions matching that
              region and product pair.
              {fn === "mean" &&
                " Careful with the margins: the row total is the mean over ALL of that region's rows, which is not the same as averaging the two cell means when group sizes differ."}
              {fn === "sum" &&
                " The margins simply add up: each row total is the sum of its cells, and both margins meet at the same grand total."}
              {fn === "count" &&
                ` The margins add up to ${TRANSACTIONS.length}, the number of raw transactions, because every row lands in exactly one cell.`}
            </p>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
