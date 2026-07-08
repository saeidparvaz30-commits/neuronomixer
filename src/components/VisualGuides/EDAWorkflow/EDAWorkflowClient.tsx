"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  ROWS,
  SEED,
  SENTINEL,
  BAD_ZONE,
  ColKey,
  NumKey,
  exactDuplicates,
  numericValues,
  sentinelCount,
  skewness,
  valueCounts,
} from "./data";
import SchemaPanel from "./SchemaPanel";
import MissingnessPanel from "./MissingnessPanel";
import DistributionsPanel from "./DistributionsPanel";
import DuplicatesPanel from "./DuplicatesPanel";
import RelationshipsPanel from "./RelationshipsPanel";

const GUIDE_TITLE = "Interrogating a Dataset";
const NEXT_GUIDE_SLUG = "data-distributions-applied";

// All three constants below are computed from the actual dataset, once.
const DUP_INFO = exactDuplicates(ROWS);
const SENTINEL_N = sentinelCount(ROWS);
const BAD_ZONE_N = valueCounts(ROWS, "zone").find((v) => v.value === BAD_ZONE)?.count ?? 0;

const STEPS = [
  { id: 0, label: "Shape & types" },
  { id: 1, label: "Missingness" },
  { id: 2, label: "Distributions" },
  { id: 3, label: "Duplicates" },
  { id: 4, label: "Relationships" },
];

const DEFAULT_PAIR: [NumKey, NumKey] = ["temp_c", "battery_v"];

export default function EDAWorkflowClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // Panel state
  const [step, setStep] = useState(0);
  const [expandedCol, setExpandedCol] = useState<ColKey | null>(null);
  const [flagFeedback, setFlagFeedback] = useState<{ value: string; correct: boolean } | null>(null);
  const [sentinelOn, setSentinelOn] = useState(false);
  const [logCols, setLogCols] = useState<ReadonlySet<NumKey>>(new Set());
  const [dupRan, setDupRan] = useState(false);
  const [pair, setPair] = useState<[NumKey, NumKey]>(DEFAULT_PAIR);

  // Findings: latched when the discovering interaction happens
  const [foundMislabel, setFoundMislabel] = useState(false);
  const [foundSentinel, setFoundSentinel] = useState(false);
  const [foundSkew, setFoundSkew] = useState(false);
  const [foundDup, setFoundDup] = useState(false);

  const isComplete = foundMislabel && foundSentinel && foundSkew && foundDup;

  // Computed evidence for the findings board / completion recap
  const vocSkewLinear = useMemo(
    () => skewness(numericValues(ROWS, "voc_ppb", false)),
    []
  );
  const vocSkewLog = useMemo(
    () =>
      skewness(
        numericValues(ROWS, "voc_ppb", false)
          .filter((v) => v > 0)
          .map((v) => Math.log10(v))
      ),
    []
  );

  // ── Handlers (these latch the findings) ─────────────────────────────────────
  const handleFlagZone = useCallback((value: string) => {
    const correct = value === BAD_ZONE;
    setFlagFeedback({ value, correct });
    if (correct) setFoundMislabel(true);
  }, []);

  const handleToggleSentinel = useCallback(() => {
    setSentinelOn((prev) => {
      const next = !prev;
      if (next && SENTINEL_N > 0) setFoundSentinel(true);
      return next;
    });
  }, []);

  const handleSetScale = useCallback((col: NumKey, log: boolean) => {
    setLogCols((prev) => {
      const next = new Set(prev);
      if (log) next.add(col);
      else next.delete(col);
      return next;
    });
    if (log && col === "voc_ppb") setFoundSkew(true);
  }, []);

  const handleRunDupCheck = useCallback(() => {
    setDupRan(true);
    if (DUP_INFO.count > 0) setFoundDup(true);
  }, []);

  function handleReset() {
    setStep(0);
    setExpandedCol(null);
    setFlagFeedback(null);
    setSentinelOn(false);
    setLogCols(new Set());
    setDupRan(false);
    setPair(DEFAULT_PAIR);
    setFoundMislabel(false);
    setFoundSentinel(false);
    setFoundSkew(false);
    setFoundDup(false);
  }

  const findings = [
    {
      id: "sentinel",
      label: "Sentinel values",
      found: foundSentinel,
      evidence: `${SENTINEL_N} readings of ${SENTINEL} disguised as valid humidity`,
      hint: "A column with zero nulls but an impossible minimum. Step 2 has a switch.",
    },
    {
      id: "dup",
      label: "Duplicated batch",
      found: foundDup,
      evidence: `${DUP_INFO.count} rows are exact copies of earlier rows, one contiguous block`,
      hint: `${ROWS.length} rows but fewer unique ids. Step 4 has a scan.`,
    },
    {
      id: "mislabel",
      label: "Impossible category",
      found: foundMislabel,
      evidence: `zone "${BAD_ZONE}" appears ${BAD_ZONE_N} time(s); the manifest allows four zones`,
      hint: "Compare zone's unique count against the manifest in step 1.",
    },
    {
      id: "skew",
      label: "Skewed column",
      found: foundSkew,
      evidence: `voc_ppb skew ${vocSkewLinear.toFixed(2)} on linear, ${vocSkewLog.toFixed(2)} after log10`,
      hint: "One histogram in step 3 hides its shape until you change its axis.",
    },
  ];
  const foundCount = findings.filter((f) => f.found).length;

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="eda-workflow" score={100} />
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
            Interrogating a <span className="text-[var(--color-accent)]">Dataset</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            A fresh dataset never confesses on its own. You have 120 sensor readings
            from a warehouse and four problems hiding in them. Work the standard
            questioning sequence until all four are on the board.
          </motion.p>
        </section>

        {/* Progress */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {findings.map((f) => (
            <div key={f.id} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: f.found ? "var(--color-accent)" : "#1e293b" }}
              />
              <span className={`text-[11px] ${f.found ? "text-white" : "text-[#475569]"}`}>
                {f.label}
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

        {/* The loop, not the checklist */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            EDA is a loop, not a checklist
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            Exploratory data analysis has a rhythm: ask a question, look at the
            answer, refine the question, look again. The five panels below are the
            standard opening questions (shape, types, missingness, distributions,
            duplicates, relationships), but they are not a form to fill in once. A
            discovery in one panel changes what every other panel shows, so you
            circle back. And you write each finding down the moment you see it,
            because a finding you did not record is a finding you will rediscover
            at 2 a.m. in production. The board on the right is your notebook.
          </p>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            How this playground stays honest: the {ROWS.length}-row dataset is
            generated once with a seeded generator (seed {SEED}) and is identical on
            every visit. Four issues were planted in it deliberately. Every count,
            histogram, skewness, and correlation on this page is computed live from
            those {ROWS.length} rows. Nothing is faked.
          </p>
        </motion.section>

        {/* Step selector */}
        <div
          role="radiogroup"
          aria-label="Interrogation step"
          className="flex flex-wrap gap-1.5 mb-5"
        >
          {STEPS.map((s) => (
            <button
              key={s.id}
              role="radio"
              aria-checked={step === s.id}
              onClick={() => setStep(s.id)}
              className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                step === s.id
                  ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[#d4af37]/10"
                  : "border-[#1e293b] text-[#94a3b8] hover:text-white"
              }`}
            >
              {s.id + 1}. {s.label}
            </button>
          ))}
        </div>

        {/* Panel + findings board */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-start">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="lg:col-span-2 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
          >
            {step === 0 && (
              <SchemaPanel
                expandedCol={expandedCol}
                onExpand={setExpandedCol}
                onFlagZone={handleFlagZone}
                flagFeedback={flagFeedback}
                foundMislabel={foundMislabel}
              />
            )}
            {step === 1 && (
              <MissingnessPanel sentinelOn={sentinelOn} onToggleSentinel={handleToggleSentinel} />
            )}
            {step === 2 && (
              <DistributionsPanel
                sentinelOn={sentinelOn}
                logCols={logCols}
                onSetScale={handleSetScale}
              />
            )}
            {step === 3 && <DuplicatesPanel dupInfo={dupRan ? DUP_INFO : null} onRunCheck={handleRunDupCheck} />}
            {step === 4 && (
              <RelationshipsPanel sentinelOn={sentinelOn} pair={pair} onPairChange={setPair} />
            )}

            <div className="flex justify-between mt-6 pt-4 border-t border-white/[0.06]">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#d4af37] hover:text-[#d4af37] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                disabled={step === STEPS.length - 1}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#d4af37] hover:text-[#d4af37] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                Next step →
              </button>
            </div>
          </motion.div>

          {/* Findings board */}
          <motion.aside
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 lg:sticky lg:top-6"
            aria-label="Findings board"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8]">
                Findings Board
              </p>
              <span className="text-[11px] font-mono text-[#475569]">
                {foundCount} / {findings.length}
              </span>
            </div>
            <ul className="space-y-3">
              {findings.map((f) => (
                <li
                  key={f.id}
                  className="rounded-xl border p-3 transition-colors"
                  style={{
                    borderColor: f.found ? "rgba(34, 197, 94, 0.35)" : "#1e293b",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {f.found ? (
                      <svg
                        className="w-3.5 h-3.5 shrink-0 text-[var(--color-success)]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span
                        className="w-3.5 h-3.5 shrink-0 rounded-full border border-[#334155]"
                        aria-hidden="true"
                      />
                    )}
                    <p
                      className={`text-[12px] font-semibold ${
                        f.found ? "text-white" : "text-[#94a3b8]"
                      }`}
                    >
                      {f.label}
                      <span className="sr-only">{f.found ? " (found)" : " (not found yet)"}</span>
                    </p>
                  </div>
                  <p className="text-[11px] text-[#475569] leading-relaxed">
                    {f.found ? f.evidence : f.hint}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-[#475569] leading-relaxed mt-4">
              Real analysts keep exactly this: a running log of what the data
              admitted and which question extracted it.
            </p>
          </motion.aside>
        </div>

        {/* Loop discipline */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">The loop discipline</p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            Notice what happened when you flagged the sentinel: the missingness map
            changed, the humidity histogram snapped into shape, and every
            correlation involving humidity became meaningful. One upstream answer
            rewrote three downstream ones. That is why EDA cannot be a checklist
            you run top to bottom once: each finding invalidates conclusions you
            already drew, so you loop back and re-look. In practice the sequence
            is: shape and types first (cheapest, catches schema lies), then
            missingness (before trusting any statistic), then per-column
            distributions, then duplicates, then relationships. Then again, until
            a full pass turns up nothing new.
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed">
            The same discipline applies to what you do next. The sentinel readings
            and the duplicated batch should be fixed at ingestion, not papered over
            in analysis code. The mislabeled zone needs a human decision: is
            &quot;{BAD_ZONE}&quot; a typo of south, or a fifth zone nobody documented?
            And the skewed VOC column is not a defect at all, just a column that
            wants a log scale. Interrogation tells you which of those four
            conversations to have.
          </p>
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
                  Full Confession Extracted
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You worked the interrogation loop and put all four planted issues
                  on the board.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {findings.map((f) => (
                    <div key={f.id} className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1 uppercase tracking-wide">
                        {f.label}
                      </p>
                      <p className="text-[12px] font-mono text-[var(--color-success)]">
                        {f.evidence}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;EDA is a loop, not a checklist: ask, look, refine, write it
                    down, and go around again, because every answer the data gives
                    changes the next question worth asking.&quot;
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
