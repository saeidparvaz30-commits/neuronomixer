"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  CategoryId,
  POOL,
  SLICES,
  TASK_BY_ID,
  drawFromCategory,
  drawRandom,
  remainingInCategory,
} from "./types";
import {
  clopperPearson,
  noiseCeiling,
  passCount,
  pct,
  rawPassRate,
  stratifiedPassRate,
} from "./stats";
import SamplingLab, { WidthSnapshot } from "./SamplingLab";
import StratificationPanel from "./StratificationPanel";
import LabelNoiseLab from "./LabelNoiseLab";

const GUIDE_TITLE = "Designing Eval Datasets";
const NEXT_GUIDE_SLUG = "rlhf";

// Gate constants. TARGET_WIDTH = 0.28 is reachable at roughly 50 tasks when
// the pass rate sits in the 60s, which is exactly the "20 to 50 tasks" range
// the prose cites as a legitimate starting eval set.
const TARGET_WIDTH = 0.28;
const MIN_SET_SIZE = 30;
const SKEW_THRESHOLD = 0.03;
const SKEW_MIN_SET = 20;
const NOISE_THRESHOLD = 0.1;
const NOISE_MIN_SET = 20;

export default function EvalDatasetDesignClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Interaction state (mount defaults; Try Again restores exactly these) ──
  const [sampledIds, setSampledIds] = useState<readonly string[]>([]);
  const [snapshots, setSnapshots] = useState<readonly WidthSnapshot[]>([]);
  const [selectedCat, setSelectedCat] = useState<CategoryId>("billing");
  const [flipRate, setFlipRate] = useState(0);
  const [noiseNonce, setNoiseNonce] = useState(1);
  const [gateCI, setGateCI] = useState(false);
  const [gateSkew, setGateSkew] = useState(false);
  const [latchedSkew, setLatchedSkew] = useState<number | null>(null);
  const [gateNoise, setGateNoise] = useState(false);
  const [latchedNoise, setLatchedNoise] = useState<number | null>(null);

  // ── Derived data ───────────────────────────────────────────────────────────
  const sampledSet = useMemo(() => new Set(sampledIds), [sampledIds]);
  const tasks = useMemo(
    () =>
      sampledIds.flatMap((id) => {
        const t = TASK_BY_ID.get(id);
        return t ? [t] : [];
      }),
    [sampledIds]
  );
  const passes = useMemo(() => passCount(tasks), [tasks]);
  const ci = useMemo(() => clopperPearson(passes, tasks.length), [passes, tasks]);

  const isComplete = gateCI && gateSkew && gateNoise;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const addIds = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const nextIds = [...sampledIds, ...ids];
      const nextTasks = nextIds.flatMap((id) => {
        const t = TASK_BY_ID.get(id);
        return t ? [t] : [];
      });
      const k = passCount(nextTasks);
      const nextCI = clopperPearson(k, nextTasks.length);
      setSampledIds(nextIds);
      setSnapshots((prev) => [
        ...prev,
        { n: nextTasks.length, width: nextCI.width },
      ]);
      if (nextTasks.length >= MIN_SET_SIZE && nextCI.width <= TARGET_WIDTH) {
        setGateCI(true);
      }
      const raw = rawPassRate(nextTasks);
      const strat = stratifiedPassRate(nextTasks);
      if (
        raw !== null &&
        strat.estimate !== null &&
        nextTasks.length >= SKEW_MIN_SET
      ) {
        const divergence = Math.abs(raw - strat.estimate);
        if (divergence >= SKEW_THRESHOLD) {
          setGateSkew(true);
          setLatchedSkew((prev) => Math.max(prev ?? 0, divergence));
        }
      }
    },
    [sampledIds]
  );

  const handleAddRandom = useCallback(
    (count: number) => addIds(drawRandom(sampledSet, count)),
    [addIds, sampledSet]
  );

  const handleAddCategory = useCallback(
    (count: number) => addIds(drawFromCategory(sampledSet, selectedCat, count)),
    [addIds, sampledSet, selectedCat]
  );

  const handleFlipRate = useCallback(
    (v: number) => {
      setFlipRate(v);
      if (v >= NOISE_THRESHOLD && tasks.length >= NOISE_MIN_SET) {
        setGateNoise(true);
        setLatchedNoise((prev) => Math.max(prev ?? 0, v));
      }
    },
    [tasks.length]
  );

  const handleReroll = useCallback(() => setNoiseNonce((x) => x + 1), []);

  function handleReset() {
    setSampledIds([]);
    setSnapshots([]);
    setSelectedCat("billing");
    setFlipRate(0);
    setNoiseNonce(1);
    setGateCI(false);
    setGateSkew(false);
    setLatchedSkew(null);
    setGateNoise(false);
    setLatchedNoise(null);
  }

  const progressItems = [
    {
      id: "ci",
      label: `Hit the CI target (${MIN_SET_SIZE}+ tasks, width ≤ ${Math.round(
        TARGET_WIDTH * 100
      )} pts)`,
      done: gateCI,
    },
    { id: "skew", label: "Catch a sampling skew", done: gateSkew },
    { id: "noise", label: "Run the label-noise experiment", done: gateNoise },
  ];

  return (
    <div
      className="min-h-screen pb-20"
      style={{ "--cat-accent": "#ec4899" } as React.CSSProperties}
    >
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="eval-dataset-design"
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
            Designing{" "}
            <span className="text-[var(--color-accent)]">Eval Datasets</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            An eval set is a measurement instrument built from your own
            failures. Assemble one task by task, watch the exact confidence
            interval narrow, then stress it with skewed sampling and noisy
            labels.
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

        {/* Start from real failures */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Start from real failures, not invented test cases
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-2">
            The best eval tasks are the ones your system already got wrong in
            production: they are realistic by construction, and they encode
            exactly the behavior you care about fixing. Anthropic&apos;s evals
            guidance and Chip Huyen&apos;s AI Engineering (chapter 4) agree on
            the starting move: begin small, around 20 to 50 tasks pulled from
            real failures and real traffic, and grow the set as you learn where
            it is blind.
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            Below is a simulated pool of {POOL.length} production tasks for a
            support assistant, grouped into four slices. Each task carries a
            hidden true label: whether the current model handles it correctly.
            Sampling a task into your eval set reveals its label (you run the
            model and grade the output). The question the rest of this guide
            answers: how many tasks, sampled how, graded how reliably, before
            you can trust the number that comes out?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SLICES.map((s) => {
              const inPool = POOL.filter((t) => t.category === s.id);
              return (
                <div key={s.id} className="rounded-xl border border-[#1e293b] p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: s.color }}
                      aria-hidden="true"
                    />
                    <p className="text-[12px] font-semibold text-white">{s.label}</p>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed mb-2">
                    {s.blurb}
                  </p>
                  <p className="text-[10px] text-[#475569]">
                    <span className="font-mono text-[#94a3b8]">
                      {pct(s.share, 0)}
                    </span>{" "}
                    of traffic ·{" "}
                    <span className="font-mono text-[#94a3b8]">{inPool.length}</span>{" "}
                    tasks in pool
                  </p>
                  <p className="text-[10px] text-[#475569] mt-1.5 italic">
                    e.g. &quot;{inPool[0].text}&quot;
                  </p>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Sampling lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Size: watch the error bars narrow
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            A pass rate measured on n tasks is an estimate, not a fact. The
            interval below is the exact 95% Clopper-Pearson binomial interval,
            computed from your set&apos;s pass count with the incomplete beta
            function. Add tasks and watch it tighten; notice how expensive each
            extra point of precision becomes.
          </p>
          <SamplingLab
            tasks={tasks}
            passes={passes}
            ci={ci}
            snapshots={snapshots}
            selectedCat={selectedCat}
            onSelectCat={setSelectedCat}
            onAddRandom={handleAddRandom}
            onAddCategory={handleAddCategory}
            remainingRandom={POOL.length - tasks.length}
            remainingSelected={remainingInCategory(sampledSet, selectedCat)}
            targetWidth={TARGET_WIDTH}
            minSetSize={MIN_SET_SIZE}
            gateHit={gateCI}
          />
        </motion.section>

        {/* Stratification */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Stratification: what are you actually measuring?
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            A narrow interval around the wrong quantity is worse than a wide
            one around the right quantity. If your set over-represents a slice,
            the raw average measures your collection habits, not your traffic.
            Stratification fixes it: estimate each slice separately, then weight
            by the slice&apos;s real production share.
          </p>
          <StratificationPanel
            tasks={tasks}
            skewThreshold={SKEW_THRESHOLD}
            gateHit={gateSkew}
          />
        </motion.section>

        {/* Label noise */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Label noise: the ceiling on what you can measure
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            Every grade in an eval set comes from a judge: a human annotator or
            an LLM grader, and judges make mistakes. Inject label noise into
            your set and watch the measured score decouple from true quality.
            The relationship is exact and computed live, not simulated.
          </p>
          <LabelNoiseLab
            tasks={tasks}
            flipRate={flipRate}
            onFlipRate={handleFlipRate}
            nonce={noiseNonce}
            onReroll={handleReroll}
            noiseThreshold={NOISE_THRESHOLD}
            minSetSize={NOISE_MIN_SET}
            gateHit={gateNoise}
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
                  Eval Set Assembled!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You built a measurable eval set from production failures,
                  caught a sampling skew with stratification, and found the
                  ceiling noisy labels put on any score.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Your eval set</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {tasks.length} tasks, CI width{" "}
                      {(ci.width * 100).toFixed(1)} pts
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Skew you caught
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--cat-accent)]">
                      {latchedSkew === null
                        ? "?"
                        : `raw vs weighted: ${(latchedSkew * 100).toFixed(1)} pts`}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Noise ceiling you found
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {latchedNoise === null
                        ? "?"
                        : `${pct(latchedNoise, 0)} noise caps scores at ${pct(
                            noiseCeiling(latchedNoise),
                            0
                          )}`}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;An eval set is a measurement instrument. Size sets the
                    error bars, sampling decides what you are actually
                    measuring, and label quality caps what any model can score.
                    Check all three before trusting the number.&quot;
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
