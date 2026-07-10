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
import type { TrainState, EvalResult, Vec2 } from "./attentionMath";
import {
  PLAY_QUERY_INIT,
  PLAY_KEYS_INIT,
  PLAY_VALUES,
  PLAY_SHARPNESS_DEFAULT,
  playgroundCompute,
  initModel,
  initTraining,
  trainChunk,
  isTrained,
  evaluateModel,
  probeHeatmap,
  heatmapDiagonalMean,
  makeDemoEpisode,
  TRAIN_EPISODES,
} from "./attentionMath";
import SoftLookupLab from "./SoftLookupLab";
import TrainAttentionPanel, { TrainPhase } from "./TrainAttentionPanel";

const GUIDE_TITLE = "Attention as Soft Lookup";
const GUIDE_SLUG = "attention-mechanism";
const NEXT_GUIDE_SLUG = "autoencoders";

/** Training episodes advanced per setTimeout tick (keeps the UI responsive). */
const CHUNK = 150;

// Deterministic module-scope constants (fixed seeds, no Math.random or
// Date.now), so SSR and the first client render agree byte for byte.
const UNTRAINED_MODEL = initModel();
const EVAL_BEFORE: EvalResult = evaluateModel(UNTRAINED_MODEL);
const HEAT_BEFORE: number[][] = probeHeatmap(UNTRAINED_MODEL);
const DEMO_EPISODE = makeDemoEpisode();

type QuizOption = { id: string; text: string; correct: boolean };

const QUIZ_OPTIONS: readonly QuizOption[] = [
  {
    id: "argmax",
    text: "Because taking the argmax of the scores is differentiable",
    correct: false,
  },
  {
    id: "smooth",
    text: "Because softmax gives every slot a nonzero weight that changes smoothly with the query, so the output responds smoothly and gradients can flow back through the lookup",
    correct: true,
  },
  {
    id: "floats",
    text: "Because the stored values are floating-point numbers instead of strings",
    correct: false,
  },
  {
    id: "rl",
    text: "It cannot; attention layers have to be trained with reinforcement learning",
    correct: false,
  },
];

export default function AttentionMechanismClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Playground state ──────────────────────────────────────────────────────
  const [query, setQuery] = useState<Vec2>(PLAY_QUERY_INIT);
  const [keys, setKeys] = useState<Vec2[]>(() => [...PLAY_KEYS_INIT]);
  const [sharpness, setSharpness] = useState(PLAY_SHARPNESS_DEFAULT);
  const [gateQuery, setGateQuery] = useState(false);
  const [gateKey, setGateKey] = useState(false);
  // Window-level drag listeners fire faster than React re-renders; these refs
  // hold the latest vectors so same-value moves are detected synchronously
  // and never earn a gate.
  const queryRef = useRef<Vec2>(PLAY_QUERY_INIT);
  const keysRef = useRef<Vec2[]>([...PLAY_KEYS_INIT]);

  // ── Training state ────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<TrainPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [lossEma, setLossEma] = useState<number | null>(null);
  const [lossHistory, setLossHistory] = useState<
    Array<{ episode: number; loss: number }>
  >([]);
  const [heat, setHeat] = useState<number[][]>(HEAT_BEFORE);
  const [evalAfter, setEvalAfter] = useState<EvalResult | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [gateTrain, setGateTrain] = useState(false);
  const trainRef = useRef<TrainState | null>(null);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef(0);

  // ── Quiz state ────────────────────────────────────────────────────────────
  const [quizPick, setQuizPick] = useState<string | null>(null);
  const [quizSolved, setQuizSolved] = useState(false);

  const isComplete = gateQuery && gateKey && gateTrain && quizSolved;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const playResult = useMemo(
    () => playgroundCompute(query, keys, PLAY_VALUES, sharpness),
    [query, keys, sharpness]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleMoveQuery = useCallback((v: Vec2) => {
    const prev = queryRef.current;
    if (prev.x === v.x && prev.y === v.y) return;
    queryRef.current = v;
    setQuery(v);
    setGateQuery(true);
  }, []);

  const handleMoveKey = useCallback((index: number, v: Vec2) => {
    const k = keysRef.current[index];
    if (k.x === v.x && k.y === v.y) return;
    const next = [...keysRef.current];
    next[index] = v;
    keysRef.current = next;
    setKeys(next);
    setGateKey(true);
  }, []);

  const handleRun = useCallback(() => {
    if (phase === "training") return;
    setPhase("training");
    setProgress(0);
    setLossEma(null);
    setLossHistory([]);
    setEvalAfter(null);
    setDurationMs(null);
    setHeat(HEAT_BEFORE);
    trainRef.current = initTraining();
    startRef.current = performance.now();

    const tick = () => {
      const st = trainRef.current;
      if (!st) return;
      trainChunk(st, CHUNK);
      setProgress(st.done / st.total);
      setLossEma(st.lossEma);
      setLossHistory([...st.lossHistory]);
      setHeat(probeHeatmap(st.model));
      if (isTrained(st)) {
        setDurationMs(performance.now() - startRef.current);
        setEvalAfter(evaluateModel(st.model));
        setPhase("done");
        setGateTrain(true);
      } else {
        timerRef.current = window.setTimeout(tick, 0);
      }
    };
    timerRef.current = window.setTimeout(tick, 0);
  }, [phase]);

  const handleQuizPick = useCallback((option: QuizOption) => {
    setQuizPick(option.id);
    if (option.correct) setQuizSolved(true);
  }, []);

  function handleReset() {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    trainRef.current = null;
    queryRef.current = PLAY_QUERY_INIT;
    keysRef.current = [...PLAY_KEYS_INIT];
    setQuery(PLAY_QUERY_INIT);
    setKeys([...PLAY_KEYS_INIT]);
    setSharpness(PLAY_SHARPNESS_DEFAULT);
    setGateQuery(false);
    setGateKey(false);
    setPhase("idle");
    setProgress(0);
    setLossEma(null);
    setLossHistory([]);
    setHeat(HEAT_BEFORE);
    setEvalAfter(null);
    setDurationMs(null);
    setGateTrain(false);
    setQuizPick(null);
    setQuizSolved(false);
  }

  const progressItems = [
    { id: "query", label: "Steer the query", done: gateQuery },
    { id: "key", label: "Move a key", done: gateKey },
    { id: "train", label: "Train the lookup", done: gateTrain },
    { id: "quiz", label: "Answer the gradient question", done: quizSolved },
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
            Attention as{" "}
            <span className="text-[var(--color-accent)]">Soft Lookup</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Attention is a dictionary made differentiable: a query scores every
            key, softmax turns the scores into weights, and the weights blend
            the stored values. Drag the vectors to feel it, then train a real
            attention layer in your browser and watch the lookup sharpen.
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
            A dictionary you can differentiate
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            A normal dictionary lookup is all or nothing: the key matches or it
            does not, and nothing about that choice can be nudged by a
            gradient. Attention replaces the exact match with a similarity
            score and the single winner with a weighted blend. Same idea,
            soft edges:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <pre className="rounded-xl bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[12px] p-4 overflow-x-auto">
              {`# hard lookup
memory = {"A": 1.3, "B": -1.9}
memory["B"]       # exactly -1.9
memory["b"]       # KeyError
# all or nothing, no gradient`}
            </pre>
            <pre className="rounded-xl bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[12px] p-4 overflow-x-auto">
              {`# soft lookup (attention)
scores  = [q . k1, q . k2]
weights = softmax(scores)
output  = w1*v1 + w2*v2
# every value chips in, smoothly`}
            </pre>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Query
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                What you are looking for, as a vector. In the playground below
                it is the gold arrow you drag around.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Keys
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                What each stored slot advertises about itself. The dot product
                q&middot;k measures how well a key matches the query: aligned
                directions score high, opposite directions score negative.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Values
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                What each slot actually contains. Values never enter the
                scoring; they are only blended by the softmax weights at the
                end.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            In the{" "}
            <Link
              href="/visual-guides/rnns-lstms"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              RNNs &amp; LSTMs guide
            </Link>{" "}
            a sequence had to squeeze through one hidden state, step by step,
            and old information faded on the way. Attention takes the opposite
            bet: keep every position around and let the model look back
            directly at whichever one it needs.
          </p>
        </motion.section>

        {/* Step 1: playground */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 1: drive the lookup by hand
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Four keys store the values 10, 20, 30 and 40. Drag the gold query
            toward a key and watch its dot-product score rise, its softmax
            weight take over, and the output slide toward that stored value.
            Then drag a key itself: the same lookup changes because the memory
            changed. Every number on the right is computed live from the
            vectors you set.
          </p>
          <SoftLookupLab
            query={query}
            keys={keys}
            sharpness={sharpness}
            result={playResult}
            onMoveQuery={handleMoveQuery}
            onMoveKey={handleMoveKey}
            onSharpness={setSharpness}
          />
        </motion.section>

        {/* Step 2: train */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 2: let gradients learn the lookup
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            You just aimed the query by hand. The point of attention is that a
            network can learn to aim it. Below, a tiny attention layer plays a
            recall game {TRAIN_EPISODES.toLocaleString()} times with plain SGD
            from fixed seeds: real forward passes, real gradients through the
            softmax, right here in your browser. Watch the heatmap start as a
            uniform smear at chance and sharpen onto the matching slots.
          </p>
          <TrainAttentionPanel
            phase={phase}
            progress={progress}
            lossEma={lossEma}
            lossHistory={lossHistory}
            heat={heat}
            diagMean={heatmapDiagonalMean(heat)}
            evalBefore={EVAL_BEFORE}
            evalAfter={evalAfter}
            durationMs={durationMs}
            demo={DEMO_EPISODE}
            onRun={handleRun}
          />
        </motion.section>

        {/* Step 3: quiz */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 3: why does this train at all?
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            A Python dict solves the recall game perfectly, yet no gradient
            descent could ever have produced it. What makes the attention
            version trainable?
          </p>
          <div
            role="radiogroup"
            aria-label="Gradient question options"
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3"
          >
            {QUIZ_OPTIONS.map((opt) => {
              const picked = quizPick === opt.id;
              const showState = picked || (quizSolved && opt.correct);
              return (
                <button
                  key={opt.id}
                  role="radio"
                  aria-checked={picked}
                  onClick={() => handleQuizPick(opt)}
                  disabled={quizSolved}
                  className={`rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                    showState
                      ? opt.correct
                        ? "border-[var(--color-success)]"
                        : "border-[#ef4444]"
                      : "border-[#1e293b] hover:border-[#334155]"
                  } ${quizSolved && !opt.correct ? "opacity-50" : ""}`}
                >
                  <p className="text-[12px] text-[#f1f5f9] leading-relaxed">
                    {opt.text}
                  </p>
                  {showState && (
                    <p
                      className={`text-[10px] font-semibold mt-1 ${
                        opt.correct
                          ? "text-[var(--color-success)]"
                          : "text-[#ef4444]"
                      }`}
                    >
                      {opt.correct ? "Correct" : "Not quite"}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
          {quizPick !== null && !quizSolved && (
            <p className="text-[11px] text-[var(--color-warning)] leading-relaxed">
              Think about what you felt in the playground: as the query moved,
              did the output jump or glide? What property lets a small change
              in weights produce a small, informative change in the loss?
            </p>
          )}
          {quizSolved && (
            <p className="text-[11px] text-[var(--color-success)] leading-relaxed">
              Right. The softmax never fully commits: every slot keeps a
              nonzero weight, so the output is a smooth function of the query
              and key embeddings, and the squared recall error sends useful
              gradients back through the blend. That is exactly what the
              sharpness slider hinted at: push scores toward argmax and the
              lookup gets harder but the gradient signal dies away.
            </p>
          )}
        </motion.section>

        {/* Scope: where this goes next */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#334155] bg-[#162032] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Where this goes next
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed max-w-[720px]">
            This guide stopped, on purpose, at one query attending over one
            stored sequence: the bare mechanism. The famous variants are the
            same three moves arranged differently. When every position in a
            sequence issues its own query and attends over all the others,
            that is self-attention; run several lookups in parallel and you
            have multi-head attention; stack those layers and you are building
            transformers and language models. All of that lives in the LLMs
            category, starting with the{" "}
            <Link
              href="/visual-guides/self-attention"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              Self-Attention guide
            </Link>
            .
          </p>
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
                  Lookup Learned
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You drove a soft lookup by hand, then watched gradient
                  descent learn to aim it better than you did.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your playground blend
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      output {playResult.output.toFixed(2)}, top weight{" "}
                      {(100 * playResult.weights[playResult.argmax]).toFixed(1)}
                      %
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your training run
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {evalAfter
                        ? `MSE ${EVAL_BEFORE.mse.toFixed(2)} to ${evalAfter.mse.toFixed(5)}`
                        : "not run"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Learned lookup
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {evalAfter
                        ? `argmax recall ${(100 * evalAfter.argmaxAccuracy).toFixed(1)}%`
                        : "not run"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Attention is a dictionary made differentiable: the
                    query scores every key, softmax turns scores into weights,
                    and the output blends the values. Because the blend changes
                    smoothly, gradient descent can learn the lookup itself.&quot;
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
