"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  generateAdData,
  generateDeliveries,
  generateHourly,
  computeTransformFit,
  computeInteractionFits,
  computeDatetimeFit,
  TransformId,
  TransformFit,
  TRANSFORM_ORDER,
  TRANSFORM_META,
  DatetimeFeatureId,
  BIN_INITIAL,
  AD_SEED,
  AD_N,
  DELIVERY_SEED,
  DELIVERY_N,
  HOURS_SEED,
  HOURS_N,
  GAIN_GATE_PCT,
} from "./types";
import TransformBench from "./TransformBench";
import InteractionLab from "./InteractionLab";
import DatetimeExpander from "./DatetimeExpander";

// Deterministic datasets: identical on server and client (seeded PRNG, no Math.random).
const ADS = generateAdData();
const DELIVERIES = generateDeliveries();
const HOURS = generateHourly();

const GUIDE_TITLE = "Making Features Speak";
const GUIDE_SLUG = "feature-engineering-craft";
const NEXT_GUIDE_SLUG = "dimensionality-reduction";

export default function FeatureEngineeringCraftClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // Section 1: transform bench
  const [transform, setTransform] = useState<TransformId>("raw");
  const [tried, setTried] = useState<ReadonlySet<TransformId>>(new Set());
  const [binCount, setBinCount] = useState(BIN_INITIAL);
  const [benchDone, setBenchDone] = useState(false);

  // Section 2: interaction lab
  const [interactionOn, setInteractionOn] = useState(false);
  const [interactionSeen, setInteractionSeen] = useState(false);

  // Section 3: datetime expander
  const [dtFeatures, setDtFeatures] = useState<ReadonlySet<DatetimeFeatureId>>(new Set());
  const [dtGateReached, setDtGateReached] = useState(false);
  const [bestGainPct, setBestGainPct] = useState(0);

  // ── Live computation ────────────────────────────────────────────────────────
  const transformFits = useMemo(() => {
    const out = {} as Record<TransformId, TransformFit>;
    for (const t of TRANSFORM_ORDER) out[t] = computeTransformFit(ADS, t, binCount);
    return out;
  }, [binCount]);

  const interactionFits = useMemo(() => computeInteractionFits(DELIVERIES), []);

  const dtBaseFit = useMemo(() => computeDatetimeFit(HOURS, new Set()), []);
  const dtCurFit = useMemo(() => computeDatetimeFit(HOURS, dtFeatures), [dtFeatures]);
  const dtGainPct = ((dtBaseFit.rmse - dtCurFit.rmse) / dtBaseFit.rmse) * 100;

  // Gate 1: among the transforms actually tried, one beats raw and one loses to it.
  const benchSolvedNow = useMemo(() => {
    const rawRmse = transformFits.raw.rmse;
    let helped = false;
    let hurt = false;
    for (const t of tried) {
      if (transformFits[t].rmse < rawRmse) helped = true;
      if (transformFits[t].rmse > rawRmse) hurt = true;
    }
    return helped && hurt;
  }, [tried, transformFits]);

  useEffect(() => {
    if (benchSolvedNow) setBenchDone(true);
  }, [benchSolvedNow]);

  useEffect(() => {
    if (dtGainPct >= GAIN_GATE_PCT) setDtGateReached(true);
    setBestGainPct((prev) => Math.max(prev, dtGainPct));
  }, [dtGainPct]);

  // ── Gates ──────────────────────────────────────────────────────────────────
  const gateBench = benchDone;
  const gateInteraction = interactionSeen;
  const gateDatetime = dtGateReached;
  const isComplete = gateBench && gateInteraction && gateDatetime;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleTransformSelect = useCallback((t: TransformId) => {
    setTransform(t);
    if (t !== "raw") {
      setTried((prev) => (prev.has(t) ? prev : new Set(prev).add(t)));
    }
  }, []);

  const handleInteractionToggle = useCallback(() => {
    // The lab starts with the interaction off, so the first toggle always
    // turns it on: any toggle means the interaction fit has been seen.
    setInteractionOn((prev) => !prev);
    setInteractionSeen(true);
  }, []);

  const handleDtFeatureToggle = useCallback((f: DatetimeFeatureId) => {
    setDtFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }, []);

  function handleReset() {
    setTransform("raw");
    setTried(new Set());
    setBinCount(BIN_INITIAL);
    setBenchDone(false);
    setInteractionOn(false);
    setInteractionSeen(false);
    setDtFeatures(new Set());
    setDtGateReached(false);
    setBestGainPct(0);
  }

  // Best transform actually tried (raw always counts as seen).
  const bestTried = useMemo(() => {
    let best: TransformId = "raw";
    for (const t of tried) {
      if (transformFits[t].rmse < transformFits[best].rmse) best = t;
    }
    return best;
  }, [tried, transformFits]);

  const interactionDropPct =
    ((interactionFits.additive.rmse - interactionFits.interaction.rmse) /
      interactionFits.additive.rmse) *
    100;

  const progressItems = [
    { id: "bench", label: "Find a transform that helps and one that hurts", done: gateBench },
    { id: "interaction", label: "Add the interaction column", done: gateInteraction },
    { id: "datetime", label: `Cut timestamp error by ${GAIN_GATE_PCT}%`, done: gateDatetime },
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
            Making Features <span className="text-[var(--color-accent)]">Speak</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            A raw column is a fact. A feature is a fact phrased so the model
            can hear it. Transform a skewed column, multiply two innocent ones,
            and unpack a timestamp, with a real least-squares fit rerunning on
            every move to tell you whether the data agrees.
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

        {/* Definition + honesty card */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The model can only use what you spell out
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            A linear model is deliberately simple: it can only add up straight
            line effects of the columns it is given. Feature engineering is the
            craft of rewriting the columns so the truth becomes expressible:
            bend a skewed scale, multiply two columns whose product carries the
            price, split a timestamp into the rhythms hiding inside it. Two
            neighboring moves have their own guides: turning categories into
            numbers is covered in{" "}
            <Link
              href="/visual-guides/categorical-encoding"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              categorical encoding
            </Link>
            , and putting columns on comparable scales is covered in{" "}
            <Link
              href="/visual-guides/feature-scaling"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              feature scaling
            </Link>
            . This guide owns the rest: transforms, bins, interactions, and
            extraction.
          </p>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            How this playground stays honest: the {AD_N} ad-spend days (seed{" "}
            {AD_SEED}), the {DELIVERY_N} deliveries (seed {DELIVERY_SEED}), and
            the {HOURS_N} hourly pickup counts (seed {HOURS_SEED}) are generated
            once with a seeded generator. Every RMSE, R squared, coefficient,
            and percentage on this page comes from an exact least-squares solve
            of the normal equations, rerun in your browser on every toggle.
            Nothing is precomputed.
          </p>
        </motion.section>

        {/* Section 1: transforms and bins */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            1 · Reshape one column: transforms and bins
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-4">
            A growth team logs daily ad spend and daily signups. Spend buys
            less and less as it grows, so a straight line in raw dollars misses
            at both ends. Hand the model a reshaped version of the same column
            and watch the error respond. At least one popular move makes things
            worse here; find it.
          </p>
          <TransformBench
            data={ADS}
            fits={transformFits}
            active={transform}
            onSelect={handleTransformSelect}
            tried={tried}
            binCount={binCount}
            onBinCountChange={setBinCount}
          />
        </motion.section>

        {/* Section 2: interactions */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            2 · Multiply two columns: interactions
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-4">
            A courier invoices {DELIVERY_N} deliveries. Distance matters,
            weight matters, but part of the price is per km-kg: the two columns
            act together. Fit distance and weight alone, then add their product
            as a third feature and watch the residuals collapse toward the
            diagonal.
          </p>
          <InteractionLab
            rows={DELIVERIES}
            fits={interactionFits}
            interactionOn={interactionOn}
            onToggle={handleInteractionToggle}
            seen={interactionSeen}
          />
        </motion.section>

        {/* Section 3: datetime extraction */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            3 · Unpack a timestamp: extraction
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-4">
            A bike-share system records one number per hour: pickups, keyed by
            a timestamp. To a linear model the raw timestamp is almost
            meaningless, yet the weekday commute peaks and the lazy weekend
            hump are sitting right inside it. Extract features until you cut
            the prediction error by at least {GAIN_GATE_PCT} percent.
          </p>
          <DatetimeExpander
            rows={HOURS}
            features={dtFeatures}
            onToggle={handleDtFeatureToggle}
            baseFit={dtBaseFit}
            curFit={dtCurFit}
            gateReached={dtGateReached}
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
                  The Columns Are Talking Now
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You reshaped a skewed column, built the feature the raw table
                  never shipped, and taught a timestamp to admit what it knew.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Best single-column feature you tried
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {TRANSFORM_META[bestTried].label}: RMSE {transformFits[bestTried].rmse.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      vs {transformFits.raw.rmse.toFixed(2)} on the raw column
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Interaction column payoff
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      -{interactionDropPct.toFixed(0)}% error
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      ${interactionFits.additive.rmse.toFixed(2)} down to $
                      {interactionFits.interaction.rmse.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Best timestamp gain you reached
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {bestGainPct.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      error cut vs the raw hours-since-start column
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Feature engineering is a conversation with the data,
                    not a checklist. Every transform is a hypothesis about how
                    the world works, and the refit error is the world answering
                    back. Propose, measure, keep what helps, and drop what does
                    not.&quot;
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
