"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import {
  TRANSACTIONS,
  GROUP_COLORS,
  AGG_LABELS,
  groupRows,
  applyAgg,
  aggregate,
  formatAgg,
  measureLabel,
  type GroupCol,
  type AggFn,
  type ValueCol,
  type Txn,
} from "./types";

type Phase = "table" | "split" | "combined";

const AGG_FNS: readonly AggFn[] = ["count", "sum", "mean", "min", "max"];

const RADIO_BTN =
  "px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]";

function radioClass(active: boolean): string {
  return `${RADIO_BTN} ${
    active
      ? "bg-[var(--color-accent)] text-[#0a0e1a]"
      : "bg-[#1e293b] text-[#94a3b8] hover:text-white"
  }`;
}

function GroupChip({ col, value }: { col: GroupCol; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: GROUP_COLORS[col][value] }}
        aria-hidden="true"
      />
      <span className="text-[#f1f5f9]">{value}</span>
    </span>
  );
}

function TxnRow({
  txn,
  groupCol,
  index,
  compact,
}: {
  txn: Txn;
  groupCol: GroupCol;
  index: number;
  compact?: boolean;
}) {
  const color = GROUP_COLORS[groupCol][txn[groupCol]];
  return (
    <motion.div
      layout
      layoutId={`txn-${txn.id}`}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`grid items-center text-[12px] font-mono ${
        compact
          ? "grid-cols-[2rem_1fr_1fr_3rem_4.5rem] px-2 py-1"
          : "grid-cols-[2.5rem_1fr_1fr_3.5rem_5rem] px-3 py-1.5"
      }`}
      style={{
        background: index % 2 === 0 ? "#0f172a" : "#162032",
        borderLeft: `3px solid ${color}`,
      }}
    >
      <span className="text-[#475569]">{txn.id}</span>
      <span>
        {groupCol === "region" ? (
          <GroupChip col="region" value={txn.region} />
        ) : (
          <span className="text-[#94a3b8]">{txn.region}</span>
        )}
      </span>
      <span>
        {groupCol === "product" ? (
          <GroupChip col="product" value={txn.product} />
        ) : (
          <span className="text-[#94a3b8]">{txn.product}</span>
        )}
      </span>
      <span className="text-[#94a3b8] text-right">{txn.units}</span>
      <span className="text-[#f1f5f9] text-right">${txn.revenue.toFixed(2)}</span>
    </motion.div>
  );
}

interface Props {
  /** Fires whenever a combine is showing for a group column (live regroup included). */
  onCombine: (col: GroupCol) => void;
  combinedCols: ReadonlySet<GroupCol>;
}

export default function SplitApplyLab({ onCombine, combinedCols }: Props) {
  const { fadeIn, pop } = useGuideMotion();
  const [groupCol, setGroupCol] = useState<GroupCol>("region");
  const [fn, setFn] = useState<AggFn>("sum");
  const [valueCol, setValueCol] = useState<ValueCol>("revenue");
  const [phase, setPhase] = useState<Phase>("table");

  const buckets = useMemo(() => groupRows(TRANSACTIONS, groupCol), [groupCol]);
  const result = useMemo(
    () => aggregate(TRANSACTIONS, groupCol, fn, valueCol),
    [groupCol, fn, valueCol]
  );

  useEffect(() => {
    if (phase === "combined") onCombine(groupCol);
  }, [phase, groupCol, onCombine]);

  const measureText =
    fn === "count" ? "count of transactions" : measureLabel(fn, valueCol);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#475569] uppercase tracking-wide">Group by</span>
          <div role="radiogroup" aria-label="Grouping column" className="flex gap-1.5">
            {(["region", "product"] as const).map((c) => (
              <button
                key={c}
                role="radio"
                aria-checked={groupCol === c}
                onClick={() => setGroupCol(c)}
                className={radioClass(groupCol === c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#475569] uppercase tracking-wide">Aggregate</span>
          <div role="radiogroup" aria-label="Aggregate function" className="flex flex-wrap gap-1.5">
            {AGG_FNS.map((f) => (
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
          <span className="text-[11px] text-[#475569] uppercase tracking-wide">Of column</span>
          <div role="radiogroup" aria-label="Value column to aggregate" className="flex gap-1.5">
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
          {fn === "count" && (
            <span className="text-[10px] text-[#475569]">count ignores the value column</span>
          )}
        </div>
      </div>

      {/* Phase actions */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {phase === "table" && (
          <button
            onClick={() => setPhase("split")}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            1. Split into groups
          </button>
        )}
        {phase === "split" && (
          <button
            onClick={() => setPhase("combined")}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            2. Apply {AGG_LABELS[fn].toLowerCase()} and combine
          </button>
        )}
        {phase !== "table" && (
          <button
            onClick={() => setPhase("table")}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            Back to raw table
          </button>
        )}
        <span className="text-[11px] text-[#475569]">
          {phase === "table" && `${TRANSACTIONS.length} raw rows, colored by ${groupCol}`}
          {phase === "split" &&
            `${TRANSACTIONS.length} rows split into ${buckets.length} buckets by ${groupCol}. Switch the grouping column to regroup live.`}
          {phase === "combined" &&
            `${TRANSACTIONS.length} rows in, ${result.length} rows out: one ${measureText} per ${groupCol}`}
        </span>
      </div>

      {/* Stage */}
      {phase === "table" && (
        <div className="rounded-xl border border-[#1e293b] overflow-hidden max-w-[560px]">
          <div className="grid grid-cols-[2.5rem_1fr_1fr_3.5rem_5rem] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8] bg-[#1e293b]">
            <span>id</span>
            <span>region</span>
            <span>product</span>
            <span className="text-right">units</span>
            <span className="text-right">revenue</span>
          </div>
          {TRANSACTIONS.map((t, i) => (
            <TxnRow key={t.id} txn={t} groupCol={groupCol} index={i} />
          ))}
        </div>
      )}

      {(phase === "split" || phase === "combined") && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {buckets.map((b) => {
            const color = GROUP_COLORS[groupCol][b.key];
            return (
              <div
                key={b.key}
                className="rounded-xl border border-[#1e293b] overflow-hidden"
              >
                <div
                  className="flex items-center justify-between px-3 py-2 bg-[#1e293b]"
                  style={{ borderTop: `3px solid ${color}` }}
                >
                  <span className="text-[12px] font-semibold text-white flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: color }}
                      aria-hidden="true"
                    />
                    {groupCol} = {b.key}
                  </span>
                  <span className="text-[10px] text-[#94a3b8]">
                    {b.rows.length} row{b.rows.length === 1 ? "" : "s"}
                  </span>
                </div>
                {phase === "split" ? (
                  <div>
                    {b.rows.map((t, i) => (
                      <TxnRow key={t.id} txn={t} groupCol={groupCol} index={i} compact />
                    ))}
                  </div>
                ) : (
                  <motion.div
                    variants={pop}
                    initial="hidden"
                    animate="visible"
                    className="px-3 py-4 flex items-baseline justify-between"
                    style={{ background: "#0f172a" }}
                  >
                    <span className="text-[11px] text-[#475569]">
                      {AGG_LABELS[fn].toLowerCase()}
                      {fn === "count" ? "" : ` of ${valueCol}`} over {b.rows.length} row
                      {b.rows.length === 1 ? "" : "s"}
                    </span>
                    <span className="text-xl font-black font-mono" style={{ color }}>
                      {formatAgg(fn, valueCol, applyAgg(b.rows, fn, valueCol))}
                    </span>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Combined result table */}
      <AnimatePresence>
        {phase === "combined" && (
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="mt-5"
          >
            <p className="text-[12px] font-semibold text-white mb-2">
              The combined result: a brand new table
            </p>
            <div className="rounded-xl border border-[#1e293b] overflow-hidden max-w-[400px]">
              <div className="grid grid-cols-[1fr_1fr] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8] bg-[#1e293b]">
                <span>{groupCol}</span>
                <span className="text-right">
                  {fn === "count" ? "count" : `${AGG_LABELS[fn].toLowerCase()}(${valueCol})`}
                </span>
              </div>
              {result.map((r, i) => (
                <div
                  key={r.key}
                  className="grid grid-cols-[1fr_1fr] items-center px-3 py-1.5 text-[12px] font-mono"
                  style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
                >
                  <GroupChip col={groupCol} value={r.key} />
                  <span className="text-right text-[#f1f5f9]">
                    {formatAgg(fn, valueCol, r.value)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#475569] mt-2">
              Each output row summarizes {result.map((r) => r.n).join(" + ")} ={" "}
              {result.reduce((a, r) => a + r.n, 0)} input rows. No raw row survives; only the
              group keys and their summaries do.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gate hint */}
      <p className="text-[11px] text-[#475569] mt-4">
        Progress: you have combined by{" "}
        {combinedCols.size === 0
          ? "nothing yet. Run the split and combine for both region and product."
          : `${[...combinedCols].join(" and ")}${
              combinedCols.size < 2
                ? ". Now switch the grouping column and combine again."
                : ". Both single-level groupings done."
            }`}
      </p>
    </div>
  );
}
