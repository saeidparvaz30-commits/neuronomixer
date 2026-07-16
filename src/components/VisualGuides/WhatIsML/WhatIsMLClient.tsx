"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const NEXT_GUIDE_SLUG = "linear-regression";

// ── Types ─────────────────────────────────────────────────────────────────────
type ScenarioId = "spam" | "image" | "price";

interface Scenario {
  id: ScenarioId;
  title: string;
  icon: string;
  rulesBased: { steps: string[]; verdict: string; limitation: string };
  mlBased: { steps: string[]; verdict: string; advantage: string };
  example: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "spam",
    title: "Email Spam Detection",
    icon: "✉️",
    rulesBased: {
      steps: [
        'IF subject contains "FREE" → SPAM',
        'IF sender not in contacts → SPAM',
        'IF body has >3 links → SPAM',
        "ELSE → Not spam",
      ],
      verdict: "Catches obvious spam but misses novel patterns",
      limitation: "Spammers learn the rules and bypass them. Requires constant manual updates.",
    },
    mlBased: {
      steps: [
        "Collect 100,000 labeled emails",
        "Extract features: word frequencies, sender history, timing...",
        "Train a classifier (e.g. Naive Bayes / Neural Net)",
        "Model learns subtle patterns automatically",
      ],
      verdict: "Adapts to new spam patterns without rule updates",
      advantage: "Generalizes to unseen patterns. Improves with more data.",
    },
    example: "Gmail's spam filter catches 99.9% of spam using ML",
  },
  {
    id: "image",
    title: "Cat vs Dog Recognition",
    icon: "🐱",
    rulesBased: {
      steps: [
        "IF ear shape = pointed → Cat",
        "IF fur pattern = striped → Cat",
        "IF snout length > threshold → Dog",
        "ELSE → Unknown",
      ],
      verdict: "Fails on unusual breeds, angles, or lighting",
      limitation: "Millions of rules needed for real-world variation. Impossible to maintain.",
    },
    mlBased: {
      steps: [
        "Collect millions of labeled images",
        "Build a convolutional neural network",
        "Learn hierarchical features: edges → textures → parts → objects",
        "Achieve >99% accuracy on held-out data",
      ],
      verdict: "Handles any breed, angle, lighting condition",
      advantage: "Automatically discovers what makes a cat look like a cat.",
    },
    example: "Google Photos recognizes people, pets, and places in your photos",
  },
  {
    id: "price",
    title: "House Price Prediction",
    icon: "🏠",
    rulesBased: {
      steps: [
        "Base price = $200,000",
        "IF bedrooms > 3: add $50,000 per extra bedroom",
        "IF has garage: add $30,000",
        "IF near school: add $20,000",
      ],
      verdict: "Rough estimate, ignores complex interactions",
      limitation: "Cannot capture nonlinear relationships or market dynamics.",
    },
    mlBased: {
      steps: [
        "Collect historical sales data with 50+ features",
        "Train a gradient boosted tree model",
        "Model learns nonlinear feature interactions",
        "Validated with cross-validation on recent sales",
      ],
      verdict: "Captures neighborhood trends, seasonal patterns, interactions",
      advantage: "Discovers that a pool adds value in summer but not winter markets.",
    },
    example: "Zillow's Zestimate uses ML trained on millions of home sales",
  },
];

// ── Animated flow diagram ─────────────────────────────────────────────────────
function FlowDiagram({ type, steps, color }: { type: "rules" | "ml"; steps: string[]; color: string }) {
  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: type === "rules" ? -16 : 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08, duration: 0.3 }}
          className="flex items-start gap-2.5"
        >
          <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
            style={{ background: color }}>
            {i + 1}
          </div>
          <div className="flex-1 rounded-lg border border-[#1e293b] bg-[#0f172a] px-3 py-2">
            <p className="text-[11px] text-white leading-snug font-mono">{step}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── ML types overview ─────────────────────────────────────────────────────────
const ML_TYPES = [
  {
    title: "Supervised Learning",
    color: "#3bb4a4",
    icon: "👩‍🏫",
    desc: "Learns from labeled examples. Input → known output pairs.",
    examples: ["Email classification", "Image recognition", "House price prediction"],
  },
  {
    title: "Unsupervised Learning",
    color: "var(--color-accent)",
    icon: "🔍",
    desc: "Finds hidden structure in unlabeled data.",
    examples: ["Customer segmentation", "Anomaly detection", "Topic modeling"],
  },
  {
    title: "Reinforcement Learning",
    color: "#a855f7",
    icon: "🎮",
    desc: "Agent learns by trial and error, maximizing cumulative reward.",
    examples: ["Game playing (AlphaGo)", "Robot locomotion", "Ad bidding"],
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WhatIsMLClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const [activeScenario, setActiveScenario] = useState<ScenarioId>("spam");
  const [view, setView] = useState<"comparison" | "types" | "workflow">("comparison");
  const [scenariosExplored, setScenariosExplored] = useState<Set<ScenarioId>>(new Set(["spam"]));
  const [viewsExplored, setViewsExplored] = useState<Set<string>>(new Set(["comparison"]));
  const completionFired = useRef(false);

  const allComplete = scenariosExplored.size >= 3 && viewsExplored.size >= 2;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "what-is-ml", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  function selectScenario(id: ScenarioId) {
    setActiveScenario(id);
    setScenariosExplored(prev => new Set([...prev, id]));
  }

  function selectView(v: "comparison" | "types" | "workflow") {
    setView(v);
    setViewsExplored(prev => new Set([...prev, v]));
  }

  const scenario = SCENARIOS.find(s => s.id === activeScenario)!;

  const progress = [
    { label: `Scenarios explored: ${scenariosExplored.size}/3`, done: scenariosExplored.size >= 3 },
    { label: `Sections viewed: ${viewsExplored.size}/2`, done: viewsExplored.size >= 2 },
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">What Is Machine Learning?</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Machine Learning</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            What Is <span className="text-[var(--color-accent)]">Machine Learning?</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Machine learning is the art of letting computers learn from data instead of following
            explicit rules. Compare both approaches side by side on real scenarios.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full transition-colors ${done ? "bg-[#3bb4a4]" : "bg-[#1e293b]"}`} />
              <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>{label}</span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">Sign in</Link>{" "}to track progress
            </p>
          )}
          <AnimatePresence>
            {allComplete && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-1.5 mb-6 flex-wrap" role="radiogroup" aria-label="Guide view">
          {[
            { id: "comparison" as const, label: "Rules vs ML" },
            { id: "types" as const, label: "Types of ML" },
            { id: "workflow" as const, label: "ML Workflow" },
          ].map(({ id, label }) => (
            <button key={id}
              role="radio"
              aria-checked={view === id}
              onClick={() => selectView(id)}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold border transition-all ${
                view === id
                  ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-[#0a0e1a]"
                  : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
              }`}>
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {view === "comparison" && (
            <motion.div key="comparison" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {/* Scenario picker */}
              <div className="flex items-center gap-2 mb-6 flex-wrap">
                {SCENARIOS.map(s => (
                  <button key={s.id}
                    onClick={() => selectScenario(s.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[13px] font-semibold transition-all ${
                      activeScenario === s.id
                        ? "border-[#3bb4a4] bg-[#3bb4a4]/10 text-white"
                        : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
                    }`}>
                    <span>{s.icon}</span> {s.title}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={activeScenario}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Rules-based */}
                  <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-[#ef4444]/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="text-[13px] font-bold text-white">Rules-Based Programming</p>
                    </div>
                    <FlowDiagram type="rules" steps={scenario.rulesBased.steps} color="#ef4444" />
                    <div className="mt-4 rounded-lg border border-[#ef4444]/20 bg-[#ef4444]/5 p-3">
                      <p className="text-[10px] font-semibold text-[#ef4444] mb-1">Result</p>
                      <p className="text-[11px] text-white mb-2">{scenario.rulesBased.verdict}</p>
                      <p className="text-[10px] text-[#94a3b8]">⚠ {scenario.rulesBased.limitation}</p>
                    </div>
                  </div>

                  {/* ML-based */}
                  <div className="rounded-2xl border border-[#3bb4a4]/30 bg-[#0f172a] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-[#3bb4a4]/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#3bb4a4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <p className="text-[13px] font-bold text-white">Machine Learning</p>
                    </div>
                    <FlowDiagram type="ml" steps={scenario.mlBased.steps} color="#3bb4a4" />
                    <div className="mt-4 rounded-lg border border-[#3bb4a4]/20 bg-[#3bb4a4]/5 p-3">
                      <p className="text-[10px] font-semibold text-[#3bb4a4] mb-1">Result</p>
                      <p className="text-[11px] text-white mb-2">{scenario.mlBased.verdict}</p>
                      <p className="text-[10px] text-[#94a3b8]">✓ {scenario.mlBased.advantage}</p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Real-world example */}
              <div className="mt-4 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-4">
                <span className="text-[10px] font-semibold text-[var(--color-accent)] uppercase tracking-wider">Real-world example</span>
                <p className="text-[13px] text-white mt-1">{scenario.example}</p>
              </div>
            </motion.div>
          )}

          {view === "types" && (
            <motion.div key="types" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {ML_TYPES.map(({ title, color, icon, desc, examples }) => (
                <div key={title} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
                  <div className="text-3xl mb-3">{icon}</div>
                  <p className="text-[14px] font-bold mb-2" style={{ color }}>{title}</p>
                  <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">{desc}</p>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#475569] mb-2">Examples</p>
                    <ul className="space-y-1.5">
                      {examples.map(ex => (
                        <li key={ex} className="flex items-center gap-2 text-[11px] text-white">
                          <span style={{ color }}>•</span> {ex}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {view === "workflow" && (
            <motion.div key="workflow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { step: "1", title: "Collect Data", desc: "Gather labeled examples representative of the real problem. More diverse data → better generalization.", color: "#3bb4a4", icon: "📊" },
                  { step: "2", title: "Prepare Features", desc: "Clean, transform, and engineer features. Handle missing values, scale, encode categories.", color: "var(--color-accent)", icon: "🔧" },
                  { step: "3", title: "Train Model", desc: "Feed training data into an algorithm. It adjusts internal parameters to minimize prediction error.", color: "#a855f7", icon: "🧠" },
                  { step: "4", title: "Evaluate & Deploy", desc: "Test on held-out data. Monitor performance over time. Retrain as data drifts.", color: "#ef4444", icon: "🚀" },
                ].map(({ step, title, desc, color, icon }) => (
                  <motion.div key={step}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Number(step) * 0.1 }}
                    className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 relative overflow-hidden"
                  >
                    <div className="text-2xl mb-2">{icon}</div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color }}>
                      Step {step}
                    </p>
                    <p className="text-[14px] font-bold text-white mb-2">{title}</p>
                    <p className="text-[11px] text-[#94a3b8] leading-relaxed">{desc}</p>
                    <div className="absolute top-4 right-4 text-[48px] font-black opacity-[0.04]" style={{ color }}>{step}</div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
                <p className="text-[12px] font-semibold text-white mb-3">The Learning Process</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Training Set", pct: "70–80%", desc: "Used to fit model parameters", color: "#3bb4a4" },
                    { label: "Validation Set", pct: "10–15%", desc: "Tune hyperparameters & architecture", color: "var(--color-accent)" },
                    { label: "Test Set", pct: "10–15%", desc: "Final unbiased performance estimate", color: "#a855f7" },
                  ].map(({ label, pct, desc, color }) => (
                    <div key={label} className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[11px] font-semibold" style={{ color }}>{label}</p>
                      <p className="text-[22px] font-black text-white my-1">{pct}</p>
                      <p className="text-[10px] text-[#475569]">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completion card */}
        <AnimatePresence>
          {allComplete && (
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
                  You Saw Why Rules Give Way to Learning
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You compared rules-based and learned pipelines on spam,
                  images, and house prices, and toured the three families of
                  machine learning and the workflow that ships a model.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Scenarios compared side by side
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {scenariosExplored.size} of {SCENARIOS.length}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      rules vs machine learning, each time
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Sections viewed
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {viewsExplored.size} of 3
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      comparison, types of ML, workflow
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Rules are written by people and freeze; models are
                    learned from data and adapt, which is why machine learning
                    wins wherever the rules are too many, too subtle, or too
                    fast-moving to write by hand.&quot;
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
                <Link
                  href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
                >
                  Next Guide →
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav (pre-completion) */}
        {!allComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link href="/visual-guides/bias-variance"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
              ← Previous Guide
            </Link>
            <Link href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
              Next Guide →
            </Link>
          </div>
        )}

        <GuideCompletion isComplete={allComplete} guideSlug="what-is-ml" score={100} />
      </div>
    </div>
  );
}
