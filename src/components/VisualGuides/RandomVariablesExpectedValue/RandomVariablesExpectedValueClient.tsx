"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";

import type { PlaygroundMode, SimState, PayoutRow } from "./types";
import {
  DEFAULT_CUSTOM_ROWS,
  FAIR_COIN_ROWS,
  buildLotteryRows,
  DEFAULT_SIM,
  computeEV,
} from "./types";

import PlaygroundSelector from "./PlaygroundSelector";
import PayoutTableBuilder from "./PayoutTableBuilder";
import ExpectedValueCalculator from "./ExpectedValueCalculator";
import SimulationRunner from "./SimulationRunner";
import SpinnerVisualizer from "./SpinnerVisualizer";
import LotteryEVBreakdown from "./LotteryEVBreakdown";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Unique-id helper ──────────────────────────────────────────────────────────

let _idCounter = 0;
function genId(): string {
  return `row-${++_idCounter}-${Date.now()}`;
}

const NEXT_GUIDE_SLUG = "probability-distributions";
const LOTTERY_EV = computeEV(buildLotteryRows());

// ── Main client component ─────────────────────────────────────────────────────

export default function RandomVariablesExpectedValueClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const completionFired = useRef(false);

  // ── State ─────────────────────────────────────────────────────────────────

  const [mode, setMode] = useState<PlaygroundMode>("custom");
  const [customRows, setCustomRows] = useState<PayoutRow[]>(DEFAULT_CUSTOM_ROWS);
  const [sim, setSim] = useState<SimState>(DEFAULT_SIM);

  // Completion tracking
  const [hasRunSim, setHasRunSim] = useState(false);
  const [hasSeenLottery, setHasSeenLottery] = useState(false);
  const [hasSeenConvergence, setHasSeenConvergence] = useState(false);

  // ── Derived rows per mode ─────────────────────────────────────────────────

  const activeRows: PayoutRow[] =
    mode === "custom"
      ? customRows
      : mode === "coin"
      ? FAIR_COIN_ROWS
      : buildLotteryRows();

  // ── Mode change ───────────────────────────────────────────────────────────

  const handleModeChange = useCallback(
    (next: PlaygroundMode) => {
      setMode(next);
      setSim(DEFAULT_SIM);
      if (next === "lottery") setHasSeenLottery(true);
    },
    []
  );

  // ── Payout table handlers ─────────────────────────────────────────────────

  function handleRowChange(id: string, field: "outcome" | "probability", value: number) {
    setCustomRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
    setSim(DEFAULT_SIM);
  }

  function handleAddRow() {
    setCustomRows((prev) => [
      ...prev,
      { id: genId(), outcome: 0, probability: 0 },
    ]);
  }

  function handleRemoveRow(id: string) {
    setCustomRows((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((r) => r.id !== id);
    });
    setSim(DEFAULT_SIM);
  }

  // ── Simulation callbacks ──────────────────────────────────────────────────

  function handleSimUpdate(updated: SimState) {
    setSim(updated);
  }

  function handleSimComplete() {
    setHasRunSim(true);
    setHasSeenConvergence(true);
  }

  function handleReset() {
    setMode("custom");
    setCustomRows(DEFAULT_CUSTOM_ROWS);
    setSim(DEFAULT_SIM);
    setHasRunSim(false);
    setHasSeenLottery(false);
    setHasSeenConvergence(false);
  }

  // ── Completion logic ──────────────────────────────────────────────────────

  const isComplete = hasRunSim && hasSeenLottery && hasSeenConvergence;

  useEffect(() => {
    if (isComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideSlug: "random-variables-expected-value",
          score: 100,
        }),
      }).catch(() => {});
    }
  }, [isComplete, session?.user]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="random-variables-expected-value" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Random Variables &amp; Expected Value</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Probability Foundations
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Random Variables &amp;{" "}
            <span className="text-[var(--color-accent)]">Expected Value</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            Build any probability distribution, compute EV = Σ xᵢpᵢ, then simulate thousands
            of draws to watch the running average converge to the theoretical value.
          </p>
        </section>

        {/* Progress tracker */}
        <div className="flex items-center gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                hasRunSim ? "bg-[#3bb4a4]" : "bg-[#1e293b]"
              }`}
            />
            <span
              className={`text-[11px] ${hasRunSim ? "text-white" : "text-[#475569]"}`}
            >
              Simulation run
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                hasSeenLottery ? "bg-[#3bb4a4]" : "bg-[#1e293b]"
              }`}
            />
            <span
              className={`text-[11px] ${hasSeenLottery ? "text-white" : "text-[#475569]"}`}
            >
              Lottery explored
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                hasSeenConvergence ? "bg-[#3bb4a4]" : "bg-[#1e293b]"
              }`}
            />
            <span
              className={`text-[11px] ${hasSeenConvergence ? "text-white" : "text-[#475569]"}`}
            >
              Convergence seen
            </span>
          </div>

          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link
                href="/auth/sign-in"
                className="underline underline-offset-2 hover:text-[#94a3b8]"
              >
                Sign in
              </Link>{" "}
              to track progress
            </p>
          )}

          <AnimatePresence>
            {isComplete && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
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

        {/* Content */}
        <div className="space-y-6">
          {/* Playground selector */}
          <PlaygroundSelector mode={mode} onChange={handleModeChange} />

          {/* ── Custom Distribution ───────────────────────────────── */}
          {mode === "custom" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PayoutTableBuilder
                  rows={customRows}
                  onRowChange={handleRowChange}
                  onAddRow={handleAddRow}
                  onRemoveRow={handleRemoveRow}
                />
                <SpinnerVisualizer rows={customRows} />
              </div>

              <ExpectedValueCalculator rows={customRows} label="Expected Value Calculator" />

              <SimulationRunner
                rows={customRows}
                sim={sim}
                onSimUpdate={handleSimUpdate}
                onSimComplete={handleSimComplete}
              />
            </>
          )}

          {/* ── Fair Coin ─────────────────────────────────────────── */}
          {mode === "coin" && (
            <>
              {/* Concept callout */}
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-2">
                  Fair Coin Flip
                </p>
                <p className="text-[14px] text-white mb-3">
                  Win <strong className="text-[#3bb4a4]">$1</strong> on Heads (p = 0.5) or
                  lose <strong className="text-[#ef4444]">$1</strong> on Tails (p = 0.5).
                </p>
                <p className="text-[13px] text-[#94a3b8]">
                  EV = (+1)(0.5) + (−1)(0.5) = <strong className="text-white">0</strong>.
                  This is a <em>fair game</em>: no player has an advantage over the long run.
                  The simulation below will demonstrate that the running average converges to 0.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PayoutTableBuilder
                  rows={FAIR_COIN_ROWS}
                  readOnly
                  onRowChange={() => {}}
                  onAddRow={() => {}}
                  onRemoveRow={() => {}}
                />
                <SpinnerVisualizer rows={FAIR_COIN_ROWS} />
              </div>

              <ExpectedValueCalculator rows={FAIR_COIN_ROWS} label="Fair Coin EV" />

              <SimulationRunner
                rows={FAIR_COIN_ROWS}
                sim={sim}
                onSimUpdate={handleSimUpdate}
                onSimComplete={handleSimComplete}
              />
            </>
          )}

          {/* ── Lottery ───────────────────────────────────────────── */}
          {mode === "lottery" && (
            <>
              <LotteryEVBreakdown />

              <SimulationRunner
                rows={buildLotteryRows()}
                sim={sim}
                onSimUpdate={handleSimUpdate}
                onSimComplete={handleSimComplete}
              />
            </>
          )}
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
                  You Computed the Long Run
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You built distributions, computed EV = Σ xᵢpᵢ, watched
                  thousands of draws converge on it, and priced a lottery
                  ticket honestly.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      EV of your current distribution
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {computeEV(activeRows).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      Σ xᵢpᵢ over {activeRows.length} outcomes
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Draws in your last simulation
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {sim.trialCount.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      {sim.trialCount > 0
                        ? `running average ${sim.runningAvg.toFixed(2)}`
                        : "average converges to the EV"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Lottery EV per ticket
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {LOTTERY_EV < 0 ? "−$" : "$"}
                      {Math.abs(LOTTERY_EV).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      on a $2 ticket, every play
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Expected value is the long-run average the world will
                    actually pay you: fair games hover at zero, and a lottery
                    quietly charges you the gap between the ticket price and
                    Σ xᵢpᵢ on every single play.&quot;
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
              href="/visual-guides/bayes-theorem"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← Bayes Theorem
            </Link>
            <Link
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Next: Probability Distributions →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
