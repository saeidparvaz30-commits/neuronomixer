"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useSession } from "next-auth/react";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

type Seg = { text: string; wrong: boolean; explanation?: string };
const EXAMPLES: { id: number; type: string; segments: Seg[] }[] = [
  { id: 1, type: "Factual", segments: [
    { text: "Albert Einstein was born in Ulm, Germany in 1879 and won the Nobel Prize in Physics in ", wrong: false },
    { text: "1925", wrong: true, explanation: "Einstein won the Nobel Prize in Physics in 1921, not 1925." },
    { text: ".", wrong: false },
  ]},
  { id: 2, type: "Package", segments: [
    { text: "The Python requests library was created by Kenneth Reitz in 2011. Install with ", wrong: false },
    { text: "'pip install requests-http'", wrong: true, explanation: "The correct package name is 'requests', not 'requests-http'." },
    { text: ".", wrong: false },
  ]},
  { id: 3, type: "Citation", segments: [
    { text: "According to ", wrong: false },
    { text: "a 2019 Stanford study by Johnson et al., LLMs hallucinate 23% of the time", wrong: true, explanation: "This study does not exist. The citation was invented by the model." },
    { text: ".", wrong: false },
  ]},
  { id: 4, type: "Factual", segments: [
    { text: "The Great Wall of China is ", wrong: false },
    { text: "visible from space with the naked eye", wrong: true, explanation: "A widely-repeated myth. Astronauts have confirmed it cannot be seen from space unaided." },
    { text: ".", wrong: false },
  ]},
  { id: 5, type: "Factual", segments: [
    { text: "Marie Curie was the first woman to win a Nobel Prize. She won it in ", wrong: false },
    { text: "Chemistry in 1903", wrong: true, explanation: "Curie won Physics in 1903, not Chemistry. Her Chemistry Nobel came in 1911." },
    { text: ".", wrong: false },
  ]},
];

const WHY = [
  { title: "Pattern completion, not reasoning", body: "LLMs predict statistically likely next tokens — not facts. They complete patterns that look plausible, even when wrong.", color: "#ef4444" },
  { title: "No uncertainty representation", body: "The model always generates something. It has no built-in 'I don't know' state — it fills gaps confidently regardless of knowledge.", color: "#d4af37" },
  { title: "Training data noise", body: "1 trillion tokens contain contradictions, errors, and myths. The model absorbs inconsistencies and may reproduce the wrong version confidently.", color: "#3bb4a4" },
];

const MITIGATIONS = [
  { id: "rag", title: "RAG", subtitle: "Retrieval Augmented Generation", desc: "Ground every response in real documents retrieved at inference time. Facts come from verified sources, not model memory.", riskBefore: 80, riskAfter: 25, color: "#3bb4a4" },
  { id: "citations", title: "Grounding citations", subtitle: "Every claim must cite a source", desc: "Force the model to provide a URL or document reference for each factual claim. Unverifiable claims are flagged.", riskBefore: 75, riskAfter: 30, color: "#1e5d8a" },
  { id: "temperature", title: "Lower temperature", subtitle: "More deterministic outputs", desc: "High temperature = creative but hallucination-prone. Low temperature = more conservative, sticking to high-probability tokens.", riskBefore: 70, riskAfter: 40, color: "#a855f7" },
  { id: "human", title: "Human verification", subtitle: "Always verify high-stakes outputs", desc: "AI outputs are drafts. For medical, legal, or financial decisions, a qualified human must review before acting.", riskBefore: 80, riskAfter: 5, color: "#d4af37" },
];

const CAL_DOTS = [{ cx: 10, cy: 90 }, { cx: 25, cy: 75 }, { cx: 40, cy: 62 }, { cx: 55, cy: 48 }, { cx: 70, cy: 32 }, { cx: 85, cy: 16 }, { cx: 95, cy: 6 }];
const LLM_DOTS = [{ cx: 80, cy: 80 }, { cx: 85, cy: 60 }, { cx: 90, cy: 72 }, { cx: 75, cy: 55 }, { cx: 88, cy: 40 }, { cx: 70, cy: 75 }, { cx: 92, cy: 30 }, { cx: 78, cy: 65 }, { cx: 82, cy: 20 }, { cx: 95, cy: 50 }];

function RiskBar({ value, color }: { value: number; color: string }) {
  return (
    <div>
      <GuideCompletion isComplete={allComplete} guideSlug="hallucination" score={100} />
      <div className="flex justify-between mb-1">
        <span className="text-[10px] text-[#94a3b8]">Hallucination risk</span>
        <span className="text-[10px] font-semibold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
          initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
      </div>
    </div>
  );
}

export default function HallucinationClient() {
  const { data: session } = useSession();
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [mitigOn, setMitigOn] = useState<Record<string, boolean>>({});
  const [mitigViewed, setMitigViewed] = useState(false);
  const completionFired = useRef(false);
  const mitigRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const mitigInView = useInView(mitigRef, { once: true, margin: "-60px" });
  const plotInView = useInView(plotRef, { once: true, margin: "-60px" });
  const mitigFired = useRef(false);

  const revealedCount = Object.values(revealed).filter(Boolean).length;
  const allComplete = revealedCount >= 3 && mitigViewed;

  useEffect(() => { if (mitigInView && !mitigFired.current) { mitigFired.current = true; setMitigViewed(true); } }, [mitigInView]);
  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guideSlug: "hallucination", score: 100 }) }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  const progress = [{ label: "Spot 3 hallucinations", done: revealedCount >= 3 }, { label: "Mitigation strategies", done: mitigViewed }];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-[#ef4444]">LLMs</span>
          <span className="text-white/20">/</span>
          <span className="text-white">Hallucination: When AI Makes Things Up</span>
        </nav>

        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#ef4444]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#ef4444]">LLMs</span>
            <span className="w-6 h-px bg-[#ef4444]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Hallucination: <span className="text-[#ef4444]">When AI Makes Things Up</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            LLMs generate confident-sounding text — even when it&apos;s factually wrong. Learn to spot hallucinations, understand why they happen, and know how to mitigate them.
          </p>
        </section>

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

        {/* Section 1 */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 1 — Spot the Hallucination</h2>
          <p className="text-[12px] text-[#94a3b8] mb-2">Each block is an LLM response. Click <span className="text-white font-semibold">Reveal</span> to see what&apos;s wrong.</p>
          <p className="text-[11px] text-[#475569] mb-6">
            Score: <span className="text-white font-bold">{revealedCount}</span>/5 revealed
            {revealedCount >= 3 && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-2 text-[#3bb4a4]">✓ Milestone reached</motion.span>}
          </p>
          <div className="flex flex-col gap-4">
            {EXAMPLES.map((ex, i) => {
              const isRevealed = !!revealed[ex.id];
              return (
                <motion.div key={ex.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  className="rounded-2xl border bg-[#0f172a] p-5" style={{ borderColor: isRevealed ? "#ef444430" : "#1e293b" }}>
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ef4444]/15 text-[#ef4444]">{ex.type}</span>
                      <span className="text-[10px] text-[#475569]">Example {ex.id}</span>
                    </div>
                    {!isRevealed && (
                      <button onClick={() => setRevealed(p => ({ ...p, [ex.id]: true }))}
                        className="px-3.5 py-1.5 rounded-xl text-[11px] font-semibold bg-[#1e293b] text-white hover:bg-[#ef4444]/20 hover:text-[#ef4444] border border-transparent transition-all">
                        Reveal →
                      </button>
                    )}
                  </div>
                  <p className="text-[13px] leading-relaxed font-mono bg-[#0a0e1a] rounded-xl px-4 py-3">
                    {ex.segments.map((seg, si) => !seg.wrong ? (
                      <span key={si} className="text-[#94a3b8]">{seg.text}</span>
                    ) : (
                      <AnimatePresence key={si} mode="wait">
                        {isRevealed
                          ? <motion.span key="h" initial={{ backgroundColor: "transparent" }} animate={{ backgroundColor: "#ef444420" }} transition={{ duration: 0.4 }} className="text-[#ef4444] underline decoration-dotted decoration-[#ef4444]/50 rounded px-0.5">{seg.text}</motion.span>
                          : <span key="p" className="text-[#94a3b8]">{seg.text}</span>
                        }
                      </AnimatePresence>
                    ))}
                  </p>
                  <AnimatePresence>
                    {isRevealed && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 flex items-start gap-2">
                        <span className="text-[#ef4444] text-[13px] mt-0.5 shrink-0">✗</span>
                        <p className="text-[12px] text-[#ef4444]/80 leading-relaxed">{ex.segments.find(s => s.wrong)?.explanation}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Section 2 */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 2 — Why This Happens</h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">Hallucination isn&apos;t a patchable bug — it&apos;s a structural property of how LLMs work.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {WHY.map((c, i) => (
              <motion.div key={c.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="rounded-2xl border bg-[#0f172a] p-5" style={{ borderColor: `${c.color}30` }}>
                <div className="w-2 h-2 rounded-full mb-3" style={{ backgroundColor: c.color }} />
                <p className="text-[13px] font-bold text-white mb-2">{c.title}</p>
                <p className="text-[12px] text-[#94a3b8] leading-relaxed">{c.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Section 3 */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 3 — Confidence ≠ Accuracy</h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">LLMs cluster at high confidence regardless of whether their answers are correct — the calibration gap.</p>
          <div ref={plotRef} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
            <h3 className="text-[13px] font-bold text-white mb-1">Confidence vs. Actual Accuracy</h3>
            <p className="text-[11px] text-[#94a3b8] mb-5">A well-calibrated model&apos;s confidence tracks accuracy. LLMs are often overconfident — high confidence even when wrong.</p>
            <svg viewBox="0 0 240 200" className="w-full max-w-[440px] mx-auto block">
              {[0, 50, 100].map(v => (
                <React.Fragment key={v}>
                  <line x1={30} y1={10 + (100 - v) * 1.6} x2={230} y2={10 + (100 - v) * 1.6} stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3 3" />
                  <line x1={30 + v * 2} y1={10} x2={30 + v * 2} y2={170} stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3 3" />
                  <text x={30 + v * 2} y={182} textAnchor="middle" fontSize="8" fill="#475569">{v}%</text>
                  {v > 0 && <text x={22} y={10 + (100 - v) * 1.6 + 3} textAnchor="end" fontSize="8" fill="#475569">{v}%</text>}
                </React.Fragment>
              ))}
              <text x={130} y={196} textAnchor="middle" fontSize="9" fill="#94a3b8">Model Confidence →</text>
              <text x={8} y={90} textAnchor="middle" fontSize="9" fill="#94a3b8" transform="rotate(-90 8 90)">Accuracy →</text>
              <line x1={30} y1={170} x2={230} y2={10} stroke="#3bb4a4" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.6" />
              <text x={165} y={52} fontSize="8" fill="#3bb4a4" opacity="0.8">Ideal</text>
              {CAL_DOTS.map((d, i) => (
                <motion.circle key={`c${i}`} cx={30 + d.cx * 2} cy={10 + (100 - d.cy) * 1.6} r="4" fill="#3bb4a4"
                  initial={{ opacity: 0, scale: 0 }} animate={plotInView ? { opacity: 0.85, scale: 1 } : { opacity: 0, scale: 0 }} transition={{ delay: i * 0.08, duration: 0.3 }} />
              ))}
              {LLM_DOTS.map((d, i) => (
                <motion.circle key={`l${i}`} cx={30 + d.cx * 2} cy={10 + (100 - d.cy) * 1.6} r="4" fill="#ef4444"
                  initial={{ opacity: 0, scale: 0 }} animate={plotInView ? { opacity: 0.85, scale: 1 } : { opacity: 0, scale: 0 }} transition={{ delay: 0.7 + i * 0.07, duration: 0.3 }} />
              ))}
            </svg>
            <div className="flex items-center justify-center gap-6 mt-2">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#3bb4a4]" /><span className="text-[11px] text-[#94a3b8]">Well-calibrated</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#ef4444]" /><span className="text-[11px] text-[#94a3b8]">LLM (illustrative)</span></div>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="mb-12" ref={mitigRef}>
          <h2 className="text-[18px] font-bold text-white mb-1">Section 4 — Mitigation Strategies</h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">Toggle each strategy to see how it reduces hallucination risk in practice.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MITIGATIONS.map((m) => {
              const on = !!mitigOn[m.id];
              const risk = on ? m.riskAfter : m.riskBefore;
              const riskColor = risk > 60 ? "#ef4444" : risk > 35 ? "#d4af37" : "#3bb4a4";
              return (
                <div key={m.id} className="rounded-2xl border bg-[#0f172a] p-5 transition-colors" style={{ borderColor: on ? `${m.color}40` : "#1e293b" }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[13px] font-bold text-white">{m.title}</p>
                      <p className="text-[11px] text-[#475569] mt-0.5">{m.subtitle}</p>
                    </div>
                    <button onClick={() => setMitigOn(p => ({ ...p, [m.id]: !p[m.id] }))}
                      className={`shrink-0 w-10 h-5 rounded-full relative transition-colors ${on ? "bg-[#3bb4a4]" : "bg-[#1e293b]"}`}
                      aria-label={`Toggle ${m.title}`}>
                      <motion.div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                        animate={{ x: on ? 20 : 2 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed mb-4">{m.desc}</p>
                  <RiskBar value={risk} color={riskColor} />
                  {on && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] mt-2" style={{ color: m.color }}>Risk reduced from {m.riskBefore}% → {m.riskAfter}%</motion.p>}
                </div>
              );
            })}
          </div>
        </section>

        <div className="rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-6 mb-12">
          <div className="flex items-start gap-3">
            <span className="text-[#d4af37] text-xl mt-0.5">💡</span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#d4af37] mb-2">Key Insight</p>
              <p className="text-[13px] text-white leading-relaxed">
                GPT-4&apos;s hallucination rate is estimated at 3–15% depending on task and measurement method. Even state-of-the-art models hallucinate regularly — treat AI outputs as drafts, not facts.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 mb-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1">Up Next</p>
            <p className="text-[15px] font-bold text-white">Fine-tuning vs. Prompting</p>
            <p className="text-[12px] text-[#94a3b8] mt-1">When do you need to retrain a model vs. just engineer a better prompt?</p>
          </div>
          <Link href="/visual-guides/fine-tuning-vs-prompting" className="px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[#ef4444] text-white hover:opacity-90 transition-opacity whitespace-nowrap">
            Next Guide →
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link href="/visual-guides/what-is-llm" className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
            ← What Is an LLM?
          </Link>
          <Link href="/visual-guides/fine-tuning-vs-prompting" className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
            Fine-tuning vs. Prompting →
          </Link>
        </div>

      </div>
    </div>
  );
}
