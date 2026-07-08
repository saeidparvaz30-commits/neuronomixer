"use client";

import React from "react";
import { motion, LayoutGroup } from "framer-motion";
import { GUIDE_EASE } from "@/lib/guideMotion";
import {
  CITIES,
  YEARS,
  WIDE_TEMPS,
  CITY_COLORS,
  pivotLonger,
  type TableMode,
} from "./types";

const LONG_ROWS = pivotLonger();

type Props = { mode: TableMode };

/**
 * The same 12 temperature values rendered wide (years as columns) or long
 * (one observation per row). Each value cell carries a stable layoutId so
 * framer-motion animates it from its wide cell to its long row and back.
 */
export default function PivotTable({ mode }: Props) {
  return (
    <LayoutGroup id="tidy-pivot">
      {mode === "wide" ? <WideTable /> : <LongTable />}
    </LayoutGroup>
  );
}

function ValueChip({ city, year, value }: { city: string; year: number; value: number }) {
  return (
    <motion.span
      layoutId={`cell-${city}-${year}`}
      transition={{ duration: 0.5, ease: GUIDE_EASE }}
      className="inline-block px-1.5 py-0.5 rounded-md font-mono text-[12px] text-[#f1f5f9]"
      style={{ background: "#1e293b" }}
    >
      {value.toFixed(1)}
    </motion.span>
  );
}

const TH = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]";
const TD = "px-3 py-2 text-[12px] text-[#94a3b8]";

function WideTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" aria-label="Wide table: one row per city, one column per year">
        <thead>
          <tr className="bg-[#1e293b]">
            <th scope="col" className={TH}>
              city
            </th>
            {YEARS.map((y) => (
              <th scope="col" key={y} className={`${TH} text-right`}>
                <span className="text-[var(--color-warning)]">{y}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CITIES.map((city, i) => (
            <tr key={city} style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}>
              <td className={TD}>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ background: CITY_COLORS[city] }}
                    aria-hidden="true"
                  />
                  <span className="text-[#f1f5f9] font-semibold">{city}</span>
                </span>
              </td>
              {YEARS.map((y) => (
                <td key={y} className={`${TD} text-right`}>
                  <ValueChip city={city} year={y} value={WIDE_TEMPS[city][y]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-[#475569] mt-2">
        {CITIES.length} rows, {YEARS.length + 1} columns. The variable
        <span className="text-[var(--color-warning)]"> year</span> is not a column, it is hiding
        in {YEARS.length} column headers.
      </p>
    </div>
  );
}

function LongTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" aria-label="Long table: one row per city and year observation">
        <thead>
          <tr className="bg-[#1e293b]">
            <th scope="col" className={TH}>
              city
            </th>
            <th scope="col" className={TH}>
              year
            </th>
            <th scope="col" className={`${TH} text-right`}>
              temp_c
            </th>
          </tr>
        </thead>
        <tbody>
          {LONG_ROWS.map((r, i) => (
            <tr key={`${r.city}-${r.year}`} style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}>
              <td className={TD}>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ background: CITY_COLORS[r.city] }}
                    aria-hidden="true"
                  />
                  <span className="text-[#f1f5f9]">{r.city}</span>
                </span>
              </td>
              <td className={`${TD} text-[var(--color-success)]`}>{r.year}</td>
              <td className={`${TD} text-right`}>
                <ValueChip city={r.city} year={r.year} value={r.tempC} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-[#475569] mt-2">
        {LONG_ROWS.length} rows, 3 columns. Every variable (city,{" "}
        <span className="text-[var(--color-success)]">year</span>, temp_c) is a column and every
        row is exactly one observation.
      </p>
    </div>
  );
}
