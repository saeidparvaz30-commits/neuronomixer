"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

import type { PlaygroundMode, SimState, PayoutRow } from "./types";
import {
  DEFAULT_CUSTOM_ROWS,
  FAIR_COIN_ROWS,
  buildLotteryRows,
  DEFAULT_SIM,
} from "./types";

import PlaygroundSelector from "./PlaygroundSelector";
import PayoutTableBuilder from "./PayoutTableBuilder";
import ExpectedValueCalculator from "./ExpectedValueCalculator";
import SimulationRunner from "./SimulationRunner";
import SpinnerVisualizer from "./SpinnerVisualizer";
import LotteryEVBreakdown from "./LotteryEVBreakdown";

// ── Unique-id helper ──────────────────────────────────────────────────────────

let _idCounter = 0;
function genId(): string {
  return `row-${++_idCounter}-${Date.now()}`;
}

// ── Main client component ─────────────────────────────────────────────────────

export default function RandomVariablesExpectedValueClient() {
  const { data: session } = useSession();
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
          score: 7,
        }),
      }).catch(() => {});
    }
  }, [isComplete, session?.user]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-20">
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
            <span className="w-6 h-px bg-[#d4af37]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#d4af37]">
              Probability Foundations
            </span>
            <span className="w-6 h-px bg-[#d4af37]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Random Variables &amp;{" "}
            <span className="text-[#d4af37]">Expected Value</span>
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
                  This is a <em>fair game</em> — no player has an advantage over the long run.
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

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/bayes-theorem"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Bayes Theorem
          </Link>
          <Link
            href="/visual-guides"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            All Visual Guides →
          </Link>
        </div>
      </div>
    </div>
  );
}
