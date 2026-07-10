"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  BATCH_SIZE,
  CORPUS,
  DECODE_STEPS,
  DEFAULT_SETTINGS,
  ExperimentPoint,
  ORDER,
  SEED,
  SampleResult,
  SamplerSettings,
  TREE_MAX_LEVELS,
  TruncMethod,
  applyTemperature,
  beamDecode,
  beamSearchTree,
  buildModel,
  displayText,
  getDistribution,
  greedyDecode,
  makeRng,
  modelStats,
  runBatch,
  sampleContinuation,
  truncate,
} from "./decodingMath";
import GreedyPath from "./GreedyPath";
import BeamTree from "./BeamTree";
import SamplingLab from "./SamplingLab";

const GUIDE_TITLE = "Greedy, Beam, and Sampling";
const NEXT_GUIDE_SLUG = "kv-cache";

const DEFAULT_BEAM_WIDTH = 3;
const DEFAULT_TREE_LEVELS = 3;

// All deterministic: computed once from the visible corpus.
const MODEL = buildModel(CORPUS);
const STATS = modelStats(CORPUS, MODEL);
const GREEDY = greedyDecode(MODEL, SEED, DECODE_STEPS);
const GREEDY_CUM = GREEDY[GREEDY.length - 1].cumLogProb;
const SEED_DIST = getDistribution(MODEL, SEED).dist;

export default function DecodingStrategiesClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Interaction state (mount defaults; Try Again restores exactly these) ──
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [beamWidth, setBeamWidth] = useState(DEFAULT_BEAM_WIDTH);
  const [treeLevels, setTreeLevels] = useState(DEFAULT_TREE_LEVELS);
  const [settings, setSettings] = useState<SamplerSettings>({ ...DEFAULT_SETTINGS });
  const [oneSample, setOneSample] = useState<SampleResult | null>(null);
  const [sampleCount, setSampleCount] = useState(0);
  const [experiments, setExperiments] = useState<ExperimentPoint[]>([]);

  // ── Gates ──────────────────────────────────────────────────────────────────
  const [gateInspect, setGateInspect] = useState(false);
  const [gateBeam, setGateBeam] = useState(false);
  const [gateTune, setGateTune] = useState(false);
  const distinctRuns = useMemo(
    () => new Set(experiments.map((e) => e.settingsKey)).size,
    [experiments]
  );
  const gateExperiment = distinctRuns >= 2;
  const isComplete = gateInspect && gateBeam && gateTune && gateExperiment;

  // ── Derived (all recomputed from the model) ────────────────────────────────
  const treeLevelsData = useMemo(
    () => beamSearchTree(MODEL, SEED, treeLevels, beamWidth),
    [treeLevels, beamWidth]
  );
  const beamFinal = useMemo(
    () => beamDecode(MODEL, SEED, DECODE_STEPS, beamWidth),
    [beamWidth]
  );
  const beamBest = beamFinal[0];
  const previewRows = useMemo(
    () => truncate(applyTemperature(SEED_DIST, settings.temperature), settings),
    [settings]
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSelectStep = useCallback((i: number) => {
    setSelectedStep(i);
    setGateInspect(true);
  }, []);

  const handleBeamWidth = useCallback(
    (w: number) => {
      if (w === beamWidth) return;
      setBeamWidth(w);
      setGateBeam(true);
    },
    [beamWidth]
  );

  const handleTemperature = useCallback(
    (t: number) => {
      if (t === settings.temperature) return;
      setSettings({ ...settings, temperature: t });
      setGateTune(true);
    },
    [settings]
  );

  const handleMethod = useCallback(
    (m: TruncMethod) => {
      if (m === settings.method) return;
      setSettings({ ...settings, method: m });
      setGateTune(true);
    },
    [settings]
  );

  const handleParam = useCallback(
    (v: number) => {
      if (settings.method === "topk") {
        if (v === settings.topK) return;
        setSettings({ ...settings, topK: v });
      } else if (settings.method === "topp") {
        if (v === settings.topP) return;
        setSettings({ ...settings, topP: v });
      } else {
        if (v === settings.minP) return;
        setSettings({ ...settings, minP: v });
      }
      setGateTune(true);
    },
    [settings]
  );

  const handleSampleOne = useCallback(() => {
    const rng = makeRng(987654321 + sampleCount * 7919);
    setOneSample(sampleContinuation(MODEL, SEED, DECODE_STEPS, settings, rng));
    setSampleCount(sampleCount + 1);
  }, [sampleCount, settings]);

  const handleRunBatch = useCallback(() => {
    const point = runBatch(
      MODEL,
      SEED,
      DECODE_STEPS,
      settings,
      BATCH_SIZE,
      1664525 * (experiments.length + 1) + 1013904223,
      experiments.length + 1
    );
    setExperiments([...experiments, point]);
  }, [settings, experiments]);

  function handleReset() {
    setSelectedStep(null);
    setBeamWidth(DEFAULT_BEAM_WIDTH);
    setTreeLevels(DEFAULT_TREE_LEVELS);
    setSettings({ ...DEFAULT_SETTINGS });
    setOneSample(null);
    setSampleCount(0);
    setExperiments([]);
    setGateInspect(false);
    setGateBeam(false);
    setGateTune(false);
  }

  const progressItems = [
    { id: "inspect", label: "Inspect a greedy step", done: gateInspect },
    { id: "beam", label: "Change the beam width", done: gateBeam },
    { id: "tune", label: "Tune a sampling control", done: gateTune },
    {
      id: "batch",
      label: `Run ${BATCH_SIZE} samples at two settings`,
      done: gateExperiment,
    },
  ];

  const bestDiversity =
    experiments.length > 0
      ? experiments.reduce((a, b) => (b.diversity > a.diversity ? b : a))
      : null;
  const bestLikelihood =
    experiments.length > 0
      ? experiments.reduce((a, b) => (b.meanLogProb > a.meanLogProb ? b : a))
      : null;

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="decoding-strategies"
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
            Greedy, Beam, and{" "}
            <span className="text-[var(--color-accent)]">Sampling</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            A language model only outputs a probability distribution over the
            next token. The text you read depends on how you pick from it.
            Here a real character n-gram model trains on a visible corpus in
            your browser, and you decode it three different ways.
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

        {/* The model */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The model: character n-gram counts over a visible corpus
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Every number in this guide comes from one tiny model trained right
            here: for each {ORDER}-character context in the corpus below, it
            counts which character comes next and turns the counts into
            probabilities. If a context was never seen it backs off to
            shorter contexts. It is character-level, so its most likely text
            is not always made of real words, which is part of the fun.
            Decoding always starts from the seed{" "}
            <span className="font-mono text-white">
              &quot;{displayText(SEED)}&quot;
            </span>
            .
          </p>
          <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-xl p-4 whitespace-pre-wrap mb-4">
            {CORPUS}
          </pre>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] mb-1">Corpus length</p>
              <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                {STATS.corpusLength} chars
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] mb-1">Vocabulary</p>
              <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                {STATS.vocabSize} distinct chars
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] mb-1">
                Distinct {ORDER}-char contexts
              </p>
              <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                {STATS.contextCount}
              </p>
            </div>
          </div>
        </motion.section>

        {/* Greedy */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Greedy: always take the argmax
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Greedy decoding picks the single most likely character at every
            step. It is deterministic: run it a thousand times and you get
            this exact text, {DECODE_STEPS} characters at a cumulative
            log-prob of {GREEDY_CUM.toFixed(2)} nats. Watch how it settles
            into the corpus&apos;s most repeated phrasing. Click any character
            to see the distribution it was chosen from, including everything
            greedy threw away.
          </p>
          <GreedyPath
            steps={GREEDY}
            selected={selectedStep}
            onSelect={handleSelectStep}
          />
        </motion.section>

        {/* Beam */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Beam search: keep the best few prefixes, not just one
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Beam search expands the top {beamWidth} prefixes with their 3 most
            likely next characters each step, ranks all candidates by
            cumulative log-prob, and keeps only the best {beamWidth}. Gold
            nodes survive the cut, gray nodes are pruned. Change the width,
            expand the tree level by level, and compare the full-length
            numbers below: a wider beam can hold on to a path that starts
            weaker but ends more likely than the one greedy locks onto.
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2" role="group" aria-label="Beam width">
              <span className="text-[12px] text-[#94a3b8]">Beam width:</span>
              {[2, 3, 4].map((w) => (
                <button
                  key={w}
                  onClick={() => handleBeamWidth(w)}
                  aria-pressed={beamWidth === w}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors ${
                    beamWidth === w
                      ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[#d4af37]/10"
                      : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155]"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setTreeLevels((l) => Math.min(l + 1, TREE_MAX_LEVELS))
                }
                disabled={treeLevels >= TREE_MAX_LEVELS}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors disabled:opacity-40 disabled:hover:border-[#1e293b] disabled:hover:text-white"
              >
                Expand one step
              </button>
              <button
                onClick={() => setTreeLevels((l) => Math.max(l - 1, 1))}
                disabled={treeLevels <= 1}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors disabled:opacity-40 disabled:hover:border-[#1e293b] disabled:hover:text-white"
              >
                Collapse one step
              </button>
              <span className="text-[11px] text-[#475569]">
                {treeLevels} of {TREE_MAX_LEVELS} steps shown
              </span>
            </div>
          </div>
          <BeamTree levels={treeLevelsData} width={beamWidth} />
          <div className="mt-4 rounded-xl border border-[#1e293b] bg-[#162032] p-4">
            <p className="text-[11px] text-[#475569] mb-2">
              Decoded to the full {DECODE_STEPS} characters:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-[#475569] mb-0.5">
                  Greedy cumulative log-prob
                </p>
                <p className="font-mono text-[15px] font-bold text-[#94a3b8]">
                  {GREEDY_CUM.toFixed(2)} nats
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#475569] mb-0.5">
                  Best beam (width {beamWidth}) cumulative log-prob
                </p>
                <p className="font-mono text-[15px] font-bold text-[var(--color-accent)]">
                  {beamBest.cumLogProb.toFixed(2)} nats
                </p>
              </div>
            </div>
            <p className="text-[11px] text-[#94a3b8] mt-2 font-mono break-all">
              best beam text: {displayText(beamBest.text)}
            </p>
          </div>
        </motion.section>

        {/* Sampling */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Sampling: draw from the distribution instead of maximizing it
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Temperature reshapes the distribution, then top-k, top-p, or
            min-p decides which characters stay in the candidate pool before
            the draw. Every batch below really samples {BATCH_SIZE}{" "}
            continuations of {DECODE_STEPS} characters with a deterministic
            rng, then scores each one under the base model. Diversity is the
            fraction of unique continuations; likelihood is the mean per-char
            log-prob.
          </p>
          <SamplingLab
            settings={settings}
            onTemperature={handleTemperature}
            onMethod={handleMethod}
            onParam={handleParam}
            previewRows={previewRows}
            baseDist={SEED_DIST}
            oneSample={oneSample}
            onSampleOne={handleSampleOne}
            experiments={experiments}
            onRunBatch={handleRunBatch}
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
                  Three Decoders, One Distribution
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You decoded the same n-gram model with greedy, beam search,
                  and truncated sampling, and measured the tradeoff yourself.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Greedy vs best beam (width {beamWidth}),{" "}
                      {DECODE_STEPS} chars
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {GREEDY_CUM.toFixed(2)} vs {beamBest.cumLogProb.toFixed(2)}{" "}
                      nats
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Most diverse run ({bestDiversity?.settingsLabel})
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {bestDiversity
                        ? `${bestDiversity.uniqueCount} unique / ${BATCH_SIZE}`
                        : ""}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Most likely run ({bestLikelihood?.settingsLabel})
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {bestLikelihood
                        ? `${bestLikelihood.meanLogProb.toFixed(3)} nats / char`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;The model never writes text, it only scores the next
                    token. Greedy maximizes each step and loops, beam maximizes
                    the whole sequence and stays bland, sampling trades
                    likelihood for diversity. Temperature and truncation are
                    the dials on that trade, which is why the same model can
                    sound dull or fresh without changing a single weight.&quot;
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
