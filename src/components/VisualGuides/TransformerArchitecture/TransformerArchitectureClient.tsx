"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

type BlockId = "token-embedding" | "positional-encoding" | "mha" | "add-norm-1" | "ffn" | "add-norm-2" | "output-projection" | "softmax";

interface Block { id: BlockId; label: string; color: string; border: string; repeat?: boolean; explanation: string; formula: string; }

const BLOCKS: Block[] = [
  { id: "token-embedding", label: "Token Embedding", color: "#1e5d8a", border: "#3b82f6",
    explanation: "Converts each token ID (an integer like 12405) into a high-dimensional vector (e.g., 768 floats). The model learns these embeddings during training.",
    formula: "E(token_id) → ℝ^768" },
  { id: "positional-encoding", label: "Positional Encoding", color: "#6b21a8", border: "#a855f7",
    explanation: "Adds positional information so the model knows token order. GPT uses learned position embeddings; original Transformers used sinusoidal functions.",
    formula: "PE(pos, 2i) = sin(pos / 10000^(2i/d_model))" },
  { id: "mha", label: "Multi-Head Self-Attention", color: "#991b1b", border: "#ef4444", repeat: true,
    explanation: "Each token attends to all previous tokens. Multiple heads run in parallel, each capturing different relationships.",
    formula: "Attention(Q,K,V) = softmax(QKᵀ / √dₖ) · V" },
  { id: "add-norm-1", label: "Add & Norm", color: "#334155", border: "#64748b", repeat: true,
    explanation: "Residual connection: add the input back to the output, then normalize. Prevents vanishing gradients and enables very deep networks.",
    formula: "LayerNorm(x + Sublayer(x))" },
  { id: "ffn", label: "Feed-Forward Network", color: "#0f766e", border: "#3bb4a4", repeat: true,
    explanation: "A two-layer MLP applied identically to each position. Width is typically 4× the model dimension.",
    formula: "FFN(x) = max(0, xW₁ + b₁)W₂ + b₂" },
  { id: "add-norm-2", label: "Add & Norm", color: "#334155", border: "#64748b", repeat: true,
    explanation: "Second residual connection after the feed-forward network. Stabilizes training and enables gradient flow across all N layers.",
    formula: "LayerNorm(x + FFN(x))" },
  { id: "output-projection", label: "Output Projection", color: "#92400e", border: "#d4af37",
    explanation: "A linear layer that maps the final hidden state to logits over the entire vocabulary (~50K tokens).",
    formula: "logits = h · W_vocab^T" },
  { id: "softmax", label: "Softmax", color: "#14532d", border: "#22c55e",
    explanation: "Converts logits to probabilities. Temperature scaling happens here — higher temperature = flatter distribution = more random output.",
    formula: "P(tokenᵢ) = e^(logitᵢ/T) / Σe^(logitⱼ/T)" },
];

const FLOW_STEPS = [
  { label: "Input text", value: '"Hello"', color: "#94a3b8" },
  { label: "Token ID", value: "[9906]", color: "#3b82f6" },
  { label: "Embedding", value: "[0.12, −0.34, ...]", color: "#a855f7" },
  { label: "After Attention", value: "context vector", color: "#ef4444" },
  { label: "After FFN", value: "transformed vector", color: "#3bb4a4" },
  { label: "Logits", value: "{world:4.2, there:3.1}", color: "#d4af37" },
  { label: "Probs", value: "{world:32%, there:18%}", color: "#22c55e" },
];

const SCALE_ROWS = [
  { model: "GPT-2", layers: 12, heads: 12, dim: "768", params: "117M" },
  { model: "GPT-3", layers: 96, heads: 96, dim: "12,288", params: "175B" },
  { model: "LLaMA 3", layers: 32, heads: 32, dim: "4,096", params: "8B" },
];

function BlockBtn({ block, selected, explored, onClick }: { block: Block; selected: boolean; explored: boolean; onClick: () => void }) {
  return (
    <motion.button onClick={onClick} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
      className="w-full h-[50px] rounded-lg text-sm font-medium text-white flex items-center justify-between px-3"
      style={{ backgroundColor: selected ? block.color : `${block.color}cc`, border: `2px solid ${selected ? block.border : `${block.color}88`}`, boxShadow: selected ? `0 0 14px ${block.border}55` : undefined }}>
      <span>{block.label}</span>
      {explored && !selected && <span className="text-white/50 text-xs">✓</span>}
      {selected && <span style={{ color: block.border }} className="text-xs font-bold">●</span>}
    </motion.button>
  );
}

export default function TransformerArchitectureClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);
  const [selected, setSelected] = useState<BlockId | null>(null);
  const [explored, setExplored] = useState<Set<BlockId>>(new Set());
  const [animDone, setAnimDone] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [flowStep, setFlowStep] = useState(-1);

  const isComplete = explored.size >= 6 && animDone;
  const progress = Math.min(Math.round(((explored.size / 6) * 0.7 + (animDone ? 1 : 0) * 0.3) * 100), 100);

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "transformer-architecture", score: 100 }) }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  function handleBlock(id: BlockId) {
    setSelected((p) => (p === id ? null : id));
    setExplored((p) => new Set([...p, id]));
  }

  function handleAnimate() {
    if (animating) return;
    setAnimating(true); setFlowStep(0); setAnimDone(true);
    let step = 0;
    const iv = setInterval(() => {
      step++;
      if (step >= FLOW_STEPS.length) { clearInterval(iv); setAnimating(false); setFlowStep(FLOW_STEPS.length - 1); }
      else setFlowStep(step);
    }, 500);
  }

  const sel = BLOCKS.find((b) => b.id === selected);
  const above = BLOCKS.filter((b) => !b.repeat).slice(0, 2);
  const repeat = BLOCKS.filter((b) => b.repeat);
  const below = BLOCKS.filter((b) => !b.repeat).slice(2);

  return (
    <main className="min-h-screen bg-[#0f172a] text-white px-4 py-10 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-xs text-[#94a3b8] mb-6 flex items-center gap-1.5 flex-wrap">
        <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
        <span>/</span>
        <span className="px-2 py-0.5 rounded-full text-white font-medium bg-[#ef4444]">LLMs</span>
        <span>/</span>
        <span className="text-white">The Transformer Architecture</span>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">The Transformer Architecture</h1>
        <p className="text-[#94a3b8] text-sm max-w-2xl">Click every block in the decoder stack to see what it does. GPT-style transformers stack these blocks N times to process and generate text.</p>
      </header>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-1.5">
          <span>Progress</span><span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#1e5d8a,#3bb4a4)" }}
            initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
        </div>
        {!session?.user && <p className="text-[11px] text-[#475569] mt-1">Sign in to save progress</p>}
      </div>

      {/* Section 1: Architecture Explorer */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-2">Architecture Explorer</h2>
        <p className="text-[#94a3b8] text-sm mb-5">Click any block to expand its explanation. Blocks 3–6 repeat N times (GPT-4 uses ~96 layers).</p>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Stack */}
          <div className="flex flex-col gap-2 lg:w-72 flex-shrink-0">
            {above.map((b) => <BlockBtn key={b.id} block={b} selected={selected === b.id} explored={explored.has(b.id)} onClick={() => handleBlock(b.id)} />)}
            <div className="border-2 border-dashed border-[#3bb4a4] rounded-xl p-2 flex flex-col gap-2">
              <p className="text-[10px] text-[#3bb4a4] font-mono text-center tracking-wide">× N LAYERS (e.g. 96 for GPT-4)</p>
              {repeat.map((b) => <BlockBtn key={b.id} block={b} selected={selected === b.id} explored={explored.has(b.id)} onClick={() => handleBlock(b.id)} />)}
            </div>
            {below.map((b) => <BlockBtn key={b.id} block={b} selected={selected === b.id} explored={explored.has(b.id)} onClick={() => handleBlock(b.id)} />)}
            <p className="text-[11px] text-[#475569] text-center mt-1">{explored.size} / {BLOCKS.length} blocks explored</p>
          </div>

          {/* Explanation panel */}
          <div className="flex-1 min-h-[200px]">
            <AnimatePresence mode="wait">
              {sel ? (
                <motion.div key={sel.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}
                  className="rounded-xl p-5 border h-full" style={{ backgroundColor: "#1e293b", borderColor: sel.border, boxShadow: `0 0 20px ${sel.border}30` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: sel.border }} />
                    <h3 className="text-base font-semibold" style={{ color: sel.border }}>{sel.label}</h3>
                  </div>
                  <p className="text-[#94a3b8] text-sm leading-relaxed mb-4">{sel.explanation}</p>
                  <div className="rounded-lg px-4 py-2.5 font-mono text-sm bg-[#0f172a]">
                    <span className="text-[#475569] text-xs mr-2">formula</span>
                    <span style={{ color: sel.border }}>{sel.formula}</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="rounded-xl border border-dashed border-[#1e293b] h-full flex items-center justify-center">
                  <p className="text-[#475569] text-sm text-center px-6">Click a block on the left to see what it does</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Section 2: Data Flow Animation */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-2">Data Flow Animation</h2>
        <p className="text-[#94a3b8] text-sm mb-5">Watch a token travel through the full transformer pipeline.</p>
        <div className="bg-[#1e293b] rounded-xl p-5 border border-[#334155]">
          <div className="flex flex-wrap gap-2 items-center mb-5">
            {FLOW_STEPS.map((step, i) => (
              <React.Fragment key={i}>
                <motion.div animate={{ opacity: flowStep >= i ? 1 : 0.2, scale: flowStep === i ? 1.05 : 1 }} transition={{ duration: 0.3 }}
                  className="rounded-lg px-3 py-2 text-center min-w-[90px]"
                  style={{ backgroundColor: flowStep >= i ? `${step.color}22` : "#0f172a", border: `1px solid ${flowStep >= i ? step.color : "#334155"}` }}>
                  <p className="text-[10px] mb-0.5" style={{ color: flowStep >= i ? step.color : "#475569" }}>{step.label}</p>
                  <p className="text-white text-[11px] font-mono leading-tight">{step.value}</p>
                </motion.div>
                {i < FLOW_STEPS.length - 1 && (
                  <motion.span animate={{ opacity: flowStep > i ? 1 : 0.15 }} className="text-[#475569] text-sm font-bold flex-shrink-0">→</motion.span>
                )}
              </React.Fragment>
            ))}
          </div>
          <button onClick={handleAnimate} disabled={animating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-all"
            style={{ backgroundColor: animating ? "#1e293b" : "#1e5d8a", border: "1px solid #3b82f6" }}>
            {animating ? (<><motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="inline-block">◌</motion.span>Animating…</>) : <>▶ Animate Flow</>}
          </button>
        </div>
      </section>

      {/* Section 3: Scale Comparison */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">Scale Comparison</h2>
        <div className="overflow-x-auto rounded-xl border border-[#334155]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#334155] bg-[#1e293b]">
                {["Model", "Layers", "Heads", "Dim", "Params"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[#94a3b8] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCALE_ROWS.map((row, i) => (
                <tr key={row.model} className="border-b border-[#1e293b] last:border-0" style={{ backgroundColor: i % 2 === 0 ? "#0f172a" : "#1e293b" }}>
                  <td className="px-4 py-3 font-semibold text-white">{row.model}</td>
                  <td className="px-4 py-3 text-[#94a3b8]">{row.layers}</td>
                  <td className="px-4 py-3 text-[#94a3b8]">{row.heads}</td>
                  <td className="px-4 py-3 text-[#94a3b8]">{row.dim}</td>
                  <td className="px-4 py-3 font-mono text-[#3bb4a4]">{row.params}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Gold insight box */}
      <div className="rounded-xl p-5 border border-[#d4af37] bg-[#d4af3710] mb-10">
        <p className="text-sm font-semibold text-[#d4af37] mb-1">Key Insight</p>
        <p className="text-[#94a3b8] text-sm leading-relaxed">
          The &ldquo;Attention Is All You Need&rdquo; paper (2017) by Vaswani et al. replaced RNNs entirely with attention.
          It has over 100,000 citations — one of the most influential papers in AI history.
        </p>
      </div>

      {/* Summary card */}
      <AnimatePresence>
        {isComplete && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
            className="rounded-xl p-5 border border-[#3bb4a4] bg-[#1e293b] mb-10">
            <p className="text-[#3bb4a4] font-semibold mb-2">Guide complete!</p>
            <p className="text-[#94a3b8] text-sm mb-4">You&apos;ve explored the full transformer stack. Up next: see how temperature and top-k sampling shape the output distribution.</p>
            <Link href="/visual-guides/temperature-topk"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#1e5d8a" }}>
              Next: Temperature &amp; Top-K →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {!isComplete && (
        <p className="text-[11px] text-[#475569] text-center mb-4">
          Explore {Math.max(0, 6 - explored.size)} more block{Math.max(0, 6 - explored.size) !== 1 ? "s" : ""} and play the animation to complete this guide.
        </p>
      )}
    </main>
  );
}
