"use client";

import React, { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  DATASETS,
  QUIZ_ITEMS,
  computeDiagnosis,
  type Dataset,
  type DatasetId,
  type Diagnosis,
  type ShapeId,
} from "./data";
import Histogram from "./Histogram";
import DiagnosisPanel from "./DiagnosisPanel";
import ShapeMatchQuiz from "./ShapeMatchQuiz";

const GUIDE_TITLE = "Data Distributions in Context";
const GUIDE_SLUG = "data-distributions-applied";
const NEXT_GUIDE_SLUG = "correlation-causation";

const DEFAULT_BINS = 24;

// Deterministic: datasets are module constants, so diagnoses are too.
const DIAGNOSES: Record<DatasetId, Diagnosis> = Object.fromEntries(
  DATASETS.map((ds) => [ds.id, computeDiagnosis(ds)])
) as Record<DatasetId, Diagnosis>;

const GROUP_COLORS = ["#1e5d8a", "#3bb4a4"];

const QUIZ_PASS = 3;

export default function DataDistributionsAppliedClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  const [selectedId, setSelectedId] = useState<DatasetId>("transactions");
  const [bins, setBins] = useState(DEFAULT_BINS);
  const [logIds, setLogIds] = useState<ReadonlySet<DatasetId>>(new Set());
  const [usedLog, setUsedLog] = useState(false);
  const [splitRevealed, setSplitRevealed] = useState(false);
  const [diagnosed, setDiagnosed] = useState<ReadonlySet<DatasetId>>(new Set());
  const [quizAnswers, setQuizAnswers] = useState<(ShapeId | null)[]>(
    QUIZ_ITEMS.map(() => null)
  );

  const dataset: Dataset = DATASETS.find((d) => d.id === selectedId) ?? DATASETS[0];
  const diagnosis = DIAGNOSES[dataset.id];
  const logOn = dataset.logSupported && logIds.has(dataset.id);
  const showSplit = dataset.id === "heights" && splitRevealed;

  const quizCorrect = useMemo(
    () => quizAnswers.filter((a, i) => a !== null && a === QUIZ_ITEMS[i].correct).length,
    [quizAnswers]
  );

  // ── Derived completion gates ────────────────────────────────────────────────
  const gateDiagnosed = diagnosed.size === DATASETS.length;
  const gateLog = usedLog;
  const gateQuiz = quizCorrect >= QUIZ_PASS;
  const isComplete = gateDiagnosed && gateLog && gateQuiz;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSelect = useCallback((id: DatasetId) => setSelectedId(id), []);

  const handleToggleLog = useCallback(() => {
    if (!dataset.logSupported) return;
    setLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(dataset.id)) {
        next.delete(dataset.id);
      } else {
        next.add(dataset.id);
        setUsedLog(true);
      }
      return next;
    });
  }, [dataset.id, dataset.logSupported]);

  const handleDiagnose = useCallback(() => {
    setDiagnosed((prev) => {
      const next = new Set(prev);
      next.add(dataset.id);
      return next;
    });
  }, [dataset.id]);

  const handleQuizAnswer = useCallback((itemIndex: number, choice: ShapeId) => {
    setQuizAnswers((prev) => {
      if (prev[itemIndex] !== null) return prev;
      const next = [...prev];
      next[itemIndex] = choice;
      return next;
    });
  }, []);

  const handleQuizRetry = useCallback(
    () => setQuizAnswers(QUIZ_ITEMS.map(() => null)),
    []
  );

  function handleReset() {
    setSelectedId("transactions");
    setBins(DEFAULT_BINS);
    setLogIds(new Set());
    setUsedLog(false);
    setSplitRevealed(false);
    setDiagnosed(new Set());
    setQuizAnswers(QUIZ_ITEMS.map(() => null));
  }

  const progressItems = [
    ...DATASETS.map((d) => ({
      id: d.id as string,
      label: d.tabLabel,
      done: diagnosed.has(d.id),
    })),
    { id: "log", label: "Log scale used", done: gateLog },
    { id: "quiz", label: `Quiz ${Math.min(quizCorrect, 4)}/${QUIZ_ITEMS.length}`, done: gateQuiz },
  ];

  const sensorDiag = DIAGNOSES.sensor;
  const txnDiag = DIAGNOSES.transactions;

  const histAriaLabel = showSplit
    ? `Two overlaid histograms of ${dataset.columnName}, one per hidden squad, with ${bins} bins. The two squads form two separate peaks.`
    : `Histogram of ${dataset.columnName} with ${bins} bins${logOn ? " on a log10 x axis" : ""}. Dashed lines mark the computed mean (${dataset.fmt(diagnosis.mean)}) and median (${dataset.fmt(diagnosis.median)}).`;

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug={GUIDE_SLUG} score={100} />
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
            Data Distributions <span className="text-[var(--color-accent)]">in Context</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            You plotted a histogram of a real column. Now what? Read five realistic
            columns the way a practitioner does: name the shape, infer the process that
            generated it, and predict what it will break downstream.
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

        {/* Intro */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The histogram is your first interview with the data
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            Before any model, a histogram answers one question: what process generated this
            column? Skew points to multiplicative processes. Twin peaks mean two populations
            are hiding in one column. A tail that refuses to fade means rare extreme events
            dominate your averages. An isolated spike is usually a bug wearing a data
            costume. And a wall of zeros means two different behaviors got mixed. The
            mathematics of the named distributions behind these shapes lives in the{" "}
            <Link
              href="/visual-guides/data-distributions"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              Data Distributions
            </Link>{" "}
            statistics guide; this one is about reading shapes in the wild and knowing the
            consequences.
          </p>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            How this playground stays honest: all five columns are generated once with
            seeded generators (400 rows each), so they are identical on every visit. Every
            histogram, mean, median, percentile, and skewness value on this page is
            computed live from those rows. Nothing is faked.
          </p>
        </motion.section>

        {/* Gallery: dataset tabs */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-4"
        >
          <div
            className="inline-flex flex-wrap rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1"
            role="radiogroup"
            aria-label="Choose a data column"
          >
            {DATASETS.map((d) => {
              const isActive = d.id === selectedId;
              return (
                <button
                  key={d.id}
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => handleSelect(d.id)}
                  className={`relative px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                    isActive
                      ? "bg-[var(--color-accent)] text-[#0a0e1a]"
                      : "text-[#94a3b8] hover:text-white"
                  }`}
                >
                  {d.tabLabel}
                  {diagnosed.has(d.id) && (
                    <span className="ml-1.5" aria-label="diagnosed">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Lab: histogram + diagnosis */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="lg:col-span-3 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
              <p className="text-[13px] font-semibold text-white">
                <span className="font-mono text-[var(--color-accent)]">
                  {dataset.columnName}
                </span>{" "}
                <span className="text-[#475569] font-normal">
                  · n = {dataset.values.length} · {dataset.unitSuffix}
                </span>
              </p>
            </div>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed mb-3">{dataset.story}</p>

            <Histogram
              values={dataset.values}
              binCount={bins}
              logScale={logOn}
              series={
                showSplit && dataset.groups
                  ? dataset.groups.map((g, i) => ({
                      name: g.name,
                      values: g.values,
                      color: GROUP_COLORS[i % GROUP_COLORS.length],
                    }))
                  : null
              }
              sentinel={dataset.sentinel}
              meanValue={showSplit ? null : diagnosis.mean}
              medianValue={showSplit ? null : diagnosis.median}
              fmt={dataset.fmt}
              ariaLabel={histAriaLabel}
            />

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-4 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="bin-slider"
                  className="text-[11px] text-[#94a3b8] whitespace-nowrap"
                >
                  Bins: <span className="font-mono text-white">{bins}</span>
                </label>
                <input
                  id="bin-slider"
                  type="range"
                  min={8}
                  max={50}
                  step={1}
                  value={bins}
                  onChange={(e) => setBins(Number(e.target.value))}
                  className="w-36 accent-[#d4af37]"
                />
              </div>

              <button
                onClick={handleToggleLog}
                disabled={!dataset.logSupported}
                aria-pressed={logOn}
                title={dataset.logSupported ? undefined : dataset.logDisabledReason}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  logOn
                    ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                    : dataset.logSupported
                      ? "border-[#334155] text-[#94a3b8] hover:border-[#d4af37] hover:text-white"
                      : "border-[#1e293b] text-[#475569] cursor-not-allowed"
                }`}
              >
                log10 x axis {logOn ? "on" : "off"}
              </button>
              {!dataset.logSupported && (
                <span className="text-[11px] text-[#475569]">
                  {dataset.logDisabledReason}
                </span>
              )}

              {dataset.id === "heights" && (
                <button
                  onClick={() => setSplitRevealed((s) => !s)}
                  aria-pressed={splitRevealed}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                    splitRevealed
                      ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                      : "border-[#334155] text-[#94a3b8] hover:border-[#d4af37] hover:text-white"
                  }`}
                >
                  {splitRevealed ? "Hide hidden groups" : "Split by hidden group"}
                </button>
              )}
            </div>

            {logOn && dataset.id === "transactions" && txnDiag.logSkew !== undefined && (
              <p className="text-[11px] text-[#94a3b8] mt-3">
                On the log axis the shape is roughly symmetric: computed skewness drops
                from {txnDiag.skew.toFixed(2)} (raw dollars) to {txnDiag.logSkew.toFixed(2)}{" "}
                (log10 dollars). When a log transform normalizes a column, the generating
                process is multiplicative.
              </p>
            )}
            {logOn && dataset.id === "response" && (
              <p className="text-[11px] text-[#94a3b8] mt-3">
                Even on a log axis this column stays lumpy: the slow path shows up as a
                second bump rather than folding into one clean bell. Heavy tails and hidden
                mixtures often survive the log transform; pure skew usually does not.
              </p>
            )}
            {showSplit && diagnosis.groupMeans && (
              <p className="text-[11px] text-[#94a3b8] mt-3">
                Recomputed per squad:{" "}
                {diagnosis.groupMeans
                  .map((g) => `${g.name} mean ${dataset.fmt(g.mean)}`)
                  .join(", ")}
                . Two clean bells were hiding in one column.
              </p>
            )}
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="lg:col-span-2"
          >
            <DiagnosisPanel
              dataset={dataset}
              diagnosis={diagnosis}
              opened={diagnosed.has(dataset.id)}
              onOpen={handleDiagnose}
            />

            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-2">
                Your Mission
              </p>
              <ol className="list-decimal list-inside text-[11px] text-[#94a3b8] leading-relaxed space-y-1">
                <li>Open all five columns and run the diagnosis on each</li>
                <li>Use the log10 toggle on a skewed column and watch the shape change</li>
                <li>Reveal the hidden groups behind the two-peaked Heights column</li>
                <li>Score at least {QUIZ_PASS} of {QUIZ_ITEMS.length} in the shape-matching exercise below</li>
              </ol>
            </div>
          </motion.div>
        </div>

        {/* Quiz */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-3">
            Shape-Matching Exercise
          </p>
          <ShapeMatchQuiz
            answers={quizAnswers}
            onAnswer={handleQuizAnswer}
            onRetry={handleQuizRetry}
            correctCount={quizCorrect}
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
                  Five Shapes, Read Like a Practitioner
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You diagnosed skew, heavy tails, hidden subgroups, a sentinel spike, and
                  zero inflation, then proved it on fresh columns.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Columns diagnosed</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {diagnosed.size} / {DATASETS.length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Quiz score</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {quizCorrect} / {QUIZ_ITEMS.length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Sentinel mean drag</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {sensorDiag.meanClean !== undefined
                        ? `${(sensorDiag.meanClean - sensorDiag.mean).toFixed(1)} C`
                        : "?"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;A histogram is a question, not a picture: what process made this
                    shape? Skew, twin peaks, long tails, spikes, and walls of zeros each
                    name a different generating process, and each one breaks a different
                    tool downstream.&quot;
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
