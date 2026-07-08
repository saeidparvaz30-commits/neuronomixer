"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  generatePopulation,
  generateFleet,
  survivorsWithArmor,
  CHANNELS,
  CHECKLIST_GROUPS,
  ChannelId,
  ZoneId,
  ZONE_META,
  ARMOR_SLOTS,
  POPULATION_SEED,
  POPULATION_SIZE,
  FLEET_SEED,
  FLEET_SIZE,
  mean,
} from "./types";
import ChannelExplorer from "./ChannelExplorer";
import WaldScenario from "./WaldScenario";
import InvisibleChecklist from "./InvisibleChecklist";

// Deterministic datasets: identical on server and client (seeded PRNG, no Math.random).
const PEOPLE = generatePopulation();
const FLEET = generateFleet();

const GUIDE_TITLE = "The Data That Never Arrived";
const GUIDE_SLUG = "data-collection-bias";
const NEXT_GUIDE_SLUG = "tidy-data-and-reshaping";

const CHECKLIST_KEY = new Set(
  CHECKLIST_GROUPS.filter((g) => g.invisible).map((g) => g.id)
);

export default function DataCollectionBiasClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // Section 1: channel explorer
  const [channel, setChannel] = useState<ChannelId>("census");
  const [visited, setVisited] = useState<ReadonlySet<ChannelId>>(new Set());
  const [nonResponse, setNonResponse] = useState(false);

  // Section 2: Wald scenario
  const [armor, setArmor] = useState<ReadonlySet<ZoneId>>(new Set());
  const [flown, setFlown] = useState(false);
  const [waldDone, setWaldDone] = useState(false);
  const [bestSaved, setBestSaved] = useState<{ saved: number; zones: ZoneId[] } | null>(null);

  // Section 3: checklist
  const [checklistSelected, setChecklistSelected] = useState<ReadonlySet<string>>(new Set());
  const [checklistDone, setChecklistDone] = useState(false);

  // ── Live computation ────────────────────────────────────────────────────────
  const trueMean = useMemo(() => mean(PEOPLE.map((p) => p.hours)), []);
  const baselineSurvivors = useMemo(() => FLEET.filter((p) => p.survived).length, []);

  const largestGap = useMemo(() => {
    let worst = 0;
    for (const id of visited) {
      const meta = CHANNELS.find((c) => c.id === id)!;
      const sample = PEOPLE.filter((p) => meta.reaches(p));
      const g = mean(sample.map((p) => p.hours)) - trueMean;
      if (Math.abs(g) > Math.abs(worst)) worst = g;
    }
    return worst;
  }, [visited, trueMean]);

  const checklistSolvedNow =
    checklistSelected.size === CHECKLIST_KEY.size &&
    [...CHECKLIST_KEY].every((id) => checklistSelected.has(id));

  useEffect(() => {
    if (checklistSolvedNow) setChecklistDone(true);
  }, [checklistSolvedNow]);

  // ── Gates ──────────────────────────────────────────────────────────────────
  const gateChannels = visited.size >= 2;
  const gateWald = waldDone;
  const gateChecklist = checklistDone;
  const isComplete = gateChannels && gateWald && gateChecklist;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChannelChange = useCallback((c: ChannelId) => {
    setChannel(c);
    if (c !== "census") {
      setVisited((prev) => (prev.has(c) ? prev : new Set(prev).add(c)));
    }
  }, []);

  const handleToggleZone = useCallback((z: ZoneId) => {
    setArmor((prev) => {
      const next = new Set(prev);
      if (next.has(z)) next.delete(z);
      else if (next.size < ARMOR_SLOTS) next.add(z);
      return next;
    });
  }, []);

  const handleFly = useCallback(() => {
    setFlown(true);
    setWaldDone(true);
    const saved = survivorsWithArmor(FLEET, armor) - baselineSurvivors;
    setBestSaved((prev) =>
      prev === null || saved > prev.saved ? { saved, zones: [...armor] } : prev
    );
  }, [armor, baselineSurvivors]);

  const handleRearm = useCallback(() => {
    setArmor(new Set());
    setFlown(false);
    // waldDone stays latched: the scenario has been completed once.
  }, []);

  const handleChecklistToggle = useCallback((id: string) => {
    setChecklistSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  function handleReset() {
    setChannel("census");
    setVisited(new Set());
    setNonResponse(false);
    setArmor(new Set());
    setFlown(false);
    setWaldDone(false);
    setBestSaved(null);
    setChecklistSelected(new Set());
    setChecklistDone(false);
  }

  const progressItems = [
    { id: "channels", label: "Compare 2 collection channels", done: gateChannels },
    { id: "wald", label: "Complete the Wald scenario", done: gateWald },
    { id: "checklist", label: "Solve the invisibility checklist", done: gateChecklist },
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
            The Data That <span className="text-[var(--color-accent)]">Never Arrived</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Bias does not wait for the analysis. It walks in with the data, at
            the moment of collection, and whoever the channel could never reach
            cannot be recovered by any model downstream. Pick channels, armor
            bombers, and learn to ask the one question your table cannot answer
            for you.
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

        {/* Definition */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The table is not the world
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            Every dataset is the output of a collection process, and that
            process has a shape: a phone number dialed, an app installed, a
            prompt answered, a plane that made it home. Rows that the process
            could not produce are not missing values you can impute. They are
            missing people, and no amount of cleaning, weighting, or modeling
            can conjure information the channel never captured. The estimator
            math of sampling designs belongs to the{" "}
            <Link
              href="/visual-guides/sampling-methods-bias"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              sampling methods and bias
            </Link>{" "}
            guide. This guide stays on the craft question that comes before any
            formula: who could never appear in this data?
          </p>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            How this playground stays honest: the city of {POPULATION_SIZE}{" "}
            residents (seed {POPULATION_SEED}) and the fleet of {FLEET_SIZE}{" "}
            simulated sorties (seed {FLEET_SEED}) are generated once with a
            seeded generator. Every average, gap, hit count, and survivor count
            on this page is computed live from those records. Nothing is faked.
          </p>
        </motion.section>

        {/* Section 1: channel selection */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            1 · Selection at the channel
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-4">
            A city agency wants the average daily hours residents spend online.
            The full census below is the truth it will never afford. Every
            realistic channel reaches a systematically different slice of the
            city. Switch channels and watch the estimate drift away from a
            truth that never changed.
          </p>
          <ChannelExplorer
            people={PEOPLE}
            channel={channel}
            onChannelChange={handleChannelChange}
            nonResponse={nonResponse}
            onNonResponseChange={setNonResponse}
            visited={visited}
          />
        </motion.section>

        {/* Taxonomy card */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-3">
            Three ways people vanish before the first row is written
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-1.5">
                Selection at the channel
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                The channel itself filters who can be observed. A landline
                survey cannot dial someone without a landline. You just watched
                this move an estimate above.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-1.5">
                Survivorship
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                You only observe entities that survived long enough to be
                observed: returning planes, companies still in business, users
                who did not churn. The scenario below is the classic case.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-1.5">
                Non-response
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                Reachable people who never answer, and whose silence correlates
                with what you are measuring. The checkbox in section 1 stacks
                this on top of channel selection.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Section 2: Wald */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            2 · Survivorship: the bombers that never came back
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-2">
            In World War II, the US military worked with the Statistical
            Research Group, a wartime team of statisticians based at Columbia
            University, on questions about aircraft damage. Abraham Wald worked
            on that problem. As the story is usually told, the instinct was to
            add armor where returning bombers showed the most bullet holes;
            Wald pointed at the planes nobody could inspect, the ones that
            never came back. His actual memoranda built methods for estimating
            survival probabilities from damage observed only on survivors, and
            the famous anecdote compresses that work into one inversion: the
            sparse patches on returners mark the hits that kill.
          </p>
          <p className="text-[11px] text-[#475569] leading-relaxed max-w-[720px] mb-4">
            The fleet below is a seeded simulation built for this exercise, not
            historical data. You get to make the call Wald made, with the same
            information he had: hits on returners only.
          </p>
          <WaldScenario
            fleet={FLEET}
            armor={armor}
            onToggleZone={handleToggleZone}
            flown={flown}
            onFly={handleFly}
            onRearm={handleRearm}
          />
        </motion.section>

        {/* Section 3: checklist */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            3 · The discipline: who could never appear in this data?
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-4">
            The fix is not a formula. It is a habit: before trusting any
            number, reconstruct the collection process and list the groups it
            structurally excludes. Practice on a scenario every product team
            has met.
          </p>
          <InvisibleChecklist
            selected={checklistSelected}
            onToggle={handleChecklistToggle}
            solved={checklistDone}
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
                  You Found the Missing Rows
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You watched channels bend an estimate, out-thought a hit map
                  of survivors, and named the groups a dashboard can never see.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Largest channel gap you found
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {largestGap >= 0 ? "+" : ""}
                      {largestGap.toFixed(2)} h
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      vs a true average of {trueMean.toFixed(2)} h
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Best armor run: extra planes saved
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {bestSaved ? `+${bestSaved.saved}` : "?"}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      {bestSaved && bestSaved.zones.length > 0
                        ? bestSaved.zones.map((z) => ZONE_META[z].label).join(" + ")
                        : "vs no armor"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Invisible groups identified
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {CHECKLIST_KEY.size} of {CHECKLIST_KEY.size}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      with zero false alarms
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Every dataset is a survivor of its own collection
                    process. Before you model what the table says, ask who
                    could never appear in it, because no analysis downstream
                    can interview the people who were never at the table.&quot;
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
