"use client";

import React, { useState } from "react";
import { BATCHES, CellValue, COLUMNS, CUSTOMERS, formatCell } from "./types";

/**
 * Section 1: the data dictionary (the contract) and the three raw batches.
 * The defects are visible here if you read the cells against the contract;
 * nothing marks them for you. That is the point.
 */

function cellClass(v: CellValue): string {
  return v === null ? "text-[#475569] italic" : "text-[#f1f5f9]";
}

export default function DataContract() {
  const [activeDay, setActiveDay] = useState(1);
  const batch = BATCHES.find((b) => b.day === activeDay)!;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Data dictionary + reference table */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
            Data dictionary: the orders contract
          </p>
          <div className="flex flex-col gap-2.5">
            {COLUMNS.map((c) => (
              <div key={c.id} className="rounded-xl border border-[#1e293b] p-3">
                <p className="text-[12px] font-mono font-semibold text-[#93c5fd] mb-0.5">
                  {c.id}{" "}
                  <span className="text-[#475569] font-normal">: {c.declaredType}</span>
                </p>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed">{c.contract}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
            Customers reference table
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CUSTOMERS.map((c) => (
              <span
                key={c.id}
                className="px-2 py-1 rounded-lg border border-[#1e293b] text-[11px] font-mono text-[#94a3b8]"
              >
                {c.id}{" "}
                <span className="text-[#475569]">{c.name}</span>
              </span>
            ))}
          </div>
          <p className="text-[10px] text-[#475569] mt-3 leading-relaxed">
            These {CUSTOMERS.length} ids are the only customers that exist. A
            relationship rule checks incoming customer_id values against this
            table.
          </p>
        </div>
      </div>

      {/* Batch inspector */}
      <div className="lg:col-span-3 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <p className="text-[13px] font-semibold text-white">
            The raw batches, exactly as they will arrive
          </p>
          <div role="radiogroup" aria-label="Batch to inspect" className="flex gap-1.5">
            {BATCHES.map((b) => (
              <button
                key={b.day}
                role="radio"
                aria-checked={activeDay === b.day}
                onClick={() => setActiveDay(b.day)}
                className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  activeDay === b.day
                    ? "border-[var(--color-accent)] text-white bg-[#1e293b]"
                    : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155]"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px] font-mono">
            <thead>
              <tr className="bg-[#1e293b]">
                {COLUMNS.map((c) => (
                  <th
                    key={c.id}
                    scope="col"
                    className="text-left px-3 py-2 text-[11px] font-semibold text-[#94a3b8]"
                  >
                    {c.id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batch.rows.map((r, i) => (
                <tr key={r.rowId} style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}>
                  <td className={`px-3 py-2 ${cellClass(r.order_id)}`}>{formatCell(r.order_id)}</td>
                  <td className={`px-3 py-2 ${cellClass(r.customer_id)}`}>{formatCell(r.customer_id)}</td>
                  <td className={`px-3 py-2 ${cellClass(r.amount)}`}>{formatCell(r.amount)}</td>
                  <td className={`px-3 py-2 ${cellClass(r.quantity)}`}>{formatCell(r.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-[#475569] mt-3 leading-relaxed">
          Read each batch against the dictionary on the left. Some cells break
          the contract: a value with the wrong type, a number outside its range,
          a missing key, a replayed order, an id no reference table has heard
          of. Nothing here is highlighted for you, because nothing will be
          highlighted in production either. The rules you write in section 2 are
          what does the noticing.
        </p>
      </div>
    </div>
  );
}
