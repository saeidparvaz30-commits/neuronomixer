"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  TranscriptId,
  TRANSCRIPTS,
  ACCENT_PINK,
  runOutcomeChecks,
  runRubricChecks,
  outcomePass,
  rubricVerdict,
  countDisagreements,
} from "./types";
import { analyticPassAtK, analyticPassPowK } from "./passMath";
import TranscriptReplay from "./TranscriptReplay";
import PassCurvesLab, { GAP_AT_TARGET, GAP_POW_TARGET } from "./PassCurvesLab";

const GUIDE_TITLE = "Evaluating Agents";
const NEXT_GUIDE_SLUG = "ai-safety";

const INITIAL_REVEALED: Record<TranscriptId, number> = {
  careful: 1,
  guesser: 1,
  typo: 1,
};

interface GapSnapshot {
  p: number;
  k: number;
  atK: number;
  powK: number;
}

export default function AgentEvaluationClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // Interaction state (mount defaults; Try Again restores exactly these)
  const [activeId, setActiveId] = useState<TranscriptId>("careful");
  const [revealed, setRevealed] = useState<Record<TranscriptId, number>>(
    () => ({ ...INITIAL_REVEALED })
  );
  const [p, setP] = useState(0.95);
  const [k, setK] = useState(1);
  const [gapFound, setGapFound] = useState(false);
  const [gapSnapshot, setGapSnapshot] = useState<GapSnapshot | null>(null);

  // Derived gates
  const gradedCount = TRANSCRIPTS.filter(
    (t) => revealed[t.id] >= t.steps.length
  ).length;
  const gateTranscripts = gradedCount === TRANSCRIPTS.length;
  const isComplete = gateTranscripts && gapFound;

  // Sticky gap gate: earned when the analytic values cross the challenge targets.
  useEffect(() => {
    if (gapFound) return;
    const atK = analyticPassAtK(p, k);
    const powK = analyticPassPowK(p, k);
    if (atK >= GAP_AT_TARGET && powK <= GAP_POW_TARGET) {
      setGapFound(true);
      setGapSnapshot({ p, k, atK, powK });
    }
  }, [p, k, gapFound]);

  const disagreements = useMemo(() => countDisagreements(), []);

  // Handlers
  const handleSelect = useCallback((id: TranscriptId) => setActiveId(id), []);

  const handleStepForward = useCallback((id: TranscriptId) => {
    setRevealed((prev) => {
      const max = TRANSCRIPTS.find((t) => t.id === id)?.steps.length ?? 0;
      if (prev[id] >= max) return prev;
      return { ...prev, [id]: prev[id] + 1 };
    });
  }, []);

  const handleRestartTranscript = useCallback((id: TranscriptId) => {
    setRevealed((prev) => ({ ...prev, [id]: 1 }));
  }, []);

  function handleReset() {
    setActiveId("careful");
    setRevealed({ ...INITIAL_REVEALED });
    setP(0.95);
    setK(1);
    setGapFound(false);
    setGapSnapshot(null);
  }

  const progressItems = [
    {
      id: "transcripts",
      label: `Grade all three transcripts (${gradedCount}/3)`,
      done: gateTranscripts,
    },
    { id: "gap", label: "Find the reliability gap", done: gapFound },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="agent-evaluation" score={100} />
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
            Evaluating Agents:{" "}
            <span className="text-[var(--color-accent)]">Grading the Trajectory</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            A chatbot is graded on its answer. An agent takes actions, so you grade the
            whole trajectory. Replay three example runs of the same agent, score them
            with code checks and a rubric judge, then see why one lucky pass says
            nothing about reliability.
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

        {/* Concept: outcome vs process */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-3">
            Two ways to grade an agent
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[#93c5fd] mb-1.5 uppercase tracking-wide">
                Outcome evals (code-based)
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Check the final state with code: does the answer match ground truth, was
                the required tool called, did the run stay in budget. Objective, fast,
                and cheap to run thousands of times, but blind to how the agent got
                there.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p
                className="text-[11px] font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: ACCENT_PINK }}
              >
                Process evals (rubric judge)
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Grade the trajectory itself against a rubric: did it fetch the policy
                instead of assuming it, is every figure grounded in an observation, did
                it avoid redundant calls. Catches lucky passes and pinpoints where a run
                broke.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            Anthropic&apos;s 2026 guide &quot;Demystifying evals for AI agents&quot;
            boils this down to habits you will use on this page: read full transcripts
            before trusting any metric, turn real failures into eval tasks, and grade
            with code where you can, with an LLM judge where you must.
          </p>
        </motion.section>

        {/* Transcript replay lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The transcript lab: three runs, one task
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            The three transcripts below are authored examples, written for this guide
            so you can watch the two graders disagree: the same agent attempts the same
            refund question three times. Step through each run, then watch the graders
            score it. Every verdict below is computed by running the graders on the
            transcript you just read, and the ground-truth refund is recomputed from
            the order data.
          </p>
          <TranscriptReplay
            activeId={activeId}
            revealed={revealed}
            onSelect={handleSelect}
            onStepForward={handleStepForward}
            onRestartTranscript={handleRestartTranscript}
          />

          {/* Verdict summary strip */}
          <div className="mt-4 rounded-xl border border-[#1e293b] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#1e293b]">
              <p className="text-[12px] font-semibold text-white">Scoreboard</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#1e293b] text-left">
                    <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                      transcript
                    </th>
                    <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                      outcome grader
                    </th>
                    <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                      rubric judge
                    </th>
                    <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                      agree?
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TRANSCRIPTS.map((t, i) => {
                    const graded = revealed[t.id] >= t.steps.length;
                    const oPass = outcomePass(runOutcomeChecks(t));
                    const rV = rubricVerdict(runRubricChecks(t));
                    return (
                      <tr
                        key={t.id}
                        style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
                      >
                        <td className="px-3 py-2 text-[#f1f5f9]">{t.label}</td>
                        {graded ? (
                          <>
                            <td
                              className={`px-3 py-2 font-semibold ${
                                oPass
                                  ? "text-[var(--color-success)]"
                                  : "text-[#ef4444]"
                              }`}
                            >
                              {oPass ? "✓ pass" : "✗ fail"}
                            </td>
                            <td
                              className={`px-3 py-2 font-semibold ${
                                rV.pass
                                  ? "text-[var(--color-success)]"
                                  : "text-[#ef4444]"
                              }`}
                            >
                              {rV.pass ? "✓" : "✗"} {rV.passed}/{rV.total}
                            </td>
                            <td
                              className={`px-3 py-2 font-semibold ${
                                oPass === rV.pass
                                  ? "text-[#94a3b8]"
                                  : "text-[var(--color-warning)]"
                              }`}
                            >
                              {oPass === rV.pass ? "yes" : "no"}
                            </td>
                          </>
                        ) : (
                          <td
                            className="px-3 py-2 text-[#475569] italic"
                            colSpan={3}
                          >
                            step through this run to grade it
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        {/* pass@k vs pass^k lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            One pass is not reliability: pass@k vs pass^k
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            Transcript B passed once by luck. Now imagine running that agent k times on
            the same task. pass@k measures whether it succeeds at least once (can it do
            the task at all), pass^k measures whether it succeeds every single time
            (does it do the task reliably). Drag p and k and watch the two curves pull
            apart as k grows: the pass@k curve climbs toward 100% while pass^k decays
            toward zero.
          </p>
          <PassCurvesLab
            p={p}
            k={k}
            onPChange={setP}
            onKChange={setK}
            gapFound={gapFound}
            gapSnapshot={gapSnapshot}
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
                  Trajectories Graded!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You read three full transcripts, watched code checks and a rubric
                  judge disagree, and proved how far one lucky pass sits from real
                  reliability.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Transcripts graded</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {gradedCount} of {TRANSCRIPTS.length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Grader disagreements
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {disagreements} of {TRANSCRIPTS.length} runs
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      The gap you found
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {gapSnapshot
                        ? `pass@${gapSnapshot.k} ${(gapSnapshot.atK * 100).toFixed(0)}% vs pass^${gapSnapshot.k} ${(gapSnapshot.powK * 100).toFixed(0)}%`
                        : "?"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;An agent that can do a task once is not an agent that does it
                    every time. Grade the trajectory to learn why it fails, and measure
                    pass^k, not just pass@k, to learn how often it will.&quot;
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
