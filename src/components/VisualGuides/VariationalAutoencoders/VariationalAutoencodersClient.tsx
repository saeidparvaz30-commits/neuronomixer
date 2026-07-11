"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  BETAS,
  DEFAULT_BETA_INDEX,
  EPOCHS_PER_BETA,
  FRAME_TS,
  DATASET,
  SAMPLES_PER_CLASS,
  CLASS_NAMES,
  HIDDEN,
  LATENT,
  PIX,
  IMG_SIZE,
  betaSeed,
  createTrainer,
  runEpochs,
  evalMetrics,
  embedDataset,
  latentRange,
  decode,
  encoderParamCount,
  decoderParamCount,
  type TrainerState,
  type EvalMetrics,
  type EmbeddedPoint,
} from "./vaeMath";
import PixelImage from "./PixelImage";
import TrainPanel, { type TrainPhase } from "./TrainPanel";
import LatentLab from "./LatentLab";
import InterpolationLab from "./InterpolationLab";
import { CLASS_COLORS } from "./LatentCanvas";

const GUIDE_TITLE = "VAEs and Latent Space";
const GUIDE_SLUG = "variational-autoencoders";
const NEXT_GUIDE_SLUG = "gans";

/** Epochs advanced per setTimeout tick, keeps each tick well under 100ms. */
const CHUNK_EPOCHS = 8;
const TOTAL_EPOCHS = BETAS.length * EPOCHS_PER_BETA;

/** Dataset thumbnails shown in the visible-dataset strip (8 per class). */
const PREVIEW_INDICES: number[] = [];
for (let cls = 0; cls < CLASS_NAMES.length; cls++) {
  for (let j = 0; j < 8; j++) {
    PREVIEW_INDICES.push(cls * SAMPLES_PER_CLASS + j * 8);
  }
}

interface TrainedModel {
  params: TrainerState["params"];
  metrics: EvalMetrics;
  embed: EmbeddedPoint[];
  range: number;
}

const DEFAULT_A_IDX = 0; // a blob
const DEFAULT_B_IDX = 150; // a ring
const DEFAULT_T = 0.5;

export default function VariationalAutoencodersClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Training state ─────────────────────────────────────────────────────
  const [phase, setPhase] = useState<TrainPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [live, setLive] = useState<{
    beta: number;
    epoch: number;
    recon: number;
    kl: number;
  } | null>(null);
  const [reconHistories, setReconHistories] = useState<(number[] | null)[]>(
    () => BETAS.map(() => null)
  );
  const [klHistories, setKlHistories] = useState<(number[] | null)[]>(() =>
    BETAS.map(() => null)
  );
  const [models, setModels] = useState<(TrainedModel | null)[]>(() =>
    BETAS.map(() => null)
  );
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const trainersRef = useRef<TrainerState[] | null>(null);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef(0);

  // ── Exploration state ──────────────────────────────────────────────────
  const [betaIndex, setBetaIndex] = useState(DEFAULT_BETA_INDEX);
  const [betasVisited, setBetasVisited] = useState<Set<number>>(
    () => new Set()
  );
  const [probe, setProbe] = useState<[number, number] | null>(null);
  const [probedKeys, setProbedKeys] = useState<Set<string>>(() => new Set());
  const [aIdx, setAIdx] = useState(DEFAULT_A_IDX);
  const [bIdx, setBIdx] = useState(DEFAULT_B_IDX);
  const [tInterp, setTInterp] = useState(DEFAULT_T);
  const [visitedLowT, setVisitedLowT] = useState(false);
  const [visitedHighT, setVisitedHighT] = useState(false);

  // ── Gates ──────────────────────────────────────────────────────────────
  const gateTrain = phase === "done";
  const gateProbe = probedKeys.size >= 3;
  const gateInterp = visitedLowT && visitedHighT;
  const gateBeta = betasVisited.size >= 2;
  const isComplete = gateTrain && gateProbe && gateInterp && gateBeta;

  const model = models[betaIndex];

  // ── Training loop (chunked with setTimeout, deterministic seeds) ───────
  const handleTrain = useCallback(() => {
    if (phase === "training") return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    const trainers = BETAS.map((b, i) => createTrainer(b, betaSeed(i)));
    trainersRef.current = trainers;
    startRef.current = performance.now();
    setPhase("training");
    setProgress(0);
    setModels(BETAS.map(() => null));
    setReconHistories(BETAS.map(() => null));
    setKlHistories(BETAS.map(() => null));
    setDurationMs(null);
    setLive(null);

    let betaIdx = 0;
    const tick = () => {
      const tr = trainers[betaIdx];
      const remaining = EPOCHS_PER_BETA - tr.epoch;
      runEpochs(tr, DATASET, Math.min(CHUNK_EPOCHS, remaining));

      const last = tr.history[tr.history.length - 1];
      setLive({
        beta: tr.beta,
        epoch: tr.epoch,
        recon: last.recon,
        kl: last.kl,
      });
      setProgress(
        (betaIdx * EPOCHS_PER_BETA + tr.epoch) / TOTAL_EPOCHS
      );
      setReconHistories((prev) =>
        prev.map((h, i) => (i === betaIdx ? tr.history.map((e) => e.recon) : h))
      );
      setKlHistories((prev) =>
        prev.map((h, i) => (i === betaIdx ? tr.history.map((e) => e.kl) : h))
      );

      if (tr.epoch >= EPOCHS_PER_BETA) {
        const embed = embedDataset(tr.params);
        const finished: TrainedModel = {
          params: tr.params,
          metrics: evalMetrics(tr.params),
          embed,
          range: latentRange(embed),
        };
        setModels((prev) => prev.map((m, i) => (i === betaIdx ? finished : m)));
        betaIdx += 1;
        if (betaIdx >= BETAS.length) {
          setDurationMs(performance.now() - startRef.current);
          setPhase("done");
          // The beta on screen when training finishes counts as visited;
          // the gate still needs a real switch to a second value.
          setBetasVisited(new Set([betaIndex]));
          return;
        }
      }
      timerRef.current = window.setTimeout(tick, 0);
    };
    timerRef.current = window.setTimeout(tick, 0);
  }, [phase, betaIndex]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  // ── Interaction handlers ───────────────────────────────────────────────
  const handleBetaChange = useCallback(
    (i: number) => {
      setBetaIndex(i);
      if (phase === "done") {
        setBetasVisited((prev) => {
          if (prev.has(i)) return prev;
          const next = new Set(prev);
          next.add(i);
          return next;
        });
      }
    },
    [phase]
  );

  const handleProbe = useCallback(
    (z1: number, z2: number) => {
      if (phase !== "done") return;
      setProbe([z1, z2]);
      // Quantized to 0.1 so a real move is needed to count a new point.
      const key = `${z1.toFixed(1)},${z2.toFixed(1)}`;
      setProbedKeys((prev) => {
        if (prev.has(key)) return prev;
        const next = new Set(prev);
        next.add(key);
        return next;
      });
    },
    [phase]
  );

  const handleTChange = useCallback(
    (t: number) => {
      if (phase !== "done") return;
      setTInterp(t);
      if (t <= 0.08) setVisitedLowT(true);
      if (t >= 0.92) setVisitedHighT(true);
    },
    [phase]
  );

  const handleReset = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    trainersRef.current = null;
    setPhase("idle");
    setProgress(0);
    setLive(null);
    setModels(BETAS.map(() => null));
    setReconHistories(BETAS.map(() => null));
    setKlHistories(BETAS.map(() => null));
    setDurationMs(null);
    setBetaIndex(DEFAULT_BETA_INDEX);
    setBetasVisited(new Set());
    setProbe(null);
    setProbedKeys(new Set());
    setAIdx(DEFAULT_A_IDX);
    setBIdx(DEFAULT_B_IDX);
    setTInterp(DEFAULT_T);
    setVisitedLowT(false);
    setVisitedHighT(false);
  }, []);

  // ── Derived values (all real model inference) ──────────────────────────
  const decodedProbe = useMemo(() => {
    if (!model || !probe) return null;
    return decode(model.params, probe).y;
  }, [model, probe]);

  const muA = useMemo(
    () => (model ? model.embed[aIdx].mu : null),
    [model, aIdx]
  );
  const muB = useMemo(
    () => (model ? model.embed[bIdx].mu : null),
    [model, bIdx]
  );

  const interpFrames = useMemo(() => {
    if (!model || !muA || !muB) return null;
    return FRAME_TS.map(
      (t) =>
        decode(model.params, [
          muA[0] + (muB[0] - muA[0]) * t,
          muA[1] + (muB[1] - muA[1]) * t,
        ]).y
    );
  }, [model, muA, muB]);

  const interpCurrent = useMemo(() => {
    if (!model || !muA || !muB) return null;
    return decode(model.params, [
      muA[0] + (muB[0] - muA[0]) * tInterp,
      muA[1] + (muB[1] - muA[1]) * tInterp,
    ]).y;
  }, [model, muA, muB, tInterp]);

  const modelLow = models[0];
  const modelHigh = models[BETAS.length - 1];

  const progressItems = [
    { id: "train", label: `Train ${BETAS.length} VAEs`, done: gateTrain },
    {
      id: "probe",
      label: `Decode 3 latent points (${Math.min(probedKeys.size, 3)}/3)`,
      done: gateProbe,
    },
    { id: "interp", label: "Sweep the A to B interpolation", done: gateInterp },
    {
      id: "beta",
      label: `Compare 2 beta values (${Math.min(betasVisited.size, 2)}/2)`,
      done: gateBeta,
    },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug={GUIDE_SLUG}
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
            VAEs and{" "}
            <span className="text-[var(--color-accent)]">Latent Space</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Make the bottleneck probabilistic and the compressed space becomes
            a smooth, sampleable map. Train a real variational autoencoder in
            your browser, then click around its latent space, morph one image
            into another, and measure what the beta knob buys and costs.
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

        {/* Concept */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            From autoencoder to VAE: one probabilistic twist
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            A plain autoencoder squeezes each image through a narrow bottleneck
            and learns to reconstruct it. That gives you compression, but the
            space between encoded points is lawless: decode a spot no training
            image landed on and you get garbage. A variational autoencoder
            (Kingma and Welling, 2013, arXiv:1312.6114) fixes this by encoding
            every image as a distribution, not a point, and paying a penalty
            whenever those distributions stray from a standard normal prior.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Encoder emits mu and sigma
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                The encoder here maps each {IMG_SIZE}x{IMG_SIZE} image (
                {PIX} pixels) through {HIDDEN} tanh units to a mean and a
                log-variance for each of the {LATENT} latent dimensions:{" "}
                {encoderParamCount()} parameters that describe a little
                Gaussian per image, not a single point.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                The reparameterization trick
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                You cannot backpropagate through a random draw, so the VAE
                samples z = mu + sigma * eps with eps from N(0, I). The
                randomness moves into eps, and gradients flow cleanly through
                mu and sigma. This one trick is what makes VAE training work.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Decoder maps z back to pixels
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                The decoder ({decoderParamCount()} parameters) turns any
                2-D latent point into {PIX} pixel intensities. Because the KL
                penalty keeps the posteriors packed around the origin, points
                between and around the training images decode to sensible
                pictures too. That is what makes the space a map.
              </p>
            </div>
          </div>
          <pre className="rounded-xl bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[12px] p-4 overflow-x-auto">
            {`loss = BCE(x, decode(z)) + beta * KL( N(mu, sigma^2) || N(0, I) )
z    = mu + sigma * eps,   eps ~ N(0, I)        (reparameterization)`}
          </pre>
          <p className="text-[11px] text-[#475569] leading-relaxed mt-3">
            Minimizing this loss maximizes the evidence lower bound (ELBO).
            The beta weight on the KL term is the beta-VAE generalization
            (Higgins et al., 2017); beta = 1 recovers the original objective.
          </p>
        </motion.section>

        {/* Dataset */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The dataset: {DATASET.length} tiny images you can inspect
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Three soft shape families ({CLASS_NAMES.join(", ")}),{" "}
            {SAMPLES_PER_CLASS} images each, drawn at deterministic
            LCG-sampled positions on an {IMG_SIZE}x{IMG_SIZE} grid. Small on
            purpose: it keeps in-browser training honest and fast, and a 2-D
            latent space is enough to organize it. Showing{" "}
            {PREVIEW_INDICES.length} of {DATASET.length}.
          </p>
          <div className="flex flex-wrap gap-2">
            {PREVIEW_INDICES.map((idx) => (
              <div key={idx} className="text-center">
                <PixelImage
                  pixels={DATASET[idx].x}
                  ariaLabel={`Dataset image ${idx}: a ${CLASS_NAMES[DATASET[idx].cls]} centered near ${DATASET[idx].cx}, ${DATASET[idx].cy}`}
                  className="w-12 h-12 rounded-md border border-[#1e293b]"
                />
                <span
                  className="block text-[9px] mt-0.5 font-semibold"
                  style={{ color: CLASS_COLORS[DATASET[idx].cls] }}
                >
                  {CLASS_NAMES[DATASET[idx].cls]}
                </span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Train */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 1: train three real VAEs, one per beta
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Hit the button and watch both loss terms fight it out live:
            reconstruction wants every image pinned precisely, the KL term
            wants every posterior to look like the prior. Beta sets the
            exchange rate between them.
          </p>
          <TrainPanel
            phase={phase}
            progress={progress}
            live={live}
            reconHistories={reconHistories}
            klHistories={klHistories}
            durationMs={durationMs}
            onTrain={handleTrain}
          />
        </motion.section>

        {/* Latent lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 2: walk the latent space
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Every marker is one dataset image placed at its encoder mean.
            Click or drag anywhere, including the empty gaps, and the decoder
            renders that exact point. Then drop beta to {BETAS[0]} and watch
            the map sprawl beyond the prior, or raise it to{" "}
            {BETAS[BETAS.length - 1]} and watch the space collapse toward one
            average image. The metrics update from the selected model.
          </p>
          <LatentLab
            trained={phase === "done"}
            betaIndex={betaIndex}
            onBetaChange={handleBetaChange}
            metricsAll={models.map((m) => (m ? m.metrics : null))}
            points={model ? model.embed : null}
            range={model ? model.range : 3}
            probe={probe}
            onProbe={handleProbe}
            decodedProbe={decodedProbe}
            a={muA}
            b={muB}
            tInterp={phase === "done" ? tInterp : null}
          />
          <p className="text-[11px] text-[#475569] leading-relaxed mt-4 max-w-[720px]">
            Evaluation detail: the metric tiles and table use the
            deterministic posterior mean (z = mu) instead of a random sample,
            so the numbers are stable and reproducible. Sampling noise would
            jitter them slightly.
          </p>
        </motion.section>

        {/* Interpolation */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 3: interpolate between two encoded images
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Pick two dataset images. Both are encoded to their posterior
            means, drawn as A and B on the map above, and the slider walks the
            straight line between them, decoding every step through the real
            decoder. This is the classic VAE party trick, and it only works
            because the KL term made the space between them meaningful.
          </p>
          <InterpolationLab
            trained={phase === "done"}
            aIdx={aIdx}
            bIdx={bIdx}
            onSelectA={setAIdx}
            onSelectB={setBIdx}
            t={tInterp}
            onTChange={handleTChange}
            frames={interpFrames}
            current={interpCurrent}
            gateDone={gateInterp}
          />
        </motion.section>

        {/* Closing concept cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            {
              title: "Sampling new data",
              body: `Because training pulls every posterior toward N(0, I), decoding a fresh draw from the prior yields a new image that never existed in the dataset. Generation is just decoding random points, and it works exactly as well as the latent space is organized.`,
              color: "#3bb4a4",
            },
            {
              title: "Posterior collapse",
              body: `Push beta high enough and the cheapest solution is mu = 0, sigma = 1 everywhere: the KL term hits zero and the decoder ignores z, outputting one average image. You can watch this happen here at beta = ${BETAS[BETAS.length - 1]}, where KL nearly vanishes and clicking the map barely changes the output.`,
              color: "#a855f7",
            },
            {
              title: "The beta dial in practice",
              body: `beta-VAE (Higgins et al., 2017) raises beta above 1 to trade reconstruction sharpness for a more disentangled, better-organized latent space. Low beta buys crisp reconstructions but lets the space sprawl into holes the prior never samples.`,
              color: "var(--color-warning)",
            },
          ].map(({ title, body, color }) => (
            <div key={title} className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold mb-2" style={{ color }}>
                {title}
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>

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
                  Latent Cartographer
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You trained three real VAEs, decoded the map they learned,
                  morphed images through latent space, and measured the beta
                  tradeoff on your own models.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your training run
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {TOTAL_EPOCHS} epochs
                      {durationMs !== null
                        ? ` in ${(durationMs / 1000).toFixed(1)}s`
                        : ""}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Beta tradeoff you measured
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {modelLow && modelHigh
                        ? `BCE ${modelLow.metrics.bce.toFixed(1)} to ${modelHigh.metrics.bce.toFixed(
                            1
                          )}, KL ${modelLow.metrics.kl.toFixed(1)} to ${modelHigh.metrics.kl.toFixed(1)}`
                        : "?"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Latent points you decoded
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {probedKeys.size}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;A plain autoencoder memorizes points; a VAE is forced
                    to fill in the space between them. The KL term buys you a
                    smooth, sampleable map at the price of reconstruction
                    sharpness, and beta sets the exchange rate.&quot;
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
