"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

// ── Tokenizer ──────────────────────────────────────────────────────────────

const COMMON_SHORT = new Set([
  "the","a","an","is","of","to","in","it","he","she","we","be","at","by","do",
  "go","no","on","or","so","up","as","if","me","my","us","am","are","was","has",
  "had","not","but","and","for","can","will","its","his","her","our","you","did",
]);

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  // Split keeping spaces attached to subsequent words (GPT-style)
  const parts = text.split(/(\s+)/);
  let pendingSpace = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (/^\s+$/.test(part)) {
      pendingSpace = part;
      continue;
    }

    // Split the word into its own chars + punctuation
    const wordTokens = splitWord(part);
    if (wordTokens.length > 0) {
      wordTokens[0] = pendingSpace + wordTokens[0];
      pendingSpace = "";
      tokens.push(...wordTokens);
    }
  }

  if (pendingSpace) tokens.push(pendingSpace);
  return tokens.filter(Boolean);
}

function splitWord(word: string): string[] {
  // Separate leading/trailing punctuation
  const leadMatch = word.match(/^([^a-zA-Z0-9À-ÿ]+)(.*)/);
  if (leadMatch) {
    const punct = leadMatch[1];
    const rest = leadMatch[2];
    const inner = rest ? splitWordCore(rest) : [];
    return [punct, ...inner];
  }
  const trailMatch = word.match(/^(.*[a-zA-Z0-9À-ÿ])([^a-zA-Z0-9À-ÿ]+)$/);
  if (trailMatch) {
    const core = trailMatch[1];
    const punct = trailMatch[2];
    return [...splitWordCore(core), punct];
  }
  return splitWordCore(word);
}

function splitWordCore(word: string): string[] {
  const lower = word.toLowerCase();

  // Common short words → 1 token
  if (COMMON_SHORT.has(lower) || word.length <= 5) return [word];

  // Pure numbers → split every 2 digits
  if (/^\d+$/.test(word)) {
    const chunks: string[] = [];
    for (let i = 0; i < word.length; i += 2) chunks.push(word.slice(i, i + 2));
    return chunks;
  }

  // 6–9 chars → 2 tokens at morpheme boundary or midpoint
  if (word.length <= 9) {
    const prefixes = ["un","re","pre","dis","over","out","sub","inter","trans","pro","de","non","mis"];
    for (const p of prefixes) {
      if (lower.startsWith(p) && word.length - p.length >= 3) {
        return [word.slice(0, p.length), word.slice(p.length)];
      }
    }
    const suffixes = ["ing","tion","ness","able","ible","ful","less","ize","ise","ment","ous","ive","al","ed","er","est"];
    for (const s of suffixes) {
      if (lower.endsWith(s) && word.length - s.length >= 3) {
        return [word.slice(0, word.length - s.length), word.slice(word.length - s.length)];
      }
    }
    const mid = Math.ceil(word.length / 2);
    return [word.slice(0, mid), word.slice(mid)];
  }

  // 10+ chars → 3 tokens
  const third = Math.ceil(word.length / 3);
  return [word.slice(0, third), word.slice(third, third * 2), word.slice(third * 2)];
}

// ── Constants ──────────────────────────────────────────────────────────────

const TOKEN_PALETTE = ["#3bb4a4","#1e5d8a","#d4af37","#a855f7","#ef4444","#ec4899"];

const DEFAULT_TEXT = "The quick brown fox jumps over the lazy dog.";

const COMPARISON_EXAMPLES = [
  { input: "Hello world",          tokens: ["Hello", " world"] },
  { input: "2024",                 tokens: ["20", "24"] },
  { input: "unbelievable",         tokens: ["un", "believ", "able"] },
  { input: "ChatGPT",              tokens: ["Chat", "G", "PT"] },
  { input: "Süddeutsche Zeitung",  tokens: ["S", "ü", "dd", "eutsche", " Ze", "itung"] },
];

const INSIGHT_CARDS = [
  {
    title: "Cost",
    body: "GPT-4 charges per token. 1K tokens \u2248 750 words — so concise prompts save money.",
    color: "#d4af37",
  },
  {
    title: "Context limits",
    body: "GPT-4 supports 128K tokens \u2248 100K words max. Every token in context counts against this limit.",
    color: "#3bb4a4",
  },
  {
    title: "Rare words are expensive",
    body: "Foreign names and rare words use more tokens than common English words, raising costs and reducing context.",
    color: "#ef4444",
  },
];

const BPE_STEPS = [
  {
    label: "Start: character level",
    tokens: [["l"],["o"],["w"]],
    merge: null,
    explanation: "BPE begins by treating every character as its own token.",
  },
  {
    label: "Pass 1: merge most frequent pair",
    tokens: [["l","o"],["w"]],
    merge: ["l","o"],
    explanation: 'The pair ("l","o") appeared most often in the corpus — merge it.',
  },
  {
    label: "Pass 2: merge next frequent pair",
    tokens: [["lo","w"]],
    merge: ["lo","w"],
    explanation: 'Now ("lo","w") is the top pair — merge to form "low".',
  },
  {
    label: "Result: vocabulary entry",
    tokens: [["low"]],
    merge: null,
    explanation: '"low" is added to the BPE vocabulary and used as a single token everywhere.',
  },
];

// ── Cost estimate ──────────────────────────────────────────────────────────

function estimateCost(tokenCount: number): string {
  // GPT-4o input: $5 / 1M tokens
  const cost = (tokenCount / 1_000_000) * 5;
  if (cost < 0.00001) return "<$0.00001";
  return `~$${cost.toFixed(5)}`;
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function TokenizationClient() {
  const { data: session } = useSession();

  const [inputText, setInputText] = useState(DEFAULT_TEXT);
  const [tokens, setTokens] = useState<string[]>(() => tokenize(DEFAULT_TEXT));
  const [bpeStep, setBpeStep] = useState(0);
  const completionFired = useRef(false);
  const hasTyped = useRef(false);
  const hasFinishedBpe = useRef(false);

  // Retokenize on input change
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    setTokens(tokenize(val));
    if (!hasTyped.current && val !== DEFAULT_TEXT) {
      hasTyped.current = true;
      checkCompletion();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNextBpeStep = useCallback(() => {
    setBpeStep((prev) => {
      const next = Math.min(prev + 1, BPE_STEPS.length - 1);
      if (next === BPE_STEPS.length - 1) {
        hasFinishedBpe.current = true;
        checkCompletion();
      }
      return next;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function checkCompletion() {
    if (completionFired.current) return;
    if (hasTyped.current && hasFinishedBpe.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "tokenization", score: 100 }),
        }).catch(() => {});
      }
    }
  }

  // Re-check completion when session loads after interactions
  useEffect(() => {
    if (hasTyped.current && hasFinishedBpe.current) checkCompletion();
  }, [session?.user]); // eslint-disable-line react-hooks/exhaustive-deps

  const charCount = inputText.length;
  const currentStep = BPE_STEPS[bpeStep];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[860px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: "#ef444422", color: "#ef4444" }}
          >
            LLMs
          </span>
          <span className="text-white/20">/</span>
          <span className="text-white">Tokenization: How AI Reads Text</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#ef4444]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#ef4444]">
              LLMs
            </span>
            <span className="w-6 h-px bg-[#ef4444]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Tokenization:{" "}
            <span className="text-[var(--color-accent)]">How AI Reads Text</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            Before an LLM sees words, it sees tokens. Type anything below and watch it
            dissolve into the subword chunks that models actually process.
          </p>
        </section>

        {/* Progress bar — always full since this is a read+interact guide */}
        <div className="mb-8">
          <div className="relative h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #1e5d8a, #3bb4a4, #d4af37)" }}
              initial={{ width: "0%" }}
              animate={{ width: `${Math.round(((bpeStep + (hasTyped.current ? 1 : 0)) / (BPE_STEPS.length)) * 100)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[12px] text-[#94a3b8]">
              Step {bpeStep + 1} of {BPE_STEPS.length} BPE steps
            </p>
            {!session?.user && (
              <p className="text-[11px] text-[#475569]">Sign in to save progress</p>
            )}
          </div>
        </div>

        {/* ── Section 1: Interactive Tokenizer ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-1">The Interactive Tokenizer</h2>
          <p className="text-[13px] text-[#94a3b8] mb-4">
            Type anything. Each coloured block is one token — roughly what a language model sees.
          </p>

          <textarea
            value={inputText}
            onChange={handleTextChange}
            rows={3}
            placeholder="Type something…"
            className="w-full rounded-xl px-4 py-3 text-[14px] text-white bg-[#1e293b] border border-white/10 focus:outline-none focus:border-[#3bb4a4] resize-none transition-colors placeholder:text-[#475569]"
          />

          {/* Token blocks */}
          <div className="mt-4 min-h-[56px] flex flex-wrap gap-1.5">
            <AnimatePresence mode="popLayout">
              {tokens.map((tok, i) => {
                const color = TOKEN_PALETTE[i % TOKEN_PALETTE.length];
                const display = tok.replace(/ /g, "·");
                return (
                  <motion.span
                    key={`${i}-${tok}`}
                    initial={{ opacity: 0, scale: 0.75, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.75, y: -6 }}
                    transition={{ duration: 0.18, delay: i * 0.025, ease: "easeOut" }}
                    title={tok}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-[13px] font-mono font-medium text-[#0f172a] select-none"
                    style={{ background: color }}
                  >
                    {display}
                  </motion.span>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Stats bar */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-[#94a3b8]">
            <span>
              <span className="text-white font-semibold">{tokens.length}</span> tokens
            </span>
            <span className="text-white/20">|</span>
            <span>
              <span className="text-white font-semibold">{charCount}</span> characters
            </span>
            <span className="text-white/20">|</span>
            <span>
              Cost estimate:{" "}
              <span className="text-[#d4af37] font-semibold">{estimateCost(tokens.length)}</span>
              <span className="text-[#475569] ml-1">(GPT-4o pricing)</span>
            </span>
          </div>
        </section>

        {/* ── Section 2: Comparison Examples ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-1">Token Comparison Examples</h2>
          <p className="text-[13px] text-[#94a3b8] mb-4">
            Real-world tokenizations showing how context, language, and structure affect token count.
          </p>

          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#1e293b] text-[#94a3b8] text-left">
                  <th className="px-4 py-3 font-medium">Input</th>
                  <th className="px-4 py-3 font-medium">Tokens</th>
                  <th className="px-4 py-3 font-medium text-right">Count</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_EXAMPLES.map((ex, rowIdx) => (
                  <tr
                    key={ex.input}
                    className={rowIdx % 2 === 0 ? "bg-[#0f172a]" : "bg-[#1e293b]/50"}
                  >
                    <td className="px-4 py-3 font-mono text-white whitespace-nowrap">{ex.input}</td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap gap-1">
                        {ex.tokens.map((tok, ti) => {
                          const color = TOKEN_PALETTE[ti % TOKEN_PALETTE.length];
                          return (
                            <span
                              key={ti}
                              className="inline-flex items-center px-2 py-0.5 rounded text-[12px] font-mono font-medium text-[#0f172a]"
                              style={{ background: color }}
                            >
                              {tok.replace(/ /g, "·")}
                            </span>
                          );
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-white">
                      {ex.tokens.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Section 3: Why Tokenization Matters ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-1">Why Tokenization Matters</h2>
          <p className="text-[13px] text-[#94a3b8] mb-4">
            Token count affects cost, context window usage, and even model quality across languages.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {INSIGHT_CARDS.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}
                className="rounded-2xl p-5 border"
                style={{
                  background: `${card.color}0d`,
                  borderColor: `${card.color}33`,
                }}
              >
                <p
                  className="text-[11px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: card.color }}
                >
                  {card.title}
                </p>
                <p className="text-[13px] text-[#94a3b8] leading-relaxed">{card.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Section 4: BPE Algorithm Visualization ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-1">BPE Algorithm Step-Through</h2>
          <p className="text-[13px] text-[#94a3b8] mb-4">
            Byte Pair Encoding merges frequent character pairs to build a vocabulary of
            ~50K subwords. Step through the process:
          </p>

          <div className="rounded-2xl border border-white/10 bg-[#1e293b] p-6">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-5">
              {BPE_STEPS.map((_, si) => (
                <div
                  key={si}
                  className="h-1.5 flex-1 rounded-full transition-all duration-300"
                  style={{
                    background: si <= bpeStep ? "#d4af37" : "#334155",
                  }}
                />
              ))}
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-3">
              {currentStep.label}
            </p>

            {/* Token visualisation */}
            <div className="flex flex-wrap gap-3 mb-4 min-h-[52px] items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={bpeStep}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="flex flex-wrap gap-2 items-center"
                >
                  {currentStep.tokens.map((group, gi) => (
                    <React.Fragment key={gi}>
                      {gi > 0 && <span className="text-[#475569] text-lg">+</span>}
                      <div className="flex gap-1 items-center">
                        {group.map((char, ci) => {
                          const isMerged = currentStep.merge !== null &&
                            currentStep.merge.length === group.length &&
                            group.every((c, idx) => c === currentStep.merge![idx]);
                          const color = isMerged ? "#d4af37" : TOKEN_PALETTE[gi % TOKEN_PALETTE.length];
                          return (
                            <motion.span
                              key={ci}
                              layout
                              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-[14px] font-mono font-bold text-[#0f172a]"
                              style={{ background: color }}
                            >
                              {char}
                            </motion.span>
                          );
                        })}
                      </div>
                    </React.Fragment>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>

            <p className="text-[13px] text-[#94a3b8] mb-5 leading-relaxed">
              {currentStep.explanation}
            </p>

            <div className="flex items-center gap-3">
              {bpeStep < BPE_STEPS.length - 1 ? (
                <button
                  onClick={handleNextBpeStep}
                  className="px-5 py-2 rounded-xl text-[13px] font-semibold text-[#0f172a] bg-[#d4af37] hover:bg-[#e5c348] transition-colors"
                >
                  Next Step →
                </button>
              ) : (
                <span className="px-5 py-2 rounded-xl text-[13px] font-semibold text-[#d4af37] border border-[#d4af37]/40">
                  Complete
                </span>
              )}
              {bpeStep > 0 && (
                <button
                  onClick={() => setBpeStep(0)}
                  className="text-[12px] text-[#475569] hover:text-[#94a3b8] transition-colors"
                >
                  Reset
                </button>
              )}
              <span className="ml-auto text-[12px] text-[#475569]">
                Step {bpeStep + 1} / {BPE_STEPS.length}
              </span>
            </div>
          </div>
        </section>

        {/* Gold insight box */}
        <div className="mb-10 rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/5 px-6 py-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#d4af37] mb-2">
            Insight
          </p>
          <p className="text-[14px] text-[#94a3b8] leading-relaxed">
            The word <span className="text-white font-mono">&ldquo;tokenize&rdquo;</span> splits as{" "}
            <span className="font-mono text-[#3bb4a4]">[&ldquo;token&rdquo;, &ldquo;ize&rdquo;]</span> — 2 tokens.
            But{" "}
            <span className="text-white font-mono">&ldquo;détokeniser&rdquo;</span> (French) splits into
            6+ tokens. This is why models perform better in English than other languages — every
            foreign or rare word consumes more context budget and costs more.
          </p>
        </div>

        {/* Summary card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          className="rounded-2xl border border-white/10 bg-[#1e293b] p-6"
        >
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#3bb4a4] mb-1">
            Up Next
          </p>
          <h3 className="text-lg font-bold text-white mb-2">
            From Tokens to Meaning: Embeddings
          </h3>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-4">
            Tokens are just integer IDs. Embeddings turn them into vectors in high-dimensional
            space — where similar words cluster together. Learn how in the next guide.
          </p>
          <Link
            href="/visual-guides/embeddings"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-[#0f172a] bg-[#3bb4a4] hover:bg-[#4fcfbe] transition-colors"
          >
            Explore Embeddings →
          </Link>
        </motion.div>

      </div>
    </div>
  );
}
