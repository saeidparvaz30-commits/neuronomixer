"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import { BATCH_SIZE, RunSettings, Strictness } from "./types";
import {
  BatchResult,
  GenerationTrace,
  mulberry32,
  runBatch,
  sampleGeneration,
  settingsSeed,
} from "./simulation";
import { formatCount, formatPct, formatUsd } from "./economics";
import SchemaCard from "./SchemaCard";
import SamplingLab from "./SamplingLab";
import RetryEconomics, { EconomicsSnapshot } from "./RetryEconomics";

const GUIDE_TITLE = "Structured Output Reliability";
const NEXT_GUIDE_SLUG = "agent-evaluation";

/** Error rate (in percent) that counts as "high" for the comparison gates. */
const HIGH_ERROR_PCT = 20;

interface BatchGate {
  errorRatePct: number;
  validRate: number;
}

export default function StructuredOutputReliabilityClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Interaction state (mount defaults; Try Again restores exactly these) ──
  const [errorRatePct, setErrorRatePct] = useState(10);
  const [strictness, setStrictness] = useState<Strictness>("strict");
  const [constrained, setConstrained] = useState(false);
  const [trace, setTrace] = useState<GenerationTrace | null>(null);
  const [traceSettings, setTraceSettings] = useState<RunSettings | null>(null);
  const [traceCount, setTraceCount] = useState(0);
  const [batch, setBatch] = useState<BatchResult | null>(null);
  const [batchSettings, setBatchSettings] = useState<RunSettings | null>(null);
  const [gateUnconstrained, setGateUnconstrained] = useState<BatchGate | null>(null);
  const [gateConstrained, setGateConstrained] = useState<BatchGate | null>(null);
  const [priceText, setPriceText] = useState("0.01");
  const [ackSnapshot, setAckSnapshot] = useState<EconomicsSnapshot | null>(null);

  // ── Derived gates ──────────────────────────────────────────────────────────
  const gatesReady = gateUnconstrained !== null && gateConstrained !== null;
  const isComplete = gatesReady && ackSnapshot !== null;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSampleTrace = useCallback(() => {
    const salt = traceCount + 1;
    const rng = mulberry32(settingsSeed(errorRatePct, strictness, constrained, salt));
    setTrace(sampleGeneration(rng, errorRatePct / 100, strictness, constrained));
    setTraceSettings({ errorRatePct, strictness, constrained });
    setTraceCount(salt);
  }, [traceCount, errorRatePct, strictness, constrained]);

  const handleRunBatch = useCallback(() => {
    const result = runBatch(
      BATCH_SIZE,
      errorRatePct / 100,
      strictness,
      constrained,
      settingsSeed(errorRatePct, strictness, constrained, 0)
    );
    setBatch(result);
    setBatchSettings({ errorRatePct, strictness, constrained });
    if (errorRatePct >= HIGH_ERROR_PCT) {
      const gate: BatchGate = { errorRatePct, validRate: result.validRate };
      if (constrained) setGateConstrained(gate);
      else setGateUnconstrained(gate);
    }
  }, [errorRatePct, strictness, constrained]);

  const handleAck = useCallback((snapshot: EconomicsSnapshot) => {
    setAckSnapshot(snapshot);
  }, []);

  function handleReset() {
    setErrorRatePct(10);
    setStrictness("strict");
    setConstrained(false);
    setTrace(null);
    setTraceSettings(null);
    setTraceCount(0);
    setBatch(null);
    setBatchSettings(null);
    setGateUnconstrained(null);
    setGateConstrained(null);
    setPriceText("0.01");
    setAckSnapshot(null);
  }

  const progressItems = [
    {
      id: "unconstrained",
      label: `Unconstrained batch at ${HIGH_ERROR_PCT}%+ error`,
      done: gateUnconstrained !== null,
    },
    {
      id: "constrained",
      label: `Constrained batch at ${HIGH_ERROR_PCT}%+ error`,
      done: gateConstrained !== null,
    },
    {
      id: "economics",
      label: "Acknowledge the retry costs",
      done: ackSnapshot !== null,
    },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="structured-output-reliability"
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
            Structured Output{" "}
            <span className="text-[var(--color-accent)]">Reliability</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            An agent is only as reliable as its worst JSON. Sample a simulated token
            stream, watch small per-token slips compound into unparseable output, then
            switch on grammar masking and price the retries with real formulas.
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

        {/* Why one bad token voids the output */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-3">
            The contract: one schema, one token path
          </p>
          <SchemaCard strictness={strictness} />
          <p className="text-[11px] text-[#475569] leading-relaxed mt-4">
            This guide is the reliability practice layer: what schemas and masking buy
            you and what retries cost. How constrained decoding manipulates the logits
            under the hood is a topic for the LLMs section; here the mask is simply a
            fact you can toggle.
          </p>
        </motion.section>

        {/* Sampling lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">The sampling lab</p>
          <SamplingLab
            errorRatePct={errorRatePct}
            strictness={strictness}
            constrained={constrained}
            onErrorRateChange={setErrorRatePct}
            onStrictnessChange={setStrictness}
            onConstrainedChange={setConstrained}
            trace={trace}
            traceSettings={traceSettings}
            batch={batch}
            batchSettings={batchSettings}
            onSampleTrace={handleSampleTrace}
            onRunBatch={handleRunBatch}
          />
          <p className="text-[11px] text-[#475569] leading-relaxed mt-4">
            To earn completion, push the error rate to {HIGH_ERROR_PCT}% or higher and
            run a {BATCH_SIZE}-generation batch in each decoding mode. Watch what
            happens to the valid rate, and watch which failure class refuses to die.
          </p>
        </motion.section>

        {/* Retry economics */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">Retry economics</p>
          <RetryEconomics
            errorRatePct={errorRatePct}
            strictness={strictness}
            priceText={priceText}
            onPriceChange={setPriceText}
            gatesReady={gatesReady}
            acked={ackSnapshot !== null}
            onAck={handleAck}
          />
        </motion.section>

        {/* Completion card */}
        <AnimatePresence>
          {isComplete && gateUnconstrained && gateConstrained && ackSnapshot && (
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
                  Outputs Under Contract!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You compounded per-token errors into failed parses, masked them away
                  with a real grammar, and priced the retries with the geometric
                  distribution.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Unconstrained valid rate
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {formatPct(gateUnconstrained.validRate)} at{" "}
                      {gateUnconstrained.errorRatePct}% error
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Constrained valid rate
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {formatPct(gateConstrained.validRate)} at{" "}
                      {gateConstrained.errorRatePct}% error
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Retry bill you read
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {formatCount(ackSnapshot.expectedAttempts)} attempts,{" "}
                      {formatUsd(ackSnapshot.costPerValidUnconstrained)} per valid
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;A schema turns silent garbage into detectable failures, a
                    grammar mask turns detectable failures into none, and neither can
                    tell you the JSON says the wrong thing. Price the retries you can
                    detect, and build evals for the failures you cannot.&quot;
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
