"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  DstMode,
  EVENTS,
  FillPolicy,
  Granularity,
  HOUR_MS,
  READINGS,
  READINGS_SEED,
  STRIP_BOUNDARY_INDEX,
  applyFillPolicy,
  applyGaps,
  naiveWallDiffMin,
  resample,
  trueDiffMin,
  zoneById,
} from "./timeModel";
import TimezoneTimeline from "./TimezoneTimeline";
import DstStrip from "./DstStrip";
import ResamplePanel from "./ResamplePanel";
import GapFillPanel from "./GapFillPanel";

const GUIDE_TITLE = "Time Is a Dirty Data Type";
const NEXT_GUIDE_SLUG = "data-pipeline";

export default function DatetimeDataClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // Section 1: timezone display
  const [zoneId, setZoneId] = useState("utc");
  const [tzSwitches, setTzSwitches] = useState(0);

  // Section 2: DST strips
  const [dstMode, setDstMode] = useState<DstMode>("spring");
  const [cursor, setCursor] = useState(0);
  const [springCrossed, setSpringCrossed] = useState(false);
  const [fallCrossed, setFallCrossed] = useState(false);

  // Section 3: resampling
  const [granularity, setGranularity] = useState<Granularity>("daily");

  // Section 4: gaps
  const [gapOn, setGapOn] = useState(false);
  const [policy, setPolicy] = useState<FillPolicy>("nan");
  const [policiesCompared, setPoliciesCompared] = useState<ReadonlySet<FillPolicy>>(
    () => new Set<FillPolicy>()
  );

  // ── Handlers (gates are set only by real user interaction) ─────────────────
  const handleZoneChange = useCallback(
    (id: string) => {
      if (id !== zoneId) setTzSwitches((n) => n + 1);
      setZoneId(id);
    },
    [zoneId]
  );

  const handleModeChange = useCallback((m: DstMode) => {
    setDstMode(m);
    setCursor(0);
  }, []);

  const handleCursorChange = useCallback(
    (next: number) => {
      const crossed =
        (cursor < STRIP_BOUNDARY_INDEX && next >= STRIP_BOUNDARY_INDEX) ||
        (cursor >= STRIP_BOUNDARY_INDEX && next < STRIP_BOUNDARY_INDEX);
      if (crossed) {
        if (dstMode === "spring") setSpringCrossed(true);
        else setFallCrossed(true);
      }
      setCursor(next);
    },
    [cursor, dstMode]
  );

  const handleToggleGap = useCallback(() => {
    setGapOn((on) => {
      const next = !on;
      if (next) {
        setPoliciesCompared((prev) => new Set(prev).add(policy));
      }
      return next;
    });
  }, [policy]);

  const handlePolicyChange = useCallback(
    (p: FillPolicy) => {
      setPolicy(p);
      if (gapOn) setPoliciesCompared((prev) => new Set(prev).add(p));
    },
    [gapOn]
  );

  // ── Derived gates ───────────────────────────────────────────────────────────
  const gateTz = tzSwitches >= 2;
  const gateDst = springCrossed && fallCrossed;
  const gateFill = policiesCompared.size >= 2;
  const isComplete = gateTz && gateDst && gateFill;

  function handleReset() {
    setZoneId("utc");
    setTzSwitches(0);
    setDstMode("spring");
    setCursor(0);
    setSpringCrossed(false);
    setFallCrossed(false);
    setGranularity("daily");
    setGapOn(false);
    setPolicy("nan");
    setPoliciesCompared(new Set<FillPolicy>());
  }

  // ── Recap numbers for the completion card, computed from the model ─────────
  const recap = useMemo(() => {
    const cet = zoneById("cet");
    const fallNaive = naiveWallDiffMin(cet, EVENTS[4].utc, EVENTS[5].utc);
    const fallTrue = trueDiffMin(EVENTS[4].utc, EVENTS[5].utc);
    const springNaive = naiveWallDiffMin(cet, EVENTS[2].utc, EVENTS[3].utc);
    const springTrue = trueDiffMin(EVENTS[2].utc, EVENTS[3].utc);
    const gapGrid = resample(applyGaps(READINGS), 6 * HOUR_MS);
    const meanNan = applyFillPolicy(gapGrid, "nan").mean;
    const meanZero = applyFillPolicy(gapGrid, "zero").mean;
    const zeroDropPct = ((meanNan - meanZero) / meanNan) * 100;
    return { fallNaive, fallTrue, springNaive, springTrue, zeroDropPct };
  }, []);

  const progressItems = [
    { id: "tz", label: "Switch timezone twice", done: gateTz },
    { id: "dst", label: "Cross both DST boundaries", done: gateDst },
    { id: "fill", label: "Compare 2 fill policies", done: gateFill },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="datetime-data" score={100} />
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
            Time Is a Dirty <span className="text-[var(--color-accent)]">Data Type</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Timezones, daylight saving jumps, irregular intervals, and silent gaps make the
            timestamp column the most error-prone field in real data. Convert instants across
            zones, walk through the hour that does not exist, and watch resampling and
            gap-filling change the story the same data tells.
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

        {/* Framing */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The one rule: store UTC, convert at display
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            A timestamp names a physical instant. A wall-clock reading like &quot;02:30&quot;
            names a position on somebody&apos;s local clock, and that mapping changes with
            politics, geography, and the season. The only safe pattern is to store the
            instant once, in UTC, and apply a timezone only when a human needs to read it.
            Every bug in this guide comes from breaking that rule.
          </p>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            How this playground stays honest: all timestamps are hardcoded constants in
            milliseconds since the Unix epoch, timezone and DST rules are written out as a
            small data table (not read from your browser), and the reading series is generated
            once by a seeded generator (mulberry32, seed {READINGS_SEED}). Every number on
            this page is recomputed live from those constants with plain arithmetic.
          </p>
        </motion.section>

        {/* Section 1 */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-1">
            1 · One instant, four wall clocks
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Six order events, stored once in UTC. Switch the display zone and watch the same
            instants land on different dates, shift across midnight, and (in the DST zone)
            skip or repeat an hour. The data never changes; only the lens does. Switch at
            least twice to see it move.
          </p>
          <TimezoneTimeline zoneId={zoneId} onZoneChange={handleZoneChange} />
        </motion.section>

        {/* Section 2 */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-1">
            2 · The missing hour and the double hour
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Twice a year the Central European wall clock breaks its promise to be a number
            line. Step the cursor across both 2024 transitions: in March, 02:00 to 02:59
            never happens; in October, it happens twice. UTC underneath ticks evenly through
            both.
          </p>
          <DstStrip
            mode={dstMode}
            onModeChange={handleModeChange}
            cursor={cursor}
            onCursorChange={handleCursorChange}
            springCrossed={springCrossed}
            fallCrossed={fallCrossed}
          />
        </motion.section>

        {/* Section 3 */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-1">
            3 · Resampling is an aggregation policy
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Real-world readings rarely arrive on a clean grid. This series has{" "}
            {READINGS.length} measurements taken every 25 to 95 minutes over two weeks, with
            a 4-hour traffic incident on Mar 29. Resample it hourly, daily, and weekly, and
            decide which story you would have told your team.
          </p>
          <ResamplePanel granularity={granularity} onGranularityChange={setGranularity} />
        </motion.section>

        {/* Section 4 */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-1">
            4 · Gaps: missing data wearing a timestamp
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Now break the collector. Two outage windows drop every reading they cover, and the
            6-hour resample grid suddenly has empty buckets. Something must go in those slots,
            and each choice quietly asserts a different claim about the world. Compare at least
            two policies with the outages on.
          </p>
          <GapFillPanel
            gapOn={gapOn}
            onToggleGap={handleToggleGap}
            policy={policy}
            onPolicyChange={handlePolicyChange}
            policiesCompared={policiesCompared}
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
                  Timestamps Tamed!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You moved instants across timezones, crossed both DST cliffs, and saw
                  resampling and gap-filling rewrite the same data&apos;s story.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Timezone switches you made</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {tzSwitches}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Naive fall-back duration (true: {recap.fallTrue} min)
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {recap.fallNaive} min
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Zero-fill bias on the 14-day mean</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      -{recap.zeroDropPct.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Store the instant in UTC and convert only at display. A wall-clock
                    time is a rendering, not a value: do arithmetic on it and daylight saving
                    will eventually hand you a negative duration. And when you resample or
                    fill gaps, you are not cleaning the data, you are choosing its story, so
                    choose explicitly.&quot;
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
