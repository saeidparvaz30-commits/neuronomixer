"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DataRow, StageId, ISSUE_META, IssueType } from "./types";

function getDisplayData(stage: StageId): DataRow[] {
  // Base raw data
  const raw: DataRow[] = [
    { id: 1,  name: "Alice",  age: 32, salary: 85000,  dept: "Engineering", issues: [] },
    { id: 2,  name: "Bob",    age: 28, salary: 72000,  dept: "Engineering", issues: [] },
    { id: 3,  name: "Carol",  age: null, salary: 91000, dept: "Marketing",  issues: ["missing"] },
    { id: 4,  name: "Dave",   age: 45, salary: null,   dept: "Sales",       issues: ["missing"] },
    { id: 5,  name: "Eve",    age: 31, salary: 999999, dept: "Engineering", issues: ["outlier"] },
    { id: 6,  name: "Frank",  age: 38, salary: 67000,  dept: "Marketting",  issues: ["type-error"] },
    { id: 7,  name: "Grace",  age: 29, salary: 78000,  dept: "Sales",       issues: [] },
    { id: 8,  name: "Hank",   age: 28, salary: 72000,  dept: "Engineering", issues: ["duplicate"] },
    { id: 9,  name: "Iris",   age: 36, salary: 88000,  dept: "Marketing",   issues: [] },
    { id: 10, name: "Jack",   age: 41, salary: 95000,  dept: "Sales",       issues: [] },
    { id: 11, name: "Karen",  age: 33, salary: 81000,  dept: "Engineering", issues: [] },
    { id: 12, name: "Leo",    age: null, salary: 74000, dept: "Marketing",  issues: ["type-error"] },
  ];

  if (stage === "ingest" || stage === "validate") return raw;

  if (stage === "clean") {
    // Fix missing ages (median=33), drop duplicate id=8, cap outlier, fix typo
    return raw
      .filter(r => r.id !== 8) // remove duplicate
      .map(r => ({
        ...r,
        age: r.age ?? 33,
        salary: r.salary ?? 80000,
        dept: r.dept === "Marketting" ? "Marketing" : r.dept,
        salary_display: r.id === 5 ? 120000 : r.salary ?? 80000,
        issues: [],
      }))
      .map(r => ({ ...r, salary: r.id === 5 ? 120000 : r.salary ?? 80000 }));
  }

  if (stage === "transform") {
    const clean = getDisplayData("clean");
    const salaries = clean.map(r => r.salary ?? 0);
    const meanS = salaries.reduce((a, b) => a + b, 0) / salaries.length;
    const stdS = Math.sqrt(salaries.reduce((a, v) => a + (v - meanS) ** 2, 0) / salaries.length);
    return clean.map(r => ({
      ...r,
      salary: Math.round(((r.salary ?? 0) - meanS) / stdS * 100) / 100,
    }));
  }

  if (stage === "aggregate" || stage === "load") return getDisplayData("clean");

  return raw;
}

interface Props {
  stage: StageId;
}

export default function DataTable({ stage }: Props) {
  const data = getDisplayData(stage);

  if (stage === "aggregate") {
    const clean = getDisplayData("clean");
    const depts = ["Engineering", "Marketing", "Sales"];
    const agg = depts.map(d => {
      const rows = clean.filter(r => r.dept === d);
      const salaries = rows.map(r => r.salary ?? 0);
      const mean = salaries.reduce((a, b) => a + b, 0) / salaries.length;
      return { dept: d, count: rows.length, mean_salary: Math.round(mean), std: Math.round(Math.sqrt(salaries.reduce((a, v) => a + (v - mean) ** 2, 0) / salaries.length)) };
    });

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[#1e293b]">
              {["Department", "Headcount", "Mean Salary", "Std Dev"].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-[#475569] uppercase tracking-[1px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agg.map(r => (
              <tr key={r.dept} className="border-b border-[#1e293b]/50">
                <td className="px-3 py-2 text-white font-medium">{r.dept}</td>
                <td className="px-3 py-2 text-[#3bb4a4]">{r.count}</td>
                <td className="px-3 py-2 text-[#d4af37]">${r.mean_salary.toLocaleString()}</td>
                <td className="px-3 py-2 text-[#94a3b8]">${r.std.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const isTransform = stage === "transform";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-[#1e293b]">
            {["ID", "Name", "Age", isTransform ? "Salary (z)" : "Salary", "Dept", "Issues"].map(h => (
              <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-[#475569] uppercase tracking-[1px]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {data.map(row => {
              const hasIssues = row.issues.length > 0;
              return (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-b border-[#1e293b]/50 hover:bg-[#1e293b]/20 transition-colors"
                >
                  <td className="px-3 py-1.5 text-[#475569]">{row.id}</td>
                  <td className="px-3 py-1.5 text-white font-medium">{row.name}</td>
                  <td className={`px-3 py-1.5 ${row.age === null ? "text-[#f97316]" : "text-[#94a3b8]"}`}>
                    {row.age === null ? "—" : row.age}
                  </td>
                  <td className={`px-3 py-1.5 font-mono text-[10px] ${row.id === 5 && stage !== "clean" && stage !== "transform" ? "text-[#ef4444]" : "text-[#94a3b8]"}`}>
                    {row.salary === null ? "—" : isTransform ? row.salary : `$${(row.salary as number).toLocaleString()}`}
                  </td>
                  <td className={`px-3 py-1.5 ${row.dept === "Marketting" ? "text-[#eab308]" : "text-[#94a3b8]"}`}>
                    {row.dept ?? "—"}
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex flex-wrap gap-1">
                      {row.issues.map((iss: IssueType) => (
                        <span
                          key={iss}
                          className="px-1.5 py-0.5 rounded text-[8px] font-semibold"
                          style={{ background: ISSUE_META[iss].color + "20", color: ISSUE_META[iss].color }}
                        >
                          {ISSUE_META[iss].label}
                        </span>
                      ))}
                      {!hasIssues && <span className="text-[#334155] text-[9px]">✓</span>}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
