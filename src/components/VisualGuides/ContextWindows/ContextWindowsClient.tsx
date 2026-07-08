"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";

// ── Constants ──────────────────────────────────────────────────────────────────

const TOKEN_STEPS = [4096, 8192, 16384, 32768, 65536, 131072];

// Illustrative U-shaped curve of the "lost in the middle" effect reported by
// Liu et al. (2023); not measurements of any specific model.
const RECALL_POINTS = [
  { pos: 0, acc: 90 }, { pos: 10, acc: 82 }, { pos: 20, acc: 71 },
  { pos: 30, acc: 63 }, { pos: 40, acc: 58 }, { pos: 50, acc: 55 },
  { pos: 60, acc: 57 }, { pos: 70, acc: 60 }, { pos: 80, acc: 65 },
  { pos: 90, acc: 72 }, { pos: 100, acc: 75 },
];

// Documented context limits at each model's release date.
// Pages derived with the same conversion used in Section 1:
// tokens × 0.75 words/token ÷ 400 words/page.
const MODELS = [
  { name: "GPT-3.5 (2022)",        tokens: 4_096,     pages: 8,     useCase: "Short chats" },
  { name: "GPT-4 Turbo (2023)",    tokens: 128_000,   pages: 240,   useCase: "Documents" },
  { name: "Claude 3 (2024)",       tokens: 200_000,   pages: 375,   useCase: "Long docs" },
  { name: "Gemini 1.5 Pro (2024)", tokens: 1_000_000, pages: 1_875, useCase: "Books / codebases" },
];

const BAR_SEGMENTS = [
  { key: "system",   label: "System Prompt",   color: "#1e5d8a", ratio: 0.08 },
  { key: "history",  label: "User History",    color: "#3bb4a4", ratio: 0.22 },
  { key: "current",  label: "Current Context", color: "var(--color-accent)", ratio: 0.50 },
  { key: "response", label: "Response Space",  color: "#475569", ratio: 0.20 },
];

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ── SVG Recall Chart ───────────────────────────────────────────────────────────

const W = 540, H = 200;
const P = { t: 20, r: 20, b: 36, l: 44 };
const IW = W - P.l - P.r, IH = H - P.t - P.b;
const sx = (p: number) => P.l + (p / 100) * IW;
const sy = (a: number) => P.t + ((100 - a) / 100) * IH;

const linePath = RECALL_POINTS.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.pos)} ${sy(p.acc)}`).join(" ");
const dangerPts = [[25,65],[50,55],[75,65],[75,100],[50,100],[25,100]].map(([x,y]) => `${sx(x)},${sy(y)}`).join(" ");

function RecallChart({ onViewed }: { onViewed: () => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true, margin: "-60px" });
  const fired = useRef(false);
  useEffect(() => { if (inView && !fired.current) { fired.current = true; onViewed(); } }, [inView, onViewed]);

  return (
    <div className="overflow-x-auto">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[540px]" aria-label="Recall vs position">
        <polygon points={dangerPts} fill="#ef444420" />
        {[25,50,75,100].map(p => <line key={p} x1={P.l} y1={sy(p)} x2={P.l+IW} y2={sy(p)} stroke="#1e293b" strokeWidth={1} />)}
        {[0,25,50,75,100].map(p => <text key={p} x={sx(p)} y={H-6} textAnchor="middle" fontSize={10} fill="#94a3b8">{p}%</text>)}
        {[25,50,75,100].map(p => <text key={p} x={P.l-6} y={sy(p)+4} textAnchor="end" fontSize={10} fill="#94a3b8">{p}%</text>)}
        <text x={P.l+IW/2} y={H-0} textAnchor="middle" fontSize={10} fill="#94a3b8">Position in context</text>
        <text x={sx(50)} y={sy(59)} textAnchor="middle" fontSize={9} fill="#ef4444" fontWeight="600">Danger zone: may be forgotten</text>
        <motion.path d={linePath} fill="none" stroke="#3bb4a4" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : { pathLength: 0 }} transition={{ duration: 1.4, ease: "easeInOut" }} />
        {inView && RECALL_POINTS.map(p => (
          <motion.circle key={p.pos} cx={sx(p.pos)} cy={sy(p.acc)} r={3.5} fill="#3bb4a4"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2 + p.pos * 0.004, duration: 0.25 }} />
        ))}
      </svg>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ContextWindowsClient() {
  const { data: session } = useSession();
  const { fadeUp, stagger, pop, card } = useGuideMotion();
  const completionFired = useRef(false);
  const sliderMoved = useRef(false);

  const [sliderIdx, setSliderIdx] = useState(0);
  const [chartViewed, setChartViewed] = useState(false);
  const [historyTurns, setHistoryTurns] = useState(3);
  const [userMsgLen, setUserMsgLen] = useState(50);
  const [resetKey, setResetKey] = useState(0);

  const handleReset = useCallback(() => {
    sliderMoved.current = false;
    setSliderIdx(0);
    setChartViewed(false);
    setHistoryTurns(3);
    setUserMsgLen(50);
    setResetKey(k => k + 1);
  }, []);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderIdx(Number(e.target.value));
    sliderMoved.current = true;
  }, []);

  const handleChartViewed = useCallback(() => setChartViewed(true), []);

  const isComplete = sliderMoved.current && chartViewed;

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "context-windows", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  const contextSize = TOKEN_STEPS[sliderIdx];
  const words = Math.round(contextSize * 0.75);
  const pages = Math.round(words / 400);
  const usedTokens = 6 + historyTurns * 40 + userMsgLen;
  const usedPct = Math.min((usedTokens / contextSize) * 100, 100);
  const isFull = usedPct >= 85;
  const maxModelTokens = MODELS[MODELS.length - 1].tokens;

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="context-windows" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">Context Windows: What the Model Can See</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">LLMs</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Context Windows: <span className="text-[var(--color-accent)]">What the Model Can See</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Slide context length and visualize the lost-in-the-middle effect. Everything outside the window is completely invisible to the model, and even content inside the window is not recalled equally well.
          </p>
        </section>

        {/* Progress indicators */}
        <div className="flex items-center gap-4 mb-10 flex-wrap">
          {[{ label: "Adjusted the slider", done: sliderMoved.current }, { label: "Viewed recall chart", done: chartViewed }].map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full transition-colors" style={{ background: done ? "var(--color-accent)" : "#1e293b" }} />
              <span className={`text-[11px] transition-colors ${done ? "text-white" : "text-[#475569]"}`}>{label}</span>
            </div>
          ))}
          {!session?.user && <p className="text-[11px] text-[#475569] ml-auto">Sign in to save progress</p>}
          <AnimatePresence>
            {isComplete && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-auto text-[11px] font-semibold text-[var(--color-success)] flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Section 1: Window Visualization */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 1: The Window Visualization</h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">The context window holds everything the model can read. Drag the slider to resize it.</p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
            <div className="flex flex-wrap gap-6 mb-6">
              {[
                { label: "Tokens available", value: fmtTokens(contextSize), color: "text-white" },
                { label: "Approx. words", value: words.toLocaleString(), color: "text-[#3bb4a4]" },
                { label: "Approx. pages", value: `~${pages}`, color: "text-[var(--color-accent)]" },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-[11px] text-[#94a3b8] mb-0.5">{s.label}</p>
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="mb-4">
              <div className="h-10 w-full rounded-xl overflow-hidden flex">
                {BAR_SEGMENTS.map(seg => (
                  <motion.div key={seg.key} className="h-full flex items-center justify-center overflow-hidden"
                    style={{ background: seg.color }} animate={{ width: `${seg.ratio * 100}%` }} transition={{ duration: 0.4 }}>
                    <span className="text-[9px] font-semibold text-white/80 truncate px-1 hidden sm:block">{seg.label}</span>
                  </motion.div>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {BAR_SEGMENTS.map(s => (
                  <div key={s.key} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: s.color }} />
                    <span className="text-[10px] text-[#94a3b8]">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <label className="text-[11px] text-[#94a3b8] mb-2 block">
              Context size: <span className="text-white font-semibold">{fmtTokens(contextSize)} tokens</span>
            </label>
            <input type="range" min={0} max={TOKEN_STEPS.length - 1} step={1} value={sliderIdx}
              onChange={handleSliderChange} className="w-full accent-[var(--color-accent)] cursor-pointer" aria-label="Context window size" />
            <div className="flex justify-between text-[10px] text-[#475569] mt-1">
              {TOKEN_STEPS.map(t => <span key={t}>{fmtTokens(t)}</span>)}
            </div>
          </div>
        </section>

        {/* Section 2: Lost in the Middle */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 2: The Lost in the Middle Problem</h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">Even when content fits inside the window, recall quality drops for information buried in the middle of a long context.</p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
            <RecallChart key={resetKey} onViewed={handleChartViewed} />
            <p className="mt-3 text-[10px] text-[#475569] leading-relaxed">
              Illustrative curve of the U-shaped &quot;lost in the middle&quot; pattern reported by Liu et al. (2023). It shows the qualitative shape, not measurements of any specific model.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Start (0–10%)", value: "~86%", color: "#3bb4a4", note: "Best recalled" },
                { label: "Middle (40–60%)", value: "~57%", color: "#ef4444", note: "Often missed" },
                { label: "End (90–100%)", value: "~74%", color: "var(--color-accent)", note: "Partially recalled" },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-[#1e293b] p-3 text-center">
                  <p className="text-[10px] text-[#94a3b8] mb-1">{s.label}</p>
                  <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] text-[#475569]">{s.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Model Comparison */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 3: Model Comparison</h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">Context windows have grown dramatically across model generations. The table shows each model&apos;s documented limit at its release date; current models may differ. Page counts use the same conversion as Section 1 (0.75 words per token, 400 words per page).</p>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={GUIDE_VIEWPORT}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_80px_70px_140px_200px] text-[10px] font-semibold text-[#475569] uppercase tracking-wider px-5 py-3 border-b border-[#1e293b]">
              <span>Model</span><span className="text-right">Context</span><span className="text-right">Pages</span><span className="pl-2">Use Case</span><span className="pl-2">Relative Size</span>
            </div>
            {MODELS.map((m, i) => {
              const barPct = Math.log10(m.tokens + 1) / Math.log10(maxModelTokens + 1) * 100;
              return (
                <motion.div key={m.name} variants={fadeUp}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_80px_70px_140px_200px] gap-2 sm:gap-0 px-5 py-4 border-b border-[#1e293b] last:border-b-0">
                  <span className="text-[13px] font-bold text-white">{m.name}</span>
                  <span className="text-right text-[12px] text-[#3bb4a4] font-semibold">{fmtTokens(m.tokens)}</span>
                  <span className="text-right text-[12px] text-[#94a3b8]">~{m.pages}</span>
                  <span className="pl-2 text-[11px] text-[#94a3b8]">{m.useCase}</span>
                  <div className="pl-2 flex items-center">
                    <div className="flex-1 h-2 bg-[#1e293b] rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #1e5d8a, #ef4444)" }}
                        initial={{ width: "0%" }} animate={{ width: `${barPct}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: "easeOut" }} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* Section 4: Token Breakdown */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 4: What Counts as Tokens?</h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">Every message in the conversation accumulates tokens. Adjust the sliders to see how the window fills up.</p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 max-w-[640px]">
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#94a3b8]">System prompt: &quot;You are a helpful assistant.&quot;</span>
                <span className="text-white font-semibold">6 tokens</span>
              </div>
              <div>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <label className="text-[#94a3b8]">Chat history turns</label>
                  <span className="text-[#3bb4a4] font-semibold">{historyTurns} turns · {historyTurns * 40} tokens</span>
                </div>
                <input type="range" min={0} max={20} value={historyTurns} aria-label="Chat history turns" onChange={e => setHistoryTurns(Number(e.target.value))} className="w-full accent-[#3bb4a4] cursor-pointer" />
              </div>
              <div>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <label className="text-[#94a3b8]">Current user message</label>
                  <span className="text-[var(--color-accent)] font-semibold">{userMsgLen} tokens</span>
                </div>
                <input type="range" min={10} max={500} value={userMsgLen} aria-label="Current user message tokens" onChange={e => setUserMsgLen(Number(e.target.value))} className="w-full accent-[var(--color-accent)] cursor-pointer" />
              </div>
            </div>
            <div className="border-t border-[#1e293b] pt-4">
              <div className="flex items-center justify-between text-[13px] mb-2">
                <span className="text-[#94a3b8]">Total used</span>
                <span className="font-bold text-white">{usedTokens.toLocaleString()} / {fmtTokens(contextSize)} tokens</span>
              </div>
              <div className="h-3 bg-[#1e293b] rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full"
                  style={{ background: isFull ? "#ef4444" : "linear-gradient(90deg, #1e5d8a, #3bb4a4)" }}
                  animate={{ width: `${Math.min(usedPct, 100)}%` }} transition={{ duration: 0.3 }} />
              </div>
              <AnimatePresence>
                {isFull && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mt-2 text-[11px] text-[#ef4444] font-semibold">
                    Near the limit: the application (not the model) must now trim the conversation. Most chat apps drop or summarize the oldest messages, and the model never sees what was cut.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Section 5: Chunking */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 5: Chunking for Large Docs</h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">Documents larger than the context window must be split into manageable pieces.</p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 max-w-[640px]">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={GUIDE_VIEWPORT} className="flex flex-wrap gap-2 mb-4">
              {Array.from({ length: 8 }, (_, i) => (
                <motion.div key={i} variants={pop}
                  className="rounded-lg px-3 py-2 text-[11px] font-semibold border"
                  style={{ borderColor: i === 2 ? "#3bb4a4" : "#1e293b", background: i === 2 ? "#3bb4a420" : "#1e293b", color: i === 2 ? "#3bb4a4" : "#475569" }}>
                  {i === 2 ? "Chunk 3 (retrieved)" : `Chunk ${i + 1}`}
                </motion.div>
              ))}
            </motion.div>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
              <strong className="text-white">RAG (Retrieval-Augmented Generation)</strong> retrieves only the chunks relevant to the user&apos;s query, keeping the context window focused rather than stuffed.
            </p>
            <Link href="/visual-guides/rag-explained" className="inline-flex items-center gap-1.5 text-[12px] text-[#3bb4a4] hover:text-white transition-colors group">
              <span>Explore the RAG guide</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </div>
        </section>

        {/* Gold insight */}
        <div className="mb-12 rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-5">
          <h3 className="text-[12px] font-bold text-[var(--color-accent)] uppercase tracking-wider mb-2">Gold Insight</h3>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed">
            <strong className="text-white">Longer context does not equal better performance.</strong>{" "}
            Retrieval-augmented approaches often outperform &quot;stuff everything in the context&quot; because they focus attention on relevant content rather than burying the signal in noise.
          </p>
        </div>

        {/* Summary card */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <p className="text-[11px] text-[#94a3b8] uppercase tracking-wider mb-1">Up next</p>
            <p className="text-[15px] font-bold text-white">Hallucinations: When Models Confabulate</p>
            <p className="text-[12px] text-[#475569] mt-0.5">Understand why LLMs produce confident but wrong answers.</p>
          </div>
          <Link href="/visual-guides/hallucination" className="flex-shrink-0 px-4 py-2 rounded-xl bg-[var(--color-accent)] text-[#0a0e1a] text-[13px] font-semibold hover:opacity-90 transition-opacity">
            Next Guide →
          </Link>
        </div>

        {/* Completion card */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              variants={card}
              initial="hidden"
              animate="visible"
              className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0f172a] overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-px bg-[var(--color-accent)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">
                    Guide Complete
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">Context Windows Understood!</h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You resized the window, saw the lost-in-the-middle effect, and watched a conversation fill the budget.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Window sizes", value: "4K to 128K", color: "#3bb4a4" },
                    { label: "Recall curve", value: "Viewed", color: "var(--color-accent)" },
                    { label: "Token budget", value: "Explored", color: "#a855f7" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">{item.label}</p>
                      <p className="text-[14px] font-mono font-bold" style={{ color: item.color }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">Key Takeaway</p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Everything outside the window is invisible, and even inside it the middle is hazy. Feed the model focused, relevant context instead of everything you have.&quot;
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link href="/visual-guides"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
                  ← All Guides
                </Link>
                <div className="flex items-center gap-3">
                  <button onClick={handleReset}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
                    Try Again
                  </button>
                  <Link href="/visual-guides/hallucination"
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
                    Next Guide →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer nav */}
        {!isComplete && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link href="/visual-guides"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
              ← All Guides
            </Link>
            <Link href="/visual-guides/hallucination"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
              Next Guide →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
