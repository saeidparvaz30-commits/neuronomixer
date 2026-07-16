"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import {
  ColumnId,
  defaultRangeFor,
  makeRuleId,
  RuleConfig,
  RuleKind,
  ruleLabel,
  RULE_KINDS,
} from "./types";

interface Props {
  rules: readonly RuleConfig[];
  onAdd: (rule: RuleConfig) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  disabled: boolean;
}

export default function RuleBuilder({ rules, onAdd, onToggle, onRemove, disabled }: Props) {
  const { pop } = useGuideMotion();
  const [kind, setKind] = useState<RuleKind>("type");
  const [column, setColumn] = useState<ColumnId>("amount");
  const [min, setMin] = useState<number>(defaultRangeFor("amount").min);
  const [max, setMax] = useState<number>(defaultRangeFor("amount").max);

  const kindMeta = RULE_KINDS.find((k) => k.kind === kind)!;
  const validColumns = kindMeta.columns;
  const effectiveColumn: ColumnId = validColumns.includes(column) ? column : validColumns[0];

  const candidateId = makeRuleId(kind, effectiveColumn);
  const alreadyAdded = rules.some((r) => r.id === candidateId);
  const rangeInvalid = kind === "range" && min > max;

  const handleKind = (k: RuleKind) => {
    setKind(k);
    const meta = RULE_KINDS.find((m) => m.kind === k)!;
    const col = meta.columns.includes(column) ? column : meta.columns[0];
    setColumn(col);
    if (k === "range") {
      const d = defaultRangeFor(col);
      setMin(d.min);
      setMax(d.max);
    }
  };

  const handleColumn = (c: ColumnId) => {
    setColumn(c);
    if (kind === "range") {
      const d = defaultRangeFor(c);
      setMin(d.min);
      setMax(d.max);
    }
  };

  const handleAdd = () => {
    if (alreadyAdded || rangeInvalid || disabled) return;
    onAdd({
      id: candidateId,
      kind,
      column: effectiveColumn,
      ...(kind === "range" ? { min, max } : {}),
      enabled: true,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Builder */}
      <div className="lg:col-span-2 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
          Rule builder
        </p>

        <div role="radiogroup" aria-label="Rule type" className="flex flex-wrap gap-1.5 mb-3">
          {RULE_KINDS.map((k) => (
            <button
              key={k.kind}
              role="radio"
              aria-checked={kind === k.kind}
              onClick={() => handleKind(k.kind)}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                kind === k.kind
                  ? "border-[var(--color-accent)] text-white bg-[#1e293b]"
                  : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155]"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-[#475569] leading-relaxed mb-4">{kindMeta.hint}</p>

        <label className="block mb-3">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8] mb-1">
            Column
          </span>
          <select
            value={effectiveColumn}
            onChange={(e) => handleColumn(e.target.value as ColumnId)}
            className="w-full rounded-lg border border-[#334155] bg-[#1e293b] px-3 py-2 text-[12px] font-mono text-[#f1f5f9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            {validColumns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        {kind === "range" && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <label className="block">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8] mb-1">
                Min
              </span>
              <input
                type="number"
                value={min}
                onChange={(e) => setMin(Number(e.target.value))}
                aria-label={`Minimum allowed value for ${effectiveColumn}`}
                className="w-full rounded-lg border border-[#334155] bg-[#1e293b] px-3 py-2 text-[12px] font-mono text-[#f1f5f9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              />
            </label>
            <label className="block">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8] mb-1">
                Max
              </span>
              <input
                type="number"
                value={max}
                onChange={(e) => setMax(Number(e.target.value))}
                aria-label={`Maximum allowed value for ${effectiveColumn}`}
                className="w-full rounded-lg border border-[#334155] bg-[#1e293b] px-3 py-2 text-[12px] font-mono text-[#f1f5f9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              />
            </label>
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={alreadyAdded || rangeInvalid || disabled}
          className="w-full px-4 py-2 rounded-xl text-[12px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Add rule to the gate
        </button>
        {alreadyAdded && (
          <p className="text-[10px] text-[var(--color-warning)] mt-2">
            That rule is already in the gate. Toggle or remove it in the list.
          </p>
        )}
        {rangeInvalid && (
          <p className="text-[10px] text-[#ef4444] mt-2">Min must not exceed max.</p>
        )}
      </div>

      {/* Active rule set */}
      <div className="lg:col-span-3 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8]">
            Your schema: {rules.length} rule{rules.length === 1 ? "" : "s"},{" "}
            {rules.filter((r) => r.enabled).length} enabled
          </p>
        </div>

        {rules.length === 0 ? (
          <p className="text-[12px] text-[#475569] leading-relaxed">
            No rules yet. The gate is wide open: every row, valid or not, will
            sail straight into the warehouse. Run the pipeline once like this to
            see what that costs, then come back and write the contract down as
            rules.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {rules.map((r) => (
                <motion.li
                  key={r.id}
                  variants={pop}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                    r.enabled ? "border-[#334155]" : "border-[#1e293b] opacity-70"
                  }`}
                >
                  <span
                    className={`text-[12px] font-mono ${
                      r.enabled ? "text-[#93c5fd]" : "text-[#475569] line-through"
                    }`}
                  >
                    {ruleLabel(r)}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onToggle(r.id)}
                      disabled={disabled}
                      aria-pressed={r.enabled}
                      aria-label={`${ruleLabel(r)}: turn ${r.enabled ? "off" : "on"}`}
                      className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-40 ${
                        r.enabled
                          ? "border-[var(--color-success)] text-[var(--color-success)]"
                          : "border-[#334155] text-[#94a3b8]"
                      }`}
                    >
                      {r.enabled ? "ON" : "OFF"}
                    </button>
                    <button
                      onClick={() => onRemove(r.id)}
                      disabled={disabled}
                      aria-label={`Remove rule ${ruleLabel(r)}`}
                      className="px-2 py-1 rounded-lg border border-[#1e293b] text-[10px] font-semibold text-[#475569] hover:border-[#ef4444] hover:text-[#ef4444] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-40"
                    >
                      ✕
                    </button>
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}

        <p className="text-[10px] text-[#475569] mt-4 leading-relaxed">
          This is how pipeline testing tools like dbt think about quality: each
          expectation from the data dictionary becomes one small executable
          test, and the set of tests is the schema. The OFF switch exists
          because the most common failure in real teams is not a missing rule;
          it is a rule someone silenced during an incident and never turned
          back on.
        </p>
      </div>
    </div>
  );
}
