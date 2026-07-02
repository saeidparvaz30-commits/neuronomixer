"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const STEPS = [
  { id: "documents", label: "Documents", icon: "📄", color: "#3bb4a4", group: "ingest", desc: "Your knowledge base: PDFs, wikis, internal docs — any unstructured text." },
  { id: "chunking", label: "Chunking", icon: "✂️", color: "#1e5d8a", group: "ingest", desc: "Split docs into ~500-token chunks with overlap so context isn't lost at boundaries." },
  { id: "embeddings", label: "Embeddings", icon: "🔢", color: "#a855f7", group: "ingest", desc: "Each chunk → 768-dim vector via an embedding model (e.g. text-embedding-3-small)." },
  { id: "vector-store", label: "Vector Store", icon: "🗄️", color: "#d4af37", group: "ingest", desc: "All chunk vectors indexed in a vector DB — Pinecone, Weaviate, Chroma, or pgvector." },
  { id: "query-embed", label: "Query Embedding", icon: "🔍", color: "#ec4899", group: "retrieve", desc: "User query → same embedding model → query vector. Must use identical model as indexing." },
  { id: "similarity", label: "Similarity Search", icon: "📐", color: "#ec4899", group: "retrieve", desc: "Cosine similarity between query vector and all stored vectors. Top-K chunks returned." },
  { id: "prompt", label: "Augmented Prompt", icon: "📝", color: "#3bb4a4", group: "augment", desc: 'System: "Use these documents to answer."\nContext: [top-K chunks]\nQuery: [user question]' },
  { id: "answer", label: "Grounded Answer", icon: "✅", color: "#d4af37", group: "generate", desc: "LLM generates an answer grounded in retrieved context — with citations, low hallucination." },
] as const;

const DOCS = [
  { id: 1, title: "Vacation Policy", content: "Vacation policy: employees get 20 days per year, accrued monthly. Unused days roll over up to 10.", keywords: ["vacation", "days", "time off", "leave"] },
  { id: 2, title: "Remote Work", content: "Remote work policy: employees may work remotely up to 3 days per week. Core hours are 10am–3pm.", keywords: ["remote", "home", "wfh", "office"] },
  { id: 3, title: "Health Benefits", content: "Health benefits: dental and vision are included in all full-time plans. Enrollment is annual.", keywords: ["health", "dental", "vision", "benefits"] },
  { id: 4, title: "Expense Policy", content: "Expense policy: receipts required for any expense over $50. Submit via Expensify within 30 days.", keywords: ["expense", "receipts", "reimburse", "spending"] },
];

const PRESETS = ["How many vacation days do I get?", "Can I work from home?", "What expenses need receipts?"];
const ANSWERS: Record<string, string> = {
  "How many vacation days do I get?": "According to the Vacation Policy, you receive 20 days per year, accrued monthly, with up to 10 unused days rolling over.",
  "Can I work from home?": "Yes — per the Remote Work Policy, you may work remotely up to 3 days per week. Core hours (10am–3pm) must be observed.",
  "What expenses need receipts?": "Based on the Expense Policy, receipts are required for any expense over $50, submitted via Expensify within 30 days.",
};

const TABLE = [
  { aspect: "Knowledge update", rag: "Real-time", ft: "Retrain required" },
  { aspect: "Cost", rag: "Low", ft: "High" },
  { aspect: "Hallucination", rag: "Reduced", ft: "Same" },
  { aspect: "Private data", rag: "Yes", ft: "Yes" },
  { aspect: "Setup time", rag: "Hours", ft: "Days" },
];

const USE_CASES = [
  { title: "Customer Support Bot", desc: "Answer product questions by retrieving from docs, FAQs, and release notes — always up to date." },
  { title: "Internal Knowledge Base", desc: "Let employees query HR policies, runbooks, and wikis without reading every document." },
  { title: "Research Assistant", desc: "Search across hundreds of papers and surface relevant passages for any research question." },
];

type Stage = "idle" | "embedding" | "scoring" | "prompt" | "typing" | "done";

function scoreDoc(doc: (typeof DOCS)[number], q: string) {
  const lq = q.toLowerCase();
  return Math.min(doc.keywords.filter((k) => lq.includes(k)).length / 2 + 0.1, 1);
}

export default function RAGExplainedClient() {
  const { data: session } = useSession();

  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [visited, setVisited] = useState<Set<string>>(new Set());

  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [scores, setScores] = useState([0, 0, 0, 0]);
  const [typed, setTyped] = useState("");
  const [queriesRun, setQueriesRun] = useState(0);
  const typerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionFired = useRef(false);

  const pipelineDone = visited.size >= 8;
  const allComplete = pipelineDone && queriesRun >= 2;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "rag-explained", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  useEffect(() => () => { if (typerRef.current) clearTimeout(typerRef.current); }, []);

  function handleStep(id: string) {
    setActiveStep((p) => (p === id ? null : id));
    setVisited((p) => new Set([...p, id]));
  }

  const runDemo = useCallback((q: string) => {
    if ((stage !== "idle" && stage !== "done") || !q.trim()) return;
    setQuery(q); setTyped(""); setScores([0, 0, 0, 0]); setStage("embedding");
    setTimeout(() => {
      setScores(DOCS.map((d) => scoreDoc(d, q)));
      setStage("scoring");
      setTimeout(() => {
        setStage("prompt");
        setTimeout(() => {
          setStage("typing");
          const ans = ANSWERS[q] ?? "Based on the retrieved context, here is a grounded answer to your question.";
          let i = 0;
          const tick = () => { i++; setTyped(ans.slice(0, i)); if (i < ans.length) { typerRef.current = setTimeout(tick, 18); } else { setStage("done"); setQueriesRun((n) => n + 1); } };
          tick();
        }, 600);
      }, 800);
    }, 700);
  }, [stage]);

  const topTwo = new Set([...scores].map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s).slice(0, 2).map((x) => x.i));
  const showScore = stage === "scoring" || stage === "prompt" || stage === "typing" || stage === "done";
  const showPrompt = stage === "prompt" || stage === "typing" || stage === "done";
  const showAnswer = stage === "typing" || stage === "done";

  const progress = [
    { label: "Pipeline explored", done: pipelineDone },
    { label: "Demo query 1", done: queriesRun >= 1 },
    { label: "Demo query 2", done: queriesRun >= 2 },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="rag-explained" score={100} />
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-[#ec4899]">Applied AI</span>
          <span className="text-white/20">/</span>
          <span className="text-white">RAG: Retrieval Augmented Generation</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#ec4899]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#ec4899]">Applied AI</span>
            <span className="w-6 h-px bg-[#ec4899]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            RAG: <span className="text-[#ec4899]">Retrieval Augmented Generation</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            RAG gives LLMs access to external knowledge at query time — no retraining required.
            Step through the full pipeline and run live simulations to see exactly how retrieval grounds every answer.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-10 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <motion.div className="w-2 h-2 rounded-full" animate={{ backgroundColor: done ? "#3bb4a4" : "#1e293b" }} transition={{ duration: 0.4 }} />
              <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>{label}</span>
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

        {/* ── Section 1: The RAG Pipeline ─────────────────────────────────── */}
        <section className="mb-14">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 1 — The RAG Pipeline</h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">Click each step to expand its explanation. Explore all 8 to unlock the demo.</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {(["ingest", "retrieve", "augment", "generate"] as const).map((g) => {
              const colors: Record<string, string> = { ingest: "#3bb4a4", retrieve: "#ec4899", augment: "#d4af37", generate: "#a855f7" };
              return (
                <div key={g} className="rounded-lg px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest"
                  style={{ background: `${colors[g]}15`, color: colors[g], border: `1px solid ${colors[g]}30` }}>
                  {g}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {STEPS.map((s) => {
              const isActive = activeStep === s.id;
              const isVisited = visited.has(s.id);
              return (
                <motion.button key={s.id} onClick={() => handleStep(s.id)}
                  className="rounded-2xl border text-left p-4 transition-all"
                  style={{ borderColor: isActive ? s.color : isVisited ? `${s.color}40` : "#1e293b", background: isActive ? `${s.color}12` : isVisited ? `${s.color}06` : "#0f172a" }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">{s.icon}</span>
                    {isVisited && !isActive && (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#3bb4a4" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    )}
                  </div>
                  <div className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: s.color }}>{s.group}</div>
                  <p className="text-[12px] font-bold text-white mb-2">{s.label}</p>
                  <AnimatePresence>
                    {isActive ? (
                      <motion.p key="open" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="text-[11px] text-[#94a3b8] leading-relaxed whitespace-pre-line">{s.desc}</motion.p>
                    ) : (
                      <p className="text-[11px] text-[#334155]">Click to expand</p>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#475569] uppercase tracking-wider">Steps explored</span>
              <span className="text-[10px] text-[#94a3b8] font-mono">{visited.size}/8</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(to right, #ec4899, #d4af37)" }}
                animate={{ width: `${(visited.size / 8) * 100}%` }} transition={{ duration: 0.4 }} />
            </div>
          </div>
        </section>

        {/* ── Section 2: Live Demo ─────────────────────────────────────────── */}
        <section className="mb-14">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 2 — Live Demo Simulation</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">Choose a preset or type your own query to watch the full RAG pipeline execute.</p>

          <div className="flex flex-wrap gap-2 mb-3">
            {PRESETS.map((p) => (
              <button key={p} onClick={() => runDemo(p)} disabled={stage !== "idle" && stage !== "done"}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-[#94a3b8] hover:border-[#ec4899] hover:text-[#ec4899] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                {p}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mb-6">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runDemo(query)}
              placeholder="Or type a custom query..." className="flex-1 rounded-xl border border-[#1e293b] bg-[#0f172a] px-4 py-2.5 text-[13px] text-white placeholder-[#334155] focus:outline-none focus:border-[#ec4899] transition-colors" />
            <button onClick={() => runDemo(query)} disabled={!query.trim() || (stage !== "idle" && stage !== "done")}
              className="px-4 py-2.5 rounded-xl text-[12px] font-semibold bg-[#ec4899] text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
              Run
            </button>
          </div>

          {stage !== "idle" && (
            <div className="space-y-4">
              {/* Step 1 */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${stage === "embedding" ? "bg-[#ec4899] animate-pulse" : "bg-[#ec4899]"}`}>
                    {stage === "embedding" ? "⟳" : "✓"}
                  </div>
                  <p className="text-[12px] font-bold text-white">Query embedding computed</p>
                </div>
                <p className="text-[11px] text-[#475569] font-mono ml-7">&ldquo;{query}&rdquo; → [0.12, -0.87, 0.34, … 768 dims]</p>
              </motion.div>

              {/* Step 2: Scores */}
              {showScore && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full bg-[#ec4899] flex items-center justify-center text-[10px] font-bold">✓</div>
                    <p className="text-[12px] font-bold text-white">Similarity scores — top-2 retrieved</p>
                  </div>
                  <div className="space-y-2 ml-7">
                    {DOCS.map((doc, i) => {
                      const isTop = topTwo.has(i);
                      return (
                        <div key={doc.id} className="flex items-center gap-3">
                          <span className="text-[11px] font-semibold w-32 shrink-0" style={{ color: isTop ? "#ec4899" : "#475569" }}>
                            {doc.title}{isTop && <span className="ml-1 text-[9px]">★</span>}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-[#1e293b] overflow-hidden">
                            <motion.div className="h-full rounded-full" style={{ background: isTop ? "#ec4899" : "#1e5d8a" }}
                              initial={{ width: 0 }} animate={{ width: `${scores[i] * 100}%` }} transition={{ duration: 0.6, delay: i * 0.1 }} />
                          </div>
                          <span className="text-[11px] text-[#475569] w-9 text-right font-mono">{(scores[i] * 100).toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Prompt */}
              {showPrompt && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-[#d4af37] flex items-center justify-center text-[10px] font-bold">✓</div>
                    <p className="text-[12px] font-bold text-white">Augmented prompt</p>
                  </div>
                  <pre className="text-[10px] text-[#94a3b8] ml-7 leading-relaxed whitespace-pre-wrap font-mono">
                    {`System: Answer using ONLY the provided context.\n\nContext:\n${DOCS.filter((_, i) => topTwo.has(i)).map((d) => `[${d.title}]: ${d.content}`).join("\n")}\n\nQuery: ${query}`}
                  </pre>
                </motion.div>
              )}

              {/* Step 4: Answer */}
              {showAnswer && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[#3bb4a4]/40 bg-[#3bb4a4]/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-[#3bb4a4] flex items-center justify-center text-[10px] font-bold">{stage === "done" ? "✓" : "⟳"}</div>
                    <p className="text-[12px] font-bold text-white">Grounded answer</p>
                  </div>
                  <p className="text-[13px] text-white ml-7 leading-relaxed">
                    {typed}
                    {stage === "typing" && (
                      <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}
                        className="inline-block w-0.5 h-3.5 bg-[#3bb4a4] ml-0.5 align-middle" />
                    )}
                  </p>
                </motion.div>
              )}

              {stage === "done" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
                  <p className="text-[11px] text-[#3bb4a4]">Query {queriesRun}/2 done{queriesRun < 2 ? " — run one more!" : ""}</p>
                  <button onClick={() => { setStage("idle"); setTyped(""); setScores([0, 0, 0, 0]); }}
                    className="px-4 py-1.5 rounded-xl text-[11px] font-semibold border border-[#1e293b] text-[#94a3b8] hover:border-[#ec4899] hover:text-[#ec4899] transition-all">
                    Run another query
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </section>

        {/* ── Section 3: RAG vs Fine-Tuning ───────────────────────────────── */}
        <section className="mb-14">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 3 — RAG vs Fine-Tuning</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">Both extend LLM knowledge — but with very different trade-offs.</p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden">
            <div className="grid grid-cols-3 bg-[#1e293b]">
              <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">Aspect</div>
              <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#ec4899]">RAG</div>
              <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#d4af37]">Fine-Tuning</div>
            </div>
            {TABLE.map((row, i) => (
              <div key={row.aspect} className={`grid grid-cols-3 border-t border-[#1e293b] ${i % 2 === 0 ? "bg-[#0f172a]" : "bg-[#0d1424]"}`}>
                <div className="px-4 py-3 text-[12px] text-[#94a3b8]">{row.aspect}</div>
                <div className="px-4 py-3 text-[12px] font-semibold text-white">{row.rag}</div>
                <div className="px-4 py-3 text-[12px] text-[#475569]">{row.ft}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 4: When to Use RAG ───────────────────────────────────── */}
        <section className="mb-14">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 4 — When to Use RAG</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">RAG shines whenever your LLM needs knowledge it was never trained on.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {USE_CASES.map((uc, i) => (
              <motion.div key={uc.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-[#ec4899]/30 bg-[#ec4899]/[0.04] p-5">
                <p className="text-[13px] font-bold text-white mb-2">{uc.title}</p>
                <p className="text-[12px] text-[#94a3b8] leading-relaxed">{uc.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Gold insight */}
        <div className="rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-6 mb-12">
          <div className="flex items-start gap-3">
            <span className="text-[#d4af37] text-xl mt-0.5">💡</span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#d4af37] mb-2">Key Insight</p>
              <p className="text-[13px] text-white leading-relaxed">
                The retrieval step is often the bottleneck. A bad embedding model or chunking strategy
                means the right context is never retrieved — even the best LLM can&apos;t help then.
              </p>
            </div>
          </div>
        </div>

        {/* Summary card */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 mb-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1">Up Next</p>
            <p className="text-[15px] font-bold text-white">Vector Databases</p>
            <p className="text-[12px] text-[#94a3b8] mt-1">How vector stores enable fast approximate nearest-neighbour search at scale.</p>
          </div>
          <Link href="/visual-guides/vector-databases" className="px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[#ec4899] text-white hover:opacity-90 transition-opacity whitespace-nowrap">
            Next Guide →
          </Link>
        </div>

        {/* Nav */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link href="/visual-guides/fine-tuning-vs-prompting" className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
            ← Fine-Tuning vs Prompting
          </Link>
          <Link href="/visual-guides/vector-databases" className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#ec4899] text-white hover:opacity-90 transition-opacity">
            Vector Databases →
          </Link>
        </div>
      </div>
    </div>
  );
}
