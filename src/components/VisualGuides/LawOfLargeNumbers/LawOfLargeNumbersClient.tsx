"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import DistributionPicker from "./DistributionPicker";
import RunningMeanChart from "./RunningMeanChart";
import GamblersFallacyPanel from "./GamblersFallacyPanel";
import LlnVsCltPanel from "./LlnVsCltPanel";
import {
  DIST_IDS,
  DIST_META,
  MAX_DRAWS_PER_RUN,
  MAX_RUNS,
  fmt,
  generateDraws,
  runningMeans,
  seedFor,
  totalDraws,
  type DistId,
  type RunSpec,
} from "./types";

const GUIDE_SLUG = "law-of-large-numbers";
const DRAW_GATE = 1000;

type RunsState = Record<DistId, RunSpec[]>;

function initialRuns(): RunsState {
  return {
    die: [{ seed: seedFor("die", 0), count: 0 }],
    coin: [{ seed: seedFor("coin", 0), count: 0 }],
    exponential: [{ seed: seedFor("exponential", 0), count: 0 }],
    cauchy: [{ seed: seedFor("cauchy", 0), count: 0 }],
  };
}

export default function LawOfLargeNumbersClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  const [activeDist, setActiveDist] = useState<DistId>("die");
  const [runsByDist, setRunsByDist] = useState<RunsState>(initialRuns);
  const [explored, setExplored] = useState<Set<DistId>>(new Set(["die"]));
  const [cauchyViewed, setCauchyViewed] = useState(false);
  const [gamblersOpened, setGamblersOpened] = useState(false);

  // ── Derived simulation state (deterministic from seeds + counts) ──────────
  const activeRuns = runsByDist[activeDist];

  const meansPerRun = useMemo(
    () =>
      activeRuns.map((r) =>
        runningMeans(generateDraws(activeDist, r.seed, r.count))
      ),
    [activeRuns, activeDist]
  );

  const activeMeta = DIST_META[activeDist];
  const lastRun = meansPerRun[meansPerRun.length - 1];
  const lastN = lastRun.length;
  const lastMean = lastN > 0 ? lastRun[lastN - 1] : null;

  // ── Completion gates ──────────────────────────────────────────────────────
  const distsAtGate = DIST_IDS.filter(
    (d) => totalDraws(runsByDist[d]) >= DRAW_GATE
  ).length;
  const gateDraws = distsAtGate >= 2;
  const isComplete = gateDraws && cauchyViewed && gamblersOpened;

  const totalAllDraws = DIST_IDS.reduce(
    (a, d) => a + totalDraws(runsByDist[d]),
    0
  );
  const distsSampled = DIST_IDS.filter(
    (d) => totalDraws(runsByDist[d]) > 0
  ).length;

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleDistChange(id: DistId) {
    setActiveDist(id);
    setExplored((prev) => new Set([...prev, id]));
    if (id === "cauchy") setCauchyViewed(true);
  }

  function handleDraw(k: number) {
    setRunsByDist((prev) => {
      const runs = prev[activeDist];
      const last = runs[runs.length - 1];
      const next: RunSpec = {
        ...last,
        count: Math.min(last.count + k, MAX_DRAWS_PER_RUN),
      };
      return { ...prev, [activeDist]: [...runs.slice(0, -1), next] };
    });
  }

  function handleNewRun() {
    setRunsByDist((prev) => {
      const runs = prev[activeDist];
      if (runs.length >= MAX_RUNS) return prev;
      return {
        ...prev,
        [activeDist]: [
          ...runs,
          { seed: seedFor(activeDist, runs.length), count: 0 },
        ],
      };
    });
  }

  function handleClearRuns() {
    setRunsByDist((prev) => ({
      ...prev,
      [activeDist]: [{ seed: seedFor(activeDist, 0), count: 0 }],
    }));
  }

  function handleReset() {
    setActiveDist("die");
    setRunsByDist(initialRuns());
    setExplored(new Set(["die"]));
    setCauchyViewed(false);
    setGamblersOpened(false);
  }

  const atRunCap = activeRuns[activeRuns.length - 1].count >= MAX_DRAWS_PER_RUN;

  const progressItems = [
    {
      id: "draws",
      label: `${DRAW_GATE.toLocaleString()}+ draws on two distributions (${Math.min(distsAtGate, 2)}/2)`,
      done: gateDraws,
    },
    { id: "cauchy", label: "Visit the Cauchy view", done: cauchyViewed },
    { id: "gamblers", label: "Open the gambler's fallacy demo", done: gamblersOpened },
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
          <span className="text-[#94a3b8]">Law of Large Numbers</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Statistics
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            The Law of{" "}
            <span className="text-[var(--color-accent)]">Large Numbers</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            Draw real samples, watch the running mean settle onto the population mean, and meet
            the one famous distribution where it never settles at all.
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
          <AnimatePresence>
            {isComplete && (
              <motion.span
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="ml-auto text-[11px] font-semibold flex items-center gap-1"
                style={{ color: "var(--color-success)" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* 1. The statement */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-8 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--color-accent)] mb-1">
            The Statement
          </p>
          <p className="text-[13px] font-semibold text-white mb-3">
            The running mean of i.i.d. draws converges to the population mean
          </p>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[760px] mb-3">
            Take independent draws from one fixed distribution and keep updating the average as
            each draw arrives. The law of large numbers says this running mean homes in on the{" "}
            <Link
              href="/visual-guides/random-variables-expected-value"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              expected value
            </Link>{" "}
            of a single draw as n grows. That is the entire bridge between{" "}
            <Link
              href="/visual-guides/probability-fundamentals"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              probability
            </Link>{" "}
            and data: relative frequencies earn the right to be called probabilities.
          </p>
          <p className="text-[12px] text-[#475569] leading-relaxed max-w-[760px]">
            Fine print, kept light: the weak law says the chance of a noticeable gap between the
            running mean and the true mean shrinks to zero (convergence in probability), while the
            strong law says the sample path itself settles onto the true mean with probability one
            (almost surely). On screen they look the same: the line settles. Both require a finite
            population mean, and that clause matters below.
          </p>
        </motion.section>

        {/* 2. Centerpiece: simulator */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-8"
        >
          <div className="mb-3">
            <p className="text-[13px] font-semibold text-white mb-1">Sample It Yourself</p>
            <p className="text-[12px] text-[#475569] max-w-[680px]">
              Pick a distribution (see the{" "}
              <Link
                href="/visual-guides/data-distributions"
                className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
              >
                data distributions guide
              </Link>{" "}
              for their shapes), then append real seeded draws. Start extra runs to see how
              different sample paths wobble differently yet converge to the same target.
            </p>
          </div>

          <div className="mb-4">
            <DistributionPicker active={activeDist} explored={explored} onChange={handleDistChange} />
            <p className="mt-2 text-[12px] text-[#475569]">{activeMeta.description}</p>
          </div>

          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {[10, 100, 1000].map((k) => (
                <button
                  key={k}
                  onClick={() => handleDraw(k)}
                  disabled={atRunCap}
                  aria-label={`Draw ${k} more samples from ${activeMeta.label}`}
                  className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Draw {k.toLocaleString()}
                </button>
              ))}
              <button
                onClick={handleNewRun}
                disabled={activeRuns.length >= MAX_RUNS}
                aria-label="Start a new overlay run for this distribution"
                className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                New run ({activeRuns.length}/{MAX_RUNS})
              </button>
              <button
                onClick={handleClearRuns}
                aria-label="Clear all runs for this distribution"
                className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white transition-colors"
              >
                Clear runs
              </button>
              {atRunCap && (
                <span className="text-[11px]" style={{ color: "var(--color-warning)" }}>
                  Run cap reached ({MAX_DRAWS_PER_RUN.toLocaleString()} draws). Start a new run.
                </span>
              )}
            </div>

            <RunningMeanChart
              series={meansPerRun}
              color={activeMeta.color}
              trueMean={activeMeta.trueMean}
              clampAxis={activeMeta.clampAxis}
              distLabel={activeMeta.label}
            />

            {/* Computed stats for the active run */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="rounded-xl border border-[#1e293b] p-3">
                <p className="text-[10px] text-[#475569] mb-1">Active run draws (n)</p>
                <p className="text-[15px] font-mono font-bold text-white">{lastN.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-[#1e293b] p-3">
                <p className="text-[10px] text-[#475569] mb-1">Running mean</p>
                <p className="text-[15px] font-mono font-bold text-white">
                  {lastMean !== null ? fmt(lastMean) : "no draws yet"}
                </p>
              </div>
              <div className="rounded-xl border border-[#1e293b] p-3">
                <p className="text-[10px] text-[#475569] mb-1">
                  {activeMeta.trueMean !== null ? "Gap to true mean" : "True mean"}
                </p>
                {activeMeta.trueMean !== null ? (
                  <p className="text-[15px] font-mono font-bold" style={{ color: "var(--color-success)" }}>
                    {lastMean !== null ? fmt(Math.abs(lastMean - activeMeta.trueMean)) : "no draws yet"}
                  </p>
                ) : (
                  <p className="text-[15px] font-mono font-bold" style={{ color: "var(--color-warning)" }}>
                    undefined
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        {/* 3. Cauchy callout */}
        <AnimatePresence>
          {activeDist === "cauchy" && (
            <motion.section
              variants={card}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="mb-8 rounded-2xl border p-5 sm:p-6 bg-[#0f172a]"
              style={{ borderColor: "color-mix(in srgb, var(--color-warning) 40%, transparent)" }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] mb-1" style={{ color: "var(--color-warning)" }}>
                Where LLN Breaks
              </p>
              <p className="text-[13px] font-semibold text-white mb-3">
                The Cauchy distribution has no mean, so there is nothing to converge to
              </p>
              <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[760px] mb-3">
                Every draw above is a real inverse-CDF sample: tan(pi times (u - 1/2)) of a uniform
                u. The tails are so heavy that the integral defining the mean does not converge, so
                the law&apos;s key hypothesis fails and its conclusion fails with it. Keep pressing
                Draw 1,000: the running mean looks calm for a stretch, then a single extreme draw
                yanks the whole average somewhere new. It never stops doing this.
              </p>
              <p className="text-[12px] text-[#475569] leading-relaxed max-w-[760px]">
                In fact the average of n standard Cauchy draws has the same distribution as one
                single draw, so averaging buys you nothing. Real data with extreme tails, such as
                asset returns in a crash or certain network latencies, can behave this way: check
                that a mean is even the right summary before trusting an average.
              </p>
            </motion.section>
          )}
        </AnimatePresence>

        {/* 4. Gambler's fallacy */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-8"
        >
          <GamblersFallacyPanel open={gamblersOpened} onOpen={() => setGamblersOpened(true)} />
        </motion.section>

        {/* 5. LLN vs CLT */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-8"
        >
          <LlnVsCltPanel />
        </motion.section>

        {/* Completion card */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              variants={card}
              initial="hidden"
              animate="visible"
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
                  Convergence, Earned the Hard Way
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You sampled your way to the law of large numbers, and found its boundary.
                </p>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: "Total draws simulated",
                      value: totalAllDraws.toLocaleString(),
                      color: "#3bb4a4",
                    },
                    {
                      label: "Distributions sampled",
                      value: `${distsSampled} / ${DIST_IDS.length}`,
                      color: "#a855f7",
                    },
                    {
                      label: "Cauchy verdict",
                      value: "mean undefined",
                      color: "var(--color-warning)",
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">{item.label}</p>
                      <p className="text-[14px] font-mono font-bold" style={{ color: item.color }}>
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
                    &quot;The law of large numbers is a promise about long-run proportions, not a
                    debt collector for short-run luck. It needs independent draws and a finite
                    mean, and the Cauchy distribution shows exactly what happens when that fine
                    print is violated.&quot;
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
                    href="/visual-guides/central-limit-theorem"
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
                  >
                    Next Guide →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer nav while incomplete */}
        {!isComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link
              href="/visual-guides"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← All Guides
            </Link>
            <Link
              href="/visual-guides/central-limit-theorem"
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
