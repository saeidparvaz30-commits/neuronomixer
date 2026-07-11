"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  AEParams,
  AEState,
  DEFAULT_PRESET_INDEX,
  DEFAULT_WIDTH,
  NUM_PIXELS,
  PRESETS,
  TRAIN_STEPS,
  TRAIN_SET_SIZE,
  cloneParams,
  initParams,
  initState,
  isTrained,
  makeTrainingSet,
  maxError,
  mse,
  pixelErrors,
  reconstruct,
  trainChunk,
} from "./autoencoderMath";
import PixelCanvas from "./PixelCanvas";
import TrainPanel, { RunInfo, TrainPhase } from "./TrainPanel";
import ReconstructionPanel from "./ReconstructionPanel";

const GUIDE_TITLE = "Autoencoders";
const GUIDE_SLUG = "autoencoders";
const NEXT_GUIDE_SLUG = "variational-autoencoders";

/** Training steps per setTimeout tick; keeps each tick well under 100ms. */
const CHUNK_STEPS = 50;

interface CachedRun {
  params: AEParams;
  lossHistory: number[];
  ms: number;
}

export default function AutoencodersClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // Input image state (ref mirror so pointer-drag painting never reads stale state).
  const [pixels, setPixels] = useState<number[]>(() => [
    ...PRESETS[DEFAULT_PRESET_INDEX].pixels,
  ]);
  const pixelsRef = useRef<number[]>(pixels);
  const [mode, setMode] = useState<"draw" | "erase">("draw");
  const [activePreset, setActivePreset] = useState<number | null>(DEFAULT_PRESET_INDEX);

  // Training state.
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [phase, setPhase] = useState<TrainPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [runInfo, setRunInfo] = useState<RunInfo | null>(null);
  const [activeParams, setActiveParams] = useState<AEParams>(() =>
    initParams(DEFAULT_WIDTH)
  );

  // Completion gates.
  const [trainedWidths, setTrainedWidths] = useState<Set<number>>(new Set());
  const [inputChanged, setInputChanged] = useState(false);

  const cacheRef = useRef<Map<number, CachedRun>>(new Map());
  const stateRef = useRef<AEState | null>(null);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const trainingSet = useMemo(() => makeTrainingSet(), []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  // ── Training runner (chunked with setTimeout so the UI stays live) ────────

  const runTraining = useCallback(
    (w: number) => {
      const st = initState(w);
      stateRef.current = st;
      startRef.current = performance.now();
      setPhase("training");
      setProgress(0);
      setLossHistory([]);
      setRunInfo(null);

      const tick = () => {
        const s = stateRef.current;
        if (!s) return;
        trainChunk(s, trainingSet, CHUNK_STEPS);
        setProgress(s.step / TRAIN_STEPS);
        setLossHistory([...s.lossHistory]);
        setActiveParams(cloneParams(s.params)); // reconstruction sharpens live
        if (isTrained(s)) {
          const ms = performance.now() - startRef.current;
          const finalLoss = s.lossHistory[s.lossHistory.length - 1];
          cacheRef.current.set(w, {
            params: cloneParams(s.params),
            lossHistory: [...s.lossHistory],
            ms,
          });
          setRunInfo({ width: w, ms, finalLoss });
          setPhase("trained");
          // Gate: a width counts as explored only when its run COMPLETES.
          setTrainedWidths((prev) => (prev.has(w) ? prev : new Set([...prev, w])));
        } else {
          timerRef.current = window.setTimeout(tick, 0);
        }
      };
      timerRef.current = window.setTimeout(tick, 0);
    },
    [trainingSet]
  );

  const handleTrain = useCallback(() => {
    if (phase === "training") return;
    runTraining(width);
  }, [phase, runTraining, width]);

  const handleWidthChange = useCallback(
    (w: number) => {
      if (phase === "training" || w === width) return;
      setWidth(w);
      const cached = cacheRef.current.get(w);
      if (cached) {
        // Pretrained-in-session weights: real, deterministic, reused instantly.
        setActiveParams(cached.params);
        setLossHistory(cached.lossHistory);
        setRunInfo({
          width: w,
          ms: cached.ms,
          finalLoss: cached.lossHistory[cached.lossHistory.length - 1],
        });
        setPhase("trained");
      } else if (trainedWidths.size > 0) {
        runTraining(w);
      } else {
        setActiveParams(initParams(w));
      }
    },
    [phase, width, trainedWidths.size, runTraining]
  );

  // ── Input editing (gate earns only on a REAL pixel change) ────────────────

  const handlePaint = useCallback(
    (idx: number) => {
      const target = mode === "draw" ? 1 : 0;
      if (pixelsRef.current[idx] === target) return;
      const next = [...pixelsRef.current];
      next[idx] = target;
      pixelsRef.current = next;
      setPixels(next);
      setActivePreset(null);
      setInputChanged(true);
    },
    [mode]
  );

  const handlePreset = useCallback((presetIndex: number) => {
    const preset = PRESETS[presetIndex];
    const same = pixelsRef.current.every((v, i) => v === preset.pixels[i]);
    setActivePreset(presetIndex);
    if (same) return; // same-value change earns nothing
    pixelsRef.current = [...preset.pixels];
    setPixels(pixelsRef.current);
    setInputChanged(true);
  }, []);

  const handleClear = useCallback(() => {
    const any = pixelsRef.current.some((v) => v !== 0);
    if (!any) return;
    pixelsRef.current = new Array<number>(NUM_PIXELS).fill(0);
    setPixels(pixelsRef.current);
    setActivePreset(null);
    setInputChanged(true);
  }, []);

  // ── Live reconstruction, all computed from the math module ────────────────

  const recon = useMemo(() => reconstruct(activeParams, pixels), [activeParams, pixels]);
  const mseValue = useMemo(() => mse(pixels, recon.xhat), [pixels, recon]);
  const errors = useMemo(() => pixelErrors(pixels, recon.xhat), [pixels, recon]);
  const maxErr = useMemo(() => maxError(errors), [errors]);

  const trainedOnce = trainedWidths.size > 0;
  // "idle" means the active weights are the deterministic starting weights;
  // during a run they are real mid-training weights and the warning is hidden.
  const activeIsTrained = phase !== "idle";
  const isComplete = trainedWidths.size >= 2 && inputChanged;

  const handleReset = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    stateRef.current = null;
    cacheRef.current.clear();
    pixelsRef.current = [...PRESETS[DEFAULT_PRESET_INDEX].pixels];
    setPixels(pixelsRef.current);
    setMode("draw");
    setActivePreset(DEFAULT_PRESET_INDEX);
    setWidth(DEFAULT_WIDTH);
    setPhase("idle");
    setProgress(0);
    setLossHistory([]);
    setRunInfo(null);
    setActiveParams(initParams(DEFAULT_WIDTH));
    setTrainedWidths(new Set());
    setInputChanged(false);
  }, []);

  const progressItems = [
    { id: "train", label: "Train the autoencoder", done: trainedOnce },
    {
      id: "widths",
      label: `Compare bottleneck widths (${Math.min(trainedWidths.size, 2)}/2)`,
      done: trainedWidths.size >= 2,
    },
    { id: "input", label: "Change the input image", done: inputChanged },
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
            Autoencoders{" "}
            <span className="text-[var(--color-accent)]">Learn What Matters</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.08 }}
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[620px]"
          >
            Force data through a bottleneck and the network must learn what matters. Draw
            an 8x8 image, train a real autoencoder in your browser, and watch the
            reconstruction sharpen as you widen the bottleneck from 1 latent number to 16.
          </motion.p>
        </section>

        {/* Progress tracker */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {progressItems.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors duration-300"
                style={{ background: item.done ? "var(--color-accent)" : "#1e293b" }}
              />
              <span
                className={`text-[11px] transition-colors ${item.done ? "text-white" : "text-[#475569]"}`}
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
          {/* Concept intro */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
          >
            <p className="text-[13px] font-semibold text-white mb-2">
              Compression as a learning signal
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed max-w-[760px]">
              An autoencoder is two networks glued together. The encoder squeezes the
              input into a small latent code, and the decoder tries to rebuild the
              original from that code alone. Nothing else gets through: if the bottleneck
              holds 4 numbers, the entire 64-pixel image must survive as 4 numbers. The
              network is never told what a digit is. It discovers strokes, loops, and
              symmetries on its own, because keeping them is the only way to score a low
              reconstruction error.
            </p>
            <div className="mt-4 rounded-xl bg-[#1e293b]/60 p-3 font-mono text-[12px] text-[#93c5fd] overflow-x-auto">
              x (64 pixels) &rarr; encoder &rarr; z ({width}{" "}
              {width === 1 ? "number" : "numbers"}) &rarr; decoder &rarr; x&#770; (64
              pixels), loss = MSE(x, x&#770;)
            </div>
          </motion.section>

          {/* Lab */}
          <motion.section
            variants={card}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
              <p className="text-[13px] font-semibold text-white mb-1">1. Pick an input</p>
              <p className="text-[11px] text-[#475569] mb-4">
                Draw on the canvas or load a preset digit. Presets and their 1-pixel
                shifts are also the training set ({TRAIN_SET_SIZE} images).
              </p>
              <PixelCanvas
                pixels={pixels}
                mode={mode}
                onModeChange={setMode}
                onPaint={handlePaint}
                onPreset={handlePreset}
                activePreset={activePreset}
                onClear={handleClear}
              />
            </div>

            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
              <p className="text-[13px] font-semibold text-white mb-1">
                2. Train and squeeze
              </p>
              <p className="text-[11px] text-[#475569] mb-4">
                Train at the current bottleneck width, then drag the slider: each new
                width trains a fresh network so you can compare capacities honestly.
              </p>
              <TrainPanel
                width={width}
                onWidthChange={handleWidthChange}
                phase={phase}
                progress={progress}
                onTrain={handleTrain}
                lossHistory={lossHistory}
                runInfo={runInfo}
                trainedWidths={trainedWidths}
              />
            </div>
          </motion.section>

          {/* Reconstruction */}
          <motion.section
            variants={card}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
          >
            <p className="text-[13px] font-semibold text-white mb-1">
              3. Input vs reconstruction
            </p>
            <p className="text-[11px] text-[#475569] mb-4">
              The reconstruction and every number below are recomputed live from the
              canvas and the active weights.
            </p>
            <ReconstructionPanel
              pixels={pixels}
              xhat={recon.xhat}
              z={recon.z}
              mseValue={mseValue}
              errors={errors}
              maxErr={maxErr}
              trained={activeIsTrained}
              width={activeParams.width}
            />
          </motion.section>

          {/* Off-manifold note + honest simplifications */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-2">
                Try drawing something that is not a digit
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Scribble a face or a diagonal line and watch the reconstruction drift
                toward digit-like strokes. The bottleneck only has room for the patterns
                the training data rewarded, so the network projects everything onto its
                learned manifold. That failure is informative: an autoencoder&apos;s
                reconstruction error is a classic anomaly detector, because things it has
                never seen reconstruct badly.
              </p>
            </div>
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[12px] font-semibold text-[var(--color-warning)] mb-2">
                Simplifications in this demo
              </p>
              <ul className="text-[12px] text-[#94a3b8] leading-relaxed list-disc pl-4 space-y-1">
                <li>
                  One hidden layer per side (64 &rarr; k &rarr; 64); real autoencoders
                  stack many layers, often convolutional.
                </li>
                <li>
                  The training set is tiny: {TRAIN_SET_SIZE} images built from 10 glyphs
                  and their 1-pixel shifts, so the network partly memorizes.
                </li>
                <li>
                  Full-batch gradient descent with momentum, with weights started from
                  small Glorot-scaled random values (Glorot and Bengio, 2010), seeded
                  deterministically per width.
                </li>
              </ul>
            </div>
          </motion.section>

          {/* Concept cards */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {[
              {
                title: "Undercomplete by design",
                body: "The bottleneck is narrower than the input on purpose. With fewer latent dimensions than pixels, copying is impossible, so the network must compress. Capacity buys fidelity: you watched MSE fall as the slider widened.",
                color: "#3bb4a4",
              },
              {
                title: "The latent space",
                body: "Those few numbers are coordinates in a learned space where similar inputs land close together. Downstream models can classify, cluster, or search in this space far more cheaply than in pixel space.",
                color: "var(--color-accent)",
              },
              {
                title: "The on-ramp to generative AI",
                body: "A plain autoencoder only compresses points it was given. Make the latent code a probability distribution instead of a point and you can sample new latent codes, and decode images that never existed. That is the variational autoencoder, the next guide.",
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
          </motion.div>
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
                  Bottleneck Mastered!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You trained a real autoencoder, squeezed images through bottlenecks of
                  different widths, and read the error heatmap like a practitioner.
                </p>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: "Widths trained",
                      value: `${trainedWidths.size} / 16`,
                      color: "#3bb4a4",
                    },
                    {
                      label: "Current MSE",
                      value: mseValue.toFixed(4),
                      color: "var(--color-accent)",
                    },
                    {
                      label: "Next stop",
                      value: "VAEs",
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
                    &quot;Compression forces understanding. When a network must squeeze 64
                    pixels through a handful of numbers, the only way to rebuild the input
                    is to learn what actually matters.&quot;
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
                    href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
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
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
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
