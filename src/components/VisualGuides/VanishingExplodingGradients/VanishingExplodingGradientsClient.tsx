"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  Activation,
  FixMethod,
  GradientStatus,
  INPUT_X,
  TARGET_Y,
  MIN_SCALE,
  MAX_SCALE,
  runNetwork,
  formatMagnitude,
} from "./types";
import ControlsPanel from "./ControlsPanel";
import GradientBarChart from "./GradientBarChart";
import DerivativePanel from "./DerivativePanel";
import FixesPanel from "./FixesPanel";

const GUIDE_TITLE = "Vanishing & Exploding Gradients";

const DEFAULTS = {
  depth: 4,
  activation: "sigmoid" as Activation,
  weightScale: 1.0,
};

const STATUS_META: Record<
  GradientStatus,
  { label: string; color: string; detail: string }
> = {
  vanishing: {
    label: "Vanishing",
    color: "var(--color-warning)",
    detail: "below the 1e-6 floor at layer 1",
  },
  healthy: {
    label: "Healthy",
    color: "var(--color-success)",
    detail: "between 1e-6 and 1e3 at layer 1",
  },
  exploding: {
    label: "Exploding",
    color: "var(--color-warning)",
    detail: "above the 1e3 ceiling at layer 1",
  },
};

type ChangeSource = "depth" | "activation" | "scale";

export default function VanishingExplodingGradientsClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  const [depth, setDepth] = useState(DEFAULTS.depth);
  const [activation, setActivation] = useState<Activation>(DEFAULTS.activation);
  const [weightScale, setWeightScale] = useState(DEFAULTS.weightScale);

  const [seenVanishing, setSeenVanishing] = useState(false);
  const [seenExploding, setSeenExploding] = useState(false);
  const [fixedWith, setFixedWith] = useState<FixMethod | null>(null);

  const result = useMemo(
    () => runNetwork(depth, activation, weightScale),
    [depth, activation, weightScale]
  );

  const isComplete = seenVanishing && seenExploding && fixedWith !== null;

  function applyChange(
    nextDepth: number,
    nextActivation: Activation,
    nextScale: number,
    source: ChangeSource
  ) {
    setDepth(nextDepth);
    setActivation(nextActivation);
    setWeightScale(nextScale);

    const next = runNetwork(nextDepth, nextActivation, nextScale);
    if (next.status === "vanishing") setSeenVanishing(true);
    if (next.status === "exploding") setSeenExploding(true);
    if (
      next.status === "healthy" &&
      (seenVanishing || seenExploding) &&
      fixedWith === null
    ) {
      if (source === "activation" && nextActivation === "relu") {
        setFixedWith("ReLU");
      } else if (source === "scale") {
        setFixedWith("Weight scale");
      }
    }
  }

  function handleReset() {
    setDepth(DEFAULTS.depth);
    setActivation(DEFAULTS.activation);
    setWeightScale(DEFAULTS.weightScale);
    setSeenVanishing(false);
    setSeenExploding(false);
    setFixedWith(null);
  }

  const statusMeta = STATUS_META[result.status];

  const productPreview = Math.pow(result.meanBackwardFactor, depth - 1);

  const progressItems = [
    { id: "vanish", label: "Produce a vanishing config", done: seenVanishing },
    { id: "explode", label: "Produce an exploding config", done: seenExploding },
    {
      id: "fix",
      label: fixedWith ? `Fixed with ${fixedWith}` : "Fix it (ReLU or weight scale)",
      done: fixedWith !== null,
    },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="vanishing-exploding-gradients"
        score={4}
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
              Deep Learning
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Vanishing &amp; Exploding{" "}
            <span className="text-[var(--color-accent)]">Gradients</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            The chain rule turns the gradient at layer 1 into a product of one
            factor per layer. Keep each factor near 1, or watch the training
            signal die or blow up exponentially with depth.
          </p>
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
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Section 1: The mechanism */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-8"
        >
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
            <p className="text-[13px] font-semibold text-white mb-2">
              The mechanism: one multiplication per layer
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[760px]">
              Backpropagation starts at the loss (the output layer) and applies
              the chain rule backwards, layer by layer. Every step multiplies the
              error signal by one more factor, a weight times an activation
              derivative. By the time it reaches layer 1 on the input side, the
              gradient is a product of one factor per layer. Products of numbers
              below 1 shrink exponentially; products of numbers above 1 grow
              exponentially. If the chain rule feels rusty, walk through the{" "}
              <Link
                href="/visual-guides/backpropagation"
                className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
              >
                backpropagation guide
              </Link>{" "}
              first.
            </p>
            <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[12px] rounded-lg p-3.5 overflow-x-auto mb-4">
{`dL/dw_1 = delta_L * [ w_L * f'(z_(L-1)) ] * ... * [ w_2 * f'(z_1) ] * x

delta_L = (a_L - y) * f'(z_L)     <- error signal at the loss end
each bracket = one layer's backward multiplier`}
            </pre>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Error signal |delta_L|",
                  value: formatMagnitude(result.deltaLMag),
                },
                {
                  label: "Mean backward multiplier",
                  value: formatMagnitude(result.meanBackwardFactor),
                },
                {
                  label: `Multiplier^(L-1), L = ${depth}`,
                  value: formatMagnitude(productPreview),
                },
                {
                  label: "|dL/dw_1| (layer 1)",
                  value: formatMagnitude(result.layer1Mag),
                },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-[#1e293b] p-3">
                  <p className="text-[10px] text-[#475569] mb-1">{m.label}</p>
                  <p className="text-[14px] font-mono font-bold text-white">
                    {m.value}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#475569] leading-relaxed mt-3">
              All four numbers are computed live from the network below: change
              the controls and watch the geometric mean of the multipliers,
              raised to the number of backward steps, drag the layer 1 gradient
              up or down with it.
            </p>
          </div>
        </motion.section>

        {/* Section 2: Gradient lab (centerpiece) */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-8"
        >
          <div className="mb-4">
            <p className="text-[13px] font-semibold text-white mb-1">
              Gradient lab: a real MLP, one unit per layer
            </p>
            <p className="text-[12px] text-[#475569] leading-relaxed max-w-[760px]">
              This is not a canned animation. Every bar comes from a real
              forward pass on the fixed input x = {INPUT_X}, then a real
              backward pass from the squared loss against the target y ={" "}
              {TARGET_Y}. Weights are seeded deterministically in [0.8, 1.2]
              times your chosen scale, so the same settings always reproduce the
              same bars.
            </p>
          </div>

          <div className="mb-5">
            <ControlsPanel
              depth={depth}
              activation={activation}
              weightScale={weightScale}
              onDepthChange={(d) => applyChange(d, activation, weightScale, "depth")}
              onActivationChange={(a) => applyChange(depth, a, weightScale, "activation")}
              onScaleChange={(s) => applyChange(depth, activation, s, "scale")}
            />
          </div>

          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
            {/* Status badge */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="text-[13px] font-semibold text-white">
                Per-layer gradient magnitude |dL/dw| (log scale)
              </p>
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold border"
                style={{
                  color: statusMeta.color,
                  borderColor: statusMeta.color,
                  background: "transparent",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: statusMeta.color }}
                />
                {statusMeta.label}: |dL/dw_1| = {formatMagnitude(result.layer1Mag)},{" "}
                {statusMeta.detail}
              </span>
            </div>

            <GradientBarChart
              gradientMags={result.gradientMags}
              status={result.status}
            />

            {/* Text equivalent readouts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="rounded-xl border border-[#1e293b] p-3">
                <p className="text-[10px] text-[#475569] mb-1">
                  Gradient at layer 1 (input side)
                </p>
                <p
                  className="text-[15px] font-mono font-bold"
                  style={{ color: statusMeta.color }}
                >
                  {formatMagnitude(result.layer1Mag)}
                </p>
              </div>
              <div className="rounded-xl border border-[#1e293b] p-3">
                <p className="text-[10px] text-[#475569] mb-1">
                  Gradient at layer {depth} (output side, next to the loss)
                </p>
                <p className="text-[15px] font-mono font-bold text-white">
                  {formatMagnitude(result.layerLMag)}
                </p>
              </div>
              <div className="rounded-xl border border-[#1e293b] p-3">
                <p className="text-[10px] text-[#475569] mb-1">
                  Network output a_L (loss = {formatMagnitude(result.loss)})
                </p>
                <p className="text-[15px] font-mono font-bold text-white">
                  {formatMagnitude(result.output)}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-[#475569] leading-relaxed mt-3">
              Notice the direction: the gradient is largest near the output,
              where backprop starts at the loss, and it shrinks (or grows) as
              the product accumulates backwards toward layer 1 on the input
              side. Recipes to try: sigmoid at depth 30 vanishes, ReLU at 3.0x
              weight scale explodes, and ReLU near 1.0x is healthy at any depth
              here.
            </p>
          </div>
        </motion.section>

        {/* Section 3: Why sigmoid vanishes */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-8"
        >
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
            <p className="text-[13px] font-semibold text-white mb-2">
              Why sigmoid vanishes: the derivative never reaches 1
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[760px]">
              Sigmoid&apos;s derivative peaks at 0.25 and decays toward 0 in both
              tails. Even in the best case, every sigmoid layer multiplies the
              backward signal by at most 0.25, so ten layers cost you at least a
              factor of 0.25^10. Large weights make it worse, not better: they
              push pre-activations into the saturated tails where the derivative
              is nearly 0. Tanh peaks at 1 but still shrinks everywhere except
              exactly at z = 0, while ReLU holds a derivative of exactly 1 across
              its entire active region. Compare the shapes in the{" "}
              <Link
                href="/visual-guides/activation-functions"
                className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
              >
                activation functions guide
              </Link>
              .
            </p>
            <DerivativePanel activation={activation} />
            <p className="text-[11px] text-[#475569] leading-relaxed mt-3">
              The same product problem appears across time steps in recurrent
              networks, where the sequence length plays the role of depth: see
              the{" "}
              <Link
                href="/visual-guides/rnns-lstms"
                className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
              >
                RNNs and LSTMs guide
              </Link>
              .
            </p>
          </div>
        </motion.section>

        {/* Section 4: The fixes */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-8"
        >
          <div className="mb-4">
            <p className="text-[13px] font-semibold text-white mb-1">
              The fixes: keep every factor near 1
            </p>
            <p className="text-[12px] text-[#475569] leading-relaxed max-w-[760px]">
              Every practical remedy attacks the same root cause. Two of them
              are wired straight into the lab above: apply either one while the
              network is vanishing or exploding and watch the status badge turn
              healthy. Weight scale range here: {MIN_SCALE.toFixed(1)}x to{" "}
              {MAX_SCALE.toFixed(1)}x.
            </p>
          </div>
          <FixesPanel
            activation={activation}
            weightScale={weightScale}
            onApplyRelu={() => applyChange(depth, "relu", weightScale, "activation")}
            onApplyUnitScale={() => applyChange(depth, activation, 1.0, "scale")}
          />
        </motion.section>

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
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Gradient Flow Tamed!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You broke a deep network both ways and then repaired it, which
                  is exactly the debugging loop practitioners run on real
                  training curves.
                </p>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: "Vanishing produced",
                      value: seenVanishing ? "Yes" : "No",
                      color: "var(--color-warning)",
                    },
                    {
                      label: "Exploding produced",
                      value: seenExploding ? "Yes" : "No",
                      color: "var(--color-warning)",
                    },
                    {
                      label: "Repaired with",
                      value: fixedWith ?? "",
                      color: "var(--color-success)",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-[#1e293b] p-3"
                    >
                      <p className="text-[10px] text-[#475569] mb-1">{item.label}</p>
                      <p
                        className="text-[14px] font-mono font-bold"
                        style={{ color: item.color }}
                      >
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
                    &quot;Backprop multiplies one factor per layer, so gradients
                    scale exponentially with depth: keep each factor near 1 with
                    the right activation and initialization, and give gradients
                    an identity highway when depth demands it.&quot;
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link
                  href="/visual-guides"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                >
                  &larr; All Guides
                </Link>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                  >
                    Try Again
                  </button>
                  <Link
                    href="/visual-guides/batch-normalization"
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
                  >
                    Next Guide &rarr;
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
              &larr; All Guides
            </Link>
            <Link
              href="/visual-guides/batch-normalization"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Next Guide &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
