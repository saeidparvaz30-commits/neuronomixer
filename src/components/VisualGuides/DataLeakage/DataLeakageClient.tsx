"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import type { LeakState, Pipeline, SplitKind } from "./types";
import {
  LEAK_NOISE_DEFAULT,
  SHIFT_DEFAULT,
  TREND_DEFAULT,
  runChurnDemo,
  runScalingDemo,
  runTemporalDemo,
} from "./types";
import PreprocessingDemo from "./PreprocessingDemo";
import TargetLeakageDemo from "./TargetLeakageDemo";
import TemporalLeakageDemo from "./TemporalLeakageDemo";

const GUIDE_SLUG = "data-leakage";
const pct = (a: number) => `${Math.round(a * 100)}%`;

export default function DataLeakageClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // Demo A: preprocessing leakage
  const [pipeline, setPipeline] = useState<Pipeline>("leaky");
  const [pipelinesSeen, setPipelinesSeen] = useState<Set<Pipeline>>(new Set(["leaky"]));
  const [shift, setShift] = useState(SHIFT_DEFAULT);

  // Demo B: target leakage
  const [leak, setLeak] = useState<LeakState>("excluded");
  const [leakSeen, setLeakSeen] = useState<Set<LeakState>>(new Set(["excluded"]));
  const [leakNoise, setLeakNoise] = useState(LEAK_NOISE_DEFAULT);

  // Demo C: temporal leakage
  const [split, setSplit] = useState<SplitKind>("random");
  const [splitsSeen, setSplitsSeen] = useState<Set<SplitKind>>(new Set(["random"]));
  const [trend, setTrend] = useState(TREND_DEFAULT);

  const scaling = useMemo(() => runScalingDemo(shift), [shift]);
  const churn = useMemo(() => runChurnDemo(leakNoise), [leakNoise]);
  const temporal = useMemo(() => runTemporalDemo(trend), [trend]);

  function handlePipeline(p: Pipeline) {
    setPipeline(p);
    setPipelinesSeen((prev) => new Set([...prev, p]));
  }
  function handleLeak(l: LeakState) {
    setLeak(l);
    setLeakSeen((prev) => new Set([...prev, l]));
  }
  function handleSplit(s: SplitKind) {
    setSplit(s);
    setSplitsSeen((prev) => new Set([...prev, s]));
  }

  const demoADone = pipelinesSeen.size === 2;
  const demoBDone = leakSeen.size === 2;
  const demoCDone = splitsSeen.size === 2;
  const isComplete = demoADone && demoBDone && demoCDone;

  function handleReset() {
    setPipeline("leaky");
    setPipelinesSeen(new Set(["leaky"]));
    setShift(SHIFT_DEFAULT);
    setLeak("excluded");
    setLeakSeen(new Set(["excluded"]));
    setLeakNoise(LEAK_NOISE_DEFAULT);
    setSplit("random");
    setSplitsSeen(new Set(["random"]));
    setTrend(TREND_DEFAULT);
  }

  const progressItems = [
    { id: "preprocessing", label: "Compare scaling pipelines", done: demoADone },
    { id: "target", label: "Toggle the leaked feature", done: demoBDone },
    { id: "temporal", label: "Compare split strategies", done: demoCDone },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug={GUIDE_SLUG} score={4} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">Data Leakage</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Machine Learning
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Data Leakage{" "}
            <span className="text-[var(--color-accent)]">Too Good to Be True</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            Leakage is information from outside the training fold sneaking into training. The
            symptom: a validation score that looks fantastic, then a model that collapses in
            production. Break it three ways below, with every number computed live.
          </p>
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
        </div>

        {/* Definition */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent)] mb-2">
              What it is
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              Any path by which knowledge of the validation or test data, or of the future, or of
              the label itself, reaches the model during training. Unlike{" "}
              <Link href="/visual-guides/overfitting-underfitting" className="underline underline-offset-2 hover:text-white">
                overfitting
              </Link>
              , which honest validation catches, leakage corrupts the validation score itself. Your
              safety net is the thing that breaks.
            </p>
          </div>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5" style={{ borderColor: "color-mix(in srgb, var(--color-warning) 35%, transparent)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-warning)] mb-2">
              The symptom
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              Validation scores too good to be true, followed by production collapse. A classic
              example: fitting a seasonal decomposition on the full series before splitting off
              the holdout, so the holdout&apos;s own values shape the trend it is later scored
              against. If you work with time series, see the{" "}
              <Link href="/visual-guides/time-series-forecasting" className="underline underline-offset-2 hover:text-white">
                time series guide
              </Link>{" "}
              for how forecasting pipelines are built.
            </p>
          </div>
        </motion.section>

        {/* Demo A */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-10"
        >
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent)] mb-1">
              Demo 1 of 3
            </p>
            <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
              Preprocessing Leakage: Scale Before or After the Split?
            </h2>
            <p className="text-[12px] text-[#475569] leading-relaxed max-w-[720px]">
              Two identical 1-nearest-neighbor models on {scaling.trainN} training and{" "}
              {scaling.valN} validation points. One thing differs: whether the{" "}
              <Link href="/visual-guides/feature-scaling" className="underline underline-offset-2 hover:text-[#94a3b8]">
                z-scaler
              </Link>{" "}
              is fitted before the split (leaky) or on the training half only (honest). The
              validation half carries a batch offset on one feature, the kind of distribution
              shift real deployments hit constantly.
            </p>
          </div>
          <PreprocessingDemo
            result={scaling}
            pipeline={pipeline}
            onPipelineChange={handlePipeline}
            shift={shift}
            onShiftChange={setShift}
          />
        </motion.section>

        {/* Demo B */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-10"
        >
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent)] mb-1">
              Demo 2 of 3
            </p>
            <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
              Target Leakage: A Feature That Is Secretly the Answer
            </h2>
            <p className="text-[12px] text-[#475569] leading-relaxed max-w-[720px]">
              A logistic regression predicts customer churn from {churn.trainN + churn.valN}{" "}
              synthetic customers. Toggle in days_until_churn_call, a column that is generated as
              a noisy copy of the churn label, and watch validation accuracy jump toward perfect.
            </p>
          </div>
          <TargetLeakageDemo
            result={churn}
            leak={leak}
            onLeakChange={handleLeak}
            noise={leakNoise}
            onNoiseChange={setLeakNoise}
          />
        </motion.section>

        {/* Demo C */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-10"
        >
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent)] mb-1">
              Demo 3 of 3
            </p>
            <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
              Temporal Leakage: Random Split on a Trending Series
            </h2>
            <p className="text-[12px] text-[#475569] leading-relaxed max-w-[720px]">
              A trending series of {temporal.series.length} points, and a model that predicts each
              held-out point with the value at the nearest training timestamp. A random split
              scatters held-out points between training neighbors, so the model quietly
              interpolates the future from both sides. A time-based split holds out the end of the
              series, the only setup that matches how{" "}
              <Link href="/visual-guides/time-series-forecasting" className="underline underline-offset-2 hover:text-[#94a3b8]">
                forecasting
              </Link>{" "}
              is used in reality.
            </p>
          </div>
          <TemporalLeakageDemo
            result={temporal}
            split={split}
            onSplitChange={handleSplit}
            trend={trend}
            onTrendChange={setTrend}
          />
        </motion.section>

        {/* Prose panels: group leakage + checklist */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent)] mb-2">
              The fourth flavor: group leakage and duplicates
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
              When several rows belong to the same entity (one patient with many scans, one user
              with many sessions), a random split puts siblings of the same entity on both sides.
              The model recognizes the entity instead of learning the pattern, and the validation
              score inflates just like in the demos above.
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              Near-duplicates do the same thing: if a row appears in both folds, the model is
              graded on questions it memorized. The fixes are structural: deduplicate before
              splitting, and split by group so an entity lives entirely in one fold.
            </p>
          </div>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-success)] mb-2">
              The leakage checklist
            </p>
            <ul className="flex flex-col gap-2.5">
              <li className="flex items-start gap-2 text-[12px] text-[#94a3b8] leading-relaxed">
                <span className="mt-0.5 shrink-0 text-[var(--color-success)]" aria-hidden="true">✓</span>
                <span>
                  Fit every preprocessing step (scalers, imputers, encoders, feature selection)
                  inside the training fold, and inside every fold of{" "}
                  <Link href="/visual-guides/cross-validation" className="underline underline-offset-2 hover:text-white">
                    cross-validation
                  </Link>
                  . A pipeline object that refits per fold makes the leak structurally impossible.
                </span>
              </li>
              <li className="flex items-start gap-2 text-[12px] text-[#94a3b8] leading-relaxed">
                <span className="mt-0.5 shrink-0 text-[var(--color-success)]" aria-hidden="true">✓</span>
                <span>
                  Interrogate every feature: is this available at prediction time? If it is
                  recorded after the outcome, derived from the label, or updated retroactively, it
                  is a leak no matter how good it looks offline.
                </span>
              </li>
              <li className="flex items-start gap-2 text-[12px] text-[#94a3b8] leading-relaxed">
                <span className="mt-0.5 shrink-0 text-[var(--color-success)]" aria-hidden="true">✓</span>
                <span>
                  Split the way production will query you: by time when order matters, by group
                  when rows share an entity, and only fully at random when rows are genuinely
                  independent.
                </span>
              </li>
            </ul>
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
                  Leak Detector Certified
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You ran all three comparisons and watched honest evaluation deflate every
                  inflated score.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Preprocessing leak (1-NN accuracy)</p>
                    <p className="text-[14px] font-mono font-bold">
                      <span style={{ color: "var(--color-warning)" }}>{pct(scaling.leaky.accuracy)}</span>
                      <span className="text-[#475569]"> vs </span>
                      <span style={{ color: "var(--color-success)" }}>{pct(scaling.proper.accuracy)}</span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Target leak (validation accuracy)</p>
                    <p className="text-[14px] font-mono font-bold">
                      <span style={{ color: "var(--color-success)" }}>{pct(churn.baseline.accuracy)}</span>
                      <span className="text-[#475569]"> to </span>
                      <span style={{ color: "var(--color-warning)" }}>{pct(churn.withLeak.accuracy)}</span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Temporal leak (MAE, random vs time)</p>
                    <p className="text-[14px] font-mono font-bold">
                      <span style={{ color: "var(--color-warning)" }}>{temporal.random.mae.toFixed(1)}</span>
                      <span className="text-[#475569]"> vs </span>
                      <span style={{ color: "var(--color-success)" }}>{temporal.time.mae.toFixed(1)}</span>
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;If a validation score looks too good to be true, it probably is. Ask of
                    every feature and every preprocessing step: was this fitted, and would this be
                    available, using only what the model could legitimately know at training
                    time?&quot;
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
                    href="/visual-guides/cross-validation"
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
              href="/visual-guides/cross-validation"
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
