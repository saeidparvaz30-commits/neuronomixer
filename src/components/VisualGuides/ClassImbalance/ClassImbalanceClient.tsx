"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  buildDataset,
  computeRoc,
  computePr,
  confusionAt,
  metricsFrom,
  optimalThresholds,
} from "./types";
import ImbalanceControl from "./ImbalanceControl";
import ScoreDistributionPlot from "./ScoreDistributionPlot";
import RocPrCurves from "./RocPrCurves";
import ThresholdPanel from "./ThresholdPanel";
import ConceptPanels from "./ConceptPanels";

const GUIDE_SLUG = "class-imbalance";
const NEXT_GUIDE_SLUG = "roc-curves";

// Balanced (1:1) reference, computed once from the same deterministic score model.
const BALANCED = buildDataset(1);
const BALANCED_AUC = computeRoc(BALANCED).auc;
const BALANCED_AP = computePr(BALANCED).averagePrecision;

export default function ClassImbalanceClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  const [ratio, setRatio] = useState(1);
  const [threshold, setThreshold] = useState(0.5);
  const [reachedFifty, setReachedFifty] = useState(false);
  const [sweptBack, setSweptBack] = useState(false);
  const [thresholdMoved, setThresholdMoved] = useState(false);
  const [metricPanelOpened, setMetricPanelOpened] = useState(false);
  const [resetCount, setResetCount] = useState(0);

  const isComplete = sweptBack && thresholdMoved && metricPanelOpened;

  const dataset = useMemo(() => buildDataset(ratio), [ratio]);
  const roc = useMemo(() => computeRoc(dataset), [dataset]);
  const pr = useMemo(() => computePr(dataset), [dataset]);
  const cm = useMemo(() => confusionAt(dataset, threshold), [dataset, threshold]);
  const metrics = useMemo(() => metricsFrom(cm), [cm]);
  const optimal = useMemo(() => optimalThresholds(dataset), [dataset]);

  const nPos = dataset.pos.length;
  const nNeg = dataset.neg.length;
  const total = nPos + nNeg;
  const majorityCount = Math.max(nPos, nNeg);
  const majorityLabel = nNeg >= nPos ? "negative" : "positive";
  const baselineAccuracy = majorityCount / total;
  const modelBeatsBaseline = metrics.accuracy > baselineAccuracy;

  const handleRatioChange = useCallback(
    (r: number) => {
      setRatio(r);
      if (r >= 50) {
        setReachedFifty(true);
      } else if (r <= 5 && reachedFifty) {
        setSweptBack(true);
      }
    },
    [reachedFifty]
  );

  const handleThresholdChange = useCallback((t: number) => {
    setThreshold(t);
    setThresholdMoved(true);
  }, []);

  const handleMetricPanelOpen = useCallback(() => {
    setMetricPanelOpened(true);
  }, []);

  function handleReset() {
    setRatio(1);
    setThreshold(0.5);
    setReachedFifty(false);
    setSweptBack(false);
    setThresholdMoved(false);
    setMetricPanelOpened(false);
    setResetCount((c) => c + 1);
  }

  const progressItems = [
    {
      id: "sweep",
      label: !reachedFifty
        ? "Sweep imbalance to 1:50"
        : !sweptBack
          ? "Now sweep back below 1:5"
          : "Imbalance swept both ways",
      done: sweptBack,
    },
    { id: "threshold", label: "Move the threshold", done: thresholdMoved },
    {
      id: "metric",
      label: "Open “Which metric when”",
      done: metricPanelOpened,
    },
  ];

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
          <span className="text-[#94a3b8]">Class Imbalance</span>
        </nav>

        {/* Hero */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Machine Learning
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Class Imbalance{" "}
            <span className="text-[var(--color-accent)]">
              and the Accuracy Trap
            </span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            A model can score 99% accuracy while missing every case you care about.
            Crank the imbalance and watch which metrics stay honest and which ones
            flatter you.
          </p>
        </motion.section>

        {/* Progress */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {progressItems.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{
                  background: item.done ? "var(--color-accent)" : "#1e293b",
                }}
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
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          {/* Section 1: The accuracy trap */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
          >
            <div className="mb-4">
              <p className="text-[13px] font-semibold text-white mb-1">
                Step 1: Set the Imbalance
              </p>
              <p className="text-[12px] text-[#475569] leading-relaxed max-w-[640px]">
                The dataset always holds about 400 points. The ratio decides how many
                belong to each class: 1:{ratio} means {ratio} negative
                {ratio === 1 ? "" : "s"} for every positive. Sweep it up to 1:50 or
                beyond, then bring it back.
              </p>
            </div>

            <ImbalanceControl ratio={ratio} onChange={handleRatioChange} />

            {/* Baseline card, computed live */}
            <div
              className="mt-5 rounded-xl border border-[#1e293b] border-l-4 p-4"
              style={{ borderLeftColor: "var(--color-warning)" }}
            >
              <p className="text-[12px] font-semibold uppercase tracking-wide mb-1.5 text-[var(--color-warning)]">
                The do-nothing baseline
              </p>
              <p className="text-[12.5px] text-[#94a3b8] leading-relaxed">
                A &quot;model&quot; that predicts{" "}
                <span className="font-semibold text-white">{majorityLabel}</span> for
                every single point scores accuracy ={" "}
                <span className="font-mono text-white">
                  {majorityCount} / {total}
                </span>{" "}
                ={" "}
                <span className="font-mono font-bold text-[var(--color-warning)]">
                  {(baselineAccuracy * 100).toFixed(1)}%
                </span>{" "}
                on the current data, while catching{" "}
                <span className="font-mono text-white">
                  {majorityLabel === "negative" ? 0 : nPos}
                </span>{" "}
                of the {nPos} positives. Your actual classifier at the current threshold
                scores{" "}
                <span
                  className="font-mono font-bold"
                  style={{
                    color: modelBeatsBaseline
                      ? "var(--color-success)"
                      : "var(--color-warning)",
                  }}
                >
                  {(metrics.accuracy * 100).toFixed(1)}%
                </span>
                {modelBeatsBaseline
                  ? ", so it beats the baseline. But notice how thin the gap gets as imbalance grows."
                  : ", which does not even beat doing nothing. Accuracy has stopped measuring anything useful."}
              </p>
            </div>
          </motion.section>

          {/* Section 2: Centerpiece */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
          >
            <div className="mb-4">
              <p className="text-[13px] font-semibold text-white mb-1">
                Step 2: Same Scores, Different Story
              </p>
              <p className="text-[12px] text-[#475569] leading-relaxed max-w-[640px]">
                Both curves below are computed live from the exact points shown in the
                strip plot. Sweep the imbalance and compare how each one reacts.
              </p>
            </div>

            <ScoreDistributionPlot
              pos={dataset.pos}
              neg={dataset.neg}
              threshold={threshold}
            />

            <div className="mt-5">
              <RocPrCurves
                roc={roc}
                pr={pr}
                cm={cm}
                balancedAuc={BALANCED_AUC}
                balancedAp={BALANCED_AP}
                ratio={ratio}
              />
            </div>
          </motion.section>

          {/* Section 3: Threshold */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
          >
            <div className="mb-3">
              <p className="text-[13px] font-semibold text-white mb-1">
                Step 3: Pick Your Operating Point
              </p>
              <p className="text-[12px] text-[#475569] max-w-[640px]">
                A curve is every threshold at once; production needs exactly one. See
                how the &quot;best&quot; threshold depends on which metric you optimize.
              </p>
            </div>
            <ThresholdPanel
              threshold={threshold}
              onThresholdChange={handleThresholdChange}
              cm={cm}
              metrics={metrics}
              optimal={optimal}
            />
          </motion.section>

          {/* Section 4: Concepts */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
          >
            <div className="mb-3">
              <p className="text-[13px] font-semibold text-white mb-1">
                Step 4: What To Do About It
              </p>
              <p className="text-[12px] text-[#475569] max-w-[640px]">
                Four short reads. The third one is required to finish the guide.
              </p>
            </div>
            <ConceptPanels
              key={resetCount}
              onMetricPanelOpen={handleMetricPanelOpen}
            />
          </motion.section>
        </div>

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
                  You Escaped the Accuracy Trap
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You watched ROC stay calm while precision collapsed, and you saw the
                  accuracy-optimal and F1-optimal thresholds part ways.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    {
                      label: "Imbalance swept",
                      value: "1:50 and back",
                      color: "var(--color-accent)",
                    },
                    {
                      label: "Curves compared",
                      value: "ROC vs PR",
                      color: "#3bb4a4",
                    },
                    {
                      label: "Threshold optima",
                      value: "Accuracy vs F1",
                      color: "#a855f7",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-[#1e293b] p-3"
                    >
                      <p className="text-[10px] text-[#475569] mb-1">{item.label}</p>
                      <p
                        className="text-[14px] font-mono font-bold"
                        style={{ color: item.color }}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Under imbalance, accuracy mostly measures the class prior. Judge
                    a rare-event model by precision, recall, and the PR curve, and choose
                    the threshold from the cost of each mistake, not from habit.&quot;
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
