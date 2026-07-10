"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  AttnVariant,
  Dtype,
  dtypeBytes,
  kvCacheBytes,
  kvHeadsFor,
  formatBytes,
  formatSeq,
  Preset,
  PROMPT_LEN,
  SEQ_OPTIONS,
  TOKENS,
  totalFlopsWithCache,
  totalFlopsWithoutCache,
} from "./kvMath";
import CacheFillAnimation from "./CacheFillAnimation";
import MemoryCalculator from "./MemoryCalculator";
import FlopsCompare, { GEN_OPTIONS, PROMPT_OPTIONS } from "./FlopsCompare";

const GUIDE_TITLE = "The KV Cache";
const GUIDE_SLUG = "kv-cache";
const NEXT_GUIDE_SLUG = "context-windows";

const N_TOKENS = TOKENS.length;
const FILL_INTERVAL_MS = 420;

// Calculator defaults (Llama 2 7B shaped)
const DEF_SEQ_IDX = 3; // 4096
const DEF_LAYERS = 32;
const DEF_HEADS = 32;
const DEF_HEAD_DIM = 128;
const DEF_DTYPE: Dtype = "fp16";
const DEF_VARIANT: AttnVariant = "mha";

// FLOPs defaults
const DEF_PROMPT_IDX = 2; // 512
const DEF_GEN_IDX = 2; // 256

export default function KVCacheClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Animation state ──────────────────────────────────────────────────────
  const [fillStep, setFillStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  // ── Calculator state ─────────────────────────────────────────────────────
  const [seqIdx, setSeqIdx] = useState(DEF_SEQ_IDX);
  const [layers, setLayers] = useState(DEF_LAYERS);
  const [heads, setHeads] = useState(DEF_HEADS);
  const [headDim, setHeadDim] = useState(DEF_HEAD_DIM);
  const [dtype, setDtype] = useState<Dtype>(DEF_DTYPE);
  const [variant, setVariant] = useState<AttnVariant>(DEF_VARIANT);

  // ── FLOPs state ──────────────────────────────────────────────────────────
  const [promptIdx, setPromptIdx] = useState(DEF_PROMPT_IDX);
  const [genIdx, setGenIdx] = useState(DEF_GEN_IDX);

  // ── Gates (sticky flags, set only by the real interaction) ───────────────
  const [gateAnim, setGateAnim] = useState(false);
  const [gateConfig, setGateConfig] = useState(false);
  const [gateGqa, setGateGqa] = useState(false);
  const [gateFlops, setGateFlops] = useState(false);
  const isComplete = gateAnim && gateConfig && gateGqa && gateFlops;

  // ── Animation timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setFillStep((s) => (s === 0 ? Math.min(PROMPT_LEN, N_TOKENS) : Math.min(s + 1, N_TOKENS)));
    }, FILL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [playing]);

  useEffect(() => {
    if (fillStep >= N_TOKENS) {
      setPlaying(false);
      setGateAnim(true);
    }
  }, [fillStep]);

  const handlePlayPause = useCallback(() => setPlaying((p) => !p), []);
  const handleFillStep = useCallback(() => {
    setFillStep((s) => (s === 0 ? Math.min(PROMPT_LEN, N_TOKENS) : Math.min(s + 1, N_TOKENS)));
  }, []);
  const handleRestart = useCallback(() => {
    setPlaying(false);
    setFillStep(0);
  }, []);

  // ── Calculator handlers (mark gateConfig only on an actual value change) ─
  const changeSeqIdx = useCallback(
    (v: number) => {
      if (v === seqIdx) return;
      setSeqIdx(v);
      setGateConfig(true);
    },
    [seqIdx]
  );
  const changeLayers = useCallback(
    (v: number) => {
      if (v === layers) return;
      setLayers(v);
      setGateConfig(true);
    },
    [layers]
  );
  const changeHeads = useCallback(
    (v: number) => {
      if (v === heads) return;
      setHeads(v);
      setGateConfig(true);
    },
    [heads]
  );
  const changeHeadDim = useCallback(
    (v: number) => {
      if (v === headDim) return;
      setHeadDim(v);
      setGateConfig(true);
    },
    [headDim]
  );
  const changeDtype = useCallback(
    (v: Dtype) => {
      if (v === dtype) return;
      setDtype(v);
      setGateConfig(true);
    },
    [dtype]
  );
  const changeVariant = useCallback(
    (v: AttnVariant) => {
      if (v === variant) return;
      setVariant(v);
      if (v !== "mha") setGateGqa(true);
    },
    [variant]
  );
  const applyPreset = useCallback(
    (p: Preset) => {
      const differs =
        p.layers !== layers || p.heads !== heads || p.headDim !== headDim || p.variant !== variant;
      if (!differs) return;
      setLayers(p.layers);
      setHeads(p.heads);
      setHeadDim(p.headDim);
      setVariant(p.variant);
      setGateConfig(true);
    },
    [layers, heads, headDim, variant]
  );

  // ── FLOPs handlers ───────────────────────────────────────────────────────
  const changePromptIdx = useCallback(
    (v: number) => {
      if (v === promptIdx) return;
      setPromptIdx(v);
      setGateFlops(true);
    },
    [promptIdx]
  );
  const changeGenIdx = useCallback(
    (v: number) => {
      if (v === genIdx) return;
      setGenIdx(v);
      setGateFlops(true);
    },
    [genIdx]
  );

  // ── Reset ────────────────────────────────────────────────────────────────
  function handleReset() {
    setPlaying(false);
    setFillStep(0);
    setSeqIdx(DEF_SEQ_IDX);
    setLayers(DEF_LAYERS);
    setHeads(DEF_HEADS);
    setHeadDim(DEF_HEAD_DIM);
    setDtype(DEF_DTYPE);
    setVariant(DEF_VARIANT);
    setPromptIdx(DEF_PROMPT_IDX);
    setGenIdx(DEF_GEN_IDX);
    setGateAnim(false);
    setGateConfig(false);
    setGateGqa(false);
    setGateFlops(false);
  }

  // ── Derived values for the completion card (all computed) ───────────────
  const kvHeads = kvHeadsFor(variant, heads);
  const cacheNow = kvCacheBytes({
    layers,
    kvHeads,
    headDim,
    seqLen: SEQ_OPTIONS[seqIdx],
    bytesPerValue: dtypeBytes(dtype),
  });
  const cacheMha = kvCacheBytes({
    layers,
    kvHeads: heads,
    headDim,
    seqLen: SEQ_OPTIONS[seqIdx],
    bytesPerValue: dtypeBytes(dtype),
  });
  const flopsSpeedup =
    totalFlopsWithoutCache(PROMPT_OPTIONS[promptIdx], GEN_OPTIONS[genIdx], layers, heads, headDim) /
    totalFlopsWithCache(PROMPT_OPTIONS[promptIdx], GEN_OPTIONS[genIdx], layers, heads, headDim);

  const progressItems = [
    { id: "anim", label: "Run the decode animation to the end", done: gateAnim },
    { id: "config", label: "Change the cache configuration", done: gateConfig },
    { id: "gqa", label: "Shrink the cache with GQA or MQA", done: gateGqa },
    { id: "flops", label: "Adjust the FLOPs comparison", done: gateFlops },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug={GUIDE_SLUG} score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-[12px] text-[#475569] mb-6"
        >
          <Link
            href="/visual-guides"
            className="hover:text-[var(--color-accent)] transition-colors"
          >
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">{GUIDE_TITLE}</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              LLMs
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            The <span className="text-[var(--color-accent)]">KV Cache</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Generation is fast because attention keys and values for past tokens are
            computed once and stored. Watch a real cache fill cell by cell, size it with a
            live bytes calculator, and measure the attention work it saves.
          </motion.p>
        </section>

        {/* Progress */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {progressItems.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: item.done ? "var(--color-accent)" : "#1e293b" }}
              />
              <span className={`text-[11px] ${item.done ? "text-white" : "text-[#475569]"}`}>
                {item.label}
              </span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link
                href="/auth/sign-in"
                className="underline underline-offset-2 hover:text-[#94a3b8]"
              >
                Sign in
              </Link>{" "}
              to save progress
            </p>
          )}
          <AnimatePresence>
            {isComplete && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[var(--color-success)] flex items-center gap-1"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Why caching works */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Why the past can be cached at all
          </p>
          <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto mb-4">
{`attention(Q, K, V) = softmax( Q K^T / sqrt(d) ) V

per layer, each token i produces:  q_i (used once)   k_i, v_i (reused forever)`}
          </pre>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                K and V never change
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Causal masking means past tokens never see the future, so their keys and
                values are identical no matter how many tokens follow. Compute them once,
                write them to GPU memory, and every later step just reads them back.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Queries are not cached
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                A query is used exactly once, when its own token attends over the cache.
                Only K and V are stored, which is why it is a KV cache and not a QKV cache.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                The bill is memory
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                The cache grows linearly with context length and with every sequence in the
                batch. At serving scale it, not the weights, is often what caps how many
                requests fit on a GPU.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Animation */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Watch the cache fill during decoding
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Each row is one layer of a toy transformer, each column one position, and each
            cell holds that position&apos;s keys and values for all heads. Prefill computes
            the whole prompt in one parallel pass, then decoding writes exactly one new
            column per generated token. Press Generate, or Step through it.
          </p>
          <CacheFillAnimation
            step={fillStep}
            playing={playing}
            onPlayPause={handlePlayPause}
            onStep={handleFillStep}
            onRestart={handleRestart}
          />
        </motion.section>

        {/* Calculator */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Size a real cache: the bytes calculator
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-5 max-w-[720px]">
            Now scale the same formula to production shapes. Every number below is computed
            live from the sliders. Try a preset, then push the sequence length up and watch
            the cache walk past whole GPUs. Then switch the attention variant: grouped-query
            attention (GQA) keeps all query heads but shares K/V across groups, shrinking
            only the cache.
          </p>
          <MemoryCalculator
            seqIdx={seqIdx}
            layers={layers}
            heads={heads}
            headDim={headDim}
            dtype={dtype}
            variant={variant}
            onSeqIdx={changeSeqIdx}
            onLayers={changeLayers}
            onHeads={changeHeads}
            onHeadDim={changeHeadDim}
            onDtype={changeDtype}
            onVariant={changeVariant}
            onPreset={applyPreset}
          />
        </motion.section>

        {/* FLOPs comparison */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            What the memory buys: attention FLOPs, with and without the cache
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Without a cache, every generated token re-runs attention for the entire
            sequence, so the per-step cost grows quadratically. With the cache, each step
            computes K/V for one token and reads the rest, so it grows linearly. The chart
            uses the layers, heads, and head dimension you set in the calculator above.
          </p>
          <FlopsCompare
            layers={layers}
            heads={heads}
            headDim={headDim}
            promptIdx={promptIdx}
            genIdx={genIdx}
            onPromptIdx={changePromptIdx}
            onGenIdx={changeGenIdx}
          />
        </motion.section>

        {/* Completion card */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              variants={card}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0f172a] overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-px bg-[var(--color-accent)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">
                    Guide Complete
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Cache Filled, Bill Understood
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You filled a cache token by token, sized it at production scale, and
                  measured the attention work it saves.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your cache ({layers} layers, {kvHeads} kv heads,{" "}
                      {formatSeq(SEQ_OPTIONS[seqIdx])} tokens, {dtype.toUpperCase()})
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {formatBytes(cacheNow)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      {variant === "mha"
                        ? "Same config under MQA (1 kv head)"
                        : `Saved vs MHA (${heads} kv heads)`}
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {variant === "mha"
                        ? formatBytes(cacheNow / heads)
                        : formatBytes(cacheMha - cacheNow)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Attention work saved ({formatSeq(PROMPT_OPTIONS[promptIdx])} prompt,{" "}
                      {formatSeq(GEN_OPTIONS[genIdx])} generated)
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {flopsSpeedup.toFixed(1)}x less
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;The KV cache trades memory for time: each token&apos;s keys and
                    values are computed once and read forever after, turning quadratic
                    recompute into a linear read. The price is 2 x layers x kv heads x head
                    dim x tokens x bytes per sequence, and at long contexts that memory,
                    not the weights, is what fills the GPU.&quot;
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
        {!isComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link
              href="/visual-guides"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← All Guides
            </Link>
            <Link
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Next Guide →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
