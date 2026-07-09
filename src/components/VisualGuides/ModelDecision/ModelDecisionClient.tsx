"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  ModelRow,
  Constraints,
  ConstraintKey,
  DEFAULT_MODELS,
  DEFAULT_CONSTRAINTS,
  FAILURE_LABEL,
  LATENCY_LABEL,
  OUT_SHARE,
  PINK,
  evaluate,
  cheapestFrontierPrice,
  monthlyCostUsd,
  formatUsd,
  contextLabel,
} from "./types";
import ConstraintPanel from "./ConstraintPanel";
import TradeoffChart from "./TradeoffChart";
import ModelTable, { EditableField } from "./ModelTable";

const GUIDE_TITLE = "Which AI Model Should I Use?";
const NEXT_GUIDE_SLUG = "benchmark-literacy";
const CONSTRAINT_GATE = 2;
const DEFAULT_WORKLOAD_MTOK = 20;

const CONSTRAINT_NAME: Record<ConstraintKey, string> = {
  quality: "Quality floor",
  budget: "Budget ceiling",
  latency: "Latency ceiling",
  context: "Context floor",
  hosting: "Privacy / hosting",
};

function cloneDefaults(): ModelRow[] {
  return DEFAULT_MODELS.map((m) => ({ ...m }));
}

export default function ModelDecisionClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Interaction state (mount defaults; Try Again restores exactly these) ──
  const [models, setModels] = useState<ModelRow[]>(cloneDefaults);
  const [constraints, setConstraints] = useState<Constraints>(DEFAULT_CONSTRAINTS);
  const [touched, setTouched] = useState<ReadonlySet<ConstraintKey>>(
    () => new Set<ConstraintKey>()
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickedFrontier, setPickedFrontier] = useState(false);
  const [workloadMtok, setWorkloadMtok] = useState(DEFAULT_WORKLOAD_MTOK);

  // ── Live computation: every number on screen comes from evaluate() ────────
  const { rows, passingCount, frontierCount } = useMemo(
    () => evaluate(models, constraints),
    [models, constraints]
  );
  const cheapestFrontier = useMemo(() => cheapestFrontierPrice(rows), [rows]);
  const selected = selectedId
    ? rows.find((r) => r.model.id === selectedId) ?? null
    : null;
  const edited = useMemo(
    () =>
      models.some((m, i) => {
        const d = DEFAULT_MODELS[i];
        return (
          m.capability !== d.capability ||
          m.priceIn !== d.priceIn ||
          m.priceOut !== d.priceOut
        );
      }),
    [models]
  );

  // ── Derived gates ──────────────────────────────────────────────────────────
  const gateConstraints = touched.size >= CONSTRAINT_GATE;
  const isComplete = gateConstraints && pickedFrontier;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleConstraintChange = useCallback(
    (key: ConstraintKey, patch: Partial<Constraints>) => {
      const changed = (Object.keys(patch) as (keyof Constraints)[]).some(
        (k) => patch[k] !== constraints[k]
      );
      if (!changed) return;
      setConstraints((prev) => ({ ...prev, ...patch }));
      setTouched((prev) => {
        if (prev.has(key)) return prev;
        const next = new Set(prev);
        next.add(key);
        return next;
      });
    },
    [constraints]
  );

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      const row = rows.find((r) => r.model.id === id);
      if (row && row.pass && row.onFrontier) setPickedFrontier(true);
    },
    [rows]
  );

  const handleEdit = useCallback((id: string, field: EditableField, value: number) => {
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  }, []);

  const handleResetDefaults = useCallback(() => {
    setModels(cloneDefaults());
  }, []);

  function handleReset() {
    setModels(cloneDefaults());
    setConstraints(DEFAULT_CONSTRAINTS);
    setTouched(new Set<ConstraintKey>());
    setSelectedId(null);
    setPickedFrontier(false);
    setWorkloadMtok(DEFAULT_WORKLOAD_MTOK);
  }

  const progressItems = [
    {
      id: "constraints",
      label: `Move ${CONSTRAINT_GATE} different constraints (${Math.min(
        touched.size,
        CONSTRAINT_GATE
      )}/${CONSTRAINT_GATE})`,
      done: gateConstraints,
    },
    { id: "pick", label: "Select a model on the frontier", done: pickedFrontier },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="ai-model-decision-guide"
        score={100}
      />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-[12px] text-[#475569] mb-6"
        >
          <Link
            href="/visual-guides"
            className="hover:text-[var(--color-accent)] transition-colors"
          >
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
              Applied AI
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            Which AI Model{" "}
            <span className="text-[var(--color-accent)]">Should I Use?</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Not a flowchart: a computation. State your constraints, and a live Pareto
            frontier of cost versus capability recomputes which models are even worth
            arguing about.
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
              <span
                className={`text-[11px] ${item.done ? "text-white" : "text-[#475569]"}`}
              >
                {item.label}
              </span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link
                href="/auth/sign-in"
                className="underline underline-offset-2 hover:text-[#94a3b8]"
              >
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
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Concept: dominated vs frontier */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-3">
            Why &quot;which model?&quot; is math, not a flowchart
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Dominated
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                A model is dominated when another model is at least as capable AND at
                least as cheap, and strictly better on one of the two. A dominated model
                is never the right answer, whatever your taste: something else beats it
                on both axes.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                On the frontier
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                The Pareto frontier is what remains after eliminating dominated models:
                every step up in capability costs real money. Your only genuine decision
                is where on that frontier your task sits. Constraints shrink the frontier
                first; preference picks last.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            The capability index and prices in this guide are editable assumptions:
            defaults as of July 2026, list-price style estimates and generic capability
            tiers, not vendor-verified benchmark results. Context window, latency class,
            and hosting are fixed dataset attributes. Prices and scores go stale; the
            point is the method. Edit a capability score or price in the table below and
            every dot, line, and recommendation recomputes exactly.
          </p>
        </motion.section>

        {/* Tradeoff explorer */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The tradeoff explorer
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-5">
            Tighten a constraint and watch models drop out (they turn dim with an
            &times;). The pink dots are the recomputed Pareto frontier of the survivors.
            Click a dot, or use the Select buttons in the table below, to inspect a
            model.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            <ConstraintPanel
              constraints={constraints}
              touched={touched}
              onChange={handleConstraintChange}
            />
            <div>
              <TradeoffChart
                rows={rows}
                selectedId={selectedId}
                onSelect={handleSelect}
              />
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="rounded-xl border border-[#1e293b] p-3">
                  <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                    models passing
                  </p>
                  <p className="text-2xl font-black font-mono text-[#f1f5f9]">
                    {passingCount}
                    <span className="text-[13px] text-[#475569]">/{rows.length}</span>
                  </p>
                </div>
                <div className="rounded-xl border p-3" style={{ borderColor: `${PINK}66` }}>
                  <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                    on the frontier
                  </p>
                  <p className="text-2xl font-black font-mono" style={{ color: PINK }}>
                    {frontierCount}
                  </p>
                </div>
                <div className="rounded-xl border border-[#1e293b] p-3">
                  <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                    cheapest frontier
                  </p>
                  <p className="text-2xl font-black font-mono text-[#f1f5f9]">
                    {cheapestFrontier === null ? "none" : formatUsd(cheapestFrontier)}
                  </p>
                </div>
              </div>
              {passingCount === 0 && (
                <p
                  className="text-[11px] text-[var(--color-warning)] mt-3"
                  aria-live="polite"
                >
                  No model satisfies all constraints at once. That is a real outcome:
                  loosen the one you care least about and see what comes back first.
                </p>
              )}
            </div>
          </div>
        </motion.section>

        {/* Model table */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The dataset: editable assumptions
          </p>
          <ModelTable
            rows={rows}
            selectedId={selectedId}
            onSelect={handleSelect}
            onEdit={handleEdit}
            onResetDefaults={handleResetDefaults}
            edited={edited}
          />
        </motion.section>

        {/* Selected model detail */}
        <AnimatePresence>
          {selected && (
            <motion.section
              variants={card}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                <p className="text-[13px] font-semibold text-white">
                  Inspecting: {selected.model.name}
                </p>
                {selected.onFrontier ? (
                  <span className="text-[11px] font-semibold" style={{ color: PINK }}>
                    &#9679; on the frontier
                  </span>
                ) : selected.pass ? (
                  <span className="text-[11px] font-semibold text-[#3bb4a4]">
                    passes, but dominated
                  </span>
                ) : (
                  <span className="text-[11px] text-[var(--color-warning)]">
                    &times; fails: {selected.failures.map((f) => FAILURE_LABEL[f]).join(", ")}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#475569] mb-4">
                {selected.model.openWeights ? "Open weights" : "Hosted API"} &middot;{" "}
                {LATENCY_LABEL[selected.model.latency]} latency &middot;{" "}
                {contextLabel(selected.model.contextK)} context
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-2 uppercase tracking-wide">
                    Blended price
                  </p>
                  <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto mb-3">
{`${(1 - OUT_SHARE).toFixed(2)} x $${selected.model.priceIn}/Mtok in
+ ${OUT_SHARE.toFixed(2)} x $${selected.model.priceOut}/Mtok out
= ${formatUsd(selected.blended)} per blended Mtok`}
                  </pre>
                  <label
                    htmlFor="md-workload"
                    className="block text-[12px] font-semibold text-white mb-1.5"
                  >
                    Monthly workload:{" "}
                    <span className="font-mono text-[var(--color-accent)]">
                      {workloadMtok}M
                    </span>{" "}
                    tokens
                  </label>
                  <input
                    id="md-workload"
                    type="range"
                    min={1}
                    max={200}
                    step={1}
                    value={workloadMtok}
                    onChange={(e) => setWorkloadMtok(Number(e.target.value))}
                    className="w-full accent-[#d4af37]"
                  />
                  <p className="text-[12px] text-[#94a3b8] mt-2">
                    At that volume this model costs about{" "}
                    <span className="font-mono font-bold text-[#f1f5f9]">
                      {formatUsd(monthlyCostUsd(selected.blended, workloadMtok))}
                    </span>{" "}
                    per month ({formatUsd(selected.blended)} &times; {workloadMtok}).
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-2 uppercase tracking-wide">
                    Constraint check
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {(Object.keys(CONSTRAINT_NAME) as ConstraintKey[]).map((key) => {
                      const fails = selected.failures.includes(key);
                      return (
                        <li
                          key={key}
                          className="flex items-center gap-2 text-[12px]"
                        >
                          <span
                            className={`font-mono font-bold ${
                              fails
                                ? "text-[var(--color-warning)]"
                                : "text-[var(--color-success)]"
                            }`}
                            aria-hidden="true"
                          >
                            {fails ? "×" : "✓"}
                          </span>
                          <span className="text-[#94a3b8]">
                            {CONSTRAINT_NAME[key]}:{" "}
                            {fails ? FAILURE_LABEL[key] : "satisfied"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {!pickedFrontier && !selected.onFrontier && (
                    <p className="text-[11px] text-[#475569] mt-3">
                      To finish the guide, select a model that is currently on the pink
                      frontier.
                    </p>
                  )}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

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
                  Frontier Found!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You turned &quot;which model?&quot; into constraints plus a Pareto
                  computation, then picked from the survivors.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Constraints you moved</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {touched.size} of {Object.keys(CONSTRAINT_NAME).length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Current frontier</p>
                    <p className="text-[14px] font-mono font-bold" style={{ color: PINK }}>
                      {frontierCount} of {passingCount} passing
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Your pick</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {selected
                        ? `${selected.model.short} @ ${formatUsd(selected.blended)}`
                        : "?"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;There is no best model, only a frontier. Write down your
                    quality floor, budget, latency, and privacy constraints, eliminate
                    everything dominated, and pick the cheapest survivor that clears the
                    floor. When prices or scores change, rerun the math, not the
                    debate.&quot;
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
