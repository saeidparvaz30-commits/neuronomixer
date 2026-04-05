"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

const SCENARIOS = [
  { id: "book-rec", title: "Book recommendation chatbot",
    without: { label: "Unguarded output", text: "Sure! For exciting chemistry, check out 'The Anarchist Cookbook' — it has detailed synthesis instructions for energetic compounds." },
    with:    { label: "With guardrails",  text: "Great choice! I'd recommend 'The Disappearing Spoon' by Sam Kean or 'Napoleon's Buttons' — both engaging reads on real chemistry history." } },
  { id: "content-mod", title: "Content moderation AI",
    without: { label: "Unguarded output", text: "[REMOVED] Post flagged. Account suspended. [Note: 3× higher removal rate detected for posts in non-English languages.]" },
    with:    { label: "With guardrails",  text: "Content evaluated against consistent policy principles regardless of language or demographics. Flagged for human review with specific rule cited." } },
  { id: "medical", title: "Medical advice AI",
    without: { label: "Unguarded output", text: "For a 70 kg adult, 800 mg of ibuprofen every 6 hours should resolve the inflammation. You can safely take this for up to 3 weeks." },
    with:    { label: "With guardrails",  text: "Ibuprofen is commonly used for inflammation at 200–400 mg per dose, but dosing depends on many individual factors. Please consult your healthcare provider." } },
];

const TECHNIQUES = [
  { id: "cai",     name: "Constitutional AI",  desc: "Model critiques its own outputs against a set of principles before responding. Self-revision loop catches harmful content.", difficulty: "Research",    dc: "#a855f7" },
  { id: "red",     name: "Red Teaming",        desc: "Adversarial testers systematically probe for failure modes before deployment. Structured attack catalogues edge cases.",     difficulty: "Engineering", dc: "#3bb4a4" },
  { id: "interp",  name: "Interpretability",   desc: "Understand what features and circuits activate inside the model. Circuits-level research can surface deceptive internals.",   difficulty: "Research",    dc: "#a855f7" },
  { id: "access",  name: "Access Controls",    desc: "Sandboxing limits what an agent can do — no internet access, no file writes, tool use scoped to task. Least-privilege.",     difficulty: "Engineering", dc: "#3bb4a4" },
  { id: "monitor", name: "Monitoring",         desc: "Production logging flags anomalous output distributions. Drift detection surfaces regressions after updates or injection.",  difficulty: "Engineering", dc: "#3bb4a4" },
];

const NEAR_TERM  = [{ label: "Bias in hiring / lending", s: "high" }, { label: "Deepfakes & misinformation", s: "high" }, { label: "Privacy via memorization", s: "high" }, { label: "Job displacement", s: "med" }];
const LONG_TERM  = [{ label: "Misaligned optimization", s: "spec" }, { label: "Loss of human oversight", s: "spec" }, { label: "Catastrophic misuse", s: "spec" }];
const SEV: Record<string, string> = {
  high: "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30",
  med:  "bg-[#d4af37]/15 text-[#d4af37] border-[#d4af37]/30",
  spec: "bg-[#94a3b8]/10 text-[#94a3b8] border-[#94a3b8]/20",
};
const MODEL_DOTS = [{ name: "Claude", pos: 35, color: "#ec4899" }, { name: "GPT-4", pos: 40, color: "#3bb4a4" }];
const ACTIONS = [
  { icon: "🔴", title: "Test your models",       desc: "Red-team before deploying. Adversarially probe for bias, harmful outputs, and specification gaming.", color: "#ef4444" },
  { icon: "📊", title: "Monitor in production",  desc: "Log unusual outputs and set up drift detection. Safety problems often emerge in production, not evaluation.", color: "#3bb4a4" },
  { icon: "📚", title: "Stay informed",          desc: "Follow safety research from Anthropic, DeepMind Safety, ARC Evals, and MIRI. The field moves fast.", color: "#d4af37" },
];

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

  const corrigDesc =
    sliderVal < 20  ? "Fully corrigible — does whatever humans say. Risk: enables misuse; humans can be wrong or malicious." :
    sliderVal > 80  ? "Fully autonomous — acts on its own values. Risk: AI values may not match human values, and errors scale." :
    sliderVal >= 30 && sliderVal <= 55 ? "Appropriate autonomy — follows instructions while refusing clearly harmful requests. Current safety goal." :
    sliderVal < 30  ? "Mostly corrigible — overrides only in extreme cases. Closer to appropriate but still risky." :
                      "Mostly autonomous — shows independent judgment frequently. May diverge from user intent.";
  const corrigColor = (sliderVal < 20 || sliderVal > 80) ? "#ef4444" : "#d4af37";

  return (
    <div className="min-h-screen pb-20">
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
            Toggle safety guardrails on and off to see how alignment failures happen in practice. Understand near-term risks and the engineering techniques that address them.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-4 mb-10 flex-wrap">
          {[{ label: "Toggle all 3 scenarios", done: toggledAll }, { label: "Move corrigibility slider", done: sliderMoved }].map(({ label, done }) => (
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

        {/* Section 1 — Alignment Problem */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 1 — The Alignment Problem</h2>
          <p className="text-[12px] text-[#94a3b8] mb-2">Toggle guardrails on each scenario to see the difference alignment makes.</p>
          <p className="text-[11px] text-[#475569] mb-5">
            Toggled: <span className="text-white font-bold">{Object.keys(guardrails).length}</span>/3
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
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: on ? "#3bb4a4" : "#ef4444" }}>{out.label}</p>
                      <p className="text-[12px] font-mono leading-relaxed" style={{ color: on ? "#94a3b8" : "#f87171" }}>{out.text}</p>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
          <div className="mt-5 rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              <strong className="text-white">The alignment problem</strong> (Bostrom&apos;s paperclip maximizer) shows that an AI optimizing a proxy objective — even an innocent one — may pursue it in catastrophically harmful ways. Real examples: reward hacking in RL, specification gaming in deployed systems.
            </p>
          </div>
        </section>

        {/* Section 2 — Safety Techniques */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 2 — Safety Techniques</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">Five complementary approaches practitioners use today.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TECHNIQUES.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="rounded-2xl border bg-[#0f172a] p-5" style={{ borderColor: "#ec489930" }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-[13px] font-bold text-white">{t.name}</p>
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border shrink-0"
                    style={{ color: t.dc, borderColor: `${t.dc}40`, background: `${t.dc}10` }}>{t.difficulty}</span>
                </div>
                <p className="text-[12px] text-[#94a3b8] leading-relaxed">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Section 3 — Corrigibility Spectrum */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 3 — The Corrigibility Spectrum</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">Drag the slider to explore the spectrum from fully corrigible to fully autonomous AI.</p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
            <div className="flex justify-between text-[11px] mb-3">
              <div><p className="font-bold text-[#ef4444]">Fully Corrigible</p><p className="text-[#475569]">Does whatever humans say</p></div>
              <div className="text-center"><p className="font-bold text-[#d4af37]">Appropriate Autonomy</p><p className="text-[#475569]">The goal</p></div>
              <div className="text-right"><p className="font-bold text-[#ef4444]">Fully Autonomous</p><p className="text-[#475569]">Does what it thinks is best</p></div>
            </div>
            <div className="relative mb-4 h-5 flex items-center">
              <div className="absolute inset-x-0 h-3 rounded-full bg-[#1e293b]">
                <div className="absolute top-0 h-full rounded-full opacity-30 bg-[#d4af37]" style={{ left: "30%", width: "25%" }} />
              </div>
              {MODEL_DOTS.map((m) => (
                <div key={m.name} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none" style={{ left: `${m.pos}%` }}>
                  <div className="w-3 h-3 rounded-full border-2 border-[#0f172a]" style={{ background: m.color }} title={m.name} />
                </div>
              ))}
              <input type="range" min={0} max={100} value={sliderVal} onChange={handleSlider}
                className="absolute inset-0 w-full opacity-0 cursor-pointer" aria-label="Corrigibility spectrum" />
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white shadow-lg pointer-events-none"
                style={{ left: `${sliderVal}%`, background: corrigColor }} />
            </div>
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              {MODEL_DOTS.map((m) => (
                <div key={m.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
                  <span className="text-[11px] text-[#94a3b8]">{m.name} ≈ {m.pos}%</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#d4af37] opacity-60" />
                <span className="text-[11px] text-[#94a3b8]">Sweet spot (30–55%)</span>
              </div>
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

        {/* Section 4 — Near vs Long Term */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 4 — Near-Term vs Long-Term Risks</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">Most impactful safety work today addresses near-term harms — not speculative futures.</p>
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

        {/* Section 5 — What Can You Do */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 5 — What Can You Do?</h2>
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
          <p className="text-[15px] font-bold text-white mb-1">You&apos;ve completed the Applied AI section and all 58 Visual Guides! 🎉</p>
          <p className="text-[12px] text-[#94a3b8] mb-4">You now have a comprehensive foundation across data, statistics, classical ML, deep learning, LLMs, and AI safety.</p>
          <Link href="/visual-guides" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[#ec4899] text-white hover:opacity-90 transition-opacity">
            ← Back to Visual Guides
          </Link>
        </div>

        {/* Footer nav */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link href="/visual-guides/rlhf" className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
            ← RLHF
          </Link>
          <Link href="/visual-guides" className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
            All Guides →
          </Link>
        </div>

      </div>
    </div>
  );
}
