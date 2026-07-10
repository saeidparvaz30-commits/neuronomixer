"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  Workload,
  Prices,
  CacheKnobs,
  DEFAULT_WORKLOAD,
  DEFAULT_PRICES,
  DEFAULT_TTFT_MS,
  DEFAULT_TPOT_MS,
  DEFAULT_CACHE_KNOBS,
  computeRequestCost,
  computeLatency,
  cacheBreakEven,
  steadyCacheSavings,
  formatUSD,
  formatMs,
  formatPct,
} from "./costMath";
import CostCalculator from "./CostCalculator";
import LatencyWaterfall from "./LatencyWaterfall";
import StreamRace from "./StreamRace";
import CacheSavings from "./CacheSavings";

const GUIDE_TITLE = "Cost and Latency Engineering";
const NEXT_GUIDE_SLUG = "model-routing-cascades";

export default function CostLatencyClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Interaction state (mount defaults; Try Again restores exactly these) ──
  const [workload, setWorkload] = useState<Workload>(DEFAULT_WORKLOAD);
  const [prices, setPrices] = useState<Prices>(DEFAULT_PRICES);
  const [touchedCost, setTouchedCost] = useState<ReadonlySet<string>>(
    () => new Set<string>()
  );
  const [ttftMs, setTtftMs] = useState(DEFAULT_TTFT_MS);
  const [tpotMs, setTpotMs] = useState(DEFAULT_TPOT_MS);
  const [touchedLatency, setTouchedLatency] = useState<ReadonlySet<string>>(
    () => new Set<string>()
  );
  const [raceDone, setRaceDone] = useState(false);
  const [cacheKnobs, setCacheKnobs] = useState<CacheKnobs>(DEFAULT_CACHE_KNOBS);
  const [nReuse, setNReuse] = useState(1);
  const [cacheSolved, setCacheSolved] = useState(false);
  // Remount key so subcomponents drop their local state on Try Again.
  const [runId, setRunId] = useState(0);

  // ── Derived gates ──────────────────────────────────────────────────────────
  const gateCost = touchedCost.size >= 2;
  const gateLatency = touchedLatency.size >= 2;
  const isComplete = gateCost && gateLatency && raceDone && cacheSolved;

  // Completion-card stats, all recomputed from live state.
  const cost = computeRequestCost(workload, prices);
  const latency = computeLatency(ttftMs, tpotMs, workload.outputTokens);
  const breakEven = cacheBreakEven(
    workload.promptTokens,
    workload.outputTokens,
    prices,
    cacheKnobs
  );
  const savings = steadyCacheSavings(workload, prices, cacheKnobs);
  const soonerFactor = latency.ttftMs > 0 ? latency.totalMs / latency.ttftMs : 0;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const markTouched = (
    setter: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>,
    id: string
  ) => {
    setter((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleWorkloadChange = useCallback(
    (field: keyof Workload, value: number) => {
      setWorkload((prev) => ({ ...prev, [field]: value }));
      markTouched(setTouchedCost, field);
    },
    []
  );

  const handlePriceChange = useCallback(
    (field: keyof Prices, value: number) => {
      setPrices((prev) => ({ ...prev, [field]: value }));
      markTouched(setTouchedCost, field);
    },
    []
  );

  const handleTtftChange = useCallback((v: number) => {
    setTtftMs(v);
    markTouched(setTouchedLatency, "ttft");
  }, []);

  const handleTpotChange = useCallback((v: number) => {
    setTpotMs(v);
    markTouched(setTouchedLatency, "tpot");
  }, []);

  const handleRaceDone = useCallback(() => setRaceDone(true), []);

  const handleKnobChange = useCallback(
    (field: keyof CacheKnobs, value: number) => {
      setCacheKnobs((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleCacheSolved = useCallback(() => setCacheSolved(true), []);

  function handleReset() {
    setWorkload(DEFAULT_WORKLOAD);
    setPrices(DEFAULT_PRICES);
    setTouchedCost(new Set<string>());
    setTtftMs(DEFAULT_TTFT_MS);
    setTpotMs(DEFAULT_TPOT_MS);
    setTouchedLatency(new Set<string>());
    setRaceDone(false);
    setCacheKnobs(DEFAULT_CACHE_KNOBS);
    setNReuse(1);
    setCacheSolved(false);
    setRunId((r) => r + 1);
  }

  const progressItems = [
    {
      id: "cost",
      label: `Price the workload (${Math.min(touchedCost.size, 2)}/2 knobs)`,
      done: gateCost,
    },
    {
      id: "latency",
      label: `Decompose the wait (${touchedLatency.size}/2 knobs)`,
      done: gateLatency,
    },
    { id: "race", label: "Run the perception race", done: raceDone },
    { id: "cache", label: "Find the cache break-even", done: cacheSolved },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="cost-latency-engineering"
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
            Cost and Latency{" "}
            <span className="text-[var(--color-accent)]">Engineering</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            You pay per token, but users feel milliseconds. Price a real
            workload, split its wait into TTFT and generation, race streaming
            against blocking, and compute exactly when prompt caching pays for
            itself.
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* The two meters */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-3">
            The two meters every LLM product runs on
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                What you pay
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Every request bills tokens twice: the prompt you send in and the
                answer that comes back. Output tokens usually cost several times
                more per token, but prompts are often 10 to 50 times longer, and
                you resend them on every call. The bill is frequently dominated
                by input.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                What users feel
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Users never perceive your $/MTok. They perceive two numbers: how
                long until the first token appears (
                <span className="font-mono text-[#93c5fd]">TTFT</span>) and how
                fast text flows after that (
                <span className="font-mono text-[#93c5fd]">TPOT</span>, time per
                output token). Total wait = TTFT + tokens × TPOT.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            This guide stays on the product side of the ledger: what a request
            costs, why it feels slow, and when caching pays. The systems
            mechanics underneath these numbers (prefill vs decode, batching, KV
            memory) belong to the LLMs category.
          </p>
        </motion.section>

        {/* Section 1: cost calculator */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Price a workload
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            This is a live calculator, not a screenshot: every number below is
            recomputed from the sliders. Move at least two knobs to price a
            workload that looks like yours. Prices are editable assumptions,
            not facts.
          </p>
          <CostCalculator
            workload={workload}
            prices={prices}
            onWorkloadChange={handleWorkloadChange}
            onPriceChange={handlePriceChange}
          />
        </motion.section>

        {/* Section 2: latency waterfall */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Decompose the wait
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            The same request has a latency anatomy: nothing appears until TTFT,
            then tokens arrive one every TPOT milliseconds. Drag both knobs and
            watch which segment actually owns the wait.
          </p>
          <LatencyWaterfall
            ttftMs={ttftMs}
            tpotMs={tpotMs}
            outputTokens={workload.outputTokens}
            onTtftChange={handleTtftChange}
            onTpotChange={handleTpotChange}
          />
        </motion.section>

        {/* Section 3: streaming vs blocking */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Perceived speed: streaming vs blocking
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            Both responses below take exactly the same total time, computed from
            your numbers above. The only difference is when the user first sees
            something.
          </p>
          <StreamRace
            key={`race-${runId}`}
            ttftMs={ttftMs}
            tpotMs={tpotMs}
            outputTokens={workload.outputTokens}
            done={raceDone}
            onDone={handleRaceDone}
          />
        </motion.section>

        {/* Section 4: prompt caching */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Prompt caching: pay once to stop repaying
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            If a prefix of your prompt is identical across requests (system
            prompt, tool definitions, shared documents), you can pay a one-time
            write premium to store it, then a deep discount every time you
            reread it. The rates are editable multipliers; the savings are
            computed exactly from your workload above.
          </p>
          <CacheSavings
            key={`cache-${runId}`}
            promptTokens={workload.promptTokens}
            outputTokens={workload.outputTokens}
            requestsPerDay={workload.requestsPerDay}
            prices={prices}
            knobs={cacheKnobs}
            nReuse={nReuse}
            onKnobChange={handleKnobChange}
            onNReuseChange={setNReuse}
            solved={cacheSolved}
            onSolved={handleCacheSolved}
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
                  Workload Priced!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You priced a real workload, split its latency into TTFT and
                  generation, watched streaming change perceived speed, and
                  found exactly when caching pays.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your workload, per month
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {formatUSD(cost.perMonth)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      TTFT share of the wait
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[#93c5fd]">
                      {formatPct(latency.ttftShare)} of {formatMs(latency.totalMs)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Streaming showed content
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {soonerFactor.toFixed(1)}x sooner
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Cache break-even
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {breakEven !== null
                        ? `${breakEven} requests, then ${formatPct(savings.inputShareSaved)} off input`
                        : "not within range"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;You pay per token, but users feel the first one. Price
                    the workload before you ship it, stream so the wait ends at
                    TTFT instead of the last token, and cache the prefix you
                    resend on every call. The biggest wins in LLM products are
                    arithmetic you can do in advance.&quot;
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
