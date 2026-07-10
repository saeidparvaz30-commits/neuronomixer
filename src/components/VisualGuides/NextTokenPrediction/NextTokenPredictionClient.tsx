"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  CORPUS,
  ALPHABET,
  MODELS,
  getDistribution,
  samplePick,
  lcgNext,
  lcgUnit,
  normalizeInput,
  displayContext,
  displayChar,
  INITIAL_SEED,
  INITIAL_PREFIX,
  MAX_GENERATED,
  GATE_MIN_CHARS,
  AUTOPLAY_MS,
} from "./ngramMath";
import DistributionBars, { LastPick } from "./DistributionBars";

const GUIDE_TITLE = "The Next-Token Machine";
const NEXT_GUIDE_SLUG = "tokenization";

const ORDER_OPTIONS = [
  { order: 1, label: "Bigram", detail: "1 character of context" },
  { order: 2, label: "Trigram", detail: "2 characters of context" },
] as const;

export default function NextTokenPredictionClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Interaction state (mount defaults; Try Again restores exactly these) ──
  const [order, setOrder] = useState<number>(1);
  const [visitedOrders, setVisitedOrders] = useState<Set<number>>(
    () => new Set([1])
  );
  const [prefix, setPrefix] = useState(INITIAL_PREFIX);
  const [prefixEdited, setPrefixEdited] = useState(false);
  const [generated, setGenerated] = useState("");
  const [charsGenerated, setCharsGenerated] = useState(0);
  const [seed, setSeed] = useState(INITIAL_SEED);
  const [lastPick, setLastPick] = useState<LastPick | null>(null);
  const [playing, setPlaying] = useState(false);

  // ── Derived model state (every number recomputed from the corpus) ─────────
  const sequence = prefix + generated;
  const dist = useMemo(() => getDistribution(sequence, order), [sequence, order]);
  const atCap = generated.length >= MAX_GENERATED;

  // ── Gates ──────────────────────────────────────────────────────────────────
  const gatePrefix = prefixEdited;
  const gateGenerate = charsGenerated >= GATE_MIN_CHARS;
  const gateOrders = visitedOrders.has(1) && visitedOrders.has(2);
  const isComplete = gatePrefix && gateGenerate && gateOrders;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handlePrefixChange = useCallback(
    (raw: string) => {
      const norm = normalizeInput(raw).slice(0, 40);
      if (norm === prefix) return;
      setPrefix(norm);
      setPrefixEdited(true);
      setGenerated("");
      setLastPick(null);
      setPlaying(false);
    },
    [prefix]
  );

  const handleOrderChange = useCallback((k: number) => {
    setOrder(k);
    setVisitedOrders((prev) => {
      const next = new Set(prev);
      next.add(k);
      return next;
    });
    setLastPick(null);
  }, []);

  const sampleOnce = useCallback(() => {
    if (atCap || dist.entries.length === 0) return;
    const nextSeed = lcgNext(seed);
    const u = lcgUnit(nextSeed);
    const pick = samplePick(dist, u);
    const entry = dist.entries[pick.index];
    setSeed(nextSeed);
    setGenerated((g) => g + entry.char);
    setCharsGenerated((c) => c + 1);
    setLastPick({
      char: entry.char,
      prob: entry.prob,
      mode: "sampled",
      u,
      lo: pick.lo,
      hi: pick.hi,
    });
  }, [atCap, dist, seed]);

  const handlePickChar = useCallback(
    (index: number) => {
      if (atCap) return;
      const entry = dist.entries[index];
      if (!entry) return;
      setGenerated((g) => g + entry.char);
      setCharsGenerated((c) => c + 1);
      setLastPick({
        char: entry.char,
        prob: entry.prob,
        mode: "chosen",
        u: null,
        lo: null,
        hi: null,
      });
      setPlaying(false);
    },
    [atCap, dist]
  );

  const handleRestartGeneration = useCallback(() => {
    setGenerated("");
    setLastPick(null);
    setPlaying(false);
  }, []);

  // Autoplay: one sampling step per tick while playing. Runs only after a
  // user click set playing to true, so it never fires on mount.
  useEffect(() => {
    if (!playing) return;
    if (atCap) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(sampleOnce, AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [playing, atCap, sampleOnce]);

  function handleReset() {
    setOrder(1);
    setVisitedOrders(new Set([1]));
    setPrefix(INITIAL_PREFIX);
    setPrefixEdited(false);
    setGenerated("");
    setCharsGenerated(0);
    setSeed(INITIAL_SEED);
    setLastPick(null);
    setPlaying(false);
  }

  const progressItems = [
    { id: "prefix", label: "Type your own prefix", done: gatePrefix },
    {
      id: "generate",
      label: `Generate ${GATE_MIN_CHARS}+ characters`,
      done: gateGenerate,
    },
    { id: "orders", label: "Compare bigram and trigram", done: gateOrders },
  ];

  const contextLen = dist.contextUsed.length;
  const seqHead = sequence.slice(0, sequence.length - contextLen);
  const topEntry = dist.entries[0];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="next-token-prediction"
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
            The Next-Token{" "}
            <span className="text-[var(--color-accent)]">Machine</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Everything a language model does is output a probability
            distribution over the next token. Here you train a real
            character-level model in your browser on a corpus you can read,
            watch the actual distribution it produces, and generate text by
            sampling from it, one draw at a time.
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

        {/* The one job */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            One job: P(next token | everything so far)
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Strip away the chat interface and the billions of parameters, and a
            language model is a function with one output: given the text so
            far, a probability for every entry in its vocabulary as the next
            token. It never emits a sentence. Sentences appear because that
            function is called in a loop: predict, sample one token, append it,
            predict again.
          </p>
          <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto mb-4">
{`model(context)  ->  [p(token_1), p(token_2), ..., p(token_V)]   sums to 1

generate(prompt):
  loop:
    dist = model(text)          the whole model is inside this call
    next = sample(dist)         one uniform draw picks a token
    text = text + next`}
          </pre>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                A distribution, not an answer
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                The model output is the full bar chart, one probability per
                vocabulary entry. Which bar becomes text is a separate,
                surprisingly small decision made by the sampler, not by the
                model.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Generation is repeated sampling
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Each new token is one draw from the current distribution, and
                the draw changes the context, which changes the next
                distribution. That feedback loop is all that text generation
                is.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Characters here, tokens in real LLMs
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Real LLMs predict subword tokens from vocabularies of 50k to
                200k entries using a neural network. This guide uses a
                count-based character model so every probability on screen is
                checkable by hand. The loop is identical.
              </p>
            </div>
          </div>
        </motion.section>

        {/* The corpus + training */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The entire training corpus, in plain sight
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Training this model means counting: slide a window over the text
            below and tally which character follows each context. Nothing is
            hidden, so you can verify any bar in the machine by counting
            occurrences here yourself.
          </p>
          <div className="rounded-xl border border-[#1e293b] bg-[#162032] p-4 mb-4">
            <p className="font-mono text-[12px] leading-relaxed text-[#93c5fd] whitespace-pre-wrap">
              {CORPUS}
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Corpus length
              </p>
              <p className="text-2xl font-black font-mono text-[#f1f5f9]">
                {CORPUS.length}
              </p>
              <p className="text-[10px] text-[#475569] mt-1">characters</p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Vocabulary
              </p>
              <p className="text-2xl font-black font-mono text-[#f1f5f9]">
                {ALPHABET.length}
              </p>
              <p className="text-[10px] text-[#475569] mt-1">
                distinct characters
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Training windows
              </p>
              <p className="text-2xl font-black font-mono text-[#f1f5f9]">
                {MODELS[order].windowCount}
              </p>
              <p className="text-[10px] text-[#475569] mt-1">
                (context, next char) pairs at order {order}
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Contexts learned
              </p>
              <p className="text-2xl font-black font-mono text-[var(--color-accent)]">
                {MODELS[order].contextCount}
              </p>
              <p className="text-[10px] text-[#475569] mt-1">
                distinct {order}-character contexts
              </p>
            </div>
          </div>

          <p className="text-[12px] font-semibold text-white mb-2">
            Model order: how much context does a prediction see
          </p>
          <div
            role="radiogroup"
            aria-label="Model order"
            className="flex flex-wrap gap-2 mb-3"
          >
            {ORDER_OPTIONS.map((opt) => (
              <button
                key={opt.order}
                role="radio"
                aria-checked={order === opt.order}
                onClick={() => handleOrderChange(opt.order)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  order === opt.order
                    ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[#d4af37]/10"
                    : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155]"
                }`}
              >
                {opt.label}
                <span className="block text-[10px] font-normal text-[#475569]">
                  {opt.detail}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#475569] leading-relaxed max-w-[720px]">
            More context means sharper, more confident distributions but fewer
            observations per context. Switch from bigram to trigram and watch
            the entropy readout below: it drops for almost every prefix in this
            corpus, though the starting prefix happens to be a rare exception
            where it ticks up. Try a few of your own. A real LLM conditions on
            thousands of tokens of context, learned by a neural network instead
            of a count table, which is why it does not run out of observations
            the way this table does.
          </p>
        </motion.section>

        {/* The machine */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The machine: type a prefix, read the distribution
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Every bar below is count divided by total for the highlighted
            context, recomputed live from the corpus. Try a prefix ending in
            &quot;q&quot; to find a certain model, or one ending in
            &quot;␣&quot; (space) to see it hedge across many word starts.
            Input is limited to the corpus alphabet: letters, space, period.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr] gap-4 mb-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <label
                htmlFor="ntp-prefix"
                className="block text-[12px] font-semibold text-white mb-2"
              >
                Your prefix
              </label>
              <input
                id="ntp-prefix"
                type="text"
                value={prefix}
                onChange={(e) => handlePrefixChange(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                aria-describedby="ntp-prefix-hint"
                className="w-full rounded-xl border border-[#334155] bg-[#162032] px-3 py-2 font-mono text-[14px] text-[#f1f5f9] focus:outline-none focus:border-[var(--color-accent)]"
              />
              <p
                id="ntp-prefix-hint"
                className="text-[10px] text-[#475569] mt-1.5"
              >
                Editing the prefix restarts generation. Allowed: a to z, space,
                period.
              </p>

              <p className="text-[10px] text-[#475569] uppercase tracking-wide mt-4 mb-1">
                Current sequence (context highlighted)
              </p>
              <p className="font-mono text-[13px] leading-relaxed text-[#94a3b8] whitespace-pre-wrap break-words rounded-lg border border-[#1e293b] p-3 min-h-[52px]">
                {seqHead}
                <span className="bg-[#d4af37]/20 text-[var(--color-accent)] border-b-2 border-[var(--color-accent)] font-bold">
                  {dist.contextUsed === ""
                    ? ""
                    : displayContext(dist.contextUsed)}
                </span>
                <span aria-hidden="true" className="text-[#475569]">
                  ▌
                </span>
              </p>
              <p className="text-[11px] text-[#475569] leading-relaxed mt-1.5">
                {sequence.length === 0 ? (
                  <>
                    Empty sequence: the model falls back to overall character
                    frequencies (order 0).
                  </>
                ) : dist.backedOff ? (
                  <>
                    Context &quot;
                    <span className="font-mono text-[var(--color-warning)]">
                      {displayContext(dist.contextRequested)}
                    </span>
                    &quot; never appears in the corpus with a continuation, so
                    the model backed off to &quot;
                    <span className="font-mono text-[var(--color-accent)]">
                      {dist.contextUsed === ""
                        ? "(no context)"
                        : displayContext(dist.contextUsed)}
                    </span>
                    &quot; (order {dist.orderUsed}).
                  </>
                ) : (
                  <>
                    Conditioning on &quot;
                    <span className="font-mono text-[var(--color-accent)]">
                      {displayContext(dist.contextUsed)}
                    </span>
                    &quot;, seen {dist.total} times in the corpus.
                  </>
                )}
              </p>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-lg border border-[#1e293b] p-2.5">
                  <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-0.5">
                    Entropy
                  </p>
                  <p className="text-lg font-black font-mono text-[#f1f5f9]">
                    {dist.entropyBits.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-[#475569]">
                    bits of uncertainty
                  </p>
                </div>
                <div className="rounded-lg border border-[#1e293b] p-2.5">
                  <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-0.5">
                    Top candidate
                  </p>
                  <p className="text-lg font-black font-mono text-[var(--color-accent)]">
                    {topEntry ? displayChar(topEntry.char) : "?"}
                  </p>
                  <p className="text-[10px] text-[#475569]">
                    {topEntry
                      ? `at ${(100 * topEntry.prob).toFixed(1)}% of ${dist.entries.length} options`
                      : "no data"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#1e293b] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p className="text-[12px] font-semibold text-white">
                  P(next character | &quot;
                  <span className="font-mono text-[var(--color-accent)]">
                    {dist.contextUsed === ""
                      ? "no context"
                      : displayContext(dist.contextUsed)}
                  </span>
                  &quot;)
                </p>
                <p className="text-[10px] text-[#475569]">
                  click any bar to force that character
                </p>
              </div>
              <DistributionBars
                dist={dist}
                lastPick={lastPick}
                onPick={handlePickChar}
                disabled={atCap}
              />
            </div>
          </div>

          {/* Sampling controls + generated text */}
          <div className="rounded-xl border border-[#1e293b] p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                onClick={sampleOnce}
                disabled={atCap}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  atCap
                    ? "border border-[#1e293b] text-[#475569] cursor-not-allowed"
                    : "bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90"
                }`}
              >
                Sample one character
              </button>
              <button
                onClick={() => setPlaying((p) => !p)}
                disabled={atCap && !playing}
                aria-pressed={playing}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  playing
                    ? "border-[var(--color-warning)] text-[var(--color-warning)]"
                    : "border-[#334155] text-white hover:border-[#d4af37] hover:text-[#d4af37]"
                } disabled:opacity-40`}
              >
                {playing ? "Pause the loop" : "Run the loop"}
              </button>
              <button
                onClick={handleRestartGeneration}
                disabled={generated.length === 0}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors disabled:opacity-40 disabled:hover:border-[#1e293b] disabled:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                Restart generation
              </button>
              <span className="text-[11px] font-mono text-[#475569] ml-auto">
                {generated.length}/{MAX_GENERATED} characters
              </span>
            </div>
            {atCap && (
              <p className="text-[10px] text-[var(--color-warning)] mb-2">
                Generation cap reached ({MAX_GENERATED}). Restart generation or
                edit the prefix to keep going.
              </p>
            )}
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1.5">
              Generated so far (prefix dim, sampled text bright)
            </p>
            <p className="font-mono text-[14px] leading-relaxed whitespace-pre-wrap break-words rounded-lg bg-[#162032] border border-[#1e293b] p-3 min-h-[56px]">
              <span className="text-[#475569]">{prefix}</span>
              <span className="text-[#f1f5f9]">{generated}</span>
              <span
                aria-hidden="true"
                className={playing ? "text-[var(--color-accent)]" : "text-[#475569]"}
              >
                ▌
              </span>
            </p>
            <p className="text-[11px] text-[#475569] leading-relaxed mt-2">
              Every bright character above was one draw from a distribution you
              could inspect at the moment it happened. The text looks
              word-like with almost no machinery because even 1 or 2 characters
              of context carry real statistical signal. That, scaled up, is the
              whole trick.
            </p>
          </div>
        </motion.section>

        {/* Why this is the keystone */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Everything downstream manipulates this bar chart
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              Temperature, top-k, and top-p do not change the model at all.
              They reshape or truncate exactly the distribution you have been
              staring at, before the uniform draw happens. The{" "}
              <Link
                href="/visual-guides/temperature-topk"
                className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
              >
                temperature and top-k guide
              </Link>{" "}
              picks up at the precise point this guide ends: after the model
              has produced its bars, before the dice are rolled.
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              And the choice of what a &quot;token&quot; is, characters here,
              subword pieces in production models, is its own design problem
              with real consequences for the distribution the model must
              output. That is the{" "}
              <Link
                href="/visual-guides/tokenization"
                className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
              >
                tokenization guide
              </Link>
              , the natural next step.
            </p>
          </div>
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
                  You Ran the Machine
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You trained a real language model on a visible corpus, read
                  its distributions, and generated text by repeated sampling.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Characters you generated
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {charsGenerated} draws from live distributions
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Contexts the models learned
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {MODELS[1].contextCount} bigram, {MODELS[2].contextCount}{" "}
                      trigram
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Current distribution
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {dist.entries.length} options, {dist.entropyBits.toFixed(2)}{" "}
                      bits
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;A language model never chooses words. It outputs one
                    probability per vocabulary entry, and generation is that
                    distribution sampled in a loop: draw, append, predict
                    again. Temperature, top-k, and every other decoding trick
                    is just a reshaping of the bars you watched being
                    computed.&quot;
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
