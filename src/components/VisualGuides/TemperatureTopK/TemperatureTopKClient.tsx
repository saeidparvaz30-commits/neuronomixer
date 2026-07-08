"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import { useGuideMotion } from "@/lib/guideMotion";

// ── Data ──────────────────────────────────────────────────────────────────────
const BASE_LOGITS = [
  { token: "blue",    logit: 4.2 },
  { token: "clear",   logit: 3.1 },
  { token: "dark",    logit: 2.8 },
  { token: "bright",  logit: 2.3 },
  { token: "cloudy",  logit: 1.9 },
  { token: "red",     logit: 1.2 },
  { token: "falling", logit: 0.3 },
  { token: "hungry",  logit: -0.5 },
];
const SEEDS = [42, 137, 999, 2048, 7777];

// ── Helpers ───────────────────────────────────────────────────────────────────
function softmax(logits: number[], t: number) {
  const s = logits.map(l => l / t);
  const m = Math.max(...s);
  const e = s.map(v => Math.exp(v - m));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map(v => v / sum);
}

function topKRenorm(probs: number[], k: number) {
  const idx = [...probs].map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p);
  const top = idx.slice(0, k);
  const sum = top.reduce((a, b) => a + b.p, 0);
  const out = new Array(probs.length).fill(0);
  top.forEach(({ i, p }) => { out[i] = p / sum; });
  return out;
}

function topPMask(probs: number[], p: number) {
  const sorted = [...probs].map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  let cum = 0;
  const mask = new Array(probs.length).fill(false);
  for (const { v, i } of sorted) { mask[i] = true; cum += v; if (cum >= p) break; }
  return mask;
}

function lcgSample(probs: number[], seed: number) {
  let s = (seed * 1664525 + 1013904223) & 0xffffffff;
  const r = (s >>> 0) / 0x100000000;
  let cum = 0;
  for (let i = 0; i < probs.length; i++) { cum += probs[i]; if (r < cum) return i; }
  return probs.length - 1;
}

// ── Bar row ───────────────────────────────────────────────────────────────────
function Bar({ token, pct, color, dim }: { token: string; pct: number; color: string; dim?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-[11px] font-mono w-14 text-right ${dim ? "text-[#334155]" : "text-[#94a3b8]"}`}>{token}</span>
      <div className="flex-1 h-5 bg-[#1e293b] rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ backgroundColor: dim ? "#1e293b" : color }}
          animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
      </div>
      <span className={`text-[11px] font-mono w-10 text-right ${dim ? "text-[#334155]" : ""}`}
        style={dim ? {} : { color }}>{dim ? "—" : `${pct.toFixed(1)}%`}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TemperatureTopKClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const completionFired = useRef(false);
  const samplesRef = useRef<HTMLDivElement>(null);

  const [temp, setTemp] = useState(1.0);
  const [topK, setTopK] = useState(5);
  const [topP, setTopP] = useState(0.9);
  const [tempMoved, setTempMoved] = useState(false);
  const [topKMoved, setTopKMoved] = useState(false);
  const [samplesViewed, setSamplesViewed] = useState(0);

  const allDone = tempMoved && topKMoved && samplesViewed >= 3;

  useEffect(() => {
    if (allDone && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "temperature-topk", score: 100 }),
      }).catch(() => {});
    }
  }, [allDone, session?.user]);

  useEffect(() => {
    const el = samplesRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setSamplesViewed(5); }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const logits = BASE_LOGITS.map(t => t.logit);
  const baseTempProbs = useMemo(() => softmax(logits, temp), [temp]);
  const baseProbs     = useMemo(() => softmax(logits, 1.0),  []);
  const topKProbs     = useMemo(() => topKRenorm(baseTempProbs, topK), [baseTempProbs, topK]);
  const pMask         = useMemo(() => topPMask(baseTempProbs, topP), [baseTempProbs, topP]);
  const pCount        = pMask.filter(Boolean).length;
  const pCum          = useMemo(() => {
    const sorted = [...baseTempProbs].map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    let c = 0; for (const { v, i } of sorted) { if (pMask[i]) c += v; if (c >= topP) break; } return Math.min(c, 1);
  }, [baseTempProbs, pMask, topP]);

  const samples = useMemo(() =>
    SEEDS.map((seed, i) => {
      const idx = lcgSample(topKProbs, seed + Math.round(temp * 10) + topK * 100);
      return { n: i + 1, token: BASE_LOGITS[idx].token, prob: topKProbs[idx] };
    }), [topKProbs, temp, topK]);

  const handleReset = () => {
    setTemp(1.0);
    setTopK(5);
    setTopP(0.9);
    setTempMoved(false);
    setTopKMoved(false);
    setSamplesViewed(0);
  };

  const tempLabel = temp <= 0.3 ? "Focused" : temp <= 0.7 ? "Conservative" : temp <= 1.2 ? "Balanced" : temp <= 2.0 ? "Creative" : "Chaotic";
  const progress = [
    { label: "Temperature adjusted", done: tempMoved },
    { label: "Top-K adjusted", done: topKMoved },
    { label: `Samples viewed: ${Math.min(samplesViewed, 5)}/3`, done: samplesViewed >= 3 },
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">Temperature &amp; Top-K: Controlling Creativity</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">LLMs</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Temperature &amp; <span className="text-[var(--color-accent)]">Top-K</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[600px]">
            After producing logits, LLMs use sampling parameters to shape outputs. Adjust them below
            and watch the probability distribution reshape in real time.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full transition-colors"
                style={{ background: done ? "var(--color-accent)" : "#1e293b" }} />
              <span className={`text-[11px] transition-colors ${done ? "text-white" : "text-[#475569]"}`}>{label}</span>
            </div>
          ))}
          {!session?.user && <p className="text-[11px] text-[#475569] ml-auto">Sign in to save progress</p>}
          <AnimatePresence>
            {allDone && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[var(--color-success)] flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* §1 Base probs */}
        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-white mb-1">1. The Base Probabilities</h2>
          <p className="text-[12px] text-[#94a3b8] mb-4">
            Prompt: <span className="font-mono text-white bg-[#1e293b] px-2 py-0.5 rounded">"The sky is ___"</span>, raw softmax at T=1.0
          </p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-2.5">
            {BASE_LOGITS.map(({ token }, i) => (
              <Bar key={token} token={token} pct={baseProbs[i] * 100} color="#1e5d8a" />
            ))}
          </div>
        </section>

        {/* §2 Temperature */}
        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-white mb-1">2. Temperature Slider</h2>
          <p className="text-[12px] text-[#94a3b8] mb-4">
            <span className="font-mono text-white">P(i) = exp(logit_i / T) / Σ exp(logit_j / T)</span>: higher T flattens the distribution.
          </p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] text-[#94a3b8]">Temperature (T)</span>
              <div className="flex items-center gap-2">
                <span className="text-[22px] font-black text-white">{temp.toFixed(1)}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  temp <= 0.5 ? "border-[#3bb4a4]/40 text-[#3bb4a4] bg-[#3bb4a4]/10"
                  : temp <= 1.2 ? "border-[var(--color-accent)]/40 text-[var(--color-accent)] bg-[var(--color-accent)]/10"
                  : "border-[#ef4444]/40 text-[#ef4444] bg-[#ef4444]/10"
                }`}>{tempLabel}</span>
              </div>
            </div>
            <input type="range" min={0.1} max={3.0} step={0.1} value={temp} aria-label="Temperature"
              onChange={e => { setTemp(parseFloat(e.target.value)); setTempMoved(true); }}
              className="w-full accent-[#3bb4a4] cursor-pointer" />
            <div className="flex justify-between mt-1">
              {["0.1 Focused", "1.0 Balanced", "2.0 Creative", "3.0 Chaotic"].map(l => (
                <span key={l} className="text-[10px] text-[#475569]">{l}</span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-2.5">
            {BASE_LOGITS.map(({ token }, i) => (
              <Bar key={token} token={token} pct={baseTempProbs[i] * 100}
                color={topKProbs[i] > 0 ? "#3bb4a4" : "#334155"} dim={topKProbs[i] === 0} />
            ))}
            <p className="text-[10px] text-[#475569] pt-1">Turquoise = in Top-K pool · Gray = excluded</p>
          </div>
        </section>

        {/* §3 Top-K */}
        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-white mb-1">3. Top-K Sampling</h2>
          <p className="text-[12px] text-[#94a3b8] mb-4">
            Only sample from the K highest-probability tokens. Excluded tokens have their mass redistributed.
          </p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] text-[#94a3b8]">K value</span>
              <div className="flex items-center gap-2">
                <span className="text-[22px] font-black text-white">K = {topK}</span>
                <span className="text-[11px] font-semibold text-[var(--color-accent)]">
                  {topK === 1 ? "Greedy" : topK <= 4 ? "Selective" : topK <= 6 ? "Balanced" : "Open"}
                </span>
              </div>
            </div>
            <input type="range" min={1} max={8} step={1} value={topK} aria-label="Top-K value"
              onChange={e => { setTopK(parseInt(e.target.value)); setTopKMoved(true); }}
              className="w-full accent-[var(--color-accent)] cursor-pointer" />
            <div className="flex justify-between mt-1">
              {["K=1 Greedy", "K=5 Balanced", "K=8 Open"].map(l => (
                <span key={l} className="text-[10px] text-[#475569]">{l}</span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-2.5">
            {BASE_LOGITS.map(({ token }, i) => (
              <Bar key={token} token={token} pct={topKProbs[i] * 100} color="var(--color-accent)" dim={topKProbs[i] === 0} />
            ))}
            <p className="text-[10px] text-[#475569] pt-1">Probabilities are renormalized across included tokens.</p>
          </div>
        </section>

        {/* §4 Top-P */}
        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-white mb-1">4. Top-P (Nucleus) Sampling</h2>
          <p className="text-[12px] text-[#94a3b8] mb-4">
            Pick the smallest set of tokens whose cumulative probability ≥ P. Adapts to distribution shape.
          </p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] text-[#94a3b8]">P threshold</span>
              <span className="text-[22px] font-black text-white">P = {topP.toFixed(2)}</span>
            </div>
            <input type="range" min={0.5} max={1.0} step={0.05} value={topP} aria-label="Top-P threshold"
              onChange={e => setTopP(parseFloat(e.target.value))}
              className="w-full accent-[#a855f7] cursor-pointer" />
          </div>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-2.5">
            {BASE_LOGITS.map(({ token }, i) => (
              <Bar key={token} token={token} pct={baseTempProbs[i] * 100} color="#a855f7" dim={!pMask[i]} />
            ))}
            <div className="pt-2 border-t border-[#1e293b] flex items-center justify-between">
              <p className="text-[11px] text-[#94a3b8]">Using <span className="text-white font-bold">{pCount}</span> tokens</p>
              <p className="text-[11px] text-[#94a3b8]">Cumulative: <span className="text-[#a855f7] font-bold">{(pCum * 100).toFixed(1)}%</span></p>
            </div>
          </div>
        </section>

        {/* §5 Samples */}
        <section className="mb-10" ref={samplesRef}>
          <h2 className="text-[15px] font-bold text-white mb-1">5. What Gets Generated</h2>
          <p className="text-[12px] text-[#94a3b8] mb-4">Five deterministic samples from the current T + Top-K distribution.</p>
          <div className="space-y-2.5">
            {samples.map(({ n, token, prob }) => (
              <motion.div key={n} layout className="rounded-xl border border-[#1e293b] bg-[#0f172a] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[#475569] w-16">Sample {n}:</span>
                  <span className="text-[13px] text-[#94a3b8]">The sky is</span>
                  <motion.span key={token} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="text-[14px] font-bold text-[#3bb4a4]">{token}</motion.span>
                </div>
                <span className="text-[11px] font-mono text-[#475569]">{(prob * 100).toFixed(1)}%</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Gold insight */}
        <div className="rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-5 mb-10">
          <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wider mb-2">Real-world settings</p>
          <p className="text-[13px] text-white leading-relaxed">
            Major LLM APIs (OpenAI, Anthropic) default to <span className="text-[var(--color-accent)] font-semibold">T=1.0</span> with
            no top-p cutoff, and what consumer apps like ChatGPT use internally is not published.{" "}
            In practice, developers often dial down to <span className="text-[#3bb4a4] font-semibold">T≈0&ndash;0.3</span> for
            code and extraction tasks, and up to <span className="text-[#a855f7] font-semibold">T≈0.9&ndash;1.1</span> for
            creative writing.
          </p>
        </div>

        {/* Summary card */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">Up Next</p>
            <p className="text-[14px] font-bold text-white">Context Windows: What the Model Can See</p>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">Slide context length and test information retrieval at different positions.</p>
          </div>
          <Link href="/visual-guides/context-windows"
            className="shrink-0 px-5 py-2 rounded-xl text-[13px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
            Next Guide →
          </Link>
        </div>

        {/* Completion card */}
        <AnimatePresence>
          {allDone && (
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
                <h2 className="text-2xl font-extrabold tracking-tight text-white">Sampling Parameters Mastered!</h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You adjusted temperature, restricted the pool with Top-K, and saw how both shape what the model generates.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Temperature", value: "Explored", color: "#3bb4a4" },
                    { label: "Top-K pool", value: "Explored", color: "var(--color-accent)" },
                    { label: "Samples drawn", value: "5 seeds", color: "#a855f7" },
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
                    &quot;Temperature reshapes the whole distribution; Top-K and Top-P decide who is even allowed in the room. Low values make output predictable, high values make it surprising.&quot;
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
                  <Link href="/visual-guides/context-windows"
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
                    Next Guide →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav */}
        {!allDone && (
          <div className="flex items-center justify-between pt-6 border-t border-white/[0.06]">
            <Link href="/visual-guides/transformer-architecture"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
              ← Previous Guide
            </Link>
            <Link href="/visual-guides/context-windows"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
              Next Guide →
            </Link>
          </div>
        )}

        <GuideCompletion isComplete={allDone} guideSlug="temperature-topk" score={100} />

      </div>
    </div>
  );
}
