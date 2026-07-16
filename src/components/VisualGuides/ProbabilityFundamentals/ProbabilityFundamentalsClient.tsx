"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import {
  type CompoundEvent,
  type SimState,
  type VennMode,
  type ProbabilityState,
  DEFAULT_EVENT,
  DEFAULT_SIM,
  initialProbabilityState,
  calcTheoretical,
} from "./types";
import EventSandbox from "./EventSandbox";
import VennDiagramVisualizer from "./VennDiagramVisualizer";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── helpers ──────────────────────────────────────────────────────────────────

const NEXT_GUIDE_SLUG = "conditional-probability";

function eventKey(e: CompoundEvent): string {
  return JSON.stringify({
    firstType: e.firstType,
    firstOutcome: e.firstOutcome,
    operator: e.operator,
    secondType: e.secondType,
    secondOutcome: e.secondOutcome,
  });
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProbabilityFundamentalsClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const completionFired = useRef(false);
  const totalTrialsRef = useRef<number>(1000);

  const [state, setState] = useState<ProbabilityState>(initialProbabilityState);

  // ── Completion logic ────────────────────────────────────────────────────────

  const operatorVariety = new Set(
    state.eventsBuilt.map((k) => {
      try {
        return (JSON.parse(k) as { operator: string }).operator;
      } catch {
        return "";
      }
    }),
  ).size;

  const isComplete =
    state.eventsBuilt.length >= 3 &&
    operatorVariety >= 3 &&
    state.simulationRun &&
    state.vennRegionsClicked.length >= 2;

  useEffect(() => {
    if (isComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "probability-fundamentals", score: 100 }),
      }).catch(() => {});
    }
  }, [isComplete, session?.user]);

  // ── Event handlers ──────────────────────────────────────────────────────────

  function handleEventChange(updated: CompoundEvent) {
    const key = eventKey(updated);
    setState((prev) => {
      const alreadyBuilt = prev.eventsBuilt.includes(key);
      return {
        ...prev,
        event: updated,
        // reset sim when event changes mid-way
        sim: prev.sim.isRunning ? prev.sim : DEFAULT_SIM,
        eventsBuilt: alreadyBuilt
          ? prev.eventsBuilt
          : [...prev.eventsBuilt, key],
      };
    });
  }

  function handleEventReset() {
    setState((prev) => ({
      ...prev,
      event: DEFAULT_EVENT,
      sim: DEFAULT_SIM,
    }));
  }

  function handleSimUpdate(updated: SimState) {
    // Track totalTrials for ResultsPanel
    setState((prev) => ({ ...prev, sim: updated }));
  }

  function handleSimComplete() {
    totalTrialsRef.current = state.sim.trialCount || totalTrialsRef.current;
    setState((prev) => ({ ...prev, simulationRun: true }));
  }

  function handleReset() {
    totalTrialsRef.current = 1000;
    setState(initialProbabilityState);
  }

  function handleVennModeChange(mode: VennMode) {
    setState((prev) => ({ ...prev, vennMode: mode }));
  }

  function handleVennRegionClick(regionId: string) {
    setState((prev) => {
      if (prev.vennRegionsClicked.includes(regionId)) return prev;
      return {
        ...prev,
        vennRegionsClicked: [...prev.vennRegionsClicked, regionId],
      };
    });
  }

  // ── Progress items ──────────────────────────────────────────────────────────

  const progress = [
    {
      label: `Events built: ${Math.min(state.eventsBuilt.length, 3)}/3`,
      done: state.eventsBuilt.length >= 3,
    },
    {
      label: `Operator variety: ${Math.min(operatorVariety, 3)}/3`,
      done: operatorVariety >= 3,
    },
    {
      label: "Simulation run",
      done: state.simulationRun,
    },
    {
      label: `Venn regions explored: ${Math.min(state.vennRegionsClicked.length, 2)}/2`,
      done: state.vennRegionsClicked.length >= 2,
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="probability-fundamentals" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Probability Fundamentals</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Probability
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Probability Fundamentals:{" "}
            <span className="text-[var(--color-accent)]">Rules of Chance</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            Flip coins, roll dice, draw cards. Build compound events and watch experimental
            probability converge to theory as you run thousands of simulations.
          </p>
        </section>

        {/* Progress tracker */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full transition-colors ${
                  done ? "bg-[#3bb4a4]" : "bg-[#1e293b]"
                }`}
              />
              <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>
                {label}
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

        {/* ── Section 1: Event Sandbox ───────────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[var(--color-accent)] text-[12px] font-black">
              1
            </span>
            <h2 className="text-xl font-black text-white">Event Sandbox</h2>
          </div>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-5 max-w-[680px]">
            Build any compound event: choose an event type, an outcome, and optionally combine
            two events with AND, OR, or NOT. The theoretical probability updates instantly.
            Then run thousands of simulations to verify.
          </p>
          <EventSandbox
            event={state.event}
            sim={state.sim}
            onEventChange={handleEventChange}
            onEventReset={handleEventReset}
            onSimUpdate={handleSimUpdate}
            onSimComplete={handleSimComplete}
            totalTrials={totalTrialsRef.current}
          />
        </section>

        {/* ── Section 2: Venn Diagram ────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[var(--color-accent)] text-[12px] font-black">
              2
            </span>
            <h2 className="text-xl font-black text-white">Venn Diagram Explorer</h2>
          </div>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-5 max-w-[680px]">
            A die is rolled once. Circle A = even result, Circle B = result greater than 3.
            Toggle AND / OR / NOT A to see which regions are highlighted, and click regions to
            explore their counts and probabilities.
          </p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 max-w-[640px]">
            <VennDiagramVisualizer
              vennMode={state.vennMode}
              vennRegionsClicked={state.vennRegionsClicked}
              onModeChange={handleVennModeChange}
              onRegionClick={handleVennRegionClick}
            />
          </div>
        </section>

        {/* ── Key concepts callout ───────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Concept
              title="Multiplication Rule"
              body="For independent events A and B: P(A AND B) = P(A) × P(B). Each event's outcome does not affect the other."
              color="var(--color-accent)"
            />
            <Concept
              title="Addition Rule"
              body="P(A OR B) = P(A) + P(B) − P(A AND B). Subtract the overlap to avoid counting shared outcomes twice."
              color="#3bb4a4"
            />
            <Concept
              title="Complement Rule"
              body="P(NOT A) = 1 − P(A). All probabilities sum to 1, so the complement fills the rest of the sample space."
              color="#3b82f6"
            />
          </div>
        </section>

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
                  You Mastered the Rules of Chance
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You built compound events with AND, OR, and NOT, ran a
                  simulation against theory, and mapped the same logic onto a
                  Venn diagram.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Distinct events built
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {state.eventsBuilt.length}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      using {operatorVariety} different operators
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Trials in your last simulation
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {(state.sim.trialCount || totalTrialsRef.current).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      experiment vs theory
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Venn regions explored
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {state.vennRegionsClicked.length}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      clicked and inspected
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Probability is a small set of rules, not guesswork:
                    multiply for AND, add and subtract the overlap for OR, take
                    the complement for NOT, and enough trials will pull
                    experiment toward theory every time.&quot;
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
              href="/visual-guides/visualizing-data-charts"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← Visualizing Data
            </Link>
            <Link
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Next: Conditional Probability →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Key concept card ──────────────────────────────────────────────────────────

function Concept({
  title,
  body,
  color,
}: {
  title: string;
  body: string;
  color: string;
}) {
  return (
    <div>
      <p
        className="text-[11px] font-semibold uppercase tracking-[1.5px] mb-2"
        style={{ color }}
      >
        {title}
      </p>
      <p className="text-[13px] text-[#94a3b8] leading-relaxed">{body}</p>
    </div>
  );
}
