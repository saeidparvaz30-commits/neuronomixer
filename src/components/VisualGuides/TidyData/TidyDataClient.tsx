"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT, GUIDE_EASE } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  CITIES,
  YEARS,
  EX_COLS,
  EX_ROWS,
  pivotLonger,
  roundTripOk,
  runExercisePivot,
  type TableMode,
  type Choice,
  type ExerciseResult,
} from "./types";
import PivotTable from "./PivotTable";
import ShapeChart from "./ShapeChart";
import VariableChooser from "./VariableChooser";

const GUIDE_TITLE = "Tidy Data: One Row, One Observation";
const GUIDE_SLUG = "tidy-data-and-reshaping";
const NEXT_GUIDE_SLUG = "joins-and-keys";

// All derived from the constant dataset in types.ts (recomputable by hand).
const LONG_ROW_COUNT = pivotLonger().length;
const VALUE_CELL_COUNT = CITIES.length * YEARS.length;
const ROUND_TRIP_OK = roundTripOk();

const INITIAL_CHOICE: Record<string, Choice> = Object.fromEntries(
  EX_COLS.map((c) => [c.key, "id" as Choice])
);

const RULES = [
  {
    id: "r1",
    title: "Each variable is a column",
    body: "city, year, and temp_c each get exactly one column. If a variable's values are spread across headers (2021, 2022, ...), it is not a column yet.",
  },
  {
    id: "r2",
    title: "Each observation is a row",
    body: "One measurement event per row: one city in one year. A wide row silently packs several observations into one line.",
  },
  {
    id: "r3",
    title: "Each value is a cell",
    body: "One value per cell, nothing encoded in the header text and no two facts glued into one field.",
  },
];

export default function TidyDataClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Lab 1: pivot the temperature table ─────────────────────────────────────
  const [mode, setMode] = useState<TableMode>("wide");
  const [gLonger, setGLonger] = useState(false);
  const [gWider, setGWider] = useState(false);

  const handleModeChange = useCallback(
    (next: TableMode) => {
      if (next === mode) return;
      if (next === "long") setGLonger(true);
      if (next === "wide" && mode === "long") setGWider(true);
      setMode(next);
    },
    [mode]
  );

  // ── Lab 2: choose-the-variables exercise ───────────────────────────────────
  const [exChoice, setExChoice] = useState<Record<string, Choice>>(INITIAL_CHOICE);
  const [exResult, setExResult] = useState<ExerciseResult | null>(null);
  const [exPivoted, setExPivoted] = useState(false);
  const [tidyRowsSnapshot, setTidyRowsSnapshot] = useState<number | null>(null);

  const handleChoose = useCallback((key: string, c: Choice) => {
    setExChoice((prev) => ({ ...prev, [key]: c }));
  }, []);

  const handleExercisePivot = useCallback(() => {
    setExPivoted(true);
    const r = runExercisePivot(exChoice);
    setExResult(r);
    if (r?.isTidy) setTidyRowsSnapshot(r.rows.length);
  }, [exChoice]);

  const gExercise = tidyRowsSnapshot !== null;
  const isComplete = gLonger && gWider && gExercise;

  function handleReset() {
    setMode("wide");
    setGLonger(false);
    setGWider(false);
    setExChoice(INITIAL_CHOICE);
    setExResult(null);
    setExPivoted(false);
    setTidyRowsSnapshot(null);
  }

  const progressItems = [
    { id: "longer", label: "Pivot longer", done: gLonger },
    { id: "wider", label: "Pivot wider", done: gWider },
    { id: "choose", label: "Choose the variables", done: gExercise },
  ];

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
            Tidy Data: <span className="text-[var(--color-accent)]">One Row, One Observation</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            The same values can be stored wide or long, and the shape decides what your tools can
            do with them. Pivot a messy table both ways, watch a chart break and heal, then pick
            the variables yourself.
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

        {/* The three rules */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-3">The three tidy rules</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {RULES.map((r, i) => (
              <div key={r.id} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
                <p className="text-[11px] font-mono text-[var(--color-accent)] mb-1.5">Rule {i + 1}</p>
                <p className="text-[13px] font-semibold text-white mb-1.5">{r.title}</p>
                <p className="text-[12px] text-[#94a3b8] leading-relaxed">{r.body}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Lab 1: pivot + chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="text-[13px] font-semibold text-white">
                City temperatures <span className="text-[#475569] font-normal">(illustrative annual means)</span>
              </p>
              <div
                role="radiogroup"
                aria-label="Table shape"
                className="inline-flex rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1"
              >
                {(
                  [
                    { m: "wide" as TableMode, label: "Wide (pivot wider)" },
                    { m: "long" as TableMode, label: "Long (pivot longer)" },
                  ]
                ).map(({ m, label }) => {
                  const isActive = mode === m;
                  return (
                    <button
                      key={m}
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => handleModeChange(m)}
                      className={`relative px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                        isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="tidy-mode-pill"
                          transition={{ duration: 0.3, ease: GUIDE_EASE }}
                          className="absolute inset-0 rounded-lg bg-[var(--color-accent)]"
                          aria-hidden="true"
                        />
                      )}
                      <span className="relative z-10">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <PivotTable mode={mode} />
            <p className="text-[11px] text-[#475569] mt-3 leading-relaxed">
              Same {VALUE_CELL_COUNT} values either way. Pivot longer melts the {YEARS.length} year
              columns into a year column plus a value column; pivot wider spreads them back. Flip
              the toggle both ways and watch each cell travel to its new home.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-white">
                What a charting tool draws from this shape
              </p>
              <span
                className="text-[11px] font-semibold"
                style={{ color: mode === "long" ? "var(--color-success)" : "var(--color-warning)" }}
              >
                {mode === "long" ? "intended view" : "wrong view"}
              </span>
            </div>
            <ShapeChart mode={mode} />
            <p className="text-[11px] text-[#475569] mt-3 leading-relaxed">
              {mode === "wide" ? (
                <>
                  The goal is temperature over time, one line per city. But the wide table has no
                  year column to put on the x axis, so a naive tool does the only mechanical thing
                  it can: one series per column ({YEARS.length} year lines) plotted over row
                  positions ({CITIES.length} cities). The values are all correct; the shape made
                  the right chart impossible.
                </>
              ) : (
                <>
                  Now year is a real column, so &quot;x = year, color = city&quot; is a direct
                  mapping: {CITIES.length} lines with {YEARS.length} points each, drawn from the
                  same {VALUE_CELL_COUNT} values. Nothing about the data changed, only its shape.
                </>
              )}
            </p>
          </motion.div>
        </div>

        {/* Inverse operations explainer */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Pivot longer and pivot wider are inverses
          </p>
          <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto mb-4">
{`wide:  ${CITIES.length} rows x ${YEARS.length + 1} cols   year hides in ${YEARS.length} headers   ${VALUE_CELL_COUNT} value cells
long:  ${LONG_ROW_COUNT} rows x 3 cols  year is a column          ${LONG_ROW_COUNT} value rows

pivot_longer(wide) -> long        pivot_wider(long) -> wide
pivot_wider(pivot_longer(wide)) == wide   round trip: ${ROUND_TRIP_OK ? "intact, all cells match" : "BROKEN"}`}
          </pre>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] mb-1">Value cells (wide)</p>
              <p className="text-[15px] font-mono font-bold text-[#f1f5f9]">{VALUE_CELL_COUNT}</p>
              <p className="text-[10px] text-[#475569] mt-0.5">
                {CITIES.length} cities x {YEARS.length} years
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] mb-1">Observation rows (long)</p>
              <p className="text-[15px] font-mono font-bold text-[#f1f5f9]">{LONG_ROW_COUNT}</p>
              <p className="text-[10px] text-[#475569] mt-0.5">one per (city, year) pair</p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] mb-1">Round trip check</p>
              <p
                className="text-[15px] font-mono font-bold"
                style={{ color: ROUND_TRIP_OK ? "var(--color-success)" : "var(--color-warning)" }}
              >
                {ROUND_TRIP_OK ? "intact" : "broken"}
              </p>
              <p className="text-[10px] text-[#475569] mt-0.5">
                wide to long to wide, all {VALUE_CELL_COUNT} cells compared
              </p>
            </div>
          </div>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mt-4">
            Because the two pivots are exact inverses, no information is lost in either direction.
            That is why tidy is a working shape, not a moral one: analysis code, grouped charts,
            and joins want long tidy input, while a human scanning for one city&apos;s trend often
            reads the wide layout faster. Store and process tidy, reshape to wide at the last
            moment for presentation.
          </p>
        </motion.section>

        {/* Exercise */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Your turn: which columns are variables, which are values?
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            Pivoting longer needs one decision from you: which columns identify the observation
            (keep them), and which columns are really values of a single measurement spread wide
            (melt them into rows). Mark each column below, pivot, and the checker will tell you,
            from the table you actually produced, whether every row now holds exactly one
            observation. Getting it wrong is instructive: try melting{" "}
            <span className="font-mono">weight_kg</span> once and read what happens.
          </p>
          <VariableChooser
            choice={exChoice}
            onChoose={handleChoose}
            result={exResult}
            hasPivoted={exPivoted}
            onPivot={handleExercisePivot}
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
                  Shape Shifter!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You pivoted a table both ways, watched the chart break and heal, and correctly
                  separated identifier variables from spread-out values.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Cells pivoted both ways</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {VALUE_CELL_COUNT}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Tidy rows you produced</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {tidyRowsSnapshot ?? "?"}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      {EX_ROWS.length} patients x 3 weeks
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Round trip</p>
                    <p
                      className="text-[14px] font-mono font-bold"
                      style={{ color: ROUND_TRIP_OK ? "var(--color-success)" : "var(--color-warning)" }}
                    >
                      {ROUND_TRIP_OK ? "intact" : "broken"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Wide and long hold exactly the same values; only the tidy shape tells
                    your tools which column is a variable. When a chart or a groupby fights you,
                    fix the shape before you touch the data.&quot;
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
