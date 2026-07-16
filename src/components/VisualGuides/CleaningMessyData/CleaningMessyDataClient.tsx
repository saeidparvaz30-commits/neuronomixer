"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  RAW_ROWS,
  TOTAL_ROWS,
  STEPS,
  StepId,
  StepState,
  NO_STEPS,
  ALL_STEPS,
  CANONICAL_COUNTRIES,
  cleanRows,
  countryCounts,
  computeStats,
  dictionaryMatches,
  whitespaceCellCount,
  pct,
} from "./types";
import SurveyTable from "./SurveyTable";
import CleaningPipeline from "./CleaningPipeline";
import CategoryChart from "./CategoryChart";

const GUIDE_TITLE = "USA, U.S.A., usa: Cleaning Real Values";
const GUIDE_SLUG = "cleaning-messy-data";
const NEXT_GUIDE_SLUG = "eda-workflow";

// Constant properties of the fixed dataset, computed once from the rows themselves.
const RAW_STATS = computeStats(RAW_ROWS, NO_STEPS);
const CEILING_STATS = computeStats(RAW_ROWS, ALL_STEPS);
const WHITESPACE_CELLS = whitespaceCellCount(RAW_ROWS);
const MAP_ALONE_MATCHES = dictionaryMatches(RAW_ROWS, NO_STEPS);
const MAP_PREPPED_MATCHES = dictionaryMatches(RAW_ROWS, {
  ...NO_STEPS,
  trim: true,
  casefold: true,
});

export default function CleaningMessyDataClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  const [steps, setSteps] = useState<StepState>(NO_STEPS);
  const [earned, setEarned] = useState(false);

  // ── Live computation (everything shown is derived from RAW_ROWS) ──────────
  const rows = useMemo(() => cleanRows(RAW_ROWS, steps), [steps]);
  const stats = useMemo(() => computeStats(RAW_ROWS, steps), [steps]);
  const counts = useMemo(() => countryCounts(RAW_ROWS, steps), [steps]);

  const readouts = useMemo(() => {
    const withStep = (id: StepId, on: boolean) => computeStats(RAW_ROWS, { ...steps, [id]: on });
    const trimOff = withStep("trim", false);
    const trimOn = withStep("trim", true);
    const foldOff = withStep("casefold", false);
    const foldOn = withStep("casefold", true);
    const mapOff = withStep("map", false);
    const mapOn = withStep("map", true);
    const datesOff = withStep("dates", false);
    const datesOn = withStep("dates", true);
    const numsOff = withStep("numbers", false);
    const numsOn = withStep("numbers", true);
    return {
      trim: `${WHITESPACE_CELLS} cells carry stray whitespace. Distinct countries off/on: ${trimOff.distinctCountries} / ${trimOn.distinctCountries}`,
      casefold: `Distinct countries off/on: ${foldOff.distinctCountries} / ${foldOn.distinctCountries}`,
      map: `Dictionary hits ${dictionaryMatches(RAW_ROWS, steps)} of ${TOTAL_ROWS} rows right now. Distinct off/on: ${mapOff.distinctCountries} / ${mapOn.distinctCountries}`,
      dates: `Dates parsed off/on: ${datesOff.datesParsed} / ${datesOn.datesParsed} of ${TOTAL_ROWS}`,
      numbers: `Hours numeric off/on: ${numsOff.hoursParsed} / ${numsOn.hoursParsed} of ${TOTAL_ROWS}`,
    } satisfies Record<StepId, string>;
  }, [steps]);

  // ── Completion: earned once every pipeline step is applied at the same time ──
  const allOn = STEPS.every((s) => steps[s.id]);
  useEffect(() => {
    if (allOn) setEarned(true);
  }, [allOn]);
  const isComplete = earned;

  const anyStepOn = STEPS.some((s) => steps[s.id]);

  const handleToggle = useCallback((id: StepId) => {
    setSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  function handleReset() {
    setSteps(NO_STEPS);
    setEarned(false);
  }

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
            USA, U.S.A., usa:{" "}
            <span className="text-[var(--color-accent)]">Cleaning Real Values</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Real columns arrive with inconsistent labels, stray whitespace, mixed date
            formats, and numbers stored as text. Below is a survey export with all four
            problems. You will clean it yourself, one step at a time, and watch every
            count and percentage respond.
          </motion.p>
        </section>

        {/* Progress */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {STEPS.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: steps[s.id] ? "var(--color-accent)" : "#1e293b" }}
              />
              <span className={`text-[11px] ${steps[s.id] ? "text-white" : "text-[#475569]"}`}>
                {s.short}
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

        {/* Framing */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Cleaning is the job, not the chore before the job
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            Practitioners routinely spend more time preparing data than modeling it, and
            entire courses exist just for this craft. The reason is simple: every join,
            filter, groupby, and chart trusts the values underneath it. A country column
            where USA, U.S.A., and usa are three different strings will quietly produce
            three different countries in every result downstream. What counts as good
            data has its own vocabulary, covered in{" "}
            <Link
              href="/visual-guides/data-quality-dimensions"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              the six faces of bad data
            </Link>
            . This guide is the hands-on half: you fix a real export.
          </p>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            How this playground stays honest: the {TOTAL_ROWS}-row export below is a
            fixed dataset shipped verbatim with the page. Every unique-value count,
            parse rate, and bar you see is computed live from those rows by the same
            cleaning functions your toggles switch on and off. Nothing is faked.
          </p>
        </motion.section>

        {/* Section 1: the raw export */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            1 · Meet the export
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-4">
            A product team merged survey responses from three source systems into one
            CSV. Scroll the table: the same three countries hide behind {RAW_STATS.distinctCountries}{" "}
            different spellings, the dates speak four dialects, and the hours column is
            text pretending to be numbers. As you enable steps in section 2, this table
            updates in place; changed cells show their original value struck through.
          </p>
          <SurveyTable rows={rows} anyStepOn={anyStepOn} />
        </motion.section>

        {/* Section 2: pipeline + live results */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            2 · Clean it, one step at a time
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-4">
            Apply all five steps to earn the guide. Each card shows, live, what the step
            changes given everything else you have already applied. The scoreboard and
            the category chart never lie: they are recomputed from the table on every
            toggle.
          </p>

          {/* Scoreboard */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Distinct country values
              </p>
              <p
                className="text-2xl font-black font-mono"
                style={{
                  color:
                    stats.distinctCountries === CANONICAL_COUNTRIES.length
                      ? "var(--color-success)"
                      : "var(--color-warning)",
                }}
              >
                {stats.distinctCountries}
              </p>
              <p className="text-[10px] text-[#475569] mt-1">
                goal: {CANONICAL_COUNTRIES.length} real countries
              </p>
            </div>
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Dates parsed
              </p>
              <p className="text-2xl font-black font-mono text-[#f1f5f9]">
                {pct(stats.datesParsed, stats.total)}%
              </p>
              <p className="text-[10px] text-[#475569] mt-1">
                {stats.datesParsed} of {stats.total}; ceiling {CEILING_STATS.datesParsed}
                : {stats.total - CEILING_STATS.datesParsed} rows are junk
              </p>
            </div>
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Hours numeric
              </p>
              <p className="text-2xl font-black font-mono text-[#f1f5f9]">
                {pct(stats.hoursParsed, stats.total)}%
              </p>
              <p className="text-[10px] text-[#475569] mt-1">
                {stats.hoursParsed} of {stats.total}; ceiling {CEILING_STATS.hoursParsed}
                : {stats.total - CEILING_STATS.hoursParsed} stay missing or junk
              </p>
            </div>
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Rows fully clean
              </p>
              <p className="text-2xl font-black font-mono text-[#f1f5f9]">
                {pct(stats.cleanRowCount, stats.total)}%
              </p>
              <p className="text-[10px] text-[#475569] mt-1">
                {stats.cleanRowCount} of {stats.total} rows pass all three columns
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <CleaningPipeline steps={steps} onToggle={handleToggle} readouts={readouts} />
            <CategoryChart
              counts={counts}
              rawDistinct={RAW_STATS.distinctCountries}
              totalRows={TOTAL_ROWS}
            />
          </div>
        </motion.section>

        {/* Section 3: lessons */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-3">
            Three habits this table just taught you
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-1.5">
                Order matters
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                Try mapping with everything else off: the exact-match dictionary hits
                only {MAP_ALONE_MATCHES} of {TOTAL_ROWS} rows. After trim and casefold
                it hits {MAP_PREPPED_MATCHES} of {TOTAL_ROWS}. Normalize first, then
                map; a cleaning pipeline is a sequence, not a bag of tricks.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-1.5">
                Formats are decisions
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                Row 6 says 1/8/2026. The parser here reads it as January 8 because it
                assumes US month-first dates; most of Europe would read August 1. No
                code can tell you which is true. Flexible parsing embeds assumptions,
                so document them where the next analyst will look.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-1.5">
                Missing is not dirty
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                N/A and a lone dash are not parse failures; they are answers that do
                not exist. Coercing them to 0 would invent data. What to do with them
                instead is its own craft:{" "}
                <Link
                  href="/visual-guides/missing-data"
                  className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
                >
                  missing data: why it matters
                </Link>
                .
              </p>
            </div>
          </div>
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
                  You Ran the Whole Pipeline
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  Trim, casefold, map, parse, coerce: five small decisions that turned a
                  liar of a table into something you can actually analyze.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Country categories</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {RAW_STATS.distinctCountries} &rarr; {stats.distinctCountries}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      fake spellings collapsed
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Dates parsed</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {stats.datesParsed} of {stats.total}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      up from {RAW_STATS.datesParsed} strict-ISO rows
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Hours numeric</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {stats.hoursParsed} of {stats.total}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      up from {RAW_STATS.hoursParsed} as raw text
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Rows fully clean</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {stats.cleanRowCount} of {stats.total}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      the rest need human calls
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Cleaning is not deleting weird rows. It is an ordered pipeline
                    of small, documented decisions: normalize, then map, then parse, then
                    coerce, and every number downstream inherits whichever decisions you
                    made here.&quot;
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
