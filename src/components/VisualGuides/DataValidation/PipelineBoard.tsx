"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import RevenueChart from "./RevenueChart";
import {
  BATCHES,
  formatCell,
  RuleConfig,
  ruleLabel,
  RunResult,
  RowVerdict,
  TOTAL_ROWS,
} from "./types";

interface Props {
  run: RunResult | null;
  /** Snapshot of the rules the current run was evaluated with. */
  rulesUsed: readonly RuleConfig[];
  /** 0..9; each batch takes 3 steps: arrive, validate, load. */
  step: number;
  running: boolean;
  finished: boolean;
  enabledRuleCount: number;
  onRun: () => void;
}

const PHASE_LABEL = ["Queued", "Arriving", "In the gate", "Processed"] as const;

function clampPhase(step: number, batchIndex: number): number {
  return Math.max(0, Math.min(3, step - batchIndex * 3));
}

export default function PipelineBoard({
  run,
  rulesUsed,
  step,
  running,
  finished,
  enabledRuleCount,
  onRun,
}: Props) {
  const { pop, fadeIn } = useGuideMotion();

  const phases = BATCHES.map((_, i) => (run ? clampPhase(step, i) : 0));

  const quarantined: RowVerdict[] = run
    ? run.batches
        .filter((_, i) => phases[i] >= 2)
        .flatMap((b) => b.verdicts.filter((v) => v.caught))
    : [];

  const loaded: RowVerdict[] = run
    ? run.batches
        .filter((_, i) => phases[i] >= 3)
        .flatMap((b) => b.verdicts.filter((v) => !v.caught))
    : [];

  const loadedDays = BATCHES.filter((_, i) => phases[i] >= 3).map((b) => b.day);
  const escapedSoFar = loaded.filter((v) => v.row.defect !== null).length;

  // The batch currently sitting in the validation gate (or the last one processed).
  const gateIndex = run
    ? phases.reduce((best, p, i) => (p >= 1 ? i : best), -1)
    : -1;
  const gateBatch = gateIndex >= 0 ? run!.batches[gateIndex] : null;
  const gateColored = gateIndex >= 0 && phases[gateIndex] >= 2;

  const labelForRuleId = (id: string) => {
    const rule = rulesUsed.find((r) => r.id === id);
    return rule ? ruleLabel(rule) : id;
  };

  const summaryText = run && finished
    ? `Run complete: ${TOTAL_ROWS} rows arrived, ${run.quarantinedCount} were quarantined by the rules, ${run.loadedCount} were loaded. ${run.caughtDefective} defective rows were caught, ${run.escapedDefective} escaped into the warehouse, and ${run.falseAlarms} valid rows were quarantined by mistake.`
    : "";

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      {/* Header: run control + live counters */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <button
          onClick={onRun}
          disabled={running}
          className="px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {running ? "Running..." : run ? "Re-run the pipeline" : "Run the pipeline"}
        </button>
        <div className="flex items-center gap-2 flex-wrap" aria-live="off">
          <span className="px-2.5 py-1 rounded-lg border border-[#334155] text-[11px] font-mono text-[#94a3b8]">
            Caught: <span className="text-[var(--color-success)] font-bold">{quarantined.length}</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg border border-[#334155] text-[11px] font-mono text-[#94a3b8]">
            Escaped: <span className={`font-bold ${escapedSoFar > 0 ? "text-[#ef4444]" : "text-[var(--color-success)]"}`}>{escapedSoFar}</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg border border-[#334155] text-[11px] font-mono text-[#94a3b8]">
            Loaded: <span className="text-[#f1f5f9] font-bold">{loaded.length}</span>
          </span>
        </div>
      </div>
      <p className="text-[10px] text-[#475569] mb-4 leading-relaxed">
        Each run rebuilds the warehouse from scratch with your current rule
        set, like a scheduled pipeline job. Caught means a defective row was
        quarantined; escaped means a defective row passed every enabled rule.
      </p>

      {/* Three stages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stage 1: extract */}
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
            Stage 1 · Extract
          </p>
          <div className="flex flex-col gap-2">
            {BATCHES.map((b, i) => {
              const phase = phases[i];
              const active = phase >= 1 && phase < 3;
              return (
                <div
                  key={b.day}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                    active
                      ? "border-[var(--color-accent)]"
                      : phase >= 3
                        ? "border-[#334155]"
                        : "border-[#1e293b]"
                  }`}
                >
                  <span className="text-[11px] font-mono text-[#f1f5f9]">
                    {b.label} · {b.rows.length} rows
                  </span>
                  <span
                    className={`text-[10px] font-semibold ${
                      phase >= 3
                        ? "text-[var(--color-success)]"
                        : active
                          ? "text-[var(--color-accent)]"
                          : "text-[#475569]"
                    }`}
                  >
                    {run ? PHASE_LABEL[phase] : "Queued"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-[#475569] mt-3 leading-relaxed">
            The three fixture batches from section 1, replayed in order.
          </p>
        </div>

        {/* Stage 2: validate */}
        <div
          className={`rounded-xl border p-4 transition-colors ${
            running && gateBatch ? "border-[var(--color-accent)]" : "border-[#1e293b]"
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-1">
            Stage 2 · Validation gate
          </p>
          <p className="text-[10px] text-[#475569] mb-3">
            {enabledRuleCount} rule{enabledRuleCount === 1 ? "" : "s"} armed
          </p>
          {gateBatch ? (
            <div>
              <p className="text-[11px] font-mono text-[#94a3b8] mb-2">
                Day {gateBatch.day} in the gate:
              </p>
              <div className="flex flex-wrap gap-1.5" aria-hidden="true">
                <AnimatePresence initial={false}>
                  {gateBatch.verdicts.map((v) => (
                    <motion.span
                      key={v.row.rowId}
                      variants={pop}
                      initial="hidden"
                      animate="visible"
                      className={`px-2 py-1 rounded-md border text-[10px] font-mono ${
                        !gateColored
                          ? "border-[#334155] text-[#94a3b8]"
                          : v.caught
                            ? "border-[#ef4444] text-[#ef4444]"
                            : "border-[var(--color-success)] text-[var(--color-success)]"
                      }`}
                    >
                      {formatCell(v.row.order_id)}
                      {gateColored ? (v.caught ? " ✕" : " ✓") : ""}
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
              <p className="sr-only">
                {gateColored
                  ? `Day ${gateBatch.day}: ${gateBatch.verdicts.filter((v) => v.caught).length} of ${gateBatch.verdicts.length} rows failed a rule and were quarantined.`
                  : `Day ${gateBatch.day} is being checked.`}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-[#475569] leading-relaxed">
              Nothing in the gate yet. Every enabled rule runs against every
              row of each batch; one failed rule is enough to quarantine a row.
            </p>
          )}
        </div>

        {/* Stage 3: load */}
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-1">
            Stage 3 · Warehouse and dashboard
          </p>
          <p className="text-[10px] text-[#475569] mb-3">
            {loaded.length} row{loaded.length === 1 ? "" : "s"} in the warehouse
          </p>
          <RevenueChart loaded={loaded} loadedDays={loadedDays} />
        </div>
      </div>

      {/* Quarantine tray */}
      <div className="mt-4 rounded-xl border border-[#1e293b] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
          Quarantine · {quarantined.length} row{quarantined.length === 1 ? "" : "s"}
        </p>
        {quarantined.length === 0 ? (
          <p className="text-[11px] text-[#475569]">
            Empty. Rows land here when an enabled rule catches them, tagged
            with the rule that fired.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            <AnimatePresence initial={false}>
              {quarantined.map((v) => (
                <motion.li
                  key={v.row.rowId}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                  className="flex items-center gap-2 flex-wrap text-[11px] font-mono"
                >
                  <span className="text-[#f1f5f9]">
                    Day {v.batchDay} · {formatCell(v.row.order_id)}
                  </span>
                  {v.failedRules.map((id) => (
                    <span
                      key={id}
                      className="px-1.5 py-0.5 rounded border border-[#ef4444]/40 text-[10px] text-[#ef4444]"
                    >
                      {labelForRuleId(id)}
                    </span>
                  ))}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* Run summary (also the text alternative for the animation) */}
      <div aria-live="polite">
        {finished && run && (
          <p className="mt-4 text-[12px] leading-relaxed text-[#94a3b8]">
            {summaryText}
            {run.escapedDefective > 0 ? (
              <span className="text-[#ef4444]">
                {" "}
                Look at the dashboard: the escaped rows are now someone
                else&apos;s incident.
              </span>
            ) : run.caughtDefective > 0 ? (
              <span className="text-[var(--color-success)]">
                {" "}
                The chart sits exactly on its defect-free values. That is what
                a guarded pipeline buys you.
              </span>
            ) : null}
          </p>
        )}
      </div>
    </div>
  );
}
