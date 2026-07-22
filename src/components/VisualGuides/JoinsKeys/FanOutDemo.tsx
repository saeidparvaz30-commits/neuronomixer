"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import { CUSTOMERS, ORDERS, buildFanCustomers, executeJoin } from "./types";
import KeyBadge from "./KeyBadge";

const COPY_OPTIONS = [1, 2, 3, 4] as const;

type Props = {
  copies: number;
  onCopiesChange: (n: number) => void;
  acked: boolean;
  onAck: (snapshot: { copies: number; total: number }) => void;
};

export default function FanOutDemo({ copies, onCopiesChange, acked, onAck }: Props) {
  const { fadeIn } = useGuideMotion();

  const fanCustomers = useMemo(() => buildFanCustomers(copies), [copies]);
  const result = useMemo(() => executeJoin(fanCustomers, ORDERS, "inner"), [fanCustomers]);
  const baseline = useMemo(() => executeJoin(CUSTOMERS, ORDERS, "inner").length, []);

  const ordersForKey1 = useMemo(
    () => ORDERS.filter((o) => o.customerId === 1).length,
    []
  );
  const rowsForKey1 = result.filter((r) => r.customer !== null && r.customer.id === 1).length;
  const delta = result.length - baseline;
  const exceedsBothInputs =
    result.length > fanCustomers.length && result.length > ORDERS.length;

  return (
    <div>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
        A join key only works because the primary key side is unique. Break that promise
        and the arithmetic changes: for each key value, the join produces every
        combination of matching rows, so the row count for that key is left-side count
        times right-side count. Add copies of Alice&apos;s row (customer id 1) and watch
        the inner join below re-execute.
      </p>

      {/* Copies selector */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-[12px] font-semibold text-white">
          Copies of Alice&apos;s row:
        </span>
        <div
          className="inline-flex rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1"
          role="radiogroup"
          aria-label="Number of copies of customer row with id 1"
        >
          {COPY_OPTIONS.map((n) => {
            const isActive = copies === n;
            return (
              <button
                key={n}
                role="radio"
                aria-checked={isActive}
                onClick={() => onCopiesChange(n)}
                className={`relative px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="fanout-pill"
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: n === 1 ? "var(--color-success)" : "var(--color-warning)",
                    }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{n}</span>
              </button>
            );
          })}
        </div>
        <span className="text-[11px] text-[#475569]">
          {copies === 1 ? "primary key intact" : "primary key broken: id 1 is duplicated"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Broken customers table */}
        <div className="rounded-xl border border-[#1e293b] overflow-hidden self-start">
          <div className="px-4 py-2.5 bg-[#1e293b] flex items-center justify-between">
            <p className="text-[12px] font-semibold text-white">customers</p>
            <span className="text-[11px] text-[#94a3b8] font-mono">
              {fanCustomers.length} rows
            </span>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <tbody>
              <AnimatePresence initial={false}>
                {fanCustomers.map((c, i) => {
                  const isDup = c.rowId.startsWith("c1-dup");
                  return (
                    <motion.tr
                      key={c.rowId}
                      variants={fadeIn}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
                    >
                      <td className="px-3 py-2">
                        <KeyBadge value={c.id} />
                      </td>
                      <td className="px-3 py-2 text-[#f1f5f9]">{c.name}</td>
                      <td className="px-3 py-2 text-[#94a3b8]">{c.city}</td>
                      <td className="px-3 py-2">
                        {isDup && (
                          <span className="text-[10px] font-semibold text-[var(--color-warning)]">
                            duplicate
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
          </div>
        </div>

        {/* Readouts */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-[#1e293b] p-4">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-2">
              The multiplication, computed
            </p>
            <p className="text-[13px] font-mono text-[#f1f5f9]">
              <span style={{ color: copies > 1 ? "var(--color-warning)" : "#f1f5f9" }}>
                {copies}
              </span>{" "}
              customer row{copies === 1 ? "" : "s"} with id 1 ×{" "}
              {ordersForKey1} orders with id 1 ={" "}
              <span
                className="font-bold"
                style={{ color: copies > 1 ? "var(--color-warning)" : "#f1f5f9" }}
              >
                {rowsForKey1} joined rows
              </span>{" "}
              for key 1
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Inner join result
              </p>
              <p
                className="text-2xl font-black font-mono"
                style={{ color: copies > 1 ? "var(--color-warning)" : "#f1f5f9" }}
              >
                {result.length} rows
              </p>
              <p className="text-[10px] text-[#475569] mt-1">
                was {baseline} with the key intact
                {delta > 0 ? `, +${delta} phantom rows` : ""}
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Rows for key 1
              </p>
              <p
                className="text-2xl font-black font-mono"
                style={{ color: copies > 1 ? "var(--color-warning)" : "#f1f5f9" }}
              >
                {rowsForKey1}
              </p>
              <p className="text-[10px] text-[#475569] mt-1">
                was {ordersForKey1} with the key intact
              </p>
            </div>
          </div>
          {exceedsBothInputs && (
            <div className="rounded-xl border border-[var(--color-warning)]/40 p-4">
              <p className="text-[11px] text-[var(--color-warning)] leading-relaxed">
                The result now has more rows than either input table ({result.length} out
                of {fanCustomers.length} customers and {ORDERS.length} orders). No data
                was added anywhere. Existing rows were multiplied.
              </p>
            </div>
          )}
          <p className="text-[11px] text-[#475569] leading-relaxed">
            This is fan-out. In production it happens when you join on a column you
            assumed was unique (an email, a date, a product code) and it is not. Every
            duplicate multiplies, and any sum or average computed downstream silently
            inflates. The first thing to check after any join is the row count.
          </p>
          <button
            onClick={() => onAck({ copies, total: result.length })}
            disabled={copies < 2 || acked}
            className={`self-start px-4 py-2 rounded-xl text-sm font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
              acked
                ? "border-[var(--color-success)]/50 text-[var(--color-success)] cursor-default"
                : copies < 2
                  ? "border-[#1e293b] text-[#475569] cursor-not-allowed"
                  : "border-[var(--color-warning)]/60 text-[var(--color-warning)] hover:border-[var(--color-warning)]"
            }`}
          >
            {acked
              ? "Fan-out understood"
              : copies < 2
                ? "Add a duplicate first"
                : "I see it: the join multiplied my rows"}
          </button>
        </div>
      </div>
    </div>
  );
}
