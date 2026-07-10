"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  COMPLETIONS,
  PAIRS,
  REF_LOGITS,
  DEFAULT_BETA,
  MIN_STEPS_PER_RUN,
  MAX_STEPS,
  softmax,
  dpoLoss,
  trainSteps,
  argmax,
  makeRunSnapshot,
  RunSnapshot,
} from "./dpoMath";
import PipelineCompare from "./PipelineCompare";
import DPOLab from "./DPOLab";
import BetaChallenge, { RunCard } from "./BetaChallenge";

const GUIDE_TITLE = "DPO: Preference Tuning Without a Reward Model";
const NEXT_GUIDE_SLUG = "lora-adapters";

const INITIAL_LOSS = dpoLoss(REF_LOGITS, REF_LOGITS, PAIRS, DEFAULT_BETA);

export default function DPOPreferenceTuningClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Interaction state (mount defaults; Try Again restores exactly these) ──
  const [beta, setBeta] = useState(DEFAULT_BETA);
  const [logits, setLogits] = useState<number[]>(() => [...REF_LOGITS]);
  const [stepCount, setStepCount] = useState(0);
  const [lossHistory, setLossHistory] = useState<number[]>(() => [INITIAL_LOSS]);
  const [savedRuns, setSavedRuns] = useState<RunSnapshot[]>([]);
  const [challengePick, setChallengePick] = useState<string | null>(null);
  const [challengeSolved, setChallengeSolved] = useState(false);

  // ── Derived gates ──────────────────────────────────────────────────────────
  const gateRunOne = savedRuns.length >= 1;
  const gateRunTwo = savedRuns.length >= 2;
  const isComplete = gateRunTwo && challengeSolved;

  const correctIds = useMemo(() => {
    if (savedRuns.length < 2) return [] as string[];
    const [a, b] = savedRuns;
    if (Math.abs(a.kl - b.kl) < 1e-9) return [a.id, b.id];
    return [a.kl < b.kl ? a.id : b.id];
  }, [savedRuns]);

  const refProbs = useMemo(() => softmax([...REF_LOGITS]), []);
  const refTopIdx = useMemo(() => argmax(refProbs), [refProbs]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleBetaChange = useCallback((b: number) => {
    setBeta(b);
    // Beta only changes at step 0 (slider locks during a run), where the
    // policy equals the reference and the loss is log 2 for every beta.
    setLossHistory([dpoLoss(REF_LOGITS, REF_LOGITS, PAIRS, b)]);
  }, []);

  const handleTrain = useCallback(
    (n: number) => {
      const remaining = Math.min(n, MAX_STEPS - stepCount);
      if (remaining <= 0) return;
      const result = trainSteps(logits, REF_LOGITS, PAIRS, beta, remaining);
      setLogits(result.logits);
      setStepCount(stepCount + remaining);
      setLossHistory((prev) => [...prev, ...result.losses]);
    },
    [logits, beta, stepCount]
  );

  const resetPolicy = useCallback(
    (b: number) => {
      setLogits([...REF_LOGITS]);
      setStepCount(0);
      setLossHistory([dpoLoss(REF_LOGITS, REF_LOGITS, PAIRS, b)]);
    },
    []
  );

  const handleResetPolicy = useCallback(() => resetPolicy(beta), [resetPolicy, beta]);

  const handleSaveRun = useCallback(() => {
    if (stepCount < MIN_STEPS_PER_RUN || savedRuns.length >= 2) return;
    if (savedRuns.length === 1 && Math.abs(savedRuns[0].beta - beta) < 1e-6) return;
    const n = savedRuns.length + 1;
    const snapshot = makeRunSnapshot(
      logits,
      REF_LOGITS,
      PAIRS,
      beta,
      stepCount,
      `run-${n}`,
      `Run ${n}`
    );
    setSavedRuns((prev) => [...prev, snapshot]);
    resetPolicy(beta);
  }, [logits, beta, stepCount, savedRuns, resetPolicy]);

  const handleChallengePick = useCallback(
    (id: string) => {
      setChallengePick(id);
      if (correctIds.includes(id)) setChallengeSolved(true);
    },
    [correctIds]
  );

  function handleReset() {
    setBeta(DEFAULT_BETA);
    setLogits([...REF_LOGITS]);
    setStepCount(0);
    setLossHistory([INITIAL_LOSS]);
    setSavedRuns([]);
    setChallengePick(null);
    setChallengeSolved(false);
  }

  const progressItems = [
    { id: "run1", label: "Train and save run 1 (10+ steps)", done: gateRunOne },
    { id: "run2", label: "Save run 2 at a different beta", done: gateRunTwo },
    { id: "challenge", label: "Answer the beta comparison", done: challengeSolved },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="dpo-preference-tuning"
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
            DPO: Preference Tuning{" "}
            <span className="text-[var(--color-accent)]">
              Without a Reward Model
            </span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Direct Preference Optimization collapses the RLHF pipeline into one
            supervised loss. Here you train a real toy policy with the actual
            DPO objective, in your browser, and watch beta and step count
            decide how far it drifts from the reference model.
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

        {/* Pipeline comparison */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            One loss where RLHF needs a pipeline
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Classic RLHF turns preference pairs into a trained reward model,
            then runs a reinforcement learning loop against it. If you have not
            walked that pipeline yet, the{" "}
            <Link
              href="/visual-guides/rlhf"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              RLHF guide
            </Link>{" "}
            steps through all three phases. DPO starts from the same data and
            the same goal, then proves the whole right-hand side of that
            pipeline has a closed-form shortcut. It is why much of production
            preference tuning today skips the reward model.
          </p>
          <PipelineCompare />
        </motion.section>

        {/* The objective */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The objective, exactly as the lab runs it
          </p>
          <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto mb-4">
{`loss(y_w, y_l) = -log sigmoid( beta * [ log( pi(y_w) / pi_ref(y_w) )
                                       - log( pi(y_l) / pi_ref(y_l) ) ] )

implicit reward   r(y) = beta * log( pi(y) / pi_ref(y) )
gradient weight   sigmoid(-margin)    wrong pairs push hardest`}
          </pre>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Why a reference model
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                The loss never scores probabilities directly, only log-ratios
                against a frozen copy of the starting model. That is RLHF&apos;s
                KL penalty smuggled into the objective: the policy is rewarded
                for moving relative to where it began, not for collapsing onto
                one answer.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                What beta does
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Beta multiplies the log-ratio margin inside the sigmoid,
                scaling the preference signal against the KL anchor. A high
                beta pushes harder per early step but saturates fast: small
                shifts already satisfy the pairs. A low beta pushes gently yet
                keeps drifting long after the ordering is learned, so final
                drift depends on beta and step count together.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Where the reward model went
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                r(y) = β·log(π/π_ref) is a valid reward model, and the DPO
                derivation shows the RLHF-optimal policy induces exactly this
                form. Your language model is secretly a reward model: train the
                policy and you get the rewards for free.
              </p>
            </div>
          </div>
        </motion.section>

        {/* The lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The lab: preference-tune a toy policy
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            The policy is a softmax over {COMPLETIONS.length} completions of one
            fixed prompt, initialized to the reference model, which was authored
            to favor the vague and the confidently wrong answers. Every step
            button runs real gradient descent on the mean DPO loss over the six
            pairs. Every number on screen, probabilities, loss, KL, margins, is
            recomputed from the current logits. Train at least{" "}
            {MIN_STEPS_PER_RUN} steps, save the run, then do it again at a
            different beta.
          </p>
          <DPOLab
            beta={beta}
            onBetaChange={handleBetaChange}
            logits={logits}
            stepCount={stepCount}
            lossHistory={lossHistory}
            onTrain={handleTrain}
            onResetPolicy={handleResetPolicy}
            onSaveRun={handleSaveRun}
            savedRuns={savedRuns}
          />
        </motion.section>

        {/* Saved runs + challenge */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-4">
            Your recorded runs
          </p>
          {savedRuns.length === 0 ? (
            <p className="text-[12px] text-[#475569] leading-relaxed">
              No runs saved yet. Train the policy above for at least{" "}
              {MIN_STEPS_PER_RUN} steps, then save the run to record its final
              loss, KL, and distribution here.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {savedRuns.map((run) => (
                <RunCard key={run.id} run={run} />
              ))}
            </div>
          )}
          {savedRuns.length === 1 && (
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              One more: move the beta slider to a different value and train a
              second run, so the two are comparable.
            </p>
          )}
          {savedRuns.length >= 2 && (
            <BetaChallenge
              runs={savedRuns}
              correctIds={correctIds}
              pick={challengePick}
              onPick={handleChallengePick}
              solved={challengeSolved}
            />
          )}
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
                  Preferences Optimized, Directly
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You trained a policy with the real DPO loss at two betas and
                  read the drift off your own KL numbers.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {savedRuns.slice(0, 2).map((run) => {
                    const topIdx = argmax(run.probs);
                    return (
                      <div key={run.id} className="rounded-xl border border-[#1e293b] p-3">
                        <p className="text-[10px] text-[#475569] mb-1">
                          {run.label}: β = {run.beta.toFixed(2)}, {run.steps} steps
                        </p>
                        <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                          KL {run.kl.toFixed(3)}, top {COMPLETIONS[topIdx].id} at{" "}
                          {(100 * run.probs[topIdx]).toFixed(1)}%
                        </p>
                      </div>
                    );
                  })}
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Reference model favorite
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {COMPLETIONS[refTopIdx].id} at{" "}
                      {(100 * refProbs[refTopIdx]).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;DPO keeps RLHF&apos;s goal, pull the policy toward
                    preferred completions while a KL tether holds it near the
                    reference, but reaches it with one offline supervised loss.
                    Beta is the tether: tighten it and the preferences are
                    satisfied with little drift, loosen it and the policy trades
                    closeness for larger preference margins.&quot;
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
