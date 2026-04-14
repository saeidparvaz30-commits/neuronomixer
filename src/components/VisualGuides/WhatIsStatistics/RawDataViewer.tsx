"use client";

import React from "react";
import type { Scenario } from "./types";

interface Props {
  scenario: Scenario;
}

// ── Deterministic dataset generation (seeded) ────────────────────────────────

function seededRandom(seed: number) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeProductLaunchData() {
  const rng = seededRandom(42);
  return Array.from({ length: 200 }, (_, i) => {
    const isMobile = rng() > 0.5;
    // Mobile users adopt at 65%, Desktop at 25%
    const adoptThresh = isMobile ? 0.35 : 0.75;
    return {
      userId: `U${String(i + 1).padStart(4, "0")}`,
      device: isMobile ? "Mobile" : "Desktop",
      trafficSource: ["Organic", "Paid", "Referral"][Math.floor(rng() * 3)],
      tenure: Math.floor(rng() * 52),
      adopted: rng() > adoptThresh ? "Yes" : "No",
    };
  });
}

function makeLoanDefaultData() {
  const rng = seededRandom(7);
  const rows = [];
  // Group A: 50 High-income (85% not default), 50 Low-income (30% not default)
  for (let i = 0; i < 50; i++) {
    rows.push({ loanId: `L${String(i + 1).padStart(4, "0")}`, groupId: "A", income: "High", defaulted: rng() > 0.85 ? "Yes" : "No" });
  }
  for (let i = 50; i < 100; i++) {
    rows.push({ loanId: `L${String(i + 1).padStart(4, "0")}`, groupId: "A", income: "Low", defaulted: rng() > 0.30 ? "Yes" : "No" });
  }
  // Group B: 80 High-income, 20 Low-income
  for (let i = 100; i < 180; i++) {
    rows.push({ loanId: `L${String(i + 1).padStart(4, "0")}`, groupId: "B", income: "High", defaulted: rng() > 0.88 ? "Yes" : "No" });
  }
  for (let i = 180; i < 200; i++) {
    rows.push({ loanId: `L${String(i + 1).padStart(4, "0")}`, groupId: "B", income: "Low", defaulted: rng() > 0.32 ? "Yes" : "No" });
  }
  return rows;
}

function makeClinicalTrialData() {
  const rng = seededRandom(99);
  const rows = [];
  for (let i = 0; i < 30; i++) {
    const before = 40 + Math.floor(rng() * 40);
    // Treated: mean improvement ~8, SD ~15
    const change = Math.round((rng() - 0.47) * 30 + 8);
    rows.push({ subjectId: `T${String(i + 1).padStart(3, "0")}`, group: "Treated", scoreBefore: before, scoreAfter: Math.max(0, Math.min(100, before - change)) });
  }
  for (let i = 0; i < 30; i++) {
    const before = 40 + Math.floor(rng() * 40);
    // Control: mean improvement ~2, SD ~14
    const change = Math.round((rng() - 0.47) * 28 + 2);
    rows.push({ subjectId: `C${String(i + 1).padStart(3, "0")}`, group: "Control", scoreBefore: before, scoreAfter: Math.max(0, Math.min(100, before - change)) });
  }
  return rows;
}

const PRODUCT_DATA = makeProductLaunchData();
const LOAN_DATA = makeLoanDefaultData();
const CLINICAL_DATA = makeClinicalTrialData();

// ── Column config per scenario ────────────────────────────────────────────────

const COLUMNS: Record<Scenario, string[]> = {
  product_launch: ["User ID", "Device", "Traffic Source", "Tenure (wks)", "Adopted"],
  loan_default:   ["Loan ID", "Group", "Income Level", "Defaulted"],
  clinical_trial: ["Subject ID", "Group", "Score Before", "Score After"],
};

type Row = Record<string, string | number>;

function getRows(scenario: Scenario): Row[] {
  if (scenario === "product_launch") {
    return PRODUCT_DATA.map((r) => ({
      "User ID": r.userId,
      "Device": r.device,
      "Traffic Source": r.trafficSource,
      "Tenure (wks)": r.tenure,
      "Adopted": r.adopted,
    }));
  }
  if (scenario === "loan_default") {
    return LOAN_DATA.map((r) => ({
      "Loan ID": r.loanId,
      "Group": r.groupId,
      "Income Level": r.income,
      "Defaulted": r.defaulted,
    }));
  }
  return CLINICAL_DATA.map((r) => ({
    "Subject ID": r.subjectId,
    "Group": r.group,
    "Score Before": r.scoreBefore,
    "Score After": r.scoreAfter,
  }));
}

export default function RawDataViewer({ scenario }: Props) {
  const cols = COLUMNS[scenario];
  const allRows = getRows(scenario);

  return (
    <div className="rounded-xl border border-[#1e293b] overflow-hidden">
      <div className="overflow-x-auto overflow-y-auto max-h-[260px]">
        <table
          role="table"
          aria-label={`Raw data for ${scenario.replace(/_/g, " ")}`}
          className="w-full text-[12px]"
        >
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-[#1e293b] bg-[#0a0e1a]">
              {cols.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-semibold text-[#94a3b8] uppercase tracking-wide text-[10px] whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allRows.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-[#1e293b]/50 ${i % 2 === 0 ? "bg-[#0f172a]" : "bg-[#0a0e1a]/50"}`}
              >
                {cols.map((col) => (
                  <td key={col} className="px-3 py-1.5 text-[#f1f5f9] whitespace-nowrap">
                    {String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-1.5 bg-[#0a0e1a] border-t border-[#1e293b]">
        <span className="text-[10px] text-[#475569]">{allRows.length} rows · scroll to explore</span>
      </div>
    </div>
  );
}
