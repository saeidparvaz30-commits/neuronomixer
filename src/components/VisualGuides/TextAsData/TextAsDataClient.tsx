"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  PipelineOptions,
  tokenize,
  runPipeline,
  countWords,
  vocabulary,
  overlapStats,
} from "./textPipeline";
import TokenSandbox from "./TokenSandbox";
import DocOverlap from "./DocOverlap";

const GUIDE_TITLE = "From Words to Counts";
const GUIDE_SLUG = "text-as-data";
const NEXT_GUIDE_SLUG = "data-validation";

const DEFAULT_TEXT =
  "The tokens tell the story. A token is just a word the computer counted, " +
  "and counting tokens turns messy text into tidy data. Count the words, " +
  "count them again, and soon the counts themselves start counting for something.";

const DEFAULT_DOC_A =
  "Coffee is brewed from roasted beans. A good brew balances bitterness " +
  "against aroma, and a careful cup rewards the patient brewer.";

const DEFAULT_DOC_B =
  "Tea is brewed from dried leaves. A good brew balances bitterness " +
  "against aroma, and a careful cup rewards the patient drinker.";

const ALL_TOGGLES: readonly (keyof PipelineOptions)[] = [
  "lowercase",
  "stopwords",
  "stem",
];

export default function TextAsDataClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // Section 1: sandbox
  const [text, setText] = useState(DEFAULT_TEXT);
  const [typed, setTyped] = useState(false);
  const [opts, setOpts] = useState<PipelineOptions>({
    lowercase: false,
    stopwords: false,
    stem: false,
  });
  const [togglesTried, setTogglesTried] = useState<
    ReadonlySet<keyof PipelineOptions>
  >(new Set());
  const [sandboxDone, setSandboxDone] = useState(false);

  // Section 2: document comparison
  const [docA, setDocA] = useState(DEFAULT_DOC_A);
  const [docB, setDocB] = useState(DEFAULT_DOC_B);
  const [compareEdited, setCompareEdited] = useState(false);
  const [compareDone, setCompareDone] = useState(false);

  // ── Live computation (single source for sandbox, overlap, and recap) ──────
  const pipe = useMemo(() => runPipeline(tokenize(text), opts), [text, opts]);
  const counts = useMemo(() => countWords(pipe), [pipe]);
  const keptCount = useMemo(
    () => pipe.filter((t) => t.final !== null).length,
    [pipe]
  );

  const vocabA = useMemo(
    () => vocabulary(runPipeline(tokenize(docA), opts)),
    [docA, opts]
  );
  const vocabB = useMemo(
    () => vocabulary(runPipeline(tokenize(docB), opts)),
    [docB, opts]
  );
  const overlap = useMemo(() => overlapStats(vocabA, vocabB), [vocabA, vocabB]);

  // ── Gates (latched so deleting text later cannot un-complete the guide) ───
  useEffect(() => {
    if (typed && keptCount >= 5) setSandboxDone(true);
  }, [typed, keptCount]);

  useEffect(() => {
    if (compareEdited && vocabA.size >= 3 && vocabB.size >= 3) {
      setCompareDone(true);
    }
  }, [compareEdited, vocabA.size, vocabB.size]);

  const gateToggles = ALL_TOGGLES.every((k) => togglesTried.has(k));
  const isComplete = sandboxDone && gateToggles && compareDone;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleTextChange = useCallback((t: string) => {
    setText(t);
    setTyped(true);
  }, []);

  const handleToggle = useCallback((k: keyof PipelineOptions) => {
    setOpts((prev) => ({ ...prev, [k]: !prev[k] }));
    setTogglesTried((prev) => (prev.has(k) ? prev : new Set(prev).add(k)));
  }, []);

  const handleDocAChange = useCallback((t: string) => {
    setDocA(t);
    setCompareEdited(true);
  }, []);

  const handleDocBChange = useCallback((t: string) => {
    setDocB(t);
    setCompareEdited(true);
  }, []);

  function handleReset() {
    setText(DEFAULT_TEXT);
    setTyped(false);
    setOpts({ lowercase: false, stopwords: false, stem: false });
    setTogglesTried(new Set());
    setSandboxDone(false);
    setDocA(DEFAULT_DOC_A);
    setDocB(DEFAULT_DOC_B);
    setCompareEdited(false);
    setCompareDone(false);
  }

  const progressItems = [
    { id: "sandbox", label: "Shape the sandbox text", done: sandboxDone },
    { id: "toggles", label: "Try all 3 pipeline switches", done: gateToggles },
    { id: "compare", label: "Compare two documents", done: compareDone },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug={GUIDE_SLUG} score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
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
              Data &amp; Analysis
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            From Words to <span className="text-[var(--color-accent)]">Counts</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Before any model can read, text has to become data, and the
            recipe is older than AI: chop the text into tokens, normalize
            them, and count. Type in the sandbox and watch every keystroke
            change what the computer thinks your words are.
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
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">
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
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Definition + boundary */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Text is not data until you decide what a word is
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            A string of characters has no rows and no columns. To analyze
            it, you make three choices: where one token ends and the next
            begins (tokenization), which surface forms count as the same
            word (normalization), and what to tally (counting). Each choice
            is a judgment call, and each one changes every number
            downstream. Modern language models push the same idea further
            by splitting words into subword pieces; that story belongs to
            the{" "}
            <Link
              href="/visual-guides/tokenization"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              tokenization
            </Link>{" "}
            guide in the LLM category. This guide is the classic craft that
            came first: whole-word tokens, honest normalization, and
            bag-of-words counts.
          </p>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            How this playground stays honest: every count, bar, vocabulary
            size, and overlap score on this page is recomputed in your
            browser, on every keystroke, from the exact text sitting in the
            input boxes. Nothing is precomputed.
          </p>
        </motion.section>

        {/* Section 1: sandbox */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            1 · Tokenize, normalize, count
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-4">
            The sandbox below runs the full pipeline live. Edit the text and
            watch tokens light up as you type. Then flip each normalization
            switch and watch the frequency chart reshuffle: lowercasing
            merges Count with count, the stop list deletes the glue words,
            and the crude stemmer folds counted, counting, and counts into
            one row.
          </p>
          <TokenSandbox
            text={text}
            onTextChange={handleTextChange}
            opts={opts}
            onToggle={handleToggle}
            togglesTried={togglesTried}
            pipe={pipe}
            counts={counts}
          />
        </motion.section>

        {/* Interlude: why crude rules are shown honestly */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-3">
            Every switch is a modeling decision
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-1.5">
                Lowercasing
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                Usually right, sometimes destructive: it merges Apple the
                company with apple the fruit, and US the country with us
                the pronoun. Folding case throws away signal on purpose.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-1.5">
                Stop words
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                There is no universal list. Dropping &quot;not&quot; is
                harmless for topic counts and catastrophic for sentiment.
                The list is part of your model, so read it before you trust
                it.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-1.5">
                Stemming
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                The stemmer here is a handful of suffix rules with guards,
                and it says so. Even real stemmers like Porter&apos;s make
                ugly stems; the trade is fewer distinct forms for less
                readable words.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Section 2: overlap */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            2 · Two documents, one yardstick
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-4">
            Once text is counts, documents become comparable. The oldest
            comparison is vocabulary overlap: which distinct words do two
            documents share? Edit either document below, or paste your own
            pair, and watch the Jaccard score move. The section 1 switches
            apply here too, because two documents can only be compared
            through the same pipeline.
          </p>
          <DocOverlap
            docA={docA}
            docB={docB}
            onDocAChange={handleDocAChange}
            onDocBChange={handleDocBChange}
            opts={opts}
            vocabA={vocabA}
            vocabB={vocabB}
            overlap={overlap}
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
                  You Turned Text into Data
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You tokenized live text, bent the counts with three
                  normalization choices, and measured two documents against
                  each other with a number you computed yourself.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your sandbox right now
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {keptCount} tokens
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      {counts.length} distinct {counts.length === 1 ? "word" : "words"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Top word in your text
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {counts.length > 0 ? counts[0].word : "none"}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      {counts.length > 0
                        ? `appears ${counts[0].count} ${counts[0].count === 1 ? "time" : "times"}`
                        : "the sandbox is empty"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Document overlap you built
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      J = {overlap.union === 0 ? "0.00" : overlap.jaccard.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      {overlap.shared.length} shared of {overlap.union} distinct words
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Text becomes data the moment you decide what
                    counts as a word. Tokenize, normalize, count: every
                    choice changes the numbers, so make each choice on
                    purpose and write it down.&quot;
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
