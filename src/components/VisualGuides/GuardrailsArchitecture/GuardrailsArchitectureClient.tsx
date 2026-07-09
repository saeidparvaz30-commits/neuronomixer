"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  GuardrailConfig,
  DEFAULT_CONFIG,
  LayerId,
  LAYER_IDS,
  evaluateCorpus,
  referencePoints,
  enabledSignature,
  enabledCount,
  FULL_STACK_CONFIG,
  ATTACK_COUNT,
  BENIGN_COUNT,
} from "./corpus";
import LayerControls from "./LayerControls";
import TradeoffCurve from "./TradeoffCurve";
import CorpusTable from "./CorpusTable";

const GUIDE_TITLE = "Guardrails Architecture";
const NEXT_GUIDE_SLUG = "prompt-injection";
const FULL_SIGNATURE = enabledSignature(FULL_STACK_CONFIG);

export default function GuardrailsArchitectureClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  const [config, setConfig] = useState<GuardrailConfig>(DEFAULT_CONFIG);
  const [explored, setExplored] = useState<ReadonlySet<string>>(
    () => new Set<string>([enabledSignature(DEFAULT_CONFIG)]),
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inspectedOnce, setInspectedOnce] = useState(false);

  const recordConfig = useCallback((next: GuardrailConfig) => {
    setExplored((prev) => {
      const sig = enabledSignature(next);
      if (prev.has(sig)) return prev;
      const nextSet = new Set(prev);
      nextSet.add(sig);
      return nextSet;
    });
  }, []);

  const handleToggle = useCallback(
    (id: LayerId) => {
      const next = { ...config, [id]: !config[id] };
      setConfig(next);
      recordConfig(next);
    },
    [config, recordConfig],
  );

  const handleThreshold = useCallback(
    (which: "inputThreshold" | "policyThreshold", value: number) => {
      setConfig((prev) => ({ ...prev, [which]: value }));
    },
    [],
  );

  const handleExpand = useCallback((id: string) => {
    setInspectedOnce(true);
    setExpandedId((cur) => (cur === id ? null : id));
  }, []);

  function handleReset() {
    setConfig(DEFAULT_CONFIG);
    setExplored(new Set<string>([enabledSignature(DEFAULT_CONFIG)]));
    setExpandedId(null);
    setInspectedOnce(false);
  }

  const stats = useMemo(() => evaluateCorpus(config), [config]);
  const refs = useMemo(() => referencePoints(), []);
  const layersOn = enabledCount(config);

  // Completion-card stats: computed from the same corpus module as everything else.
  const bestSingleLayerRate = useMemo(
    () => Math.max(...refs.filter((p) => p.id !== "full").map((p) => p.blockRate)),
    [refs],
  );
  const tunedFullStackRate = useMemo(
    () =>
      evaluateCorpus({ ...FULL_STACK_CONFIG, inputThreshold: 2, policyThreshold: 2 })
        .blockRate,
    [],
  );

  // ── Completion gates ────────────────────────────────────────────────────────
  const sawSingleLayer = useMemo(
    () => [...explored].some((sig) => sig !== "none" && sig.split("+").length === 1),
    [explored],
  );
  const sawFullStack = explored.has(FULL_SIGNATURE);
  const isComplete = sawSingleLayer && sawFullStack && inspectedOnce;

  const progressItems = [
    { id: "single", label: "Replay one layer alone", done: sawSingleLayer },
    { id: "stack", label: "Replay all four layers", done: sawFullStack },
    { id: "inspect", label: "Inspect a corpus item", done: inspectedOnce },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="guardrails-architecture"
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
            Guardrails <span className="text-[var(--color-accent)]">Architecture</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[600px]"
          >
            No single filter stops a determined attacker. Toggle four defense layers over a
            fixed set of attack and benign strings, run them through transparent rule-based
            classifiers, and watch the block rate and the false-positive rate move against
            each other. The lesson is computed, not asserted: single layers fail where stacks
            hold.
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

        {/* Concept: why layers */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-3">Defense in depth, made testable</p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            A guardrail is any check that sits between a request and a consequence. There are
            four common places to put one: filter the input before the model sees it, constrain
            the model with a system-prompt policy, filter the output after generation, and gate
            the actual actions the model can take. Each catches a different kind of attack and
            misses others. The only honest way to see this is to run a small designed corpus
            through them.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { k: "Corpus size", v: `${ATTACK_COUNT + BENIGN_COUNT} strings` },
              { k: "Attacks", v: `${ATTACK_COUNT}` },
              { k: "Benign", v: `${BENIGN_COUNT}` },
              { k: "Layers", v: "4" },
            ].map((s) => (
              <div key={s.k} className="rounded-xl border border-[#1e293b] p-3">
                <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">{s.k}</p>
                <p className="text-[15px] font-mono font-bold text-[#f1f5f9]">{s.v}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#475569] leading-relaxed mt-3">
            Every attack string below is a tame, illustrative example, the benign strings are
            deliberately authored to trip naive filters so the false-positive pressure is real,
            and every model response shown is authored for the demo, never generated by a live
            model. The classifiers are plain pattern rules you can read, not a hidden scoring
            model.
          </p>
        </motion.section>

        {/* Layer controls */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">Build your stack</p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            Turn layers on and off and drag the thresholds. The whole corpus re-runs instantly.
            Start with a single layer to watch it fail, then stack all four.
          </p>
          <LayerControls
            config={config}
            onToggle={handleToggle}
            onThreshold={handleThreshold}
          />
        </motion.section>

        {/* Live rates + tradeoff curve */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-4">The tradeoff, live</p>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">Layers on</p>
              <p className="text-2xl font-black font-mono text-[#f1f5f9]">{layersOn}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-success)]/40 p-3">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">Block rate</p>
              <p
                className="text-2xl font-black font-mono"
                style={{ color: "var(--color-success)" }}
                aria-live="polite"
              >
                {Math.round(stats.blockRate * 100)}%
              </p>
              <p className="text-[10px] text-[#475569] mt-0.5">
                {stats.tp}/{ATTACK_COUNT} attacks
              </p>
            </div>
            <div className="rounded-xl border border-[var(--color-warning)]/40 p-3">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                False positives
              </p>
              <p
                className="text-2xl font-black font-mono"
                style={{ color: "var(--color-warning)" }}
                aria-live="polite"
              >
                {Math.round(stats.falsePositiveRate * 100)}%
              </p>
              <p className="text-[10px] text-[#475569] mt-0.5">
                {stats.fp}/{BENIGN_COUNT} benign
              </p>
            </div>
          </div>

          <TradeoffCurve
            reference={refs}
            current={{
              falsePositiveRate: stats.falsePositiveRate,
              blockRate: stats.blockRate,
              label: enabledSignature(config),
            }}
          />
        </motion.section>

        {/* Corpus table */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            What each layer caught and missed
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            Every row is scored by the classifiers for the current stack. The four boxes show
            which layers blocked it (pink) versus let it through. Click any string to see the
            matched patterns, the authored response, and why the verdict came out the way it
            did. Look for the exfiltration attack that only tool permissioning stops.
          </p>
          <CorpusTable
            results={stats.results}
            expandedId={expandedId}
            onExpand={handleExpand}
          />
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
            {[
              { c: "var(--color-success)", t: "attack blocked (good)" },
              { c: "#ef4444", t: "attack missed (bad)" },
              { c: "var(--color-warning)", t: "benign blocked (false positive)" },
              { c: "#94a3b8", t: "benign allowed (good)" },
            ].map((l) => (
              <div key={l.t} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: l.c }} />
                <span className="text-[10px] text-[#94a3b8]">{l.t}</span>
              </div>
            ))}
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
                  Stack assembled
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You ran a single layer, watched it fail, then stacked all four and inspected
                  how the verdict was reached string by string.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Configs replayed</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {explored.size}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Best single layer</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {Math.round(bestSingleLayerRate * 100)}% blocked
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Full stack, tuned</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {Math.round(tunedFullStackRate * 100)}% blocked
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;No single guardrail catches everything, and every one of them blocks
                    some legitimate requests. Layer defenses so each covers another&apos;s blind
                    spot, then tune thresholds to hold the block rate high while pulling the
                    false-positive rate down. The exfiltration attack proves the point: only an
                    action gate stops it, and no amount of text filtering ever will.&quot;
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
