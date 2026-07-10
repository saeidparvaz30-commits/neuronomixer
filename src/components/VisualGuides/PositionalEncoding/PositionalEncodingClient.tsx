"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  HEATMAP_DEFAULTS,
  HeatmapParams,
  baseFromExp,
  Q_VEC,
  K_VEC,
  ROPE_MAX_POS,
  ropeThetas,
  ropeScore,
} from "./peMath";
import PEHeatmap from "./PEHeatmap";
import RopeLab, { ShiftRecord } from "./RopeLab";

const GUIDE_TITLE = "How Models Know Word Order";
const NEXT_GUIDE_SLUG = "self-attention";

const THETAS = ropeThetas();

const DEFAULT_M = 4;
const DEFAULT_N = 1;

export default function PositionalEncodingClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Interaction state (mount defaults; Try Again restores exactly these) ──
  const [heatmapParams, setHeatmapParams] =
    useState<HeatmapParams>(HEATMAP_DEFAULTS);
  const [inspectPos, setInspectPos] = useState(0);
  const [m, setM] = useState(DEFAULT_M);
  const [n, setN] = useState(DEFAULT_N);
  const [lastShift, setLastShift] = useState<ShiftRecord | null>(null);

  // ── Gates: each flips ONLY inside its user-event handler ──────────────────
  const [reshapedHeatmap, setReshapedHeatmap] = useState(false);
  const [movedPositions, setMovedPositions] = useState(false);
  const [shiftedBoth, setShiftedBoth] = useState(false);

  const isComplete = reshapedHeatmap && movedPositions && shiftedBoth;

  const score = useMemo(() => ropeScore(Q_VEC, K_VEC, m, n, THETAS), [m, n]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleNPos = useCallback((v: number) => {
    setHeatmapParams((p) => ({ ...p, nPos: v }));
    setInspectPos((ip) => Math.min(ip, v - 1));
    setReshapedHeatmap(true);
  }, []);

  const handleDModel = useCallback((v: number) => {
    setHeatmapParams((p) => ({ ...p, dModel: v }));
    setReshapedHeatmap(true);
  }, []);

  const handleBaseExp = useCallback((v: number) => {
    setHeatmapParams((p) => ({ ...p, baseExp: v }));
    setReshapedHeatmap(true);
  }, []);

  const handleM = useCallback((v: number) => {
    setM(v);
    setMovedPositions(true);
  }, []);

  const handleN = useCallback((v: number) => {
    setN(v);
    setMovedPositions(true);
  }, []);

  const handleShift = useCallback(
    (delta: number) => {
      const toM = m + delta;
      const toN = n + delta;
      if (toM < 0 || toN < 0 || toM > ROPE_MAX_POS || toN > ROPE_MAX_POS)
        return;
      const before = ropeScore(Q_VEC, K_VEC, m, n, THETAS);
      const after = ropeScore(Q_VEC, K_VEC, toM, toN, THETAS);
      setM(toM);
      setN(toN);
      setLastShift({ fromM: m, fromN: n, toM, toN, before, after });
      setShiftedBoth(true);
    },
    [m, n]
  );

  function handleReset() {
    setHeatmapParams(HEATMAP_DEFAULTS);
    setInspectPos(0);
    setM(DEFAULT_M);
    setN(DEFAULT_N);
    setLastShift(null);
    setReshapedHeatmap(false);
    setMovedPositions(false);
    setShiftedBoth(false);
  }

  const progressItems = [
    { id: "heatmap", label: "Reshape the sinusoidal heatmap", done: reshapedHeatmap },
    { id: "rope", label: "Move a RoPE position slider", done: movedPositions },
    { id: "shift", label: "Shift both positions together", done: shiftedBoth },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="positional-encoding"
        score={100}
      />
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
            How Models Know{" "}
            <span className="text-[var(--color-accent)]">Word Order</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Attention treats its input as a bag of tokens: position has to be
            injected. Here you compute the classic sinusoidal encoding live from
            its formula, then rotate real query and key vectors with RoPE and
            watch the attention score depend only on how far apart two tokens
            sit.
          </motion.p>
        </section>

        {/* Progress */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {progressItems.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{
                  background: item.done ? "var(--color-accent)" : "#1e293b",
                }}
              />
              <span
                className={`text-[11px] ${item.done ? "text-white" : "text-[#475569]"}`}
              >
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Why attention is order-blind */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Attention is order-blind by construction
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Self-attention compares every token with every other token through
            dot products, and a set of dot products has no idea which token came
            first. Feed it these two sentences with plain word embeddings and it
            sees the exact same multiset of vectors:
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {[
              ["dog", "bites", "man"],
              ["man", "bites", "dog"],
            ].map((words, si) => (
              <div
                key={si}
                className="flex items-center gap-2 rounded-xl border border-[#1e293b] bg-[#162032] px-4 py-3"
              >
                {words.map((w, wi) => (
                  <span
                    key={wi}
                    className="px-2.5 py-1 rounded-lg bg-[#1e293b] text-[12px] font-mono text-[#f1f5f9]"
                  >
                    {w}
                  </span>
                ))}
                <span className="text-[11px] text-[#475569] ml-1">
                  {si === 0 ? "sentence A" : "sentence B"}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed max-w-[720px]">
            Same three embeddings, radically different meaning. Every
            transformer therefore injects position into the computation. Two
            families dominate: add a positional vector to each embedding
            (sinusoidal, learned), or rotate the query and key vectors by a
            position-dependent angle (RoPE, used by Llama, Qwen, and most
            current open models). You will build both below.
          </p>
        </motion.section>

        {/* Sinusoidal heatmap lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Lab 1: the sinusoidal encoding, computed from the formula
          </p>
          <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto mb-4">
{`PE(pos, 2i)   = sin( pos / base^(2i / d_model) )
PE(pos, 2i+1) = cos( pos / base^(2i / d_model) )    base = 10000 in the paper`}
          </pre>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Every cell below is that formula evaluated live for the sliders you
            set: nothing is precomputed. Left columns cycle fast (wavelength of
            a few positions), right columns cycle slowly, so each row becomes a
            unique fingerprint the model can add to its token embedding. Shrink
            the base and watch the slow columns speed up; grow d and watch new
            slow columns appear on the right.
          </p>
          <PEHeatmap
            params={heatmapParams}
            inspectPos={inspectPos}
            onNPosChange={handleNPos}
            onDModelChange={handleDModel}
            onBaseExpChange={handleBaseExp}
            onInspectPosChange={setInspectPos}
          />
        </motion.section>

        {/* RoPE lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Lab 2: RoPE, position as rotation
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Adding a position vector changes what a token IS. Rotary embeddings
            instead change how tokens MEET: split the query and key vectors into
            2D pairs, rotate each pair of q by m times its frequency and each
            pair of k by n times the same frequency, then take the ordinary dot
            product. The rotations cancel except for their difference, so the
            score depends only on the offset m minus n. This toy head has 4
            dimensions (two pairs); every number is computed from the vectors and
            angles on screen.
          </p>
          <RopeLab
            m={m}
            n={n}
            onMChange={handleM}
            onNChange={handleN}
            onShift={handleShift}
            lastShift={lastShift}
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
                  Order, Injected
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You computed a positional fingerprint from the sinusoidal
                  formula and proved RoPE&apos;s relative-offset property with
                  your own slider moves.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your heatmap
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {heatmapParams.nPos} x {heatmapParams.dModel}, base{" "}
                      {baseFromExp(heatmapParams.baseExp).toLocaleString("en-US")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your RoPE score at m = {m}, n = {n} (offset {m - n})
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {score.toFixed(4)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Score change when you shifted both positions
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {lastShift
                        ? Math.abs(lastShift.after - lastShift.before) < 1e-12
                          ? "0 (machine precision)"
                          : Math.abs(
                              lastShift.after - lastShift.before
                            ).toExponential(2)
                        : "n/a"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Attention has no built-in sense of order, so position
                    must be injected. Sinusoidal encodings add a unique
                    multi-frequency fingerprint to each token; RoPE rotates
                    queries and keys so the attention score depends only on the
                    distance between two tokens, never on where the pair sits in
                    the sequence.&quot;
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
