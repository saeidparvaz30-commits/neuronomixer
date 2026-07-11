"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import type { TrainState } from "./residualMath";
import {
  DEFAULT_DEPTH,
  initTrainState,
  isTrainDone,
  predictCurve,
  trainChunk,
} from "./residualMath";
import BlockDiagram from "./BlockDiagram";
import GradientFlowLab from "./GradientFlowLab";
import TrainingRace, { RacePhase, RaceResult } from "./TrainingRace";

const GUIDE_TITLE = "Residual Connections";
const GUIDE_SLUG = "residual-connections";
const NEXT_GUIDE_SLUG = "rnns-lstms";

/** Gradient steps per UI chunk (both networks advance together). */
const CHUNK_STEPS = 50;

export default function ResidualConnectionsClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // Gradient-flow lab state
  const [depth, setDepth] = useState(DEFAULT_DEPTH);
  const [residual, setResidual] = useState(false);
  const [depthChanged, setDepthChanged] = useState(false);
  const [wiringsViewed, setWiringsViewed] = useState<Set<string>>(
    new Set(["off"])
  );

  // Training race state
  const [phase, setPhase] = useState<RacePhase>("idle");
  const [progress, setProgress] = useState(0);
  const [live, setLive] = useState<{
    step: number;
    plainLoss: number;
    resLoss: number;
  } | null>(null);
  const [result, setResult] = useState<RaceResult | null>(null);
  const trainRef = useRef<TrainState | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);

  const isComplete = depthChanged && wiringsViewed.size >= 2 && result !== null;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleDepthChange = useCallback((v: number) => {
    setDepth((prev) => {
      if (v !== prev) setDepthChanged(true);
      return v;
    });
  }, []);

  const handleWiringChange = useCallback((r: boolean) => {
    setResidual(r);
    setWiringsViewed((prev) => {
      const next = new Set(prev);
      next.add(r ? "on" : "off");
      return next;
    });
  }, []);

  const handleRun = useCallback(() => {
    if (phase === "training") return;
    setResult(null);
    setPhase("training");
    setProgress(0);
    setLive(null);
    trainRef.current = initTrainState();
    startedAtRef.current = performance.now();

    const tick = () => {
      const st = trainRef.current;
      if (!st) return;
      trainChunk(st, CHUNK_STEPS);
      setProgress(st.step / st.total);
      setLive({ step: st.step, plainLoss: st.plainLoss, resLoss: st.resLoss });
      if (isTrainDone(st)) {
        setResult({
          plainCurve: st.plainCurve,
          resCurve: st.resCurve,
          plainLoss: st.plainLoss,
          resLoss: st.resLoss,
          fitPlain: predictCurve(st.plain, 97),
          fitRes: predictCurve(st.res, 97),
          durationMs: performance.now() - startedAtRef.current,
        });
        setPhase("done");
      } else {
        timerRef.current = window.setTimeout(tick, 0);
      }
    };
    timerRef.current = window.setTimeout(tick, 0);
  }, [phase]);

  const handleReset = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    trainRef.current = null;
    setDepth(DEFAULT_DEPTH);
    setResidual(false);
    setDepthChanged(false);
    setWiringsViewed(new Set(["off"]));
    setPhase("idle");
    setProgress(0);
    setLive(null);
    setResult(null);
  }, []);

  const progressItems = [
    { id: "depth", label: "Explore depth", done: depthChanged },
    {
      id: "wiring",
      label: `Compare both wirings (${wiringsViewed.size}/2)`,
      done: wiringsViewed.size >= 2,
    },
    { id: "race", label: "Train both networks", done: result !== null },
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
              Deep Learning
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            Residual <span className="text-[var(--color-accent)]">Connections</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Skip connections let each layer learn a small correction instead of a
            whole new representation, and give gradients an identity highway back
            to layer one. Measure real backward passes at any depth, then train
            two networks that differ only in their wiring.
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
        </div>

        <div className="space-y-6">
          {/* Concept: the problem and the fix */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
          >
            <p className="text-[13px] font-semibold text-white mb-2">
              The problem: depth multiplies, and multiplying kills
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed max-w-[760px] mb-3">
              Backpropagation sends the loss signal through every layer in reverse,
              multiplying by each layer&apos;s local derivative on the way. When most
              of those factors sit below one, the product shrinks geometrically and
              the layers near the input stop learning. The{" "}
              <Link
                href="/visual-guides/vanishing-exploding-gradients"
                className="underline underline-offset-2 text-[#94a3b8] hover:text-white"
              >
                vanishing and exploding gradients guide
              </Link>{" "}
              walks through that multiplication in detail. There are two classic
              answers: pick the multiplier carefully (
              <Link
                href="/visual-guides/weight-initialization"
                className="underline underline-offset-2 text-[#94a3b8] hover:text-white"
              >
                weight initialization
              </Link>
              ), or change the architecture so the signal never has to survive the
              full product. Residual connections are the architectural answer.
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed max-w-[760px] mb-4">
              A residual block computes h + f(h) instead of f(h): the input flows
              through unchanged on an identity path, and the block only adds a
              correction. In the backward pass that identity path contributes a
              clean, unattenuated copy of the gradient, whatever the block&apos;s own
              derivative looks like. Introduced by He, Zhang, Ren and Sun in{" "}
              <em>Deep Residual Learning for Image Recognition</em> (2015,
              arXiv:1512.03385), this idea took image networks from around 20
              trainable layers to over 150 and won the ILSVRC 2015 classification
              challenge.
            </p>
            <BlockDiagram />
          </motion.section>

          {/* Lab 1: gradient flow */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
          >
            <GradientFlowLab
              depth={depth}
              residual={residual}
              onDepthChange={handleDepthChange}
              onWiringChange={handleWiringChange}
            />
          </motion.div>

          {/* Lab 2: training race */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
          >
            <TrainingRace
              phase={phase}
              progress={progress}
              live={live}
              result={result}
              onRun={handleRun}
            />
          </motion.div>

          {/* Concept cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                title: "Learn the residual, not the map",
                body: "If the ideal transformation is close to identity, learning f(h) = 0 is far easier than learning f(h) = h from scratch. Skips give every block that easier target: start from what you have, add a nudge.",
                color: "var(--color-success)",
              },
              {
                title: "Gradient highways",
                body: "d(h + f(h))/dh = I + df/dh. The identity term guarantees the backward signal reaches every layer intact, no matter how small the block derivative is. Depth stops being a multiplicative death sentence.",
                color: "var(--color-accent)",
              },
              {
                title: "Everywhere in modern nets",
                body: "Every transformer block wraps both its attention and its feed-forward sublayers in residual connections, usually paired with normalization. Without skips, hundred-layer language models would not train.",
                color: "#a855f7",
              },
            ].map(({ title, body, color }) => (
              <div key={title} className="rounded-xl border border-[#1e293b] p-4">
                <p className="text-[11px] font-semibold mb-2" style={{ color }}>
                  {title}
                </p>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
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
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Skips Understood!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You measured gradient flow at depth, compared both wirings, and
                  watched the training gap open up live.
                </p>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: "Depths explored",
                      value: "2 to 30 blocks",
                      color: "var(--color-accent)",
                    },
                    {
                      label: "Wirings compared",
                      value: "plain vs residual",
                      color: "var(--color-success)",
                    },
                    {
                      label: "Networks trained",
                      value: result
                        ? `${(result.plainLoss / result.resLoss).toFixed(0)}x loss gap`
                        : "2",
                      color: "#a855f7",
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-[#1e293b] p-3">
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
                    &quot;A skip connection changes every layer&apos;s job from
                    building a new representation to nudging the one it was given.
                    The identity path guarantees the gradient reaches layer one, so
                    depth stops being the enemy of training.&quot;
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

        {/* Footer nav */}
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
