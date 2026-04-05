"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useSession } from "next-auth/react";

const PRED_ROUNDS = [
  { prefix: "The cat sat on the", choices: ["mat", "moon", "car"], correct: "mat" },
  { prefix: "The cat sat on the mat and", choices: ["purred", "flew", "melted"], correct: "purred" },
  { prefix: "The cat sat on the mat and purred", choices: ["loudly", "upside-down", "digitally"], correct: "loudly" },
];

const MODEL_SIZES = [
  { name: "GPT-2", year: "2019", params: "1.5B", value: 1.5, cap: "Basic generation" },
  { name: "GPT-3", year: "2020", params: "175B", value: 175, cap: "In-context learning" },
  { name: "PaLM", year: "2022", params: "540B", value: 540, cap: "Chain-of-thought" },
  { name: "GPT-4 est.", year: "2023", params: "~1T", value: 1000, cap: "Complex reasoning" },
];

const TRAIN_STEPS = [
  { icon: "📚", title: "Pre-training", desc: "Read ~1 trillion words from the internet — web pages, books, code, articles.", color: "#3bb4a4" },
  { icon: "🎯", title: "Fine-tuning", desc: "Specialized on task-specific examples to improve helpfulness and reduce harmful outputs.", color: "#d4af37" },
  { icon: "👍", title: "RLHF", desc: "Refined with human feedback — humans rank outputs, a reward model is trained, PPO optimizes the LLM.", color: "#a855f7" },
];

const EMERGENT = [
  { thresh: "1B params", items: ["Basic grammar", "Simple Q&A"], color: "#475569" },
  { thresh: "10B params", items: ["Code completion", "Translation"], color: "#1e5d8a" },
  { thresh: "100B params", items: ["Chain-of-thought reasoning", "Arithmetic"], color: "#3bb4a4" },
  { thresh: "1T params", items: ["Multi-step planning", "Analogical reasoning"], color: "#d4af37" },
];

const GEN_TOKENS = ["Paris", " is", " the", " capital", " of", " France", "."];

export default function WhatIsLLMClient() {
  const { data: session } = useSession();
  const [predRound, setPredRound] = useState(0);
  const [predDone, setPredDone] = useState(false);
  const [choiceFeedback, setChoiceFeedback] = useState<string | null>(null);
  const [trainStep, setTrainStep] = useState(0);
  const [emergentViewed, setEmergentViewed] = useState(false);
  const [scaleViewed, setScaleViewed] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const completionFired = useRef(false);
  const tokensDone = revealed >= GEN_TOKENS.length;
  const allComplete = predDone && emergentViewed && tokensDone;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "what-is-llm", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  // Auto-play token generation
  useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(() => {
      setRevealed(prev => {
        if (prev >= GEN_TOKENS.length) { setAutoPlay(false); return prev; }
        const next = prev + 1;
        setFlashIdx(next - 1);
        setTimeout(() => setFlashIdx(null), 350);
        return next;
      });
    }, 400);
    return () => clearInterval(id);
  }, [autoPlay]);

  function handleChoice(word: string) {
    const round = PRED_ROUNDS[predRound];
    if (word === round.correct) {
      setChoiceFeedback("correct");
      setTimeout(() => {
        setChoiceFeedback(null);
        if (predRound + 1 >= PRED_ROUNDS.length) setPredDone(true);
        else setPredRound(r => r + 1);
      }, 700);
    } else {
      setChoiceFeedback(word);
      setTimeout(() => setChoiceFeedback(null), 600);
    }
  }

  function addToken() {
    if (revealed >= GEN_TOKENS.length) return;
    const next = revealed + 1;
    setFlashIdx(revealed);
    setTimeout(() => setFlashIdx(null), 350);
    setRevealed(next);
  }

  // Scale chart ref
  const scaleRef = useRef<HTMLDivElement>(null);
  const scaleInView = useInView(scaleRef, { once: true, margin: "-60px" });
  const scaleFiredRef = useRef(false);
  useEffect(() => {
    if (scaleInView && !scaleFiredRef.current) { scaleFiredRef.current = true; setScaleViewed(true); }
  }, [scaleInView]);

  // Emergent ref
  const emergRef = useRef<HTMLDivElement>(null);
  const emergInView = useInView(emergRef, { once: true, margin: "-40px" });
  const emergFiredRef = useRef(false);
  useEffect(() => {
    if (emergInView && !emergFiredRef.current) { emergFiredRef.current = true; setEmergentViewed(true); }
  }, [emergInView]);

  const maxVal = MODEL_SIZES[MODEL_SIZES.length - 1].value;
  const progress = [
    { label: "Prediction game", done: predDone },
    { label: "Emergent abilities", done: emergentViewed },
    { label: "Token generation", done: tokensDone },
  ];
  const round = PRED_ROUNDS[predRound];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-[#ef4444]">LLMs</span>
          <span className="text-white/20">/</span>
          <span className="text-white">What Is a Large Language Model?</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#ef4444]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#ef4444]">LLMs</span>
            <span className="w-6 h-px bg-[#ef4444]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            What Is a <span className="text-[#ef4444]">Large Language Model?</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            An LLM is a neural network trained on vast text to predict the next token.
            Behind that simple idea lies billions of parameters and capabilities that surprised even their creators.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-10 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <motion.div className="w-2 h-2 rounded-full" animate={{ backgroundColor: done ? "#3bb4a4" : "#1e293b" }} transition={{ duration: 0.4 }} />
              <span className={`text-[11px] transition-colors ${done ? "text-white" : "text-[#475569]"}`}>{label}</span>
            </div>
          ))}
          {!session?.user && <p className="text-[11px] text-[#475569] ml-auto">Sign in to save progress</p>}
          <AnimatePresence>
            {allComplete && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* ── S1: Core Idea ── */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 1 — The Core Idea</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">LLMs predict the most likely next token given everything before it. Play the game to see this in action.</p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 max-w-[600px]">
            <AnimatePresence mode="wait">
              {predDone ? (
                <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4">
                  <div className="text-3xl mb-3">🎉</div>
                  <p className="text-[14px] font-bold text-white mb-1">That&apos;s exactly what LLMs do!</p>
                  <p className="text-[12px] text-[#94a3b8]">At every step they predict the most probable next token — billions of times per second.</p>
                </motion.div>
              ) : (
                <motion.div key={predRound} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-3">
                    Round {predRound + 1}/{PRED_ROUNDS.length} — complete the sentence:
                  </p>
                  <p className="text-[16px] font-semibold text-white mb-5 leading-relaxed">
                    &ldquo;{round.prefix} <span className="text-[#d4af37]">___</span>&rdquo;
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {round.choices.map(word => {
                      const isGreen = choiceFeedback === "correct" && word === round.correct;
                      const isRed = choiceFeedback === word && word !== round.correct;
                      return (
                        <button key={word} onClick={() => handleChoice(word)} disabled={choiceFeedback !== null}
                          className={`px-5 py-2.5 rounded-xl text-[13px] font-semibold border transition-all disabled:cursor-not-allowed ${
                            isGreen ? "border-[#d4af37] bg-[#d4af37]/20 text-[#d4af37]"
                            : isRed ? "border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444]"
                            : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
                          }`}>{word}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ── S2: Scale ── */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 2 — The Scale</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">&ldquo;Large&rdquo; is the key word. More parameters enable more capable representations.</p>
          <div ref={scaleRef} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
            <h3 className="text-[13px] font-bold text-white mb-1">Parameter Count Over Time</h3>
            <p className="text-[11px] text-[#94a3b8] mb-5">Bars scaled logarithmically so smaller models remain visible.</p>
            <div className="flex items-end gap-4 h-44">
              {MODEL_SIZES.map((m, i) => {
                const logH = Math.log10(m.value + 1) / Math.log10(maxVal + 1);
                return (
                  <div key={m.name} className="flex-1 flex flex-col items-center gap-2">
                    <motion.div className="w-full rounded-t-lg relative"
                      style={{ background: "linear-gradient(to top, #1e5d8a, #3bb4a4)" }}
                      initial={{ height: 0 }}
                      animate={scaleInView ? { height: `${logH * 160}px` } : { height: 0 }}
                      transition={{ delay: i * 0.15, duration: 0.7, ease: "easeOut" }}>
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-bold text-white whitespace-nowrap">{m.params}</span>
                    </motion.div>
                    <div className="text-center">
                      <p className="text-[11px] font-semibold text-white">{m.name}</p>
                      <p className="text-[10px] text-[#94a3b8]">{m.year}</p>
                      <p className="text-[9px] text-[#475569] mt-0.5 leading-tight max-w-[70px] mx-auto">{m.cap}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {scaleViewed && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-[#475569] mt-3 italic">
              GPT-3&apos;s 175B parameters require ~350 GB at float16 — too large for most consumer hardware.
            </motion.p>
          )}
        </section>

        {/* ── S3: Training ── */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 3 — How It&apos;s Trained</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">Training happens in three stages. Click each step to reveal it.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            {TRAIN_STEPS.map((step, i) => (
              <motion.button key={step.title} onClick={() => setTrainStep(Math.max(trainStep, i + 1))}
                className="flex-1 rounded-2xl border text-left p-5 transition-all"
                style={{ borderColor: trainStep > i ? `${step.color}50` : "#1e293b", background: trainStep > i ? `${step.color}08` : "#0f172a" }}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <div className="text-2xl mb-2">{step.icon}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: step.color }}>Step {i + 1}</div>
                <p className="text-[13px] font-bold text-white mb-2">{step.title}</p>
                <AnimatePresence>
                  {trainStep > i
                    ? <motion.p key="d" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-[11px] text-[#94a3b8] leading-relaxed">{step.desc}</motion.p>
                    : <p className="text-[11px] text-[#334155]">Click to reveal</p>}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>
        </section>

        {/* ── S4: Emergent Abilities ── */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 4 — Emergent Abilities</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">These capabilities were never explicitly trained — they appeared as scale increased, surprising researchers.</p>
          <div ref={emergRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {EMERGENT.map((tier, i) => (
              <motion.div key={tier.thresh}
                initial={{ opacity: 0, scale: 0.88 }}
                animate={emergInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.88 }}
                transition={{ delay: i * 0.12, duration: 0.4 }}
                className="rounded-2xl border bg-[#0f172a] p-5"
                style={{ borderColor: `${tier.color}40` }}>
                <div className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold mb-3"
                  style={{ background: `${tier.color}20`, color: tier.color }}>{tier.thresh}</div>
                <ul className="space-y-2">
                  {tier.items.map(a => (
                    <li key={a} className="flex items-start gap-2 text-[12px] text-white">
                      <span style={{ color: tier.color }} className="mt-0.5 text-[10px]">▶</span>{a}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── S5: Token Generation ── */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 5 — Token-by-Token Generation</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">At inference time the model generates one token at a time — each new token becomes part of the input for the next.</p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
            {/* Output */}
            <div className="min-h-[52px] rounded-xl border border-[#1e293b] bg-[#0a0f1e] px-4 py-3 mb-3 font-mono text-[14px] flex flex-wrap items-center">
              <AnimatePresence>
                {GEN_TOKENS.slice(0, revealed).map((tok, i) => (
                  <motion.span key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
                    className={`transition-colors duration-300 ${flashIdx === i ? "text-[#d4af37]" : "text-white"}`}>{tok}</motion.span>
                ))}
              </AnimatePresence>
              {!tokensDone && (
                <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}
                  className="inline-block w-0.5 h-4 bg-[#3bb4a4] ml-0.5" />
              )}
            </div>
            <p className="text-[11px] text-[#94a3b8] mb-4">{revealed} / {GEN_TOKENS.length} tokens generated</p>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={addToken} disabled={tokensDone || autoPlay}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-white hover:border-[#3bb4a4] hover:text-[#3bb4a4] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                Generate Next Token
              </button>
              <button onClick={() => setAutoPlay(true)} disabled={tokensDone || autoPlay}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-[#3bb4a4] text-[#0a0e1a] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                {autoPlay ? "Auto-playing..." : "Auto-play"}
              </button>
              {tokensDone && (
                <button onClick={() => { setRevealed(0); setAutoPlay(false); }}
                  className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37]/10 transition-all">
                  Replay
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Gold insight */}
        <div className="rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-6 mb-12">
          <div className="flex items-start gap-3">
            <span className="text-[#d4af37] text-xl mt-0.5">💡</span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#d4af37] mb-2">Key Insight</p>
              <p className="text-[13px] text-white leading-relaxed">
                LLMs don&apos;t &ldquo;understand&rdquo; language the way humans do — they model statistical patterns.
                Yet these patterns encode surprisingly deep structure about the world.
              </p>
            </div>
          </div>
        </div>

        {/* Summary card */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 mb-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1">Up Next</p>
            <p className="text-[15px] font-bold text-white">How Tokenization Works</p>
            <p className="text-[12px] text-[#94a3b8] mt-1">Understand how raw text is split into tokens before entering an LLM.</p>
          </div>
          <Link href="/visual-guides/tokenization"
            className="px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[#ef4444] text-white hover:opacity-90 transition-opacity whitespace-nowrap">
            Next Guide →
          </Link>
        </div>

        {/* Nav */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link href="/visual-guides/what-is-ml"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
            ← What Is ML?
          </Link>
          <Link href="/visual-guides/tokenization"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
            Tokenization →
          </Link>
        </div>
      </div>
    </div>
  );
}
