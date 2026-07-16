"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  BATCHES,
  evaluateRun,
  RuleConfig,
  RunResult,
  TOTAL_DEFECTS,
  TOTAL_ROWS,
} from "./types";
import DataContract from "./DataContract";
import RuleBuilder from "./RuleBuilder";
import PipelineBoard from "./PipelineBoard";

const GUIDE_TITLE = "Guardrails for Data: Validation Rules";
const GUIDE_SLUG = "data-validation";
const NEXT_GUIDE_SLUG = "data-ethics-privacy";

/** 3 batches x 3 phases (arrive, validate, load). */
const TOTAL_STEPS = 9;

interface RunState {
  result: RunResult;
  rulesUsed: RuleConfig[];
  hadDisabledRule: boolean;
}

export default function DataValidationClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  const [rules, setRules] = useState<RuleConfig[]>([]);
  const [run, setRun] = useState<RunState | null>(null);
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [runCount, setRunCount] = useState(0);

  // Earned states (latched)
  const [brokeChart, setBrokeChart] = useState(false);
  const [cleanRun, setCleanRun] = useState(false);
  const [toggleBreak, setToggleBreak] = useState(false);
  const [cleanRuleCount, setCleanRuleCount] = useState<number | null>(null);

  const finished = !running && run !== null && step >= TOTAL_STEPS;
  const isComplete = brokeChart && cleanRun && toggleBreak;

  // ── Pipeline animation: advance one phase at a time, then grade the run ────
  useEffect(() => {
    if (!running || !run) return;
    if (step >= TOTAL_STEPS) {
      setRunning(false);
      const r = run.result;
      if (r.escapedDefective > 0) setBrokeChart(true);
      if (r.escapedDefective === 0 && r.caughtDefective === TOTAL_DEFECTS) {
        setCleanRun(true);
        setCleanRuleCount(
          (prev) => prev ?? run.rulesUsed.filter((x) => x.enabled).length
        );
      }
      if (cleanRun && run.hadDisabledRule && r.escapedDefective > 0) {
        setToggleBreak(true);
      }
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), 650);
    return () => clearTimeout(t);
  }, [running, step, run, cleanRun]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleRun = useCallback(() => {
    if (running) return;
    const result = evaluateRun(BATCHES, rules);
    setRun({
      result,
      rulesUsed: rules,
      hadDisabledRule: rules.some((r) => !r.enabled),
    });
    setStep(0);
    setRunning(true);
    setRunCount((c) => c + 1);
  }, [running, rules]);

  const handleAddRule = useCallback((rule: RuleConfig) => {
    setRules((prev) =>
      prev.some((r) => r.id === rule.id) ? prev : [...prev, rule]
    );
  }, []);

  const handleToggleRule = useCallback((id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  }, []);

  const handleRemoveRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  function handleReset() {
    setRules([]);
    setRun(null);
    setStep(0);
    setRunning(false);
    setRunCount(0);
    setBrokeChart(false);
    setCleanRun(false);
    setToggleBreak(false);
    setCleanRuleCount(null);
  }

  const progressItems = [
    { id: "break", label: "Watch bad rows break the chart", done: brokeChart },
    { id: "clean", label: `Catch all ${TOTAL_DEFECTS} defects in one run`, done: cleanRun },
    { id: "toggle", label: "Toggle a rule off and re-run", done: toggleBreak },
  ];

  const nextHint = !brokeChart
    ? "Start unguarded: run the pipeline in section 3 before writing a single rule, and look closely at what reaches the dashboard."
    : !cleanRun
      ? `Now write the contract down as rules in section 2 until one full run catches all ${TOTAL_DEFECTS} defective rows with zero escapes. The data dictionary in section 1 tells you exactly which rules you need.`
      : !toggleBreak
        ? "Final experiment: switch exactly one of your rules OFF (keep it in the list), re-run, and watch which defect walks straight back into the warehouse."
        : "All three beats done. Scroll down to wrap up.";

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug={GUIDE_SLUG} score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">{GUIDE_TITLE}</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Data &amp; Analysis
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            Guardrails for Data:{" "}
            <span className="text-[var(--color-accent)]">Validation Rules</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            A quality check that lives in someone&apos;s head protects nothing.
            Here you turn a data contract into executable rules, run corrupted
            batches through a three-stage pipeline, and watch exactly what one
            switched-off rule costs the dashboard at the end.
          </motion.p>
        </section>

        {/* Progress */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {progressItems.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: item.done ? "var(--color-accent)" : "#1e293b" }}
              />
              <span className={`text-[11px] ${item.done ? "text-white" : "text-[#475569]"}`}>
                {item.label}
              </span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">
                Sign in
              </Link>{" "}
              to save progress
            </p>
          )}
          <AnimatePresence>
            {isComplete && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[var(--color-success)] flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Definition */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            From quality talk to quality gates
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            The{" "}
            <Link
              href="/visual-guides/data-quality-dimensions"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              six dimensions of data quality
            </Link>{" "}
            name what good data means. This guide is about enforcement: each
            expectation becomes a small executable predicate (type, range,
            not_null, unique, relationship) that runs against every incoming
            batch and quarantines whatever fails, the same idea behind tests in
            tools like dbt or Great Expectations. The difference between a
            documented standard and a validation rule is that the rule cannot
            forget to check. It sits inside the{" "}
            <Link
              href="/visual-guides/data-pipeline"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              pipeline
            </Link>{" "}
            as a gate, and the pipeline does not move data past it.
          </p>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            How this playground stays honest: the three batches ({TOTAL_ROWS}{" "}
            rows, {TOTAL_DEFECTS} of them defective) are fixed fixtures you can
            read cell by cell in section 1. Every caught and escaped count
            comes from executing your enabled rules against those rows, and
            every bar on the dashboard is a live sum over the rows that
            actually passed your gate. Nothing is faked.
          </p>
        </motion.section>

        {/* Section 1: the contract and the raw batches */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            1 · The contract and the raw batches
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-4">
            An orders feed lands three times, once per day. The data dictionary
            says what every column must look like; the batches say what
            actually arrived. Inspect both. Some cells break the contract, and
            finding them by eye is the last time anyone should have to.
          </p>
          <DataContract />
        </motion.section>

        {/* Section 2: rule builder */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            2 · Write the schema rules
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-4">
            Translate the dictionary into rules. Each one is a real predicate:
            when the pipeline runs, every enabled rule executes against every
            row, and one failure is enough to quarantine the row. Rules are
            deliberately narrow. A range check shrugs at text, a type check
            shrugs at nulls, so coverage comes from the set, not from any
            single rule.
          </p>
          <RuleBuilder
            rules={rules}
            onAdd={handleAddRule}
            onToggle={handleToggleRule}
            onRemove={handleRemoveRule}
            disabled={running}
          />
        </motion.section>

        {/* Section 3: the pipeline */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            3 · Run the pipeline
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-2">
            Extract, validate, load: the three batches flow through the gate in
            order, and whatever survives your rules becomes the revenue
            dashboard on the right.
          </p>
          <p className="text-[12px] text-[var(--color-accent)] leading-relaxed max-w-[720px] mb-4">
            {nextHint}
          </p>
          <PipelineBoard
            run={run?.result ?? null}
            rulesUsed={run?.rulesUsed ?? []}
            step={step}
            running={running}
            finished={finished}
            enabledRuleCount={rules.filter((r) => r.enabled).length}
            onRun={handleRun}
          />
        </motion.section>

        {/* Completion card */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              variants={card}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0f172a] overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-px bg-[var(--color-accent)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">
                    Guide Complete
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  You Built the Gate
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You watched an unguarded pipeline poison its own dashboard,
                  wrote the contract down as executable rules, and proved with
                  one flipped switch that the rules were the only thing holding
                  the line.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Rules in your first clean run
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {cleanRuleCount ?? "?"}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      enabled at the gate
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Defects caught in that run
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {TOTAL_DEFECTS} of {TOTAL_DEFECTS}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      zero escapes downstream
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Pipeline runs it took you
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[#f1f5f9]">
                      {runCount}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      each one rebuilt the warehouse
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;A quality expectation that lives in someone&apos;s
                    head is a hope. Written as an executable rule in the
                    pipeline, it becomes a guardrail: it runs on every batch,
                    it cannot forget to check, and it fails loudly before a bad
                    row can reach the chart.&quot;
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link
                  href="/visual-guides"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                >
                  ← All Guides
                </Link>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                  >
                    Try Again
                  </button>
                  <Link
                    href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
                  >
                    Next Guide →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer nav (pre-completion) */}
        {!isComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link
              href="/visual-guides"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← All Guides
            </Link>
            <Link
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Next Guide →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
