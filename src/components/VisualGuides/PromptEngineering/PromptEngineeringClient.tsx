"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

type PatternId = "zero-shot" | "few-shot" | "cot" | "role" | "output-format" | "self-consistency";

interface Pattern {
  id: PatternId;
  name: string;
  icon: string;
  desc: string;
  mostUsed?: boolean;
  prompt: string;
  response: string;
  annotations: string[];
}

const PATTERNS: Pattern[] = [
  {
    id: "zero-shot", name: "Zero-Shot", icon: "Z", mostUsed: true,
    desc: "Direct instruction without any examples.",
    prompt: "Classify the sentiment of this text as POSITIVE, NEGATIVE, or NEUTRAL.\nText: The battery died after 2 hours.\nSentiment:",
    response: "NEGATIVE",
    annotations: ["This is the instruction", "This is the input", "This is the output cue"],
  },
  {
    id: "few-shot", name: "Few-Shot", icon: "F",
    desc: "Provide 2–5 examples before the actual task.",
    prompt: "Text: This is amazing! -> POSITIVE\nText: Terrible experience. -> NEGATIVE\nText: It arrived on time. -> NEUTRAL\nText: I love this product! ->",
    response: "POSITIVE",
    annotations: ["Example 1 — label maps input to output", "Example 2", "Example 3", "Model infers the pattern here"],
  },
  {
    id: "cot", name: "Chain-of-Thought", icon: "C", mostUsed: true,
    desc: "Force step-by-step reasoning before the answer.",
    prompt: "Q: Roger has 5 tennis balls. He buys 2 more cans with 3 balls each. How many balls does he have? Think step by step.\nA:",
    response: "Roger starts with 5 balls.\nHe buys 2 x 3 = 6 more balls.\nTotal: 5 + 6 = 11 balls.",
    annotations: ["The task question", '"Think step by step" triggers CoT reasoning', "Output cue — model fills in the reasoning"],
  },
  {
    id: "role", name: "Role Prompting", icon: "R",
    desc: "Assign an expert persona to change tone and depth.",
    prompt: "You are a senior Python developer. Review this code and identify issues:\n\ndef add(a, b):\n  return a + b\nprint(add('2', 3))",
    response: "Issue: Type mismatch. '2' is a string, 3 is an int. Python will raise TypeError.\nFix: int(a) + b, or use type hints: def add(a: int, b: int) -> int.",
    annotations: ["Persona assignment — changes tone, depth, vocabulary", "The actual task follows the persona"],
  },
  {
    id: "output-format", name: "Output Format", icon: "O",
    desc: "Specify exact output structure to get structured data.",
    prompt: 'Analyze this review and respond ONLY with JSON:\n{"sentiment": "...", "score": 0-10, "key_issue": "..."}\nReview: Great camera but battery dies fast.',
    response: '{"sentiment": "mixed", "score": 6, "key_issue": "short battery life"}',
    annotations: ["Strict output instruction — ONLY is important", "Output schema — model fills the values", "Input data"],
  },
  {
    id: "self-consistency", name: "Self-Consistency", icon: "S",
    desc: "Generate multiple answers, pick the most common.",
    prompt: "Is 17 a prime number? Generate 3 independent answers, then give the majority answer.",
    response: "Answer 1: Yes.\nAnswer 2: Yes.\nAnswer 3: Yes.\nMajority answer: Yes, 17 is prime (only divisible by 1 and 17).",
    annotations: ["Request multiple independent samples", "Majority voting reduces random errors"],
  },
];

const ANATOMY = [
  { label: "System instruction", note: "sets role and rules", color: "#ec4899" },
  { label: "Context / Background", note: "relevant information", color: "#3bb4a4" },
  { label: "Examples", note: "few-shot demonstrations", color: "#d4af37" },
  { label: "Task instruction", note: "what to do", color: "#a855f7" },
  { label: "Input", note: "the actual data", color: "#1e5d8a" },
  { label: "Output format", note: "how to respond", color: "#f97316" },
];

const MISTAKES = [
  { title: "Vague instructions", bad: '"Write a good summary."', good: '"Summarize in exactly 3 sentences. First: main point. Second: key evidence. Third: conclusion."', tip: "Quantify everything you can. 'Good' means nothing to a model." },
  { title: "Missing output format", bad: '"Is this email spam?"', good: '"Is this email spam? Respond with a single word: SPAM or HAM."', tip: "Without format constraints, the model explains at length when you wanted one word." },
  { title: "No examples for ambiguous tasks", bad: '"Translate this to formal English."', good: '"Translate to formal English.\nInput: gonna -> Output: going to\nInput: wanna -> Output: want to\nInput: kinda ->"', tip: "Showing is faster than explaining. Two examples beat two paragraphs of description." },
];

export default function PromptEngineeringClient() {
  const { data: session } = useSession();
  const [selectedPattern, setSelectedPattern] = useState<PatternId>("zero-shot");
  const [anatomyViewed, setAnatomyViewed] = useState(false);
  const [patternsViewed, setPatternsViewed] = useState<Set<PatternId>>(new Set(["zero-shot"]));
  const [openMistake, setOpenMistake] = useState<number | null>(null);
  const [editablePrompt, setEditablePrompt] = useState<Record<PatternId, string>>(
    () => Object.fromEntries(PATTERNS.map((p) => [p.id, p.prompt])) as Record<PatternId, string>
  );
  const anatomyRef = useRef<HTMLDivElement>(null);
  const completionFired = useRef(false);

  const allComplete = patternsViewed.size >= 4 && anatomyViewed;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "prompt-engineering", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  useEffect(() => {
    if (!anatomyRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setAnatomyViewed(true); },
      { threshold: 0.4 }
    );
    obs.observe(anatomyRef.current);
    return () => obs.disconnect();
  }, []);

  function selectPattern(id: PatternId) {
    setSelectedPattern(id);
    setPatternsViewed((prev) => new Set([...prev, id]));
  }

  const active = PATTERNS.find((p) => p.id === selectedPattern)!;
  const progressPct = ((patternsViewed.size >= 4 ? 1 : 0) + (anatomyViewed ? 1 : 0)) * 50;

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-[#ec4899]">Applied AI</span>
          <span className="text-white/20">/</span>
          <span className="text-white">Prompt Engineering Patterns</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#ec4899]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#ec4899]">Applied AI</span>
            <span className="w-6 h-px bg-[#ec4899]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Prompt Engineering <span className="text-[#ec4899]">Patterns</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Six reusable patterns for writing prompts that reliably produce the output you want. Each pattern comes with an editable live demo.
          </p>
        </section>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2 flex-wrap">
            {[
              { label: `Patterns viewed: ${patternsViewed.size}/4`, done: patternsViewed.size >= 4 },
              { label: "Prompt anatomy viewed", done: anatomyViewed },
            ].map(({ label, done }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${done ? "bg-[#ec4899]" : "bg-[#1e293b]"}`} />
                <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>{label}</span>
              </div>
            ))}
            {!session?.user && (
              <p className="text-[11px] text-[#475569] ml-auto">
                Sign in to save progress
              </p>
            )}
            <AnimatePresence>
              {allComplete && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="ml-auto text-[11px] font-semibold text-[#ec4899] flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Guide complete!
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="h-1 rounded-full bg-[#1e293b] overflow-hidden">
            <motion.div className="h-full rounded-full bg-[#ec4899]"
              initial={{ width: "0%" }} animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }} />
          </div>
        </div>

        {/* ── Section 1: Pattern Gallery ─────────────────────────────────── */}
        <section className="mb-8">
          <h2 className="text-[13px] font-bold uppercase tracking-[2px] text-[#94a3b8] mb-4">Pattern Gallery</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PATTERNS.map((p) => (
              <button key={p.id} onClick={() => selectPattern(p.id)}
                className={`relative text-left rounded-2xl border p-4 transition-all duration-200 ${
                  selectedPattern === p.id ? "border-[#ec4899] bg-[#ec4899]/5" : "border-[#1e293b] bg-[#0f172a] hover:border-[#334155]"
                }`}>
                {p.mostUsed && (
                  <span className="absolute top-2.5 right-2.5 text-[9px] font-bold text-[#d4af37] bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-full px-1.5 py-0.5">
                    Most used
                  </span>
                )}
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[14px] font-black mb-3"
                  style={{ background: selectedPattern === p.id ? "#ec4899" : "#1e293b", color: selectedPattern === p.id ? "#fff" : "#94a3b8" }}>
                  {p.icon}
                </div>
                <p className="text-[13px] font-bold text-white mb-1">{p.name}</p>
                <p className="text-[11px] text-[#94a3b8] leading-snug">{p.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* ── Section 2: Live Pattern Demo ───────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-[13px] font-bold uppercase tracking-[2px] text-[#94a3b8] mb-4">Live Pattern Demo</h2>
          <AnimatePresence mode="wait">
            <motion.div key={selectedPattern}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Prompt editor */}
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
                  <div className="w-2 h-2 rounded-full bg-[#d4af37]" />
                  <div className="w-2 h-2 rounded-full bg-[#3bb4a4]" />
                  <p className="ml-2 text-[11px] font-semibold text-[#475569] uppercase tracking-wider">Prompt Editor</p>
                </div>
                <textarea
                  value={editablePrompt[selectedPattern]}
                  onChange={(e) => setEditablePrompt((prev) => ({ ...prev, [selectedPattern]: e.target.value }))}
                  spellCheck={false} rows={6}
                  className="w-full rounded-xl bg-[#0a0f1e] border border-[#1e293b] text-[12px] font-mono text-white p-3 resize-none focus:outline-none focus:border-[#ec4899] transition-colors leading-relaxed"
                />
                <div className="mt-3 space-y-1.5">
                  {active.annotations.map((ann, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[#ec4899] text-[10px] mt-0.5">&#8594;</span>
                      <p className="text-[10px] text-[#94a3b8] leading-snug">{ann}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Simulated AI Response */}
              <div className="rounded-2xl border border-[#3bb4a4]/30 bg-[#0f172a] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-lg bg-[#3bb4a4]/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-[#3bb4a4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <p className="text-[11px] font-semibold text-[#3bb4a4] uppercase tracking-wider">Simulated AI Response</p>
                </div>
                <div className="rounded-xl bg-[#0a0f1e] border border-[#1e293b] p-3 min-h-[120px]">
                  <pre className="text-[12px] font-mono text-[#3bb4a4] whitespace-pre-wrap leading-relaxed">{active.response}</pre>
                </div>
                <p className="mt-3 text-[10px] text-[#475569]">Response is pre-defined to illustrate the expected output of this pattern.</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </section>

        {/* ── Section 3: Prompt Anatomy ──────────────────────────────────── */}
        <section ref={anatomyRef} className="mb-10">
          <h2 className="text-[13px] font-bold uppercase tracking-[2px] text-[#94a3b8] mb-2">Prompt Anatomy</h2>
          <p className="text-[13px] text-[#94a3b8] mb-5">A well-structured prompt has up to 6 layers. Not every prompt needs all of them.</p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 space-y-2">
            {ANATOMY.map((part, i) => (
              <motion.div key={part.label}
                initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.3 }}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{ background: `${part.color}10`, border: `1px solid ${part.color}25` }}>
                <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-black text-white"
                  style={{ background: part.color }}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-bold font-mono" style={{ color: part.color }}>[{part.label}]</span>
                  <span className="text-[11px] text-[#94a3b8] ml-2">&larr; {part.note}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Section 4: Common Mistakes ─────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-[13px] font-bold uppercase tracking-[2px] text-[#94a3b8] mb-4">Common Mistakes</h2>
          <div className="space-y-3">
            {MISTAKES.map((m, i) => (
              <div key={i} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden">
                <button onClick={() => setOpenMistake(openMistake === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#1e293b]/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#ef4444]/20 text-[#ef4444] text-[10px] font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <p className="text-[13px] font-semibold text-white">{m.title}</p>
                  </div>
                  <motion.span animate={{ rotate: openMistake === i ? 180 : 0 }} transition={{ duration: 0.2 }}
                    className="text-[#475569] text-[18px] leading-none select-none">&#8964;</motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {openMistake === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/5 p-3">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#ef4444] mb-1.5">Bad</p>
                          <p className="text-[11px] font-mono text-white leading-relaxed">{m.bad}</p>
                        </div>
                        <div className="rounded-xl border border-[#3bb4a4]/20 bg-[#3bb4a4]/5 p-3">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#3bb4a4] mb-1.5">Good</p>
                          <p className="text-[11px] font-mono text-white leading-relaxed">{m.good}</p>
                        </div>
                        <div className="sm:col-span-2 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-3">
                          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                            <span className="text-[#d4af37] font-semibold">Tip: </span>{m.tip}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        {/* Gold insight */}
        <div className="mb-10 rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#d4af37] mb-2">Key Insight</p>
          <p className="text-[13px] text-white leading-relaxed">
            Prompt engineering is a skill with diminishing returns. For production systems, RAG + few-shot examples often outperforms elaborate prompt engineering. Know when to prompt vs when to fine-tune.
          </p>
        </div>

        {/* Summary card */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#ec4899] mb-1">Up next</p>
            <p className="text-[15px] font-bold text-white">AI Agents</p>
            <p className="text-[12px] text-[#94a3b8] mt-0.5">How autonomous agents plan, use tools, and loop until a goal is reached.</p>
          </div>
          <Link href="/visual-guides/ai-agents"
            className="flex-shrink-0 px-5 py-2.5 rounded-xl text-[13px] font-bold bg-[#ec4899] text-white hover:opacity-90 transition-opacity">
            Next Guide &rarr;
          </Link>
        </div>

        {/* Bottom nav */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link href="/visual-guides/fine-tuning-vs-prompting"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#ec4899] hover:text-[#ec4899] transition-colors">
            &larr; Previous Guide
          </Link>
          <Link href="/visual-guides/ai-agents"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#ec4899] text-white hover:opacity-90 transition-opacity">
            Next Guide &rarr;
          </Link>
        </div>

      </div>
    </div>
  );
}
