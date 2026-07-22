"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useSession } from "next-auth/react";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import { useGuideMotion } from "@/lib/guideMotion";

const GUIDE_TITLE = "AI Agents: Autonomy in Action";
const NEXT_GUIDE_SLUG = "structured-output-reliability";
const PREV_GUIDE_SLUG = "prompt-engineering";

const LOOP_PHASES = [
  { id: "perceive", label: "PERCEIVE", desc: "Read context (text, files, results)",      color: "#3bb4a4", angle: 270 },
  { id: "think",   label: "THINK",    desc: "Model decides: answer, or emit a tool call", color: "#ec4899", angle: 0   },
  { id: "act",     label: "ACT",      desc: "Runtime executes the tool call",             color: "#f97316", angle: 90  },
  { id: "observe", label: "OBSERVE",  desc: "Result feeds back into the context",         color: "#a855f7", angle: 180 },
];

type TPhase = "THOUGHT" | "ACTION" | "OBSERVATION" | "ANSWER";
const PC: Record<TPhase, string> = { THOUGHT: "#3b82f6", ACTION: "#ec4899", OBSERVATION: "#3bb4a4", ANSWER: "#d4af37" };

const TRACE: { phase: TPhase; text: string }[] = [
  { phase: "THOUGHT",     text: "I need to search for Paris hotels." },
  { phase: "ACTION",      text: 'web_search("Paris hotels under $100")' },
  { phase: "OBSERVATION", text: "Found 15 results: Ibis Paris (€89), Hotel du Louvre (€95)..." },
  { phase: "THOUGHT",     text: "Ibis Paris at €89 is cheapest. Let me get more details." },
  { phase: "ACTION",      text: 'web_search("Ibis Paris address rating")' },
  { phase: "OBSERVATION", text: "4 stars, 8.2 rating, 15 Rue du Théâtre, Paris 15th." },
  { phase: "THOUGHT",     text: "I have enough info to answer." },
  { phase: "ANSWER",      text: "Ibis Paris at €89/night (4★, 8.2 rating) is the cheapest option." },
];

const TOOLS = [
  { name: "Web Search",       desc: "Searches the live internet",              input: 'web_search("Paris weather")',             output: "18°C, partly cloudy in Paris." },
  { name: "Code Interpreter", desc: "Runs Python in a sandbox",                input: "execute_python('print(2**10)')",           output: "1024" },
  { name: "File System",      desc: "Reads and writes files",                  input: "read_file('report.txt')",                  output: "Q3 revenue increased 14%..." },
  { name: "Calculator",       desc: "Precise arithmetic",                      input: "calculate('1234.56 * 7.89 / 100')",        output: "97.406784" },
  { name: "RAG Retrieval",    desc: "Searches private knowledge base",         input: 'rag_search("refund policy")',              output: "Digital goods non-refundable if downloaded." },
  { name: "API Caller",       desc: "Integrates with external services",       input: 'api_call("GET /weather?city=Paris")',      output: '{"temp":18,"condition":"cloudy"}' },
];

const RISKS: { title: string; desc: string; color: string; href?: string; linkLabel?: string }[] = [
  { title: "Infinite Loops",      desc: "Agent keeps searching without a stopping condition, burning tokens indefinitely.", color: "#ef4444" },
  { title: "Tool Misuse",         desc: "Selecting the wrong tool, e.g. web search when precise arithmetic is needed.", color: "#f97316" },
  { title: "Compounding Errors",  desc: "A small mistake in step 2 gets passed through all subsequent steps.", color: "#a855f7" },
  { title: "Prompt Injection",    desc: "An agent that reads untrusted content (web pages, emails, files) can have its instructions hijacked by text planted in that content.", color: "#3b82f6", href: "/visual-guides/prompt-injection", linkLabel: "See the Prompt Injection guide" },
];

function polarPos(angleDeg: number, r: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: 50 + r * Math.cos(rad), y: 50 + r * Math.sin(rad) };
}

export default function AIAgentsClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  const [loopRunning, setLoopRunning]     = useState(false);
  const [activePhase, setActivePhase]     = useState(-1);
  const [loopViewed, setLoopViewed]       = useState(false);
  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [traceStep, setTraceStep]         = useState(0);
  const [traceAuto, setTraceAuto]         = useState(false);
  const traceAllDone                      = traceStep >= TRACE.length;

  const [activeTool, setActiveTool]       = useState<number | null>(null);

  const multiRef    = useRef<HTMLDivElement>(null);
  const multiInView = useInView(multiRef, { once: true, margin: "-60px" });

  const allComplete = loopViewed && traceAllDone;

  const startLoop = useCallback(() => {
    if (loopRunning) return;
    setLoopRunning(true); setActivePhase(0);
    let idx = 0;
    loopRef.current = setInterval(() => { idx = (idx + 1) % 4; setActivePhase(idx); }, 1200);
    setTimeout(() => {
      if (loopRef.current) clearInterval(loopRef.current);
      setLoopRunning(false); setLoopViewed(true);
    }, 1200 * 4 * 2 + 200);
  }, [loopRunning]);

  useEffect(() => () => { if (loopRef.current) clearInterval(loopRef.current); }, []);

  useEffect(() => {
    if (!traceAuto || traceAllDone) { setTraceAuto(false); return; }
    const id = setInterval(() => setTraceStep(s => { if (s >= TRACE.length) { setTraceAuto(false); return s; } return s + 1; }), 1000);
    return () => clearInterval(id);
  }, [traceAuto, traceAllDone]);

  const progress = [{ label: "Agent loop", done: loopViewed }, { label: "ReAct trace", done: traceAllDone }];

  function handleReset() {
    setLoopRunning(false);
    setActivePhase(-1);
    setLoopViewed(false);
    setTraceStep(0);
    setTraceAuto(false);
    setActiveTool(null);
    if (loopRef.current) clearInterval(loopRef.current);
  }

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="ai-agents" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">Visual Guides</Link>
          <span>/</span>
          <span className="text-[#94a3b8]">{GUIDE_TITLE}</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Applied AI</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            AI Agents: <span className="text-[var(--color-accent)]">Autonomy in Action</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            An AI agent is an LLM in a loop with tools: the model emits structured tool calls against typed tool definitions, a runtime executes them, and the results feed back into the context until the task is done.
          </motion.p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full transition-colors" style={{ background: done ? "var(--color-accent)" : "#1e293b" }} />
              <span className={`text-[11px] transition-colors ${done ? "text-white" : "text-[#475569]"}`}>{label}</span>
            </div>
          ))}
          {!session?.user && <p className="text-[11px] text-[#475569] ml-auto">Sign in to save progress</p>}
          <AnimatePresence>
            {allComplete && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-auto text-[11px] font-semibold text-[var(--color-success)] flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="h-1 rounded-full bg-[#1e293b] mb-10 overflow-hidden">
          <motion.div className="h-full rounded-full bg-[var(--color-accent)]" animate={{ width: `${(progress.filter(p => p.done).length / progress.length) * 100}%` }} transition={{ duration: 0.5 }} />
        </div>

        {/* ── S1: Agent Loop ── */}
        <section className="mb-14">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 1: The Agent Loop</h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">An agent repeats four steps until its goal is reached. Press Start to animate the cycle.</p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
            <div className="relative mx-auto" style={{ width: "min(320px,100%)", aspectRatio: "1" }}>
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {LOOP_PHASES.map((p, i) => {
                  const next = LOOP_PHASES[(i + 1) % 4];
                  const f = polarPos(p.angle, 33), t = polarPos(next.angle, 33);
                  return <motion.line key={p.id} x1={f.x} y1={f.y} x2={t.x} y2={t.y} strokeWidth="0.8" strokeDasharray="2 1.5"
                    animate={{ stroke: activePhase === i ? p.color : "#1e293b", opacity: activePhase === i ? 1 : 0.4 }} transition={{ duration: 0.3 }} />;
                })}
                <text x="50" y="47" textAnchor="middle" style={{ fill: "#94a3b8", fontSize: "4.5px", fontWeight: 600 }}>Goal:</text>
                <text x="50" y="52.5" textAnchor="middle" style={{ fill: "white", fontSize: "4px", fontWeight: 700 }}>Book a flight to Tokyo</text>
              </svg>
              {LOOP_PHASES.map((p, i) => {
                const pos = polarPos(p.angle, 33);
                const on = activePhase === i;
                return (
                  <motion.div key={p.id} className="absolute flex flex-col items-center"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%,-50%)" }}
                    animate={{ scale: on ? 1.12 : 1 }} transition={{ duration: 0.25 }}>
                    <motion.div className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold border-2 whitespace-nowrap"
                      animate={{ borderColor: on ? p.color : "#334155", background: on ? `${p.color}20` : "#0f172a", color: on ? p.color : "#94a3b8", boxShadow: on ? `0 0 10px ${p.color}50` : "none" }}
                      transition={{ duration: 0.3 }}>{p.label}</motion.div>
                    <AnimatePresence>
                      {on && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-[9px] text-center mt-1 max-w-[80px] leading-tight" style={{ color: p.color }}>{p.desc}</motion.p>}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
            <div className="mt-5 text-center">
              <button onClick={startLoop} disabled={loopRunning}
                className="px-6 py-2.5 rounded-xl text-[13px] font-semibold bg-[#ec4899] text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                {loopRunning ? "Running..." : loopViewed ? "▶ Replay" : "▶ Start"}
              </button>
              {loopViewed && !loopRunning && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-[#3bb4a4] mt-2">The loop runs until the agent decides the goal is achieved.</motion.p>
              )}
            </div>
          </div>
        </section>

        {/* ── S2: ReAct Trace ── */}
        <section className="mb-14">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 2: ReAct Trace Simulation</h2>
          <p className="text-[12px] text-[#94a3b8] mb-1">Goal: <span className="text-white font-semibold">Find the cheapest hotel in Paris under $100</span></p>
          <p className="text-[12px] text-[#94a3b8] mb-5">ReAct = Reasoning + Acting interleaved. In modern APIs each ACTION line is a structured function call the runtime executes. Step through each agent move.</p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
            {traceStep > 0 ? (
              <div className="space-y-2 mb-4 max-h-[260px] overflow-y-auto pr-1">
                {TRACE.slice(0, traceStep).map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}
                    className="rounded-xl border p-3" style={{ borderColor: `${PC[s.phase]}30`, background: `${PC[s.phase]}08` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: `${PC[s.phase]}20`, color: PC[s.phase] }}>{s.phase}</span>
                      <span className="text-[10px] text-[#475569]">Step {i + 1}</span>
                    </div>
                    <p className={`text-[12px] leading-relaxed ${s.phase === "ACTION" ? "font-mono" : ""}`}
                      style={{ color: s.phase === "ANSWER" ? "var(--color-accent)" : "white" }}>{s.text}</p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-5 mb-4 text-center">
                <p className="text-[12px] text-[#475569]">Press Next Step or Auto-Play to begin the trace.</p>
              </div>
            )}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-1 rounded-full bg-[#1e293b] overflow-hidden">
                <motion.div className="h-full rounded-full bg-[#ec4899]" animate={{ width: `${(traceStep / TRACE.length) * 100}%` }} transition={{ duration: 0.4 }} />
              </div>
              <span className="text-[11px] text-[#475569] shrink-0">{traceStep}/{TRACE.length}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => setTraceStep(s => Math.min(s + 1, TRACE.length))} disabled={traceAllDone || traceAuto}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-white hover:border-[#ec4899] hover:text-[#ec4899] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                ▶ Next Step
              </button>
              <button onClick={() => setTraceAuto(true)} disabled={traceAllDone || traceAuto}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-[#3bb4a4] text-[#0a0e1a] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                {traceAuto ? "Playing..." : "Auto-Play"}
              </button>
              <button onClick={() => { setTraceStep(0); setTraceAuto(false); }}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-[#334155] text-[#94a3b8] hover:border-[#475569] hover:text-white transition-all">
                ↺ Reset
              </button>
            </div>
          </div>
        </section>

        {/* ── S3: Tool Palette ── */}
        <section className="mb-14">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 3: Tool Palette</h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">Each tool is a typed function definition the model can call. Click a card to see an example call and result.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TOOLS.map((tool, i) => (
              <motion.button key={tool.name} onClick={() => setActiveTool(activeTool === i ? null : i)}
                aria-pressed={activeTool === i}
                className="rounded-2xl border text-left p-4 transition-all"
                style={{ borderColor: activeTool === i ? "#ec4899" : "#1e293b", background: activeTool === i ? "#ec489910" : "#0f172a" }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <p className="text-[12px] font-bold text-white mb-0.5" style={{ color: activeTool === i ? "#ec4899" : "white" }}>{tool.name}</p>
                <p className="text-[10px] text-[#94a3b8] leading-snug">{tool.desc}</p>
              </motion.button>
            ))}
          </div>
          <AnimatePresence>
            {activeTool !== null && (
              <motion.div key={activeTool} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="mt-4 rounded-2xl border border-[#ec4899]/30 bg-[#ec489908] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#ec4899] mb-3">{TOOLS[activeTool].name}: Example</p>
                <div className="space-y-2">
                  <div className="rounded-xl bg-[#0a0e1a] border border-[#1e293b] p-3">
                    <span className="text-[10px] font-bold text-[#475569] block mb-1">INPUT</span>
                    <code className="text-[11px] text-[#3bb4a4] font-mono">{TOOLS[activeTool].input}</code>
                  </div>
                  <div className="rounded-xl bg-[#0a0e1a] border border-[#1e293b] p-3">
                    <span className="text-[10px] font-bold text-[#475569] block mb-1">OUTPUT</span>
                    <p className="text-[11px] text-white font-mono">{TOOLS[activeTool].output}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── S4: Multi-Agent ── */}
        <section className="mb-14">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 4: Multi-Agent System</h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">Complex tasks get broken into parallel subtasks, each handled by a specialist agent.</p>
          <div ref={multiRef} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 sm:p-8">
            <div className="flex flex-col items-center gap-6">
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={multiInView ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.4 }}
                className="px-6 py-3 rounded-2xl border-2 border-[#ec4899] bg-[#ec489920] text-center">
                <p className="text-[11px] font-bold text-[#ec4899] uppercase tracking-wider mb-0.5">Orchestrator</p>
                <p className="text-[13px] font-bold text-white">Agent</p>
              </motion.div>
              <div className="flex items-start justify-center gap-4 sm:gap-10 w-full">
                {[{ label: "Research Agent", color: "#3bb4a4", delay: 0.15 }, { label: "Code Agent", color: "#3b82f6", delay: 0.3 }, { label: "Writing Agent", color: "#d4af37", delay: 0.45 }].map((a) => (
                  <div key={a.label} className="flex flex-col items-center gap-2 flex-1 max-w-[140px]">
                    <motion.div initial={{ scaleY: 0, opacity: 0 }} animate={multiInView ? { scaleY: 1, opacity: 1 } : {}}
                      transition={{ delay: a.delay, duration: 0.35 }} style={{ originY: 0 }}
                      className="w-px h-8 bg-gradient-to-b from-[#ec4899] to-[#334155]" />
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={multiInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ delay: a.delay + 0.2, duration: 0.35 }}
                      className="px-3 py-2.5 rounded-xl border text-center w-full"
                      style={{ borderColor: `${a.color}50`, background: `${a.color}10` }}>
                      <p className="text-[11px] font-bold" style={{ color: a.color }}>{a.label}</p>
                    </motion.div>
                    <motion.p initial={{ opacity: 0 }} animate={multiInView ? { opacity: 1 } : {}}
                      transition={{ delay: a.delay + 0.35 }} className="text-[9px] text-[#475569] text-center leading-tight">
                      task ↓ / result ↑
                    </motion.p>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-[#475569] text-center mt-6 italic">Arrow labels: task delegation + result return</p>
          </div>
        </section>

        {/* ── S5: Risks ── */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 5: Risks &amp; Limitations</h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">Autonomy introduces failure modes that don&apos;t exist in single-shot LLM calls.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {RISKS.map((r) => (
              <div key={r.title} className="rounded-2xl border bg-[#0f172a] p-5" style={{ borderColor: `${r.color}30` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${r.color}15` }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={r.color} strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <p className="text-[13px] font-bold text-white mb-1.5">{r.title}</p>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed">{r.desc}</p>
                {r.href && (
                  <Link href={r.href} className="inline-block mt-2 text-[11px] font-semibold hover:underline" style={{ color: r.color }}>
                    {r.linkLabel} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Gold insight */}
        <div className="rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-6 mb-12">
          <div className="flex items-start gap-3">
            <span className="text-[var(--color-accent)] text-xl mt-0.5">💡</span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent)] mb-2">Key Insight</p>
              <p className="text-[13px] text-white leading-relaxed">
                Modern agents are function calling in a loop: the model emits a structured call against a typed tool definition, and your runtime executes it and returns the result. Because that loop is ordinary code you own, stop conditions, permission checks, and human approval gates belong in the code, not in the model.
              </p>
            </div>
          </div>
        </div>

        {/* Summary card */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 mb-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1">Up Next</p>
            <p className="text-[15px] font-bold text-white">Structured Output Reliability</p>
            <p className="text-[12px] text-[#94a3b8] mt-1">Learn how to make model outputs match a schema you can trust.</p>
          </div>
          <Link href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
            className="px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[#ec4899] text-white hover:opacity-90 transition-opacity whitespace-nowrap">
            Next Guide →
          </Link>
        </div>

        {/* Completion card */}
        <AnimatePresence>
          {allComplete && (
            <motion.div
              variants={card}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="mb-10 rounded-2xl border border-white/[0.08] bg-[#0f172a] overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-px bg-[var(--color-accent)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">
                    Guide Complete
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Agents Understood!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You ran the perceive-think-act-observe loop and stepped through a full ReAct trace.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Agent loop", value: loopViewed ? "Animated" : "?", color: "#3bb4a4" },
                    { label: "ReAct trace", value: `${Math.min(traceStep, TRACE.length)} / ${TRACE.length} steps`, color: "#ec4899" },
                    { label: "Tool palette", value: `${TOOLS.length} tools`, color: "var(--color-accent)" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">{item.label}</p>
                      <p className="text-[14px] font-mono font-bold" style={{ color: item.color }}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;An agent is a language model with hands: tools give it reach, the loop gives it persistence, and your guardrails decide whether that autonomy helps or hurts.&quot;
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
        {!allComplete && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link href={`/visual-guides/${PREV_GUIDE_SLUG}`}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
              ← Previous Guide
            </Link>
            <Link href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
              Next Guide →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
