"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

// ── Constants ─────────────────────────────────────────────────────────────────

const METRICS = [
  { label: "Setup time", p: "Minutes", ft: "Hours–Days" },
  { label: "Cost", p: "$0 compute", ft: "GPU hours" },
  { label: "Domain accuracy", p: "Good", ft: "Excellent" },
  { label: "Customization", p: "Limited", ft: "Deep" },
];

const TREE: Record<string, { q: string; yes?: string; no?: string; result?: { label: string; color: string; desc: string } }> = {
  q1: { q: "Do you have labeled training data?", yes: "q2", no: "rp" },
  q2: { q: "Is the model already good at your task?", yes: "rp", no: "q3" },
  q3: { q: "Do you need consistent style or format?", yes: "rft", no: "q4" },
  q4: { q: "Do you have GPU resources available?", yes: "rff", no: "rl" },
  rp:  { q: "", result: { label: "Use Prompting", color: "#3bb4a4", desc: "The model already knows your domain or you lack labeled data. Engineer better prompts first — zero cost, instant." } },
  rft: { q: "", result: { label: "Fine-Tune the Model", color: "#a855f7", desc: "You have data and need consistent output style. Fine-tuning bakes your format requirements directly into model weights." } },
  rff: { q: "", result: { label: "Full Fine-Tuning", color: "#a855f7", desc: "You have data, GPUs, and deep domain needs. Full fine-tuning gives maximum control — all weights are updated." } },
  rl:  { q: "", result: { label: "LoRA / QLoRA", color: "#d4af37", desc: "No heavy GPU? LoRA and QLoRA fine-tune only small adapter matrices, slashing memory usage by up to 10x with minimal quality loss." } },
};

const TECHNIQUES = [
  { id: "zero", title: "Zero-Shot", sub: "Direct instruction, no examples", color: "#3bb4a4",
    example: `System: You are a sentiment classifier.\nUser: "The product broke after 2 days."\n→ Output: Negative`,
    when: "The task is well-known and the model has seen it during pre-training." },
  { id: "few", title: "Few-Shot", sub: "2–5 examples in the prompt", color: "#1e5d8a",
    example: `"Great product!" → Positive\n"Arrived broken." → Negative\n"Okay, nothing special." → Neutral\n---\n"The lid leaks." → ???`,
    when: "Model needs anchor examples to grasp your exact label definitions." },
  { id: "cot", title: "Chain-of-Thought", sub: '"Think step by step..."', color: "#d4af37",
    example: `User: Is 17 prime? Think step by step.\n→ Not divisible by 2, 3, 5...\n→ No factors other than 1 and 17.\n→ Yes, 17 is prime.`,
    when: "The task requires multi-step reasoning, math, or logic." },
  { id: "sys", title: "System Prompt", sub: "Persistent instructions", color: "#a855f7",
    example: `System: You are a concise legal assistant.\nAlways cite relevant statutes.\nNever give definitive legal advice.\n---\n[All future messages inherit this context]`,
    when: "You want a consistent persona, tone, or constraints across a full session." },
];

const SPECTRUM = [
  { label: "Prompting", cost: "$0", time: "Instant", cw: 1, tw: 1, color: "#3bb4a4" },
  { label: "Few-shot", cost: "$0", time: "Instant", cw: 1, tw: 1, color: "#3bb4a4" },
  { label: "LoRA", cost: "$$$", time: "Hours", cw: 3, tw: 3, color: "#d4af37" },
  { label: "Full Fine-Tune", cost: "$$$$", time: "Days", cw: 4, tw: 4, color: "#a855f7" },
  { label: "Train from Scratch", cost: "$$$$$$$", time: "Months", cw: 7, tw: 6, color: "#ef4444" },
];

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FineTuningVsPromptingClient() {
  const { data: session } = useSession();
  const [treeNode, setTreeNode] = useState("q1");
  const [treePath, setTreePath] = useState<string[]>(["q1"]);
  const [treeComplete, setTreeComplete] = useState(false);
  const [openTechs, setOpenTechs] = useState<Set<string>>(new Set());
  const completionFired = useRef(false);
  const treeCompleteFired = useRef(false);
  const expandReported = useRef(0);

  const expandedCount = openTechs.size;
  const allComplete = treeComplete && expandedCount >= 2;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "fine-tuning-vs-prompting", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  function treeAdvance(next: string) {
    setTreeNode(next);
    setTreePath(h => [...h, next]);
    if (TREE[next]?.result && !treeCompleteFired.current) {
      treeCompleteFired.current = true;
      setTreeComplete(true);
    }
  }

  function treeReset() {
    setTreeNode("q1");
    setTreePath(["q1"]);
    treeCompleteFired.current = false;
    setTreeComplete(false);
  }

  function toggleTech(id: string) {
    setOpenTechs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      if (next.size > expandReported.current) expandReported.current = next.size;
      return next;
    });
  }

  const node = TREE[treeNode];
  const isResult = !!node.result;
  const progress = [
    { label: "Decision tree", done: treeComplete },
    { label: "Prompt techniques (2+)", done: expandedCount >= 2 },
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-[#ef4444]">LLMs</span>
          <span className="text-white/20">/</span>
          <span className="text-white">Fine-Tuning vs Prompting</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#ef4444]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#ef4444]">LLMs</span>
            <span className="w-6 h-px bg-[#ef4444]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Fine-Tuning <span className="text-[#ef4444]">vs</span> Prompting
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Both techniques customize LLM behavior — but they work very differently.
            Prompting writes better instructions. Fine-tuning updates model weights.
            Learn when to reach for each.
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

        {/* Section 1 — Comparison */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 1 — Side-by-Side Comparison</h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">Same task: classify customer sentiment. Two very different approaches.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Prompting */}
            <div className="rounded-2xl border border-[#3bb4a4]/30 bg-[#0f172a] p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-[#3bb4a4]" />
                <h3 className="text-[14px] font-bold text-white">Prompting</h3>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#3bb4a4]/15 text-[#3bb4a4] font-semibold">No weight updates</span>
              </div>
              <div className="rounded-xl bg-[#1e293b] p-4 font-mono text-[11px] leading-relaxed mb-4">
                <p className="text-[#94a3b8]">System:</p>
                <p className="text-white ml-2">You are a sentiment classifier.</p>
                <p className="text-[#94a3b8] mt-2">User:</p>
                <p className="text-white ml-2">&ldquo;The product broke after 2 days.&rdquo;</p>
                <p className="text-[#3bb4a4] mt-3">→ Output: <span className="text-[#d4af37]">Negative</span></p>
              </div>
              <div className="space-y-2">
                {METRICS.map(m => (
                  <div key={m.label} className="flex items-center justify-between text-[11px]">
                    <span className="text-[#94a3b8]">{m.label}</span>
                    <span className="text-[#3bb4a4] font-semibold">{m.p}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Fine-Tuning */}
            <div className="rounded-2xl border border-[#a855f7]/30 bg-[#0f172a] p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-[#a855f7]" />
                <h3 className="text-[14px] font-bold text-white">Fine-Tuning</h3>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#a855f7]/15 text-[#a855f7] font-semibold">Updates weights</span>
              </div>
              <div className="rounded-xl bg-[#1e293b] p-4 font-mono text-[11px] leading-relaxed mb-4">
                <p className="text-[#94a3b8]">Training data: 500 examples</p>
                <p className="text-[#94a3b8] mt-1">[review] → [positive/negative/neutral]</p>
                <p className="text-white mt-2">Model learns:</p>
                <p className="text-white ml-2">- specific product vocabulary</p>
                <p className="text-white ml-2">- edge cases &amp; your label definitions</p>
                <p className="text-[#a855f7] mt-3">→ More accurate on your domain</p>
              </div>
              <div className="space-y-2">
                {METRICS.map(m => (
                  <div key={m.label} className="flex items-center justify-between text-[11px]">
                    <span className="text-[#94a3b8]">{m.label}</span>
                    <span className="text-[#a855f7] font-semibold">{m.ft}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 — Decision Tree */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 2 — Interactive Decision Tree</h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">Answer yes/no questions to get a personalized recommendation.</p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
            {/* Path trail */}
            <div className="flex items-center gap-1 flex-wrap mb-6 min-h-[24px]">
              {treePath.map((id, i) => {
                const n = TREE[id];
                const isLast = i === treePath.length - 1;
                return (
                  <React.Fragment key={`${id}-${i}`}>
                    <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isLast ? "bg-[#1e5d8a]/40 text-[#3bb4a4]" : "bg-[#1e293b] text-[#475569]"}`}>
                      {n.result ? n.result.label : `Q${i + 1}`}
                    </motion.span>
                    {!isLast && <span className="text-[#334155] text-[10px]">→</span>}
                  </React.Fragment>
                );
              })}
            </div>
            <AnimatePresence mode="wait">
              {isResult ? (
                <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center py-4">
                  <div className="inline-block px-5 py-2 rounded-full text-[14px] font-bold mb-3"
                    style={{ background: `${node.result!.color}20`, color: node.result!.color, border: `1px solid ${node.result!.color}40` }}>
                    {node.result!.label}
                  </div>
                  <p className="text-[12px] text-[#94a3b8] leading-relaxed max-w-[480px] mx-auto mb-5">{node.result!.desc}</p>
                  <button onClick={treeReset} className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white transition-all">
                    Start over
                  </button>
                </motion.div>
              ) : (
                <motion.div key={treeNode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <p className="text-[15px] font-semibold text-white mb-6 text-center leading-snug">{node.q}</p>
                  <div className="flex items-center justify-center gap-4">
                    <button onClick={() => node.yes && treeAdvance(node.yes)}
                      className="px-6 py-2.5 rounded-xl text-[13px] font-semibold bg-[#3bb4a4] text-[#0a0e1a] hover:opacity-90 transition-opacity">
                      Yes
                    </button>
                    <button onClick={() => node.no && treeAdvance(node.no)}
                      className="px-6 py-2.5 rounded-xl text-[13px] font-semibold border border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white transition-all">
                      No
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Section 3 — Prompt Techniques */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 3 — Prompt Engineering Techniques</h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">Expand at least two cards. Each technique has distinct strengths.</p>
          <div className="space-y-3">
            {TECHNIQUES.map(tech => {
              const isOpen = openTechs.has(tech.id);
              return (
                <div key={tech.id} className="rounded-2xl border overflow-hidden transition-colors"
                  style={{ borderColor: isOpen ? `${tech.color}40` : "#1e293b" }}>
                  <button onClick={() => toggleTech(tech.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: tech.color }} />
                      <span className="text-[14px] font-bold text-white">{tech.title}</span>
                      <span className="text-[11px] text-[#475569] hidden sm:block">{tech.sub}</span>
                    </div>
                    <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-[#475569] text-[12px]">▼</motion.span>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                        <div className="px-5 pb-5 space-y-3">
                          <pre className="rounded-xl p-4 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap"
                            style={{ background: "#1e293b", color: tech.color }}>{tech.example}</pre>
                          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                            <span className="text-white font-semibold">When to use: </span>{tech.when}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          {expandedCount > 0 && expandedCount < 2 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-[#475569] mt-3 italic">
              Open one more technique to unlock completion.
            </motion.p>
          )}
        </section>

        {/* Section 4 — Spectrum */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 4 — The Fine-Tuning Spectrum</h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">From zero-cost prompting to months-long pre-training — every step trades time and money for capability.</p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 overflow-x-auto">
            <div className="flex items-stretch gap-2 min-w-[480px]">
              {SPECTRUM.map((step, i) => (
                <React.Fragment key={step.label}>
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.4 }}
                    className="flex-1 rounded-xl p-4 flex flex-col gap-3"
                    style={{ background: `${step.color}0d`, border: `1px solid ${step.color}30` }}>
                    <p className="text-[11px] font-bold text-white leading-tight">{step.label}</p>
                    <div>
                      <p className="text-[9px] text-[#475569] mb-1 uppercase tracking-wider">Cost</p>
                      <div className="h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ background: step.color }}
                          initial={{ width: 0 }} animate={{ width: `${(step.cw / 7) * 100}%` }}
                          transition={{ delay: i * 0.1 + 0.3, duration: 0.6, ease: "easeOut" }} />
                      </div>
                      <p className="text-[10px] font-semibold mt-1" style={{ color: step.color }}>{step.cost}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-[#475569] mb-1 uppercase tracking-wider">Time</p>
                      <div className="h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ background: step.color }}
                          initial={{ width: 0 }} animate={{ width: `${(step.tw / 6) * 100}%` }}
                          transition={{ delay: i * 0.1 + 0.4, duration: 0.6, ease: "easeOut" }} />
                      </div>
                      <p className="text-[10px] font-semibold mt-1" style={{ color: step.color }}>{step.time}</p>
                    </div>
                  </motion.div>
                  {i < SPECTRUM.length - 1 && <div className="flex items-center text-[#334155] text-[12px] flex-shrink-0">→</div>}
                </React.Fragment>
              ))}
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
                Most production AI applications use prompting + RAG first, then fine-tune only if prompting is
                insufficient. Fine-tuning is often overkill for format or style changes — a well-crafted system
                prompt gets you 80% of the way there at zero cost.
              </p>
            </div>
          </div>
        </div>

        {/* Summary card */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 mb-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1">Up Next</p>
            <p className="text-[15px] font-bold text-white">RAG Explained</p>
            <p className="text-[12px] text-[#94a3b8] mt-1">You&apos;ve completed the LLMs section! Next up: Applied AI →</p>
          </div>
          <Link href="/visual-guides/rag-explained"
            className="px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[#ef4444] text-white hover:opacity-90 transition-opacity whitespace-nowrap">
            Next Guide →
          </Link>
        </div>

        {/* Nav */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link href="/visual-guides/transfer-learning"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
            ← Transfer Learning
          </Link>
          <Link href="/visual-guides/rag-explained"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
            RAG Explained →
          </Link>
        </div>

      </div>
    </div>
  );
}
