"use client";

import React from "react";
import { FIELDS, FieldName, RULES, RuleId, ruleApplicable } from "./data";

export interface ActiveRule {
  column: FieldName;
  rule: RuleId;
  offenders: number[];
}

interface Props {
  selCol: FieldName;
  selRule: RuleId;
  onSelCol: (c: FieldName) => void;
  onSelRule: (r: RuleId) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  rules: ActiveRule[];
  addNote: string | null;
}

export default function RuleBuilder({
  selCol,
  selRule,
  onSelCol,
  onSelRule,
  onAdd,
  onRemove,
  rules,
  addNote,
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Builder */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-2">
          1. Pick a column
        </p>
        <div
          role="radiogroup"
          aria-label="Column"
          className="flex flex-wrap gap-2 mb-4"
        >
          {FIELDS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={selCol === f}
              onClick={() => onSelCol(f)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-mono font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                selCol === f
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[#0a0e1a]"
                  : "border-[#334155] text-[#94a3b8] hover:text-white hover:border-[#475569]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-2">
          2. Pick a rule
        </p>
        <div role="radiogroup" aria-label="Rule" className="flex flex-col gap-2 mb-4">
          {RULES.map((r) => {
            const applicable = ruleApplicable(selCol, r.id);
            return (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={selRule === r.id}
                disabled={!applicable}
                onClick={() => applicable && onSelRule(r.id)}
                className={`text-left px-3 py-2 rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  !applicable
                    ? "border-[#1e293b] text-[#475569] cursor-not-allowed opacity-60"
                    : selRule === r.id
                      ? "border-[var(--color-accent)] bg-[#d4af37]/10 text-white"
                      : "border-[#334155] text-[#94a3b8] hover:text-white hover:border-[#475569]"
                }`}
              >
                <span className="block text-[12px] font-mono font-semibold">
                  {r.label}
                </span>
                <span className="block text-[10px] mt-0.5">{r.blurb}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Add rule
        </button>
        {addNote && (
          <p className="text-[11px] text-[var(--color-warning)] mt-2" role="status">
            {addNote}
          </p>
        )}
      </div>

      {/* Active rules */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-2">
          3. Your rules (offending rows highlight in the table above)
        </p>
        {rules.length === 0 ? (
          <p className="text-[12px] text-[#475569] leading-relaxed">
            No rules yet. Add one and the table lights up the rows that break it.
            Try not-null on email while fields are blanked out, or unique on email
            while a customer is pasted twice.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rules.map((r) => {
              const key = `${r.column}:${r.rule}`;
              const n = r.offenders.length;
              return (
                <li
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#1e293b] bg-[#0f172a] px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="text-[12px] font-mono text-[#93c5fd] truncate">
                      {r.column} · {r.rule}
                    </code>
                    <span
                      className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        background: n === 0 ? "rgba(34,197,94,0.12)" : "rgba(249,115,22,0.12)",
                        color: n === 0 ? "var(--color-success)" : "var(--color-warning)",
                      }}
                    >
                      {n === 0
                        ? "0 violations"
                        : `${n} ${n === 1 ? "row" : "rows"} flagged`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(key)}
                    aria-label={`Remove rule ${r.column} ${r.rule}`}
                    className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-[#334155] text-[#94a3b8] hover:text-white hover:border-[#475569] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
