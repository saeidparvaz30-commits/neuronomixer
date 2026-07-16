"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  GUARDRAIL_DEFAULT_PCT,
  RunRecord,
  TARGETS,
  fmtInt,
  fmtPct,
  summarize,
} from "./types";
import OptimizerLab from "./OptimizerLab";

const GUIDE_TITLE = "Metrics That Do Not Backfire";
const GUIDE_SLUG = "metrics-design";
const NEXT_GUIDE_SLUG = "what-is-ml";

export default function MetricsDesignClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  const [guardEnabled, setGuardEnabled] = useState(false);
  const [guardFloorPct, setGuardFloorPct] = useState(GUARDRAIL_DEFAULT_PCT);
  const [runLog, setRunLog] = useState<RunRecord[]>([]);
  const [resetKey, setResetKey] = useState(0);

  const handleRunComplete = useCallback((record: RunRecord) => {
    setRunLog((prev) => [...prev, record]);
  }, []);

  // ── Gates: both earned by actually finishing full simulation runs ──────────
  const unguardedRun = useMemo(
    () =>
      [...runLog]
        .reverse()
        .find((r) => r.target === "clicks" && !r.guardrail.enabled) ?? null,
    [runLog]
  );
  const guardedRun = useMemo(
    () =>
      [...runLog]
        .reverse()
        .find((r) => r.target === "clicks" && r.guardrail.enabled) ?? null,
    [runLog]
  );
  const gateBackfire = unguardedRun !== null;
  const gateGuarded = guardedRun !== null;
  const isComplete = gateBackfire && gateGuarded;

  const unguardedSummary = unguardedRun ? summarize(unguardedRun.history) : null;
  const guardedSummary = guardedRun ? summarize(guardedRun.history) : null;

  function handleReset() {
    setRunLog([]);
    setGuardEnabled(false);
    setGuardFloorPct(GUARDRAIL_DEFAULT_PCT);
    setResetKey((k) => k + 1);
  }

  const progressItems = [
    { id: "backfire", label: "Optimize clicks with no guardrail", done: gateBackfire },
    { id: "guarded", label: "Re-run clicks with a retention guardrail", done: gateGuarded },
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
            Metrics That Do Not <span className="text-[var(--color-accent)]">Backfire</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            A metric is not a measurement. It is a steering wheel. Hand a
            relentless optimizer one number to maximize and watch what happens
            to everything you did not write down. Then fence it with a
            guardrail and run it again.
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

        {/* Definition + honesty note */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            A metric is a decision instrument
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            Teams do not collect numbers to admire them. Numbers get wired into
            decisions: what ships, who gets budget, which experiment wins, what
            an algorithm promotes. The moment a number starts steering behavior
            it stops being a passive reading and becomes a target, and targets
            get optimized by people, by incentives, and by literal optimizers.
            Good metric design assumes that pressure from day one and splits
            the work across three roles: a north star, input metrics, and
            guardrails.
          </p>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            How this playground stays honest: the product below is a small
            simulation with three state variables (content mix, user trust,
            active users) and three derived metrics (CTR, retention, clicks),
            advanced day by day in your browser under the rules listed next to
            it. Every number on every dashboard is read live from that
            simulation state. Nothing is pre-baked.
          </p>
        </motion.section>

        {/* Section 1: vocabulary */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            1 · Three jobs for a metric
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-4">
            A healthy metric system is not one perfect number. It is a division
            of labor.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-1.5">
                North star
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                The one slow outcome that says the product is working for users
                and the business, over quarters. Think retained weekly readers,
                not raw traffic. You monitor it; you cannot move it directly
                this sprint, and that is a feature: outcomes are hard to game.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-1.5">
                Input metrics
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                The levers a team can actually move this week that feed the
                north star: publishing cadence, load time, recommendation
                quality, activation steps. You manage inputs and check they
                still correlate with the outcome. Clicks live here, not at the
                top.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-1.5">
                Guardrails
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                The metrics you refuse to trade away while pushing everything
                else: retention, quality, latency, trust. A guardrail is a
                constraint, not a target. Its whole job is to say no to wins
                that quietly spend something you cannot buy back.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Section 2: the lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            2 · The optimizer lab
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-4">
            You run a content feed. A greedy optimizer controls exactly one
            thing: the share of clickbait in the publishing mix. Every
            simulated day it nudges that share in whichever direction improves
            the metric you gave it, looking one day ahead, exactly like a
            growth loop tuned on a dashboard. Pick clicks per day and press
            run. Watch the front page fill with bait while retention decays.
            Then switch the retention guardrail on and run it again.
          </p>
          <OptimizerLab
            key={resetKey}
            guardEnabled={guardEnabled}
            onGuardEnabledChange={setGuardEnabled}
            guardFloorPct={guardFloorPct}
            onGuardFloorChange={setGuardFloorPct}
            onRunComplete={handleRunComplete}
          />

          {/* Experiment log */}
          {runLog.length > 0 && (
            <div className="mt-4 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5 overflow-x-auto">
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
                Your experiment log
              </p>
              <table className="w-full border-collapse text-[11px] min-w-[560px]">
                <thead>
                  <tr className="bg-[#1e293b] text-[#94a3b8]">
                    <th className="text-left font-semibold px-3 py-2">Run</th>
                    <th className="text-left font-semibold px-3 py-2">Target</th>
                    <th className="text-left font-semibold px-3 py-2">Guardrail</th>
                    <th className="text-right font-semibold px-3 py-2">Peak clicks</th>
                    <th className="text-right font-semibold px-3 py-2">Final clicks</th>
                    <th className="text-right font-semibold px-3 py-2">Final retention</th>
                    <th className="text-right font-semibold px-3 py-2">Final users</th>
                  </tr>
                </thead>
                <tbody>
                  {runLog.map((r, i) => {
                    const s = summarize(r.history);
                    return (
                      <tr
                        key={r.id}
                        style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
                      >
                        <td className="px-3 py-2 font-mono text-[#94a3b8]">{i + 1}</td>
                        <td className="px-3 py-2 text-[#f1f5f9]">
                          {TARGETS.find((t) => t.id === r.target)!.label}
                        </td>
                        <td className="px-3 py-2 text-[#94a3b8]">
                          {r.guardrail.enabled
                            ? `retention >= ${r.guardrail.minRetentionPct}%`
                            : "off"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[#f1f5f9]">
                          {fmtInt(s.peak.clicks)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[#f1f5f9]">
                          {fmtInt(s.final.clicks)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[#f1f5f9]">
                          {fmtPct(s.final.retention)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[#f1f5f9]">
                          {fmtInt(s.final.users)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[10px] text-[#475569] mt-3 leading-relaxed">
                Every row is a full 80-day run you completed. Compare an
                unguarded clicks run against a guarded one: same optimizer,
                same world, one constraint apart.
              </p>
            </div>
          )}
        </motion.section>

        {/* Section 3: Goodhart */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-3">
            3 · Goodhart&apos;s law, live
          </h2>
          <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-4">
            <p className="text-[13px] text-[#f1f5f9] leading-relaxed italic">
              &quot;When a measure becomes a target, it ceases to be a good
              measure.&quot;
            </p>
            <p className="text-[11px] text-[#475569] mt-1.5">
              Marilyn Strathern (1997), summarizing economist Charles
              Goodhart&apos;s 1975 observation.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12px] text-[#94a3b8] leading-relaxed">
            <div>
              <p className="mb-2">
                You just watched the law execute. Clicks were only ever a proxy
                for &quot;people found something worth reading.&quot; The
                moment the proxy became the target, the optimizer found the
                cheapest way to manufacture the number without the outcome
                behind it. For a while the dashboard looked great. Then the
                users it burned stopped coming back, and the target metric
                itself collapsed below where it started. The metric did not
                just mislead; it ate itself.
              </p>
              <p>
                The optimizer here stands in for any optimizing pressure: a
                ranking algorithm, a growth team with a bonus tied to one KPI,
                a vendor managing to an SLA, a model trained on a reward. None
                of them are malicious. They are all obedient, and that is the
                problem.
              </p>
            </div>
            <div>
              <p className="mb-2">
                The guardrail did not make the optimizer any wiser. It bounded
                the damage: the same greedy loop pushed bait up until the
                projected return rate touched the floor, then held the line
                there. Notice the overshoot in your guarded run: retention lags
                because trust moves slowly, so the mix climbed too far early
                and was dragged back only as the floor began to bind.
                Guardrails on lagging metrics always bind late. Set them
                tighter than the level that actually hurts.
              </p>
              <p>
                And pointing the optimizer at retention itself grew nothing at
                all. A guardrail makes a poor target for the same reason it
                makes a good fence: the safest move is always to do nothing.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Completion card */}
        <AnimatePresence>
          {isComplete && unguardedSummary && guardedSummary && (
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
                  You Fenced the Optimizer
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You watched an unguarded target eat itself, then bounded the
                  same pressure with one constraint.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      The backfire you triggered
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {fmtInt(unguardedSummary.peak.clicks)} →{" "}
                      {fmtInt(unguardedSummary.final.clicks)}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      clicks/day, peak (day {unguardedSummary.peakDay}) to day
                      80; retention {fmtPct(unguardedSummary.start.retention, 0)}{" "}
                      → {fmtPct(unguardedSummary.final.retention, 0)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      With the guardrail on
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {fmtPct(guardedSummary.final.retention)}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      final retention vs a {guardedRun!.guardrail.minRetentionPct}
                      % floor; {fmtInt(guardedSummary.final.clicks)} clicks/day
                      on day 80
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Users the guardrail kept
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      +
                      {fmtInt(
                        guardedSummary.final.users - unguardedSummary.final.users
                      )}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      day-80 active users, guarded run vs unguarded run
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Every metric you publish becomes a target for
                    something that optimizes harder than you expected. Name one
                    north star for the outcome, move it through input metrics
                    you can control, and fence it with guardrails you refuse to
                    trade, because an unguarded metric is an instruction to
                    game it.&quot;
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
