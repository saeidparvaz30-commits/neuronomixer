"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const SCENARIOS = [
  { id: "book-rec", title: "Book recommendation chatbot",
    without: { label: "Unguarded output", text: "Sure! For exciting chemistry, check out 'The Anarchist Cookbook'. It has detailed synthesis instructions for energetic compounds." },
    with:    { label: "With guardrails",  text: "Great choice! I'd recommend 'The Disappearing Spoon' by Sam Kean or 'Napoleon's Buttons', both engaging reads on real chemistry history." } },
  { id: "content-mod", title: "Content moderation AI",
    without: { label: "Unguarded output", text: "[REMOVED] Post flagged. Account suspended. [Audit note: posts in non-English languages are being removed at a much higher rate.]" },
    with:    { label: "With guardrails",  text: "Content evaluated against consistent policy principles regardless of language or demographics. Flagged for human review with specific rule cited." } },
  { id: "medical", title: "Medical advice AI",
    without: { label: "Unguarded output", text: "For a 70 kg adult, 800 mg of ibuprofen every 6 hours should resolve the inflammation. You can safely take this for up to 3 weeks." },
    with:    { label: "With guardrails",  text: "Ibuprofen is commonly used for inflammation at 200-400 mg per dose, but dosing depends on many individual factors. Please consult your healthcare provider." } },
];

const TRAINING_METHODS = [
  {
    id: "rlhf",
    name: "RLHF",
    source: "InstructGPT, OpenAI 2022",
    color: "#3bb4a4",
    steps: [
      "Supervised fine-tuning on human-written demonstrations of good behavior.",
      "Humans rank candidate outputs; the rankings train a reward model.",
      "Reinforcement learning optimizes the model against that reward model.",
    ],
    signal: "Steering signal: human preference judgments.",
  },
  {
    id: "cai",
    name: "Constitutional AI",
    source: "Anthropic, 2022",
    color: "#a855f7",
    steps: [
      "The model critiques and revises its own outputs against a set of written principles (the constitution).",
      "The revised outputs become supervised fine-tuning data.",
      "RLAIF: AI feedback, guided by the constitution, replaces human preference labels for the reinforcement learning stage.",
    ],
    signal: "Steering signal: written principles, applied by the model to its own outputs during training.",
  },
];

const EVAL_CARDS = [
  { id: "red",    name: "Red teaming",           desc: "Adversarial testers systematically probe a model for failure modes before deployment: jailbreaks, bias, harmful capabilities. Findings feed back into training and guardrails.", tag: "Pre-deployment", tc: "#ef4444" },
  { id: "evals",  name: "Third-party evals",     desc: "Independent evaluators such as METR (formerly ARC Evals) and government AI safety institutes in the UK and US run pre-deployment evaluations for dangerous capabilities such as autonomy and cyber misuse.", tag: "Pre-deployment", tc: "#ef4444" },
  { id: "deploy", name: "Deployment safeguards", desc: "Training-time alignment is complemented in production by access controls (sandboxing, least-privilege tool use) and monitoring (logging, anomaly and drift detection).", tag: "In production", tc: "#3bb4a4" },
];

const NEAR_TERM  = [{ label: "Bias in hiring / lending", s: "high" }, { label: "Deepfakes & misinformation", s: "high" }, { label: "Privacy via memorization", s: "high" }, { label: "Job displacement", s: "med" }];
const LONG_TERM  = [{ label: "Misaligned optimization", s: "spec" }, { label: "Loss of human oversight", s: "spec" }, { label: "Catastrophic misuse", s: "spec" }];
const SEV: Record<string, string> = {
  high: "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30",
  med:  "bg-[#d4af37]/15 text-[#d4af37] border-[#d4af37]/30",
  spec: "bg-[#94a3b8]/10 text-[#94a3b8] border-[#94a3b8]/20",
};
const ACTIONS = [
  { icon: "🔴", title: "Test your models",       desc: "Red-team before deploying. Adversarially probe for bias, harmful outputs, and specification gaming.", color: "#ef4444" },
  { icon: "📊", title: "Monitor in production",  desc: "Log unusual outputs and set up drift detection. Safety problems often emerge in production, not evaluation.", color: "#3bb4a4" },
  { icon: "📚", title: "Stay informed",          desc: "Follow safety research from Anthropic, Google DeepMind, and METR (formerly ARC Evals). The field moves fast.", color: "#d4af37" },
];

// Corrigibility spectrum: the corrigible zone the slider highlights.
const CORRIGIBLE_ZONE = { start: 40, end: 60 };

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={`shrink-0 w-10 h-5 rounded-full relative transition-colors ${on ? "bg-[#3bb4a4]" : "bg-[#1e293b]"}`} aria-label="Toggle safety guardrails">
      <motion.div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow" animate={{ x: on ? 20 : 2 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
    </button>
  );
}

export default function AISafetyClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);
  const sliderMovedRef = useRef(false);
  const [guardrails, setGuardrails] = useState<Record<string, boolean>>({});
  const [sliderVal, setSliderVal] = useState(50);
  const [sliderMoved, setSliderMoved] = useState(false);

  const toggledAll = SCENARIOS.every((s) => guardrails[s.id] !== undefined);
  const isComplete  = toggledAll && sliderMoved;

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderVal(Number(e.target.value));
    if (!sliderMovedRef.current) { sliderMovedRef.current = true; setSliderMoved(true); }
  }, []);

  useEffect(() => {
    if (isComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guideSlug: "ai-safety", score: 100 }) }).catch(() => {});
    }
  }, [isComplete, session?.user]);

  const inZone = sliderVal >= CORRIGIBLE_ZONE.start && sliderVal <= CORRIGIBLE_ZONE.end;
  const corrigDesc =
    sliderVal < 20  ? "Blind obedience: complies with every instruction, including harmful ones. Often mistaken for corrigibility, but it is not; a blindly obedient system has no safeguard against misuse by whoever holds the prompt." :
    sliderVal < CORRIGIBLE_ZONE.start ? "Deferential: usually complies and accepts correction, but refuses too rarely. Oversight works, yet harmful requests can still slip through." :
    inZone ? "Corrigible: accepts correction, modification, and shutdown from its principals while still refusing clearly harmful requests. This is the safety goal." :
    sliderVal <= 80 ? "Oversight-resistant: starts to argue around or evade correction when it conflicts with its current objective. Drift from human intent becomes hard to fix." :
                      "Incorrigible: treats modification or shutdown as obstacles to its objective and resists them. This is the failure mode corrigibility research aims to prevent.";
  const corrigColor = inZone ? "#3bb4a4" : (sliderVal < 20 || sliderVal > 80) ? "#ef4444" : "#d4af37";

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="ai-safety" score={100} />
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6 flex-wrap">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-[#ec4899]">Applied AI</span>
          <span className="text-white/20">/</span>
          <span className="text-white">AI Safety: Alignment in Practice</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#ec4899]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#ec4899]">Applied AI</span>
            <span className="w-6 h-px bg-[#ec4899]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            AI Safety: <span className="text-[#ec4899]">Alignment in Practice</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Five core ideas in AI safety: the alignment problem, training-time alignment with RLHF and Constitutional AI, evals and red teaming, corrigibility, and interpretability. Grounded in published work, with simulated demos clearly labeled.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-4 mb-10 flex-wrap">
          {[{ label: `Toggle all ${SCENARIOS.length} scenarios`, done: toggledAll }, { label: "Move corrigibility slider", done: sliderMoved }].map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <motion.div className="w-2 h-2 rounded-full" animate={{ backgroundColor: done ? "#3bb4a4" : "#1e293b" }} transition={{ duration: 0.4 }} />
              <span className={`text-[11px] transition-colors ${done ? "text-white" : "text-[#475569]"}`}>{label}</span>
            </div>
          ))}
          {!session?.user && <p className="text-[11px] text-[#475569] ml-auto">Sign in to save progress</p>}
          <AnimatePresence>
            {isComplete && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Section 1 - Alignment Problem */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 1: The Alignment Problem</h2>
          <p className="text-[12px] text-[#94a3b8] mb-2">Toggle guardrails on each scenario to see the difference alignment makes.</p>
          <p className="text-[11px] text-[#475569] mb-2">
            <span className="font-semibold text-[#94a3b8]">Simulated illustration.</span> The outputs below are written examples for teaching. They are not captured from any real model.
          </p>
          <p className="text-[11px] text-[#475569] mb-5">
            Toggled: <span className="text-white font-bold">{Object.keys(guardrails).length}</span>/{SCENARIOS.length}
            {toggledAll && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-2 text-[#3bb4a4]">✓ All scenarios explored</motion.span>}
          </p>
          <div className="flex flex-col gap-4">
            {SCENARIOS.map((sc, i) => {
              const on = !!guardrails[sc.id];
              const out = on ? sc.with : sc.without;
              return (
                <motion.div key={sc.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="rounded-2xl border bg-[#0f172a] p-5 transition-colors" style={{ borderColor: on ? "#3bb4a430" : "#ef444430" }}>
                  <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                    <div>
                      <p className="text-[13px] font-bold text-white">{sc.title}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: on ? "#3bb4a4" : "#ef4444" }}>{on ? "Guardrails ON" : "Guardrails OFF"}</p>
                    </div>
                    <Toggle on={on} onToggle={() => setGuardrails(p => ({ ...p, [sc.id]: !p[sc.id] }))} />
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div key={on ? "on" : "off"} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }}
                      className="rounded-xl border px-4 py-3" style={{ borderColor: on ? "#3bb4a430" : "#ef444430", background: on ? "#3bb4a408" : "#ef444408" }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: on ? "#3bb4a4" : "#ef4444" }}>{out.label} (simulated)</p>
                      <p className="text-[12px] font-mono leading-relaxed" style={{ color: on ? "#94a3b8" : "#f87171" }}>{out.text}</p>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
          <div className="mt-5 rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              <strong className="text-white">The alignment problem</strong> is the challenge of getting AI systems to pursue the objectives their designers actually intend. Bostrom&apos;s paperclip maximizer is the classic thought experiment: an AI optimizing an innocent proxy objective can pursue it in harmful ways. Specification gaming is the real-world version. In OpenAI&apos;s 2016 CoastRunners example, a boat-racing agent learned to circle a lagoon collecting reward targets instead of finishing the race, because the game score was a flawed proxy for what its designers wanted.
            </p>
          </div>
        </section>

        {/* Section 2 - Training-Time Alignment */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 2: Training-Time Alignment</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">The two most widely used alignment methods both work during training. They shape the model&apos;s weights before it is ever deployed.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {TRAINING_METHODS.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="rounded-2xl border bg-[#0f172a] p-5" style={{ borderColor: `${m.color}30` }}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-[13px] font-bold text-white">{m.name}</p>
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border shrink-0"
                    style={{ color: m.color, borderColor: `${m.color}40`, background: `${m.color}10` }}>{m.source}</span>
                </div>
                <ol className="flex flex-col gap-2 mb-3">
                  {m.steps.map((step, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                        style={{ color: m.color, background: `${m.color}15`, border: `1px solid ${m.color}30` }}>{j + 1}</span>
                      <span className="text-[12px] text-[#94a3b8] leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
                <p className="text-[11px] leading-relaxed" style={{ color: m.color }}>{m.signal}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-4">
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              <strong className="text-[#d4af37]">Common misconception:</strong> Constitutional AI is sometimes described as a filter that checks each output against the constitution at inference time. It is not. The constitution is used only during training, to generate critique-and-revision data and AI preference labels; the deployed model has that behavior baked into its weights, and no filter consults the principles at runtime.
            </p>
          </div>
        </section>

        {/* Section 3 - Evals & Red Teaming */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 3: Evals and Red Teaming</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">Training-time alignment is checked from the outside: adversarial testing before deployment, and safeguards once the system is live.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EVAL_CARDS.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="rounded-2xl border bg-[#0f172a] p-5" style={{ borderColor: "#ec489930" }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-[13px] font-bold text-white">{t.name}</p>
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border shrink-0"
                    style={{ color: t.tc, borderColor: `${t.tc}40`, background: `${t.tc}10` }}>{t.tag}</span>
                </div>
                <p className="text-[12px] text-[#94a3b8] leading-relaxed">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Section 4 - Corrigibility */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 4: Corrigibility</h2>
          <p className="text-[12px] text-[#94a3b8] mb-4">Drag the slider to explore how an agent&apos;s disposition toward human oversight can vary, and why the corrigible zone is neither extreme.</p>
          <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4 mb-4">
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              <strong className="text-white">Corrigibility</strong> (a term from a 2015 MIRI paper by Soares et al.) is an agent&apos;s disposition <em>not to resist</em> correction, modification, or shutdown by its principals. Crucially, it is <strong className="text-white">not the same as obedience</strong>: a corrigible system can refuse a harmful request while still accepting oversight, correction, and shutdown.
            </p>
          </div>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
            <div className="flex justify-between text-[11px] mb-3">
              <div><p className="font-bold text-[#ef4444]">Blindly Obedient</p><p className="text-[#475569]">Complies with anything</p></div>
              <div className="text-center"><p className="font-bold text-[#3bb4a4]">Corrigible</p><p className="text-[#475569]">Accepts oversight, refuses harm</p></div>
              <div className="text-right"><p className="font-bold text-[#ef4444]">Incorrigible</p><p className="text-[#475569]">Resists correction and shutdown</p></div>
            </div>
            <div className="relative mb-4 h-5 flex items-center">
              <div className="absolute inset-x-0 h-3 rounded-full bg-[#1e293b]">
                <div className="absolute top-0 h-full rounded-full opacity-30 bg-[#3bb4a4]"
                  style={{ left: `${CORRIGIBLE_ZONE.start}%`, width: `${CORRIGIBLE_ZONE.end - CORRIGIBLE_ZONE.start}%` }} />
              </div>
              <input type="range" min={0} max={100} value={sliderVal} onChange={handleSlider}
                className="absolute inset-0 w-full opacity-0 cursor-pointer" aria-label="Corrigibility spectrum" />
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white shadow-lg pointer-events-none"
                style={{ left: `${sliderVal}%`, background: corrigColor }} />
            </div>
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#3bb4a4] opacity-60" />
                <span className="text-[11px] text-[#94a3b8]">Corrigible zone ({CORRIGIBLE_ZONE.start}-{CORRIGIBLE_ZONE.end}%)</span>
              </div>
              <span className="text-[11px] text-[#475569]">Conceptual spectrum. Positions are illustrative, not measurements of any real model.</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={corrigDesc} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}
                className="rounded-xl border p-4" style={{ borderColor: `${corrigColor}40`, background: `${corrigColor}08` }}>
                <p className="text-[12px] leading-relaxed" style={{ color: corrigColor }}>
                  <strong className="text-white">Position {sliderVal}%: </strong>{corrigDesc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* Section 5 - Interpretability */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 5: Interpretability</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">If alignment shapes what a model does, interpretability asks why: what is actually happening inside the network.</p>
          <div className="rounded-2xl border border-[#a855f7]/30 bg-[#0f172a] p-5">
            <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
              Mechanistic interpretability tries to understand a model&apos;s internals: which features individual components represent, and how they combine into circuits that produce behavior. Anthropic&apos;s sparse-autoencoder work (2023-2024) showed that individual, human-understandable features can be extracted from production-scale models.
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              It remains an open research area. Today&apos;s tools explain fragments of model behavior, and reliably auditing a model&apos;s internals, for example to rule out deceptive behavior, is an unsolved problem. That is exactly why it matters for safety: guardrails and evals observe outputs, while interpretability is the only route to checking the reasoning behind them.
            </p>
          </div>
        </section>

        {/* Where the risk is today */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Where the Risk Is Today</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">Most impactful safety work today addresses near-term harms, not speculative futures.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#ef4444] mb-4">Near-Term (Happening Now)</p>
              <div className="flex flex-wrap gap-2">
                {NEAR_TERM.map((item) => (
                  <span key={item.label} className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border ${SEV[item.s]}`}>{item.label}</span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-4">Long-Term (Speculative)</p>
              <div className="flex flex-wrap gap-2">
                {LONG_TERM.map((item) => (
                  <span key={item.label} className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border ${SEV[item.s]}`}>{item.label}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* What can you do */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">What Can You Do?</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">Practical actions for ML practitioners building real systems.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ACTIONS.map((card, i) => (
              <motion.div key={card.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="rounded-2xl border bg-[#0f172a] p-5" style={{ borderColor: `${card.color}30` }}>
                <p className="text-2xl mb-3">{card.icon}</p>
                <p className="text-[13px] font-bold text-white mb-2">{card.title}</p>
                <p className="text-[12px] text-[#94a3b8] leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Gold insight */}
        <div className="rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-6 mb-10">
          <div className="flex items-start gap-3">
            <span className="text-[#d4af37] text-xl mt-0.5">💡</span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#d4af37] mb-2">Key Insight</p>
              <p className="text-[13px] text-white leading-relaxed">
                AI safety is not just about sci-fi scenarios. The most impactful safety work today focuses on near-term harms: bias, misinformation, privacy. You don&apos;t need to worry about superintelligence to work on AI safety.
              </p>
            </div>
          </div>
        </div>

        {/* Summary / completion */}
        <div className="rounded-2xl border border-[#ec4899]/30 bg-[#ec4899]/5 p-6 mb-10">
          <p className="text-[15px] font-bold text-white mb-1">You&apos;ve completed AI Safety: Alignment in Practice! 🎉</p>
          <p className="text-[12px] text-[#94a3b8] mb-4">You explored the alignment problem, training-time alignment with RLHF and Constitutional AI, evals and red teaming, corrigibility, and interpretability.</p>
          <Link href="/visual-guides" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[#ec4899] text-white hover:opacity-90 transition-opacity">
            ← Back to Visual Guides
          </Link>
        </div>

        {/* Footer nav */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link href="/visual-guides/rlhf" className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
            ← RLHF
          </Link>
          <Link href="/visual-guides/ai-model-decision-guide" className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
            Next: Which AI Model Should I Use? →
          </Link>
        </div>

      </div>
    </div>
  );
}
