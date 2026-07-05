"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const GUIDE_TITLE = "Model Evaluation: Beyond Accuracy";
const NEXT_GUIDE_SLUG = "rlhf";

// ── Metric helpers ─────────────────────────────────────────────────────────────

function ngramCounts(tokens: string[], n: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i + n <= tokens.length; i++) {
    const gram = tokens.slice(i, i + n).join("_");
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  return counts;
}

// Simplified BLEU-2: geometric mean of CLIPPED unigram + bigram precision,
// times the brevity penalty. Clipping caps each n-gram at its reference count,
// so repeating a matching word cannot inflate the score.
function bleuScore(reference: string, hypothesis: string): number {
  const refTokens = reference.toLowerCase().split(/\W+/).filter(Boolean);
  const hypTokens = hypothesis.toLowerCase().split(/\W+/).filter(Boolean);
  if (!hypTokens.length || !refTokens.length) return 0;
  const precisions = [1, 2].map((n) => {
    const hypCounts = ngramCounts(hypTokens, n);
    const refCounts = ngramCounts(refTokens, n);
    let clipped = 0;
    let total = 0;
    for (const [gram, count] of hypCounts) {
      clipped += Math.min(count, refCounts.get(gram) ?? 0);
      total += count;
    }
    return total ? clipped / total : 0;
  });
  const bp =
    hypTokens.length >= refTokens.length
      ? 1
      : Math.exp(1 - refTokens.length / hypTokens.length);
  return Math.min(1, bp * Math.sqrt(precisions[0] * precisions[1]));
}

function rouge1(reference: string, hypothesis: string): number {
  const refTokens = new Set(reference.toLowerCase().split(/\W+/).filter(Boolean));
  const hypTokens = hypothesis.toLowerCase().split(/\W+/).filter(Boolean);
  if (!refTokens.size) return 0;
  const matches = hypTokens.filter((t) => refTokens.has(t)).length;
  return matches / Math.max(refTokens.size, 1);
}

function rouge2(reference: string, hypothesis: string): number {
  const bigrams = (s: string) => {
    const tokens = s.toLowerCase().split(/\W+/).filter(Boolean);
    return tokens.slice(0, -1).map((t, i) => `${t}_${tokens[i + 1]}`);
  };
  const refBigrams = new Set(bigrams(reference));
  const hypBigrams = bigrams(hypothesis);
  if (!refBigrams.size) return 0;
  const matches = hypBigrams.filter((b) => refBigrams.has(b)).length;
  return matches / Math.max(refBigrams.size, 1);
}

function wordOverlap(
  reference: string,
  hypothesis: string
): { matched: number; total: number } {
  const refTokens = new Set(reference.toLowerCase().split(/\W+/).filter(Boolean));
  const hypTokens = hypothesis.toLowerCase().split(/\W+/).filter(Boolean);
  const matched = hypTokens.filter((t) => refTokens.has(t)).length;
  return { matched, total: hypTokens.length };
}

function scoreColor(val: number): string {
  if (val >= 0.5) return "#3bb4a4";
  if (val >= 0.3) return "var(--color-accent)";
  return "#ef4444";
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_REFERENCE =
  "The capital of France is Paris, a city known for the Eiffel Tower.";
const DEFAULT_HYPOTHESIS =
  "Paris is the capital of France. It is famous for the Eiffel Tower.";

const METRIC_FAILURES = [
  {
    id: "same-words",
    label: "High BLEU, wrong meaning",
    reference: "The dog bit the man.",
    hypothesis: "The man bit the dog.",
    insight:
      "Same words, opposite meaning. Every word matches and three of the four bigrams survive the swap, so BLEU-2 stays high while the semantics are reversed. Only longer n-grams would expose it.",
    color: "#ef4444",
  },
  {
    id: "paraphrase",
    label: "Low BLEU, same meaning",
    reference: "The capital of France is Paris.",
    hypothesis: "Paris is the French capital.",
    insight:
      "A perfect paraphrase is penalised because the word order differs: not a single bigram matches, so BLEU-2 collapses to zero. BLEU punishes creativity.",
    color: "#d4af37",
  },
  {
    id: "repetition",
    label: "Repetition: why BLEU clips",
    reference: "The model generates coherent and accurate text.",
    hypothesis: "The the the the the the the.",
    insight:
      "Unclipped precision would score this 1.00, since every \"the\" appears in the reference. Clipping caps it at the reference count, so BLEU collapses to zero. Perplexity can also be fooled: a model stuck in a repetition loop grows ever more confident in the repeated token, so low perplexity alone never guarantees quality.",
    color: "#a855f7",
  },
];

const FRAMEWORKS = [
  {
    name: "MMLU",
    full: "Massive Multitask Language Understanding",
    tests: "General knowledge across 57 academic subjects",
    detail: "Multiple-choice questions spanning STEM, humanities, law, medicine",
    leader: "GPT-4o (2024): 88.7%",
    color: "#3bb4a4",
  },
  {
    name: "HumanEval",
    full: "HumanEval",
    tests: "Code generation: 164 Python problems",
    detail: "Pass@1 rate: model writes a function, tests run against hidden test cases",
    leader: "GPT-4o (2024): 90.2%",
    color: "#1e5d8a",
  },
  {
    name: "HellaSwag",
    full: "HellaSwag",
    tests: "Commonsense reasoning & sentence completion",
    detail: "Model picks the most plausible next sentence from 4 adversarially filtered choices",
    leader: "GPT-4 (2023): 95.3%",
    color: "#d4af37",
  },
  {
    name: "MT-Bench",
    full: "Multi-Turn Benchmark",
    tests: "Multi-turn conversation quality",
    detail:
      "GPT-4 judges responses on writing, reasoning, math, coding across 80 multi-turn questions",
    leader: "GPT-4 (2023): 8.99 / 10",
    color: "#a855f7",
  },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function MetricBar({
  label,
  value,
  format,
}: {
  label: string;
  value: number;
  format?: (v: number) => string;
}) {
  const pct = Math.min(100, value * 100);
  const color = scoreColor(value);
  const display = format ? format(value) : value.toFixed(2);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-[#94a3b8] font-medium">{label}</span>
        <span className="font-bold" style={{ color }}>
          {display}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#1e293b] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function MetricCalculator({ onEdited }: { onEdited: () => void }) {
  const [reference, setReference] = useState(DEFAULT_REFERENCE);
  const [hypothesis, setHypothesis] = useState(DEFAULT_HYPOTHESIS);
  const editedRef = useRef(false);

  function handleHypothesisChange(v: string) {
    setHypothesis(v);
    if (!editedRef.current) {
      editedRef.current = true;
      onEdited();
    }
  }

  const bleu = bleuScore(reference, hypothesis);
  const r1 = rouge1(reference, hypothesis);
  const r2 = rouge2(reference, hypothesis);
  const overlap = wordOverlap(reference, hypothesis);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">
            Reference answer
          </label>
          <textarea
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-[#1e293b] border border-[#334155] text-[13px] text-white px-4 py-3 resize-none focus:outline-none focus:border-[#1e5d8a] transition-colors leading-relaxed"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[#3bb4a4]">
            Model output{" "}
            <span className="text-[#475569] normal-case font-normal tracking-normal">
              (edit me)
            </span>
          </label>
          <textarea
            value={hypothesis}
            onChange={(e) => handleHypothesisChange(e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-[#1e293b] border border-[#3bb4a4]/40 text-[13px] text-white px-4 py-3 resize-none focus:outline-none focus:border-[#3bb4a4] transition-colors leading-relaxed"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 pt-2">
        <MetricBar label="BLEU-2 score" value={bleu} />
        <MetricBar label="ROUGE-1" value={r1} />
        <MetricBar label="ROUGE-2" value={r2} />
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[#94a3b8] font-medium">Word overlap</span>
            <span className="font-bold text-white">
              {overlap.matched}/{overlap.total} words
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#1e293b] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[#1e5d8a]"
              animate={{
                width: overlap.total
                  ? `${(overlap.matched / overlap.total) * 100}%`
                  : "0%",
              }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      <p className="text-[11px] text-[#475569] italic">
        Tip: try making the output shorter, longer, or rephrasing it to see how each metric reacts.
      </p>
    </div>
  );
}

function MetricFailureCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {METRIC_FAILURES.map((ex) => {
        const bleu = bleuScore(ex.reference, ex.hypothesis);
        const r1 = rouge1(ex.reference, ex.hypothesis);
        return (
          <div
            key={ex.id}
            className="rounded-2xl border bg-[#0f172a] p-5 space-y-3"
            style={{ borderColor: `${ex.color}30` }}
          >
            <div
              className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{ background: `${ex.color}18`, color: ex.color }}
            >
              {ex.label}
            </div>

            <div className="space-y-1.5">
              <div className="rounded-lg bg-[#1e293b] px-3 py-2">
                <p className="text-[9px] uppercase tracking-wider text-[#475569] mb-0.5">Reference</p>
                <p className="text-[11px] text-white leading-relaxed">{ex.reference}</p>
              </div>
              <div className="rounded-lg bg-[#1e293b] px-3 py-2">
                <p className="text-[9px] uppercase tracking-wider text-[#475569] mb-0.5">Model output</p>
                <p className="text-[11px] text-white leading-relaxed">{ex.hypothesis}</p>
              </div>
            </div>

            <div className="flex gap-4 text-[11px]">
              <span>
                <span className="text-[#475569]">BLEU-2 </span>
                <span className="font-bold" style={{ color: scoreColor(bleu) }}>
                  {bleu.toFixed(2)}
                </span>
              </span>
              <span>
                <span className="text-[#475569]">ROUGE-1 </span>
                <span className="font-bold" style={{ color: scoreColor(r1) }}>
                  {r1.toFixed(2)}
                </span>
              </span>
            </div>

            <p className="text-[11px] text-[#94a3b8] leading-relaxed">{ex.insight}</p>
          </div>
        );
      })}
    </div>
  );
}

function FrameworkCards({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const { stagger, card } = useGuideMotion();
  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      ref={containerRef}
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={GUIDE_VIEWPORT}
    >
      {FRAMEWORKS.map((fw) => (
        <motion.div
          key={fw.name}
          variants={card}
          className="rounded-2xl border bg-[#0f172a] p-5 space-y-3"
          style={{ borderColor: `${fw.color}30` }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p
                className="text-[15px] font-black tracking-tight"
                style={{ color: fw.color }}
              >
                {fw.name}
              </p>
              <p className="text-[10px] text-[#475569] leading-tight mt-0.5">{fw.full}</p>
            </div>
            <span
              className="text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0"
              style={{ background: `${fw.color}15`, color: fw.color }}
            >
              Benchmark
            </span>
          </div>
          <p className="text-[12px] text-white font-semibold leading-tight">{fw.tests}</p>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">{fw.detail}</p>
          <div className="rounded-lg bg-[#1e293b] px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-[#475569] mb-0.5">Reference score (at publication)</p>
            <p className="text-[12px] font-bold" style={{ color: fw.color }}>
              {fw.leader}
            </p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function HumanVsAutomated() {
  const COLS = [
    {
      label: "Human Eval",
      color: "#3bb4a4",
      pros: ["Gold standard accuracy", "Captures nuance & tone", "Detects subtle errors"],
      cons: ["Expensive ($$$)", "Slow (days–weeks)", "Hard to scale"],
    },
    {
      label: "Automated Metrics",
      color: "#1e5d8a",
      pros: ["Instant results", "Free to run at scale", "Reproducible"],
      cons: ["Misses paraphrases", "Penalises creativity", "Easy to game"],
    },
    {
      label: "LLM-as-Judge",
      color: "#a855f7",
      pros: ["85–90% agreement with humans", "Scalable & cheap", "Emerging gold standard"],
      cons: ["Self-serving bias", "GPT-4 judging GPT-4", "Prompt-sensitive"],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLS.map((col) => (
        <div
          key={col.label}
          className="rounded-2xl border bg-[#0f172a] p-5 space-y-4"
          style={{ borderColor: `${col.color}30` }}
        >
          <p className="text-[14px] font-bold" style={{ color: col.color }}>
            {col.label}
          </p>
          <div className="space-y-1.5">
            {col.pros.map((p) => (
              <div key={p} className="flex items-start gap-2 text-[11px] text-white">
                <span className="mt-0.5 text-[#3bb4a4] flex-shrink-0">+</span>
                {p}
              </div>
            ))}
            {col.cons.map((c) => (
              <div key={c} className="flex items-start gap-2 text-[11px] text-[#94a3b8]">
                <span className="mt-0.5 text-[#ef4444] flex-shrink-0">−</span>
                {c}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function ModelEvaluationClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  const [hasEdited, setHasEdited] = useState(false);
  const [hasScrolledToFrameworks, setHasScrolledToFrameworks] = useState(false);
  const [calcKey, setCalcKey] = useState(0);
  const completionFired = useRef(false);

  const frameworksRef = useRef<HTMLDivElement>(null);

  const allComplete = hasEdited && hasScrolledToFrameworks;

  function handleResetGuide() {
    setHasEdited(false);
    setHasScrolledToFrameworks(false);
    setCalcKey((k) => k + 1);
    completionFired.current = false;
  }

  // Detect scroll to frameworks section
  useEffect(() => {
    if (hasScrolledToFrameworks) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasScrolledToFrameworks(true);
        }
      },
      { threshold: 0.2 }
    );
    const el = frameworksRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasScrolledToFrameworks]);

  // Fire completion
  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "model-evaluation", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  const handleEdited = useCallback(() => setHasEdited(true), []);

  const progress = [
    { label: "Edit model output", done: hasEdited },
    { label: "Scroll to frameworks", done: hasScrolledToFrameworks },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="model-evaluation" score={100} />
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
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Applied AI
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            Model Evaluation:{" "}
            <span className="text-[var(--color-accent)]">Beyond Accuracy</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            For LLMs, standard metrics don&apos;t work: you can&apos;t just check
            exact match. BLEU, ROUGE, perplexity, and BERTScore each capture
            different aspects of quality. Edit outputs below and see the scores
            update live.
          </motion.p>
        </section>

        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-10 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <motion.div
                className="w-2 h-2 rounded-full"
                animate={{ backgroundColor: done ? "#3bb4a4" : "#1e293b" }}
                transition={{ duration: 0.4 }}
              />
              <span
                className={`text-[11px] transition-colors ${done ? "text-white" : "text-[#475569]"}`}
              >
                {label}
              </span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              Sign in to save progress
            </p>
          )}
          <AnimatePresence>
            {allComplete && (
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

        {/* Section 1 */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">
            Section 1: Interactive Metric Calculator
          </h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">
            Edit the model output and watch BLEU, ROUGE-1, ROUGE-2, and word overlap update in
            real time.
          </p>

          {/* Metric definitions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { name: "BLEU", desc: "Clipped n-gram precision + brevity penalty (computed here up to bigrams)", color: "#3bb4a4" },
              { name: "ROUGE-1", desc: "Unigram recall overlap", color: "#1e5d8a" },
              { name: "ROUGE-2", desc: "Bigram recall overlap", color: "#d4af37" }, // raw hex kept: concatenated with alpha suffix below
              { name: "BERTScore", desc: "Semantic similarity via embeddings", color: "#a855f7" },
            ].map((m) => (
              <div
                key={m.name}
                className="rounded-xl border bg-[#0f172a] px-4 py-3"
                style={{ borderColor: `${m.color}30` }}
              >
                <p className="text-[12px] font-bold mb-0.5" style={{ color: m.color }}>
                  {m.name}
                </p>
                <p className="text-[10px] text-[#94a3b8] leading-tight">{m.desc}</p>
              </div>
            ))}
          </div>

          <MetricCalculator key={calcKey} onEdited={handleEdited} />
        </section>

        {/* Section 2 */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">
            Section 2: When Metrics Lie
          </h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">
            Three classic failure modes where automated metrics mislead you. Live scores are
            computed from the actual text.
          </p>
          <MetricFailureCards />
        </section>

        {/* Section 3 */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">
            Section 3: Evaluation Frameworks
          </h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">
            The four benchmarks every LLM paper cites, and what they actually measure.
          </p>
          <FrameworkCards containerRef={frameworksRef} />
        </section>

        {/* Section 4 */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">
            Section 4: Human vs Automated Eval
          </h2>
          <p className="text-[12px] text-[#94a3b8] mb-6">
            Each approach has trade-offs. The emerging winner is LLM-as-judge: using a stronger
            model to score a weaker one.
          </p>
          <HumanVsAutomated />
        </section>

        {/* Gold insight */}
        <div className="rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-6 mb-12">
          <div className="flex items-start gap-3">
            <span className="text-[var(--color-accent)] text-xl mt-0.5">&#128161;</span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent)] mb-2">
                Key Insight
              </p>
              <p className="text-[13px] text-white leading-relaxed">
                LMSYS Chatbot Arena ranks models with Elo-style ratings computed from
                millions of blind, head-to-head human votes. Static academic benchmarks
                can leak into training data and be gamed; live human preference is much
                harder to optimize against, which is why many teams treat Arena rankings
                as the stronger signal.
              </p>
            </div>
          </div>
        </div>

        {/* Completion card */}
        <AnimatePresence>
          {allComplete && (
            <motion.div
              variants={card}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="mt-8 mb-10 rounded-2xl border border-white/[0.08] bg-[#0f172a] overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-px bg-[var(--color-accent)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">
                    Guide Complete
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Evaluation Skeptic Unlocked!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You edited model outputs, watched BLEU and ROUGE react, and saw where automated metrics mislead.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Metric calculator</p>
                    <p className="text-[14px] font-mono font-bold text-[#3bb4a4]">Explored</p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Failure modes</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">3 seen</p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Benchmarks</p>
                    <p className="text-[14px] font-mono font-bold text-white">4 reviewed</p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Every automated metric is a proxy. BLEU counts n-grams, not meaning; a benchmark score can be gamed. Trust a metric only as far as you understand what it fails to measure.&quot;
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
                    onClick={handleResetGuide}
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
        {!allComplete && (
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
