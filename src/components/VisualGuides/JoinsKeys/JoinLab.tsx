"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import {
  JoinType,
  ALL_JOIN_TYPES,
  JOIN_META,
  CUSTOMERS,
  ORDERS,
  executeJoin,
} from "./types";
import KeyBadge from "./KeyBadge";

type RowFate = "matched" | "null-filled" | "dropped";

type Props = {
  joinType: JoinType;
  onJoinTypeChange: (t: JoinType) => void;
};

function NullCell() {
  return <span className="italic font-mono text-[11px] text-[#475569]">NULL</span>;
}

function FateTag({ fate }: { fate: RowFate }) {
  if (fate === "matched") {
    return (
      <span className="text-[10px] font-semibold text-[var(--color-success)]">
        joins
      </span>
    );
  }
  if (fate === "null-filled") {
    return (
      <span className="text-[10px] font-semibold text-[var(--color-warning)]">
        kept + NULL
      </span>
    );
  }
  return <span className="text-[10px] font-semibold text-[#475569]">dropped</span>;
}

export default function JoinLab({ joinType, onJoinTypeChange }: Props) {
  const { fadeIn } = useGuideMotion();

  const result = useMemo(() => executeJoin(CUSTOMERS, ORDERS, joinType), [joinType]);

  const orderedCustomerIds = useMemo(() => new Set(ORDERS.map((o) => o.customerId)), []);
  const customerIds = useMemo(() => new Set(CUSTOMERS.map((c) => c.id)), []);

  const customerFate = (id: number): RowFate => {
    if (orderedCustomerIds.has(id)) return "matched";
    return joinType === "left" || joinType === "full" ? "null-filled" : "dropped";
  };
  const orderFate = (customerId: number): RowFate => {
    if (customerIds.has(customerId)) return "matched";
    return joinType === "right" || joinType === "full" ? "null-filled" : "dropped";
  };

  const matchedPairs = result.filter((r) => r.customer !== null && r.order !== null).length;
  const nullFilledCustomers = result.filter((r) => r.order === null).length;
  const nullFilledOrders = result.filter((r) => r.customer === null).length;

  const meta = JOIN_META[joinType];

  return (
    <div>
      {/* Join type selector */}
      <div
        className="inline-flex flex-wrap rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1 mb-3"
        role="radiogroup"
        aria-label="Join type"
      >
        {ALL_JOIN_TYPES.map((t) => {
          const isActive = joinType === t;
          return (
            <button
              key={t}
              role="radio"
              aria-checked={isActive}
              onClick={() => onJoinTypeChange(t)}
              className={`relative px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="join-pill"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: "var(--color-accent)" }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">{JOIN_META[t].label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">{meta.description}</p>

      <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto mb-5">
{`SELECT c.id, c.name, c.city, o.order_id, o.item, o.amount
FROM customers c
${meta.sqlKeyword} orders o ON o.customer_id = c.id;`}
      </pre>

      {/* Input tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="rounded-xl border border-[#1e293b] overflow-hidden">
          <div className="px-4 py-2.5 bg-[#1e293b] flex items-center justify-between">
            <p className="text-[12px] font-semibold text-white">customers</p>
            <span className="text-[11px] text-[#94a3b8] font-mono">
              {CUSTOMERS.length} rows
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#1e293b] text-left">
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                    id <span className="text-[var(--color-accent)]">(PK)</span>
                  </th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                    name
                  </th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                    city
                  </th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                    fate
                  </th>
                </tr>
              </thead>
              <tbody>
                {CUSTOMERS.map((c, i) => {
                  const fate = customerFate(c.id);
                  return (
                    <tr
                      key={c.rowId}
                      className="transition-opacity duration-300"
                      style={{
                        background: i % 2 === 0 ? "#0f172a" : "#162032",
                        opacity: fate === "dropped" ? 0.4 : 1,
                      }}
                    >
                      <td className="px-3 py-2">
                        <KeyBadge value={c.id} />
                      </td>
                      <td className="px-3 py-2 text-[#f1f5f9]">{c.name}</td>
                      <td className="px-3 py-2 text-[#94a3b8]">{c.city}</td>
                      <td className="px-3 py-2">
                        <FateTag fate={fate} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-[#1e293b] overflow-hidden">
          <div className="px-4 py-2.5 bg-[#1e293b] flex items-center justify-between">
            <p className="text-[12px] font-semibold text-white">orders</p>
            <span className="text-[11px] text-[#94a3b8] font-mono">{ORDERS.length} rows</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#1e293b] text-left">
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                    order_id <span className="text-[var(--color-accent)]">(PK)</span>
                  </th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                    customer_id <span className="text-[var(--color-accent)]">(FK)</span>
                  </th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                    item
                  </th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                    fate
                  </th>
                </tr>
              </thead>
              <tbody>
                {ORDERS.map((o, i) => {
                  const fate = orderFate(o.customerId);
                  return (
                    <tr
                      key={o.rowId}
                      className="transition-opacity duration-300"
                      style={{
                        background: i % 2 === 0 ? "#0f172a" : "#162032",
                        opacity: fate === "dropped" ? 0.4 : 1,
                      }}
                    >
                      <td className="px-3 py-2 font-mono text-[#f1f5f9]">{o.orderId}</td>
                      <td className="px-3 py-2">
                        <KeyBadge value={o.customerId} orphan={!customerIds.has(o.customerId)} />
                      </td>
                      <td className="px-3 py-2 text-[#94a3b8]">{o.item}</td>
                      <td className="px-3 py-2">
                        <FateTag fate={fate} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row count readout */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">customers in</p>
          <p className="text-2xl font-black font-mono text-[#f1f5f9]">{CUSTOMERS.length}</p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">orders in</p>
          <p className="text-2xl font-black font-mono text-[#f1f5f9]">{ORDERS.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-accent)]/40 p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">result rows out</p>
          <p className="text-2xl font-black font-mono text-[var(--color-accent)]">
            {result.length}
          </p>
        </div>
      </div>
      <p className="text-[11px] text-[#475569] mb-4" aria-live="polite">
        {matchedPairs} matched pair{matchedPairs === 1 ? "" : "s"}
        {nullFilledCustomers > 0 &&
          ` + ${nullFilledCustomers} customer${nullFilledCustomers === 1 ? "" : "s"} kept with NULL orders`}
        {nullFilledOrders > 0 &&
          ` + ${nullFilledOrders} order${nullFilledOrders === 1 ? "" : "s"} kept with NULL customer`}
        {" = "}
        {result.length} rows.
      </p>

      {/* Result table */}
      <div className="rounded-xl border border-[#1e293b] overflow-hidden">
        <div className="px-4 py-2.5 bg-[#1e293b] flex items-center justify-between">
          <p className="text-[12px] font-semibold text-white">
            result: customers {meta.sqlKeyword} orders
          </p>
          <span className="text-[11px] text-[#94a3b8] font-mono">{result.length} rows</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#1e293b] text-left">
                {["id", "name", "city", "order_id", "item", "amount"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {result.map((r, i) => (
                  <motion.tr
                    key={r.id}
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
                  >
                    <td className="px-3 py-2">
                      {r.customer ? <KeyBadge value={r.customer.id} /> : <NullCell />}
                    </td>
                    <td className="px-3 py-2 text-[#f1f5f9]">
                      {r.customer ? r.customer.name : <NullCell />}
                    </td>
                    <td className="px-3 py-2 text-[#94a3b8]">
                      {r.customer ? r.customer.city : <NullCell />}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#f1f5f9]">
                      {r.order ? r.order.orderId : <NullCell />}
                    </td>
                    <td className="px-3 py-2 text-[#94a3b8]">
                      {r.order ? r.order.item : <NullCell />}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#94a3b8]">
                      {r.order ? `$${r.order.amount}` : <NullCell />}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
