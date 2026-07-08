"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import { TRANSACTIONS, QUESTIONS, type GroupCol } from "./types";
import SplitApplyLab from "./SplitApplyLab";
import PivotSection from "./PivotSection";
import QuestionTranslator from "./QuestionTranslator";

const GUIDE_TITLE = "Split, Apply, Combine";
const NEXT_GUIDE_SLUG = "data-quality-dimensions";

export default function GroupByAggregationClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // Completion gates, all derived from what the user actually did.
  const [combinedCols, setCombinedCols] = useState<ReadonlySet<GroupCol>>(new Set());
  const [pivotBuilt, setPivotBuilt] = useState(false);
  const [solved, setSolved] = useState<ReadonlySet<string>>(new Set());

  // Remount key so Try Again restores the exact mount state of every section.
  const [resetNonce, setResetNonce] = useState(0);

  const handleCombine = useCallback((col: GroupCol) => {
    setCombinedCols((prev) => {
      if (prev.has(col)) return prev;
      const next = new Set(prev);
      next.add(col);
      return next;
    });
  }, []);

  const handlePivotBuilt = useCallback(() => setPivotBuilt(true), []);

  const handleSolved = useCallback((qId: string) => {
    setSolved((prev) => {
      if (prev.has(qId)) return prev;
      const next = new Set(prev);
      next.add(qId);
      return next;
    });
  }, []);

  function handleReset() {
    setCombinedCols(new Set());
    setPivotBuilt(false);
    setSolved(new Set());
    setResetNonce((n) => n + 1);
  }

  const gateGroupings = combinedCols.size >= 2;
  const gateTranslator = solved.size >= 2;
  const isComplete = gateGroupings && pivotBuilt && gateTranslator;

  const progressItems = [
    {
      id: "groupings",
      label: `Two single-level groupings (${Math.min(combinedCols.size, 2)}/2)`,
      done: gateGroupings,
    },
    { id: "pivot", label: "Build a two-level pivot", done: pivotBuilt },
    {
      id: "translator",
      label: `Translate questions (${Math.min(solved.size, 2)}/2)`,
      done: gateTranslator,
    },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="groupby-aggregation" score={100} />
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
            Split, Apply, <span className="text-[var(--color-accent)]">Combine</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Every &quot;average X per Y&quot; question is the same three-step move: split the
            rows into groups, apply one function to each group, and combine the answers into a
            new, smaller table. Run it live on a real table below.
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

        {/* Definition: row-level vs group-level */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Row-level questions vs group-level questions
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            &quot;What was the revenue of transaction 7?&quot; is a row-level question: one row
            goes in, one value comes out ($36.00, straight off the table). &quot;What is the
            average revenue per region?&quot; is a group-level question: all{" "}
            {TRANSACTIONS.length} rows go in, and only one row per region comes out. You cannot
            answer a group-level question by pointing at any single row. You need the
            split-apply-combine move, which databases call GROUP BY and pandas calls groupby.
          </p>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            How this playground stays honest: the {TRANSACTIONS.length} transactions below are
            a fixed dataset where every revenue equals units times a constant unit price
            (Coffee $4.50, Tea $3.50). Every group total, mean, count, and pivot cell on this
            page is computed live from those rows in your browser. Nothing is precomputed or
            faked.
          </p>
        </motion.section>

        {/* Section 1: the lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            1. The split-apply-combine machine
          </h2>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Pick a grouping column and watch the rows take that column&apos;s colors. Split the
            table into buckets, choose an aggregate, then combine each bucket into a single
            summary row. Your mission: run a full split and combine for region, then switch the
            grouping column to product and watch the same rows regroup live.
          </p>
          <SplitApplyLab
            key={`lab-${resetNonce}`}
            onCombine={handleCombine}
            combinedCols={combinedCols}
          />
        </motion.section>

        {/* Choosing the grouping column */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            How to choose the grouping column and the aggregate
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-2">
            The grouping column is hiding in the question itself: it is the word after
            &quot;per&quot; or &quot;each&quot;. Revenue per region groups by region.
            Transactions per product groups by product. The aggregate is the verb: total means
            sum, how many means count, average means mean, best or worst means max or min.
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed">
            Two aggregates deserve extra care. Count ignores the value column entirely, so
            counting revenue and counting units give the same answer. And a mean throws away
            group size: North&apos;s mean revenue comes from 5 rows while East&apos;s comes
            from 3, so treat means of small groups with suspicion.
          </p>
        </motion.section>

        {/* Section 2: pivot */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            2. Two-level grouping: the pivot table
          </h2>
          <PivotSection key={`pivot-${resetNonce}`} built={pivotBuilt} onBuild={handlePivotBuilt} />
        </motion.section>

        {/* Section 3: translator */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            3. Translate the question into a recipe
          </h2>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            This is the skill you will actually use: turning a plain-language question into a
            grouping column plus an aggregate. Pick both for each question below. Your answer
            is computed from the {TRANSACTIONS.length} transactions and compared against the
            correct recipe&apos;s table, so a wrong recipe shows you exactly which different
            question you just answered.
          </p>
          <QuestionTranslator key={`translator-${resetNonce}`} solved={solved} onSolved={handleSolved} />
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
                  You Think in Groups Now!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You split one table two different ways, built a two-level pivot, and
                  translated plain-language questions into grouping recipes.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Groupings you ran</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {[...combinedCols].join(" + ")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Pivot cells computed</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      3 × 2 = 6
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Questions translated</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {solved.size} of {QUESTIONS.length}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;The word after &apos;per&apos; names your grouping column, and the
                    verb names your aggregate. Split on the per, apply the verb, combine the
                    answers: that one move turns raw rows into every summary table you have
                    ever read.&quot;
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
