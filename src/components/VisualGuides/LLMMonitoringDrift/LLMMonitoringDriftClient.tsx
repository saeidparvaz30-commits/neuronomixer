"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  MetricKey,
  Scenario,
  DEFAULT_SCENARIO,
  METRIC_KEYS,
  MONITOR_DIRECTION,
  simulateTraffic,
  runCusum,
  classifyAlarms,
  metricShifted,
  sweepThresholds,
} from "./math";
import { METRIC_META, DetectSnapshot, FalseAlarmSnapshot } from "./types";
import ScenarioLab from "./ScenarioLab";
import DetectorPanel from "./DetectorPanel";
import TradeoffCurve from "./TradeoffCurve";

const GUIDE_TITLE = "Monitoring and Drift for LLM Apps";
const NEXT_GUIDE_SLUG = "ab-testing-workflow";

const DEFAULT_SEED = 1;
const DEFAULT_METRIC: MetricKey = "judge";
const DEFAULT_H = 5;
const DEFAULT_K = 0.5;

export default function LLMMonitoringDriftClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Interaction state (mount defaults; Try Again restores exactly these) ──
  const [scenario, setScenario] = useState<Scenario>(DEFAULT_SCENARIO);
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [metric, setMetric] = useState<MetricKey>(DEFAULT_METRIC);
  const [h, setH] = useState(DEFAULT_H);
  const [k, setK] = useState(DEFAULT_K);
  // The false-alarm gate only counts once the user has tuned the threshold.
  const [hTouched, setHTouched] = useState(false);

  // Latched gates + snapshots for the completion card
  const [gateInject, setGateInject] = useState(false);
  const [detectSnapshot, setDetectSnapshot] = useState<DetectSnapshot | null>(
    null
  );
  const [faSnapshot, setFaSnapshot] = useState<FalseAlarmSnapshot | null>(
    null
  );

  // ── Everything displayed is computed from the math module ────────────────
  const injected = scenario.qualityDrop > 0 || scenario.driftSeverity > 0;
  // Whether the injected scenario actually shifts the monitored metric.
  const shifted = metricShifted(scenario, metric);

  const series = useMemo(
    () => simulateTraffic(scenario, seed),
    [scenario, seed]
  );

  const cusum = useMemo(
    () => runCusum(series[metric], MONITOR_DIRECTION[metric], h, k),
    [series, metric, h, k]
  );

  // classifyAlarms treats every alarm as false unless the scenario really
  // shifts this metric AND the alarm fires at or after the onset.
  const stats = useMemo(
    () => classifyAlarms(cusum.alarms, scenario, metric),
    [cusum, scenario, metric]
  );

  const sweep = useMemo(
    () => sweepThresholds(scenario, metric, k, seed),
    [scenario, metric, k, seed]
  );

  // ── Gate latching ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (injected) setGateInject(true);
  }, [injected]);

  useEffect(() => {
    // stats.detectionDelay is only non-null for a genuine detection: an alarm
    // at or after onset on a metric the injected scenario actually shifts.
    if (injected && stats.detectionDelay !== null) {
      const delay = stats.detectionDelay;
      setDetectSnapshot(
        (prev) =>
          prev ?? { metricLabel: METRIC_META[metric].label, h, delay }
      );
    }
  }, [injected, stats.detectionDelay, metric, h]);

  useEffect(() => {
    if (hTouched && stats.falseAlarms.length > 0) {
      const count = stats.falseAlarms.length;
      setFaSnapshot((prev) => prev ?? { h, count });
    }
  }, [hTouched, stats.falseAlarms, h]);

  const isComplete =
    gateInject && detectSnapshot !== null && faSnapshot !== null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleResample = useCallback(() => setSeed((s) => s + 1), []);

  const handleHChange = useCallback((v: number) => {
    setH(v);
    setHTouched(true);
  }, []);

  function handleReset() {
    setScenario(DEFAULT_SCENARIO);
    setSeed(DEFAULT_SEED);
    setMetric(DEFAULT_METRIC);
    setH(DEFAULT_H);
    setK(DEFAULT_K);
    setHTouched(false);
    setGateInject(false);
    setDetectSnapshot(null);
    setFaSnapshot(null);
  }

  const progressItems = [
    { id: "inject", label: "Inject a regression", done: gateInject },
    {
      id: "detect",
      label: "Catch it with CUSUM",
      done: detectSnapshot !== null,
    },
    {
      id: "false-alarm",
      label: "Trigger a false alarm",
      done: faSnapshot !== null,
    },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="llm-monitoring-drift"
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
            Monitoring and Drift{" "}
            <span className="text-[var(--color-accent)]">for LLM Apps</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Your deployed LLM app degrades quietly: inputs drift, quality
            slips, and users rarely file a ticket. Break a simulated
            production system on purpose, then tune a real changepoint
            detector to catch it, and feel the tradeoff between catching it
            fast and crying wolf.
          </motion.p>
        </section>

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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Why monitor: the four signals */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-3">
            Four signals that tell you before your users do
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {METRIC_KEYS.map((key) => {
              const meta = METRIC_META[key];
              return (
                <div key={key} className="rounded-xl border border-[#1e293b] p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: meta.color }}
                      aria-hidden="true"
                    />
                    <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide">
                      {meta.label}
                    </p>
                  </div>
                  <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                    {meta.description}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            Offline evals grade a frozen model on a frozen dataset. Production
            is neither: prompts change, providers ship silent model updates,
            and the traffic itself drifts. Monitoring is the eval that never
            stops running. Everything below is simulated traffic from a
            fictional app, generated by a seeded random model you control.
          </p>
        </motion.section>

        {/* Scenario lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Break production on purpose
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            You control the incident: pick when it starts and how hard it
            hits. Quality drop is a silent regression in answer quality, like
            a bad prompt deploy or a provider-side model change. Input drift
            is your traffic changing shape, which shows up as more refusals,
            slower responses, and fatter token bills.
          </p>
          <ScenarioLab
            scenario={scenario}
            onScenarioChange={setScenario}
            series={series}
            onResample={handleResample}
            injected={injected}
          />
        </motion.section>

        {/* Detector */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The detector: CUSUM, a real changepoint method
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            Eyeballing dashboards does not scale, and a naive
            &quot;alert when the metric crosses X&quot; rule ignores how noisy
            each hour is. CUSUM (cumulative sum control chart) accumulates
            small standardized deviations from baseline, so a persistent
            shift builds up and fires even when no single hour looks scary.
            Pick a metric to monitor, then tune the threshold h. Lower it
            until it catches your regression, then keep lowering it and watch
            false alarms appear before the onset.
          </p>
          <DetectorPanel
            metric={metric}
            onMetricChange={setMetric}
            h={h}
            k={k}
            onHChange={handleHChange}
            onKChange={setK}
            cusum={cusum}
            stats={stats}
            onset={scenario.onset}
            injected={injected}
            shifted={shifted}
          />
        </motion.section>

        {/* Tradeoff */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The honest tradeoff: detection delay vs false alarms
          </p>
          <TradeoffCurve
            sweep={sweep}
            currentH={h}
            metric={metric}
            injected={injected}
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
                  Regression Caught!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You broke a production system, tuned a CUSUM detector until
                  it caught the break, and then pushed it far enough to cry
                  wolf. That is the whole job of production monitoring, in
                  miniature.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Regression you injected
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      hour {scenario.onset}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      First catch
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {detectSnapshot
                        ? `${detectSnapshot.delay} h delay (${detectSnapshot.metricLabel}, h=${detectSnapshot.h})`
                        : "?"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      First false alarm
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {faSnapshot
                        ? `at h=${faSnapshot.h} (${faSnapshot.count} false alarm${faSnapshot.count === 1 ? "" : "s"})`
                        : "?"}
                    </p>
                  </div>
                </div>

                <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
                  Detection tells you something changed; it does not tell you
                  the fix works. When you ship the repair, you validate it the
                  same way you validate any change: a controlled experiment.
                  The next guide picks up exactly there.
                </p>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Every alert threshold is a bet: detect late or cry
                    wolf. You cannot tune your way out of that tradeoff, you
                    can only choose your point on the curve, and the right
                    point depends on what a missed regression costs versus
                    what a 3 a.m. page costs.&quot;
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
