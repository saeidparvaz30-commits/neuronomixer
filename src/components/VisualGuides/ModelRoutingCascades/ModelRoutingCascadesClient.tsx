"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  TierParams,
  PolicyLock,
  DEFAULT_TIERS,
  DEFAULT_THRESHOLD,
  DEFAULT_CALIBRATION,
  WIN_TOLERANCE,
  LOCK_MIN_CALIBRATION,
  BREAK_CALIBRATION_MAX,
  BREAK_ACCURACY_DROP,
  BREAK_CONFIDENCE_SLACK,
  CASCADE_PINK,
} from "./types";
import {
  generateStream,
  simulateCascade,
  simulateAlways,
  computeFrontier,
  beatsAlwaysBig,
} from "./cascadeMath";
import CascadeFlow from "./CascadeFlow";
import TierControls from "./TierControls";
import FrontierChart from "./FrontierChart";
import SilentFailurePanel from "./SilentFailurePanel";
import RoutingChallenge from "./RoutingChallenge";

const GUIDE_TITLE = "Model Routing and Cascades";
const NEXT_GUIDE_SLUG = "llm-monitoring-drift";

function cloneDefaults(): TierParams[] {
  return DEFAULT_TIERS.map((t) => ({ ...t }));
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export default function ModelRoutingCascadesClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Interaction state (mount defaults; Try Again restores exactly these) ──
  const [tiers, setTiers] = useState<TierParams[]>(cloneDefaults);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [calibration, setCalibration] = useState(DEFAULT_CALIBRATION);
  const [lock, setLock] = useState<PolicyLock | null>(null);
  const [breakAcked, setBreakAcked] = useState(false);
  const [challengePick, setChallengePick] = useState<number | null>(null);
  const [challengeSolved, setChallengeSolved] = useState(false);

  // ── Simulation (every displayed number comes from cascadeMath.ts) ─────────
  const stream = useMemo(() => generateStream(), []);
  const sim = useMemo(
    () => simulateCascade(stream, tiers, threshold, calibration),
    [stream, tiers, threshold, calibration]
  );
  const alwaysBig = useMemo(
    () => simulateAlways(stream, tiers, tiers.length - 1),
    [stream, tiers]
  );
  const alwaysSmall = useMemo(() => simulateAlways(stream, tiers, 0), [stream, tiers]);
  const frontier = useMemo(
    () => computeFrontier(stream, tiers, calibration),
    [stream, tiers, calibration]
  );

  const isWin = beatsAlwaysBig(sim, alwaysBig);
  const savings = (alwaysBig.avgCost - sim.avgCost) / alwaysBig.avgCost;
  const qualityDelta = sim.accuracy - alwaysBig.accuracy;

  // ── Derived gates ──────────────────────────────────────────────────────────
  const canLock = isWin && calibration >= LOCK_MIN_CALIBRATION;
  const gateLock = lock !== null;

  const breakConditionMet =
    lock !== null &&
    calibration <= BREAK_CALIBRATION_MAX &&
    sim.accuracy <= lock.accuracy - BREAK_ACCURACY_DROP &&
    sim.dashboardConfidence !== null &&
    (lock.dashboardConfidence === null ||
      sim.dashboardConfidence >= lock.dashboardConfidence - BREAK_CONFIDENCE_SLACK);

  const isComplete = gateLock && breakAcked && challengeSolved;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleTierChange = useCallback(
    (index: number, patch: Partial<Pick<TierParams, "cost" | "skill">>) => {
      setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
    },
    []
  );

  const handleLock = useCallback(() => {
    if (!canLock) return;
    setLock({
      threshold,
      calibration,
      avgCost: sim.avgCost,
      accuracy: sim.accuracy,
      dashboardConfidence: sim.dashboardConfidence,
    });
  }, [canLock, threshold, calibration, sim]);

  const handleBreakAck = useCallback(() => {
    if (breakConditionMet) setBreakAcked(true);
  }, [breakConditionMet]);

  const handleChallengePick = useCallback((option: number, correct: boolean) => {
    setChallengePick(option);
    if (correct) setChallengeSolved(true);
  }, []);

  function handleReset() {
    setTiers(cloneDefaults());
    setThreshold(DEFAULT_THRESHOLD);
    setCalibration(DEFAULT_CALIBRATION);
    setLock(null);
    setBreakAcked(false);
    setChallengePick(null);
    setChallengeSolved(false);
  }

  const progressItems = [
    { id: "lock", label: "Lock a policy that beats always-big", done: gateLock },
    { id: "break", label: "Expose the silent failure", done: breakAcked },
    { id: "challenge", label: "Solve the challenge", done: challengeSolved },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="model-routing-cascades"
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
            Model Routing{" "}
            <span className="text-[var(--color-accent)]">and Cascades</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Send every query to the cheapest model that can handle it, escalating only
            when the model is not confident. Route a simulated query stream through a
            three-tier cascade, drag the confidence threshold to trace the cost-quality
            frontier, then break the whole thing with miscalibration and watch quality
            fall while the dashboard stays green.
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

        {/* The cascade */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The cascade: three tiers, one gate
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[760px]">
            Every query starts at the Small tier. The tier answers and reports a
            confidence; if that confidence clears the escalation threshold, the answer
            ships. If not, the query escalates and the next tier is also paid for. The
            final tier always answers. Below, a seeded stream of {stream.length} queries
            (60% easy, 25% medium, 15% hard) is routed live with your current settings:
            every count is computed from the stream.
          </p>
          <CascadeFlow sim={sim} tiers={tiers} threshold={threshold} />
        </motion.section>

        {/* Tier parameters */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">The tiers</p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[760px]">
            Each tier has a cost per query (relative units) and a capability midpoint:
            the difficulty at which it is 50% likely to be correct. The defaults are
            illustrative, chosen to echo the roughly 5x to 30x price spread between
            small and frontier models; drag them to match your own stack.
          </p>
          <TierControls tiers={tiers} onTierChange={handleTierChange} />
          <div className="grid grid-cols-2 gap-3 mt-4 max-w-[520px]">
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Always-big baseline
              </p>
              <p className="text-[13px] font-mono font-bold text-[var(--color-accent)]">
                {alwaysBig.avgCost.toFixed(1)} units, {pct(alwaysBig.accuracy)}
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Always-small baseline
              </p>
              <p className="text-[13px] font-mono font-bold text-[#94a3b8]">
                {alwaysSmall.avgCost.toFixed(1)} units, {pct(alwaysSmall.accuracy)}
              </p>
            </div>
          </div>
        </motion.section>

        {/* Frontier + threshold */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The cost-quality frontier
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[760px]">
            Every gray point is the cascade evaluated on the same stream at one
            threshold value; the pink point is your current threshold. Drag the slider
            and trace the frontier. The shaded corner is the win region: cheaper than
            always-big at near-equal quality. Push the threshold to 1.0 and note the
            cascade costs MORE than always-big: you pay the lower tiers for answers you
            never use.
          </p>

          <div className="mb-4 max-w-[560px]">
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="mrc-threshold"
                className="text-[12px] font-semibold text-white"
              >
                Escalation confidence threshold
              </label>
              <span
                className="text-[13px] font-mono font-bold"
                style={{ color: CASCADE_PINK }}
              >
                {threshold.toFixed(2)}
              </span>
            </div>
            <input
              id="mrc-threshold"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-[#ec4899]"
            />
            <p className="text-[11px] text-[#475569] mt-1">
              Accept a tier&apos;s answer only when its confidence is at least this
              value; otherwise escalate.
            </p>
          </div>

          <FrontierChart
            frontier={frontier}
            current={{ avgCost: sim.avgCost, accuracy: sim.accuracy, threshold }}
            big={alwaysBig}
            small={alwaysSmall}
            winTolerance={WIN_TOLERANCE}
          />

          {/* Regime banner */}
          <div
            aria-live="polite"
            className={`rounded-xl border p-4 mt-4 ${
              isWin
                ? "border-[var(--color-success)]/50"
                : sim.avgCost >= alwaysBig.avgCost
                  ? "border-[var(--color-warning)]/50"
                  : qualityDelta < -0.03
                    ? "border-[#ef4444]/50"
                    : "border-[#334155]"
            }`}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wide mb-1.5"
              style={{
                color: isWin
                  ? "var(--color-success)"
                  : sim.avgCost >= alwaysBig.avgCost
                    ? "var(--color-warning)"
                    : qualityDelta < -0.03
                      ? "#ef4444"
                      : "#94a3b8",
              }}
            >
              {isWin
                ? "Routing wins"
                : sim.avgCost >= alwaysBig.avgCost
                  ? "Cascade overhead"
                  : qualityDelta < -0.03
                    ? "Quality degraded"
                    : "Tradeoff zone"}
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              {sim.avgCost.toFixed(2)} units per query at {pct(sim.accuracy)} accuracy,
              versus always-big at {alwaysBig.avgCost.toFixed(1)} units and{" "}
              {pct(alwaysBig.accuracy)}.{" "}
              {isWin
                ? `That is ${(savings * 100).toFixed(0)}% of the cost saved with quality within ${(
                    WIN_TOLERANCE * 100
                  ).toFixed(0)} point of the big model. Lock it in.`
                : sim.avgCost >= alwaysBig.avgCost
                  ? "You are paying for escalation attempts on top of the big model. Lower the threshold."
                  : qualityDelta < -0.03
                    ? `Cheap, but accuracy is ${Math.abs(qualityDelta * 100).toFixed(1)} points below always-big. Raise the threshold.`
                    : `Cheaper, but the quality gap of ${Math.abs(qualityDelta * 100).toFixed(1)} points is outside the ${(WIN_TOLERANCE * 100).toFixed(0)}-point tolerance.`}
            </p>
            <button
              onClick={handleLock}
              disabled={!canLock || gateLock}
              className={`mt-3 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                gateLock
                  ? "border-[var(--color-success)]/50 text-[var(--color-success)] cursor-default"
                  : canLock
                    ? "border-[var(--color-success)]/60 text-[var(--color-success)] hover:border-[var(--color-success)]"
                    : "border-[#1e293b] text-[#475569] cursor-not-allowed"
              }`}
            >
              {gateLock
                ? `Policy locked: T = ${lock?.threshold.toFixed(2)}, ${pct(lock?.accuracy ?? 0)} at ${lock?.avgCost.toFixed(2)} units`
                : canLock
                  ? "Lock this routing policy"
                  : calibration < LOCK_MIN_CALIBRATION
                    ? `Restore calibration to at least ${LOCK_MIN_CALIBRATION.toFixed(1)} to lock`
                    : "Find a threshold that beats always-big first"}
            </button>
          </div>
        </motion.section>

        {/* Silent failure */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Break it: miscalibrated confidence
          </p>
          <SilentFailurePanel
            sim={sim}
            big={alwaysBig}
            lock={lock}
            calibration={calibration}
            onCalibrationChange={setCalibration}
            breakConditionMet={breakConditionMet}
            breakAcked={breakAcked}
            onAck={handleBreakAck}
          />
        </motion.section>

        {/* Mini challenge */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-4">Mini challenge</p>
          <RoutingChallenge
            stream={stream}
            tiers={tiers}
            threshold={lock ? lock.threshold : threshold}
            pick={challengePick}
            solved={challengeSolved}
            onPick={handleChallengePick}
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
                  Router Certified!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You found a routing policy that beat always-big, then broke it with
                  miscalibration and watched the dashboard stay green while quality fell.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Your locked policy</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {lock
                        ? `T=${lock.threshold.toFixed(2)}: ${pct(lock.accuracy)} at ${lock.avgCost.toFixed(2)} units`
                        : "?"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Cost saved vs always-big
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {lock
                        ? `${(((alwaysBig.avgCost - lock.avgCost) / alwaysBig.avgCost) * 100).toFixed(0)}%`
                        : "?"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      The break you exposed
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {lock
                        ? `${pct(lock.accuracy)} to ${pct(sim.accuracy)} true accuracy`
                        : "?"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;A cascade is a bet on calibration. Confidence routing can cut
                    cost by a third at near-equal quality, but confidence is the
                    model&apos;s self-estimate, so when calibration drifts, quality falls
                    while cost and confidence both look better than ever. Audit with
                    ground truth, never with the router&apos;s own score.&quot;
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
