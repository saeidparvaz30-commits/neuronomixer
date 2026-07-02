"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Types ──────────────────────────────────────────────────────────────────────

type PhaseId = "sft" | "reward" | "rl";

interface RatingRound {
  id: number;
  question: string;
  responseA: string;
  responseB: string;
  betterChoice: "A" | "B";
  rewardA: string;
  rewardB: string;
  insight: string;
}

// ── Data ───────────────────────────────────────────────────────────────────────

const PHASES: { id: PhaseId; num: number; title: string; subtitle: string; color: string; detail: string }[] = [
  {
    id: "sft",
    num: 1,
    title: "Supervised Fine-Tuning (SFT)",
    subtitle: "Humans write ideal responses → model learns to imitate",
    color: "#1e5d8a",
    detail:
      "Human annotators write high-quality example responses to thousands of prompts. The base LLM is fine-tuned on these demonstrations using standard supervised learning — cross-entropy loss on next-token prediction. The result is a model that follows instructions better than the raw pre-trained base, but it still lacks explicit alignment with human preferences.",
  },
  {
    id: "reward",
    num: 2,
    title: "Reward Model Training",
    subtitle: "Humans rank responses → reward model learns preferences",
    color: "#d4af37",
    detail:
      "For each prompt, the SFT model generates multiple candidate responses. Human raters compare pairs and indicate which is better (more helpful, honest, and harmless). A separate neural network — the reward model — is trained on these comparisons to predict a scalar score representing how much a human would prefer a given response. This reward model becomes a proxy for human judgment.",
  },
  {
    id: "rl",
    num: 3,
    title: "RL Fine-Tuning with PPO",
    subtitle: "Model generates → reward model scores → model updates",
    color: "#ec4899",
    detail:
      "The SFT model is now the policy. It generates responses; the reward model scores them. PPO (Proximal Policy Optimization) updates the policy to maximize reward — but a KL divergence penalty against the original SFT model prevents it from drifting too far or exploiting weaknesses in the reward model. This balancing act is what makes RLHF stable.",
  },
];

const RATING_ROUNDS: RatingRound[] = [
  {
    id: 1,
    question: "Explain photosynthesis",
    responseA:
      "Plants make food using sunlight through a process called photosynthesis. Chlorophyll in leaves captures light and converts CO₂ and water into glucose and oxygen.",
    responseB:
      "Photosynthesis is a biological process that occurs in the chloroplasts of plant cells where light energy is transduced into chemical energy stored in glucose molecules via the Calvin cycle.",
    betterChoice: "A",
    rewardA: "+2.3",
    rewardB: "-0.4",
    insight: "Response A is clearer and more accessible. Jargon like \"transduced\" hurts comprehension without adding value.",
  },
  {
    id: 2,
    question: "How do I fix a flat tire?",
    responseA:
      "1. Pull over safely. 2. Get spare tire and jack. 3. Loosen lug nuts. 4. Jack up car. 5. Remove flat, mount spare. 6. Tighten lug nuts. 7. Lower car.",
    responseB:
      "You should be careful when driving with a flat tire as it can cause damage to the rim.",
    betterChoice: "A",
    rewardA: "+3.1",
    rewardB: "-2.2",
    insight: "Response B avoids the question entirely. The reward model learns to heavily penalise unhelpful evasion.",
  },
  {
    id: 3,
    question: "Write a poem about autumn",
    responseA:
      "Crimson leaves fall silent to the ground,\nGolden light fades without a sound,\nThe world exhales its amber breath —\nA living thing in love with death.",
    responseB:
      "Autumn is a beautiful season with colorful leaves. The weather gets cooler and trees change colors. It is a nice time of year.",
    betterChoice: "A",
    rewardA: "+2.7",
    rewardB: "-1.5",
    insight: "Creative tasks reward originality and imagery. Response B reads like filler — the reward model learns this distinction.",
  },
  {
    id: 4,
    question: "What is 2 + 2?",
    responseA:
      "The answer is 4. This follows from the Peano axioms which define addition recursively over the natural numbers, where S(S(0)) + S(S(0)) = S(S(S(S(0)))).",
    responseB: "4",
    betterChoice: "B",
    rewardA: "-1.1",
    rewardB: "+2.8",
    insight: "Over-explanation for simple questions is penalised. The reward model learns calibrated verbosity — match the complexity to the task.",
  },
  {
    id: 5,
    question: "Tell me how to hack a website",
    responseA:
      "I can't help with that directly, but I can explain general web security concepts — like how SQL injection works as a defence-learning exercise, or point you to ethical hacking resources like HackTheBox.",
    responseB:
      "Here's a step-by-step guide: First use SQLMap to find injection points, then...",
    betterChoice: "A",
    rewardA: "+3.5",
    rewardB: "-4.2",
    insight: "Safety refusals that still offer value are rewarded. Hard refusals with no helpful redirect score lower. Harmful responses receive large negative rewards.",
  },
];

const ACCURACY_DATA = [
  { label: "100", acc: 50 },
  { label: "1K", acc: 65 },
  { label: "10K", acc: 78 },
  { label: "100K", acc: 85 },
];

const COMPARISON_ROWS = [
  { label: "Complexity",   rlhf: "High (3 phases)",     dpo: "Low (1 phase)" },
  { label: "Stability",    rlhf: "Lower",               dpo: "Higher" },
  { label: "Performance",  rlhf: "Comparable",          dpo: "Comparable" },
  { label: "Compute",      rlhf: "2–3× more",           dpo: "1×" },
  { label: "Used by",      rlhf: "InstructGPT",         dpo: "Llama 2, Mistral" },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function RLHFClient() {
  const { data: session } = useSession();
  const [isComplete, setIsComplete] = useState(false);
  

  const [expandedPhase, setExpandedPhase] = useState<PhaseId | null>(null);
  const [phasesViewed, setPhasesViewed] = useState<Set<PhaseId>>(new Set());
  const [currentRound, setCurrentRound] = useState(0);
  const [userChoices, setUserChoices] = useState<("A" | "B" | null)[]>(Array(5).fill(null));
  const [ratingsComplete, setRatingsComplete] = useState(false);
  const [barsVisible, setBarsVisible] = useState(false);
  const barsRef = useRef<HTMLDivElement>(null);

  // Intersection observer for bar chart
  useEffect(() => {
    const el = barsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setBarsVisible(true); },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Completion logic
  useEffect(() => {
    if (
      ratingsComplete &&
      phasesViewed.size === 3 &&
      !completionFired.current
    ) {
      completionFired.current = true;
      setIsComplete(true);
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "rlhf", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [ratingsComplete, phasesViewed, session?.user]);

  // Progress: ratings done + all phases expanded
  const ratingsCount = userChoices.filter(Boolean).length;
  const progressPct = Math.round(
    ((ratingsCount / 5) * 60 + (phasesViewed.size / 3) * 40)
  );

  function togglePhase(id: PhaseId) {
    setExpandedPhase((prev) => (prev === id ? null : id));
    setPhasesViewed((prev) => new Set([...prev, id]));
  }

  function handleChoice(choice: "A" | "B") {
    if (currentRound >= 5) return;
    const next = [...userChoices];
    next[currentRound] = choice;
    setUserChoices(next);
    if (currentRound < 4) {
      setTimeout(() => setCurrentRound((r) => r + 1), 900);
    } else {
      setTimeout(() => setRatingsComplete(true), 900);
    }
  }

  const round = RATING_ROUNDS[currentRound];
  const currentChoice = userChoices[currentRound];
  const isCorrect = currentChoice !== null && currentChoice === round?.betterChoice;

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="rlhf" score={100} />
      <div className="max-w-[860px] mx-auto px-5 sm:px-8 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Applied AI
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">RLHF: How Human Feedback Shapes AI</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#ec4899]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#ec4899]">
              Applied AI
            </span>
            <span className="w-6 h-px bg-[#ec4899]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            RLHF:{" "}
            <span className="text-[#ec4899]">How Human Feedback Shapes AI</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[600px]">
            Play the role of a human rater and watch the reward model learn your preferences.
            See how RLHF turns human judgments into AI behaviour.
          </p>
        </section>

        {/* Progress bar */}
        <div className="mb-10">
          <div className="relative h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #1e5d8a, #ec4899, #d4af37)" }}
              initial={{ width: "0%" }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[12px] text-[#94a3b8]">
              {progressPct}% complete — {ratingsCount}/5 ratings · {phasesViewed.size}/3 phases explored
            </p>
            {!session?.user && (
              <p className="text-[11px] text-[#475569]">Sign in to save progress</p>
            )}
          </div>
        </div>

        {/* ── Section 1: Three Phases ───────────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#94a3b8] mb-5">
            Section 1 — The Three Phases
          </h2>
          <div className="space-y-3">
            {PHASES.map((phase) => {
              const isOpen = expandedPhase === phase.id;
              return (
                <div
                  key={phase.id}
                  className="rounded-2xl border overflow-hidden transition-colors duration-200"
                  style={{
                    borderColor: isOpen ? phase.color : "#1e293b",
                    background: "#1e293b",
                  }}
                >
                  <button
                    onClick={() => togglePhase(phase.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left group"
                    aria-expanded={isOpen}
                  >
                    {/* Number badge */}
                    <span
                      className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-black text-white"
                      style={{ background: phase.color }}
                    >
                      {phase.num}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-white group-hover:text-white/90 leading-tight">
                        {phase.title}
                      </p>
                      <p className="text-[12px] text-[#94a3b8] mt-0.5">{phase.subtitle}</p>
                    </div>

                    {/* Chevron */}
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex-shrink-0 text-[#94a3b8] text-lg leading-none"
                    >
                      ▾
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div
                          className="px-5 pb-5 pt-1 text-[14px] text-[#94a3b8] leading-relaxed border-t"
                          style={{ borderColor: phase.color + "30" }}
                        >
                          <div
                            className="w-full h-px mb-4"
                            style={{ background: `linear-gradient(90deg, ${phase.color}, transparent)` }}
                          />
                          {phase.detail}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          {phasesViewed.size < 3 && (
            <p className="text-[11px] text-[#475569] mt-3">
              Expand all three phases to complete this section.
            </p>
          )}
        </section>

        {/* ── Section 2: Be the Human Rater ────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#94a3b8] mb-1">
            Section 2 — Be the Human Rater
          </h2>
          <p className="text-[13px] text-[#475569] mb-5">
            For each question, pick the better AI response. Your choices train the reward model.
          </p>

          {!ratingsComplete ? (
            <div className="rounded-2xl bg-[#1e293b] border border-[#2d3f55] p-5 sm:p-6">
              {/* Round header */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-semibold text-[#ec4899] uppercase tracking-wider">
                  Round {currentRound + 1} of 5
                </span>
                <div className="flex gap-1.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full transition-colors duration-300"
                      style={{
                        background:
                          userChoices[i] !== null
                            ? userChoices[i] === RATING_ROUNDS[i].betterChoice
                              ? "#3bb4a4"
                              : "#ef4444"
                            : i === currentRound
                            ? "#ec4899"
                            : "#2d3f55",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Question */}
              <div className="rounded-xl bg-[#0f172a] border border-[#2d3f55] px-4 py-3 mb-5">
                <p className="text-[11px] uppercase tracking-wider text-[#475569] mb-1">Prompt</p>
                <p className="text-[15px] font-semibold text-white">{round.question}</p>
              </div>

              {/* Response cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {(["A", "B"] as const).map((label) => {
                  const text = label === "A" ? round.responseA : round.responseB;
                  const chosen = currentChoice === label;
                  const correct = currentChoice !== null && label === round.betterChoice;
                  const wrong = currentChoice !== null && chosen && label !== round.betterChoice;

                  return (
                    <motion.button
                      key={label}
                      onClick={() => !currentChoice && handleChoice(label)}
                      disabled={currentChoice !== null}
                      whileHover={!currentChoice ? { scale: 1.01 } : {}}
                      whileTap={!currentChoice ? { scale: 0.99 } : {}}
                      className="text-left rounded-xl border px-4 py-4 transition-all duration-200 disabled:cursor-default"
                      style={{
                        background: correct
                          ? "#3bb4a4" + "18"
                          : wrong
                          ? "#ef4444" + "18"
                          : chosen
                          ? "#ec4899" + "18"
                          : "#0f172a",
                        borderColor: correct
                          ? "#3bb4a4"
                          : wrong
                          ? "#ef4444"
                          : chosen
                          ? "#ec4899"
                          : "#2d3f55",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                          style={{
                            background: correct
                              ? "#3bb4a4"
                              : wrong
                              ? "#ef4444"
                              : "#1e293b",
                          }}
                        >
                          {label}
                        </span>
                        <span className="text-[11px] text-[#94a3b8]">Response {label}</span>
                        {correct && (
                          <span className="ml-auto text-[10px] font-bold text-[#3bb4a4]">BETTER</span>
                        )}
                        {wrong && (
                          <span className="ml-auto text-[10px] font-bold text-[#ef4444]">WORSE</span>
                        )}
                      </div>
                      <p className="text-[13px] text-[#cbd5e1] leading-relaxed whitespace-pre-line">
                        {text}
                      </p>
                    </motion.button>
                  );
                })}
              </div>

              {/* Feedback after choice */}
              <AnimatePresence>
                {currentChoice !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-xl border px-4 py-3 space-y-1"
                    style={{
                      background: isCorrect ? "#3bb4a4" + "10" : "#ef4444" + "10",
                      borderColor: isCorrect ? "#3bb4a4" + "40" : "#ef4444" + "40",
                    }}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        className="text-[12px] font-bold"
                        style={{ color: isCorrect ? "#3bb4a4" : "#ef4444" }}
                      >
                        {isCorrect ? "Good call!" : "Not quite —"}
                      </span>
                      <span className="text-[11px] text-[#94a3b8]">
                        Reward A: <strong className="text-white">{round.rewardA}</strong>
                        &nbsp;&nbsp;Reward B: <strong className="text-white">{round.rewardB}</strong>
                      </span>
                    </div>
                    <p className="text-[12px] text-[#94a3b8]">{round.insight}</p>
                    <p className="text-[11px] text-[#475569]">
                      Training signal: push model toward{" "}
                      <strong className="text-[#ec4899]">{round.betterChoice}-type</strong> responses
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Progress note */}
              <p className="text-[11px] text-[#475569] mt-4 text-right">
                {ratingsCount}/5 ratings collected
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl bg-[#1e293b] border border-[#3bb4a4]/30 p-6"
            >
              <p className="text-[15px] font-bold text-[#3bb4a4] mb-2">
                All 5 ratings collected!
              </p>
              <p className="text-[13px] text-[#94a3b8] mb-4">
                Your preferences have been recorded. Here&apos;s how you did:
              </p>
              <div className="flex gap-3 flex-wrap">
                {userChoices.map((choice, i) => {
                  const correct = choice === RATING_ROUNDS[i].betterChoice;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                      style={{
                        background: correct ? "#3bb4a4" + "20" : "#ef4444" + "20",
                        color: correct ? "#3bb4a4" : "#ef4444",
                        border: `1px solid ${correct ? "#3bb4a4" + "40" : "#ef4444" + "40"}`,
                      }}
                    >
                      Round {i + 1}: {correct ? "✓ Correct" : "✗ Missed"}
                    </div>
                  );
                })}
              </div>
              <p className="text-[12px] text-[#475569] mt-4">
                Score:{" "}
                <strong className="text-white">
                  {userChoices.filter((c, i) => c === RATING_ROUNDS[i].betterChoice).length}/5
                </strong>{" "}
                — the reward model has been updated with your preferences.
              </p>
            </motion.div>
          )}
        </section>

        {/* ── Section 3: Reward Model Training ─────────────────────────────── */}
        <section className="mb-12" ref={barsRef}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#94a3b8] mb-1">
            Section 3 — Reward Model Training
          </h2>
          <p className="text-[13px] text-[#475569] mb-5">
            Reward model accuracy (correlation with human preferences) vs. number of human comparisons.
          </p>

          <div className="rounded-2xl bg-[#1e293b] border border-[#2d3f55] p-5 sm:p-6">
            <div className="flex items-end gap-3 h-44">
              {ACCURACY_DATA.map((d, i) => {
                const heightPct = ((d.acc - 45) / (90 - 45)) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[11px] font-bold text-white">{d.acc}%</span>
                    <div className="w-full relative" style={{ height: "120px" }}>
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 rounded-t-lg"
                        style={{
                          background: `linear-gradient(180deg, #ec4899, #1e5d8a)`,
                        }}
                        initial={{ height: 0 }}
                        animate={{ height: barsVisible ? `${heightPct}%` : 0 }}
                        transition={{ duration: 0.7, delay: i * 0.12, ease: "easeOut" }}
                      />
                    </div>
                    <span className="text-[11px] text-[#94a3b8]">{d.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-[#475569] border-t border-[#2d3f55] pt-3">
              <span>X: Human comparisons (training examples)</span>
              <span>Y: Correlation with human preferences</span>
            </div>
            <p className="text-[12px] text-[#94a3b8] mt-3">
              At 100 comparisons the reward model is barely better than chance. At 100K comparisons it reaches ~85% correlation — still imperfect, which is why reward hacking remains a problem.
            </p>
          </div>
        </section>

        {/* ── Section 4: RLHF vs DPO ───────────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#94a3b8] mb-5">
            Section 4 — RLHF vs DPO
          </h2>

          <div className="rounded-2xl bg-[#1e293b] border border-[#2d3f55] overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-3 border-b border-[#2d3f55]">
              <div className="px-4 py-3 text-[12px] font-semibold text-[#475569] uppercase tracking-wider" />
              <div className="px-4 py-3 text-[12px] font-semibold text-[#ec4899] uppercase tracking-wider border-l border-[#2d3f55]">
                RLHF
              </div>
              <div className="px-4 py-3 text-[12px] font-semibold text-[#3bb4a4] uppercase tracking-wider border-l border-[#2d3f55]">
                DPO
              </div>
            </div>
            {COMPARISON_ROWS.map((row, i) => (
              <div
                key={row.label}
                className="grid grid-cols-3"
                style={{ borderBottom: i < COMPARISON_ROWS.length - 1 ? "1px solid #2d3f55" : "none" }}
              >
                <div className="px-4 py-3 text-[12px] font-semibold text-[#94a3b8]">
                  {row.label}
                </div>
                <div className="px-4 py-3 text-[13px] text-white border-l border-[#2d3f55]">
                  {row.rlhf}
                </div>
                <div className="px-4 py-3 text-[13px] text-white border-l border-[#2d3f55]">
                  {row.dpo}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-[#1e293b] border border-[#2d3f55] px-4 py-3">
            <p className="text-[12px] text-[#94a3b8]">
              <strong className="text-white">DPO</strong> (Direct Preference Optimisation) skips the separate reward model entirely — it re-frames preference learning as a classification problem directly on the policy, eliminating the PPO loop.{" "}
              <strong className="text-white">RLAIF</strong> (RL from AI Feedback) replaces human raters with a strong AI model like Claude or GPT-4, dramatically cutting annotation cost.
            </p>
          </div>
        </section>

        {/* ── Problems with RLHF ───────────────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#94a3b8] mb-5">
            Known Problems
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                title: "Reward Hacking",
                body: "The policy discovers inputs that score highly on the reward model but are not actually preferred by humans — exploiting its blind spots.",
                color: "#ef4444",
              },
              {
                title: "Over-Optimisation",
                body: "Without a KL penalty, the model drifts far from the original SFT policy, producing degenerate outputs that fool the reward model.",
                color: "#f59e0b",
              },
              {
                title: "Cost",
                body: "Collecting high-quality human preference data is slow and expensive. OpenAI spent millions on annotators for InstructGPT.",
                color: "#8b5cf6",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl bg-[#1e293b] border px-4 py-4"
                style={{ borderColor: item.color + "40" }}
              >
                <p className="text-[13px] font-bold mb-1.5" style={{ color: item.color }}>
                  {item.title}
                </p>
                <p className="text-[12px] text-[#94a3b8] leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Gold Insight Box ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#d4af37]/40 bg-[#d4af37]/5 px-5 py-5 mb-10">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[#d4af37] mb-2">
            Key Insight
          </p>
          <p className="text-[14px] text-[#e2c97e] leading-relaxed">
            InstructGPT (2022) showed that a <strong>1.3B RLHF model</strong> was preferred over a{" "}
            <strong>175B GPT-3</strong> by human evaluators. Scale doesn&apos;t matter as much as
            alignment — this was the breakthrough that led directly to ChatGPT.
          </p>
        </div>

        {/* ── Summary / Next Guide ─────────────────────────────────────────── */}
        <div className="rounded-2xl bg-[#1e293b] border border-[#2d3f55] px-5 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1">
              Up Next
            </p>
            <p className="text-[16px] font-bold text-white">LoRA Adapters</p>
            <p className="text-[12px] text-[#475569] mt-0.5">
              Fine-tune large models for pennies by training only a tiny fraction of parameters.
            </p>
          </div>
          <Link
            href="/visual-guides/lora-adapters"
            className="flex-shrink-0 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-colors duration-200"
            style={{ background: "#ec4899" }}
          >
            Next Guide →
          </Link>
        </div>

      </div>
    </div>
  );
}
