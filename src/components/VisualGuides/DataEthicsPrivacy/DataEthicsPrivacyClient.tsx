"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  AgeLevel,
  DIRECTORY,
  FULL_DETAIL,
  GenderLevel,
  HEALTH_RECORDS,
  kAnonymity,
  matchesFor,
  Settings,
  settingsKey,
  TARGET_K,
  TriedSetting,
  uniqueMatchCount,
  utility,
  ZipLevel,
} from "./types";
import AttackPhase from "./AttackPhase";
import DefensePhase from "./DefensePhase";
import TradeoffChart from "./TradeoffChart";

const GUIDE_TITLE = "Anonymous Is Harder Than You Think";
const GUIDE_SLUG = "data-ethics-privacy";
const NEXT_GUIDE_SLUG = "metrics-design";

const ATTACK_GOAL = 3;
const EXPLORE_GOAL = 3;
const DEFAULT_KEY = settingsKey(FULL_DETAIL);

function makeTried(settings: Settings): TriedSetting {
  return {
    key: settingsKey(settings),
    settings,
    k: kAnonymity(settings).k,
    utilityScore: utility(settings).score,
  };
}

export default function DataEthicsPrivacyClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // Section 1: the attack
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [attempted, setAttempted] = useState<ReadonlyMap<string, number>>(
    new Map()
  );
  const [reIdentified, setReIdentified] = useState<ReadonlySet<string>>(
    new Set()
  );

  // Section 2 + 3: the defense and its history
  const [settings, setSettings] = useState<Settings>(FULL_DETAIL);
  const [tried, setTried] = useState<ReadonlyMap<string, TriedSetting>>(
    () => new Map([[DEFAULT_KEY, makeTried(FULL_DETAIL)]])
  );

  // ── Live computation ───────────────────────────────────────────────────────
  const totalUnique = useMemo(() => uniqueMatchCount(FULL_DETAIL), []);
  const triedList = useMemo(() => [...tried.values()], [tried]);

  const kReached = useMemo(
    () => triedList.some((t) => t.k >= TARGET_K),
    [triedList]
  );
  const exploredCount = useMemo(
    () => triedList.filter((t) => t.key !== DEFAULT_KEY).length,
    [triedList]
  );
  const bestDefense = useMemo(() => {
    const candidates = triedList.filter((t) => t.k >= TARGET_K);
    if (candidates.length === 0) return null;
    return candidates.reduce((best, t) =>
      t.utilityScore > best.utilityScore ? t : best
    );
  }, [triedList]);

  // ── Gates ──────────────────────────────────────────────────────────────────
  const gateAttack = reIdentified.size >= ATTACK_GOAL;
  const gateDefense = kReached;
  const gateExplore = exploredCount >= EXPLORE_GOAL;
  const isComplete = gateAttack && gateDefense && gateExplore;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSelectPerson = useCallback((name: string) => {
    setSelectedName(name);
    const person = DIRECTORY.find((p) => p.name === name);
    if (!person) return;
    const count = matchesFor(person, FULL_DETAIL).length;
    setAttempted((prev) => {
      const next = new Map(prev);
      next.set(name, count);
      return next;
    });
    if (count === 1) {
      setReIdentified((prev) => (prev.has(name) ? prev : new Set(prev).add(name)));
    }
  }, []);

  const applySettings = useCallback((next: Settings) => {
    setSettings(next);
    setTried((prev) => {
      const key = settingsKey(next);
      if (prev.has(key)) return prev;
      const nextMap = new Map(prev);
      nextMap.set(key, makeTried(next));
      return nextMap;
    });
  }, []);

  const handleChangeZip = useCallback(
    (level: ZipLevel) => applySettings({ ...settings, zip: level }),
    [settings, applySettings]
  );
  const handleChangeAge = useCallback(
    (level: AgeLevel) => applySettings({ ...settings, age: level }),
    [settings, applySettings]
  );
  const handleChangeGender = useCallback(
    (level: GenderLevel) => applySettings({ ...settings, gender: level }),
    [settings, applySettings]
  );

  function handleReset() {
    setSelectedName(null);
    setAttempted(new Map());
    setReIdentified(new Set());
    setSettings(FULL_DETAIL);
    setTried(new Map([[DEFAULT_KEY, makeTried(FULL_DETAIL)]]));
  }

  const progressItems = [
    {
      id: "attack",
      label: `Re-identify ${ATTACK_GOAL} neighbors (${Math.min(reIdentified.size, ATTACK_GOAL)}/${ATTACK_GOAL})`,
      done: gateAttack,
    },
    { id: "defense", label: `Reach k ≥ ${TARGET_K}`, done: gateDefense },
    {
      id: "explore",
      label: `Try ${EXPLORE_GOAL} defense settings (${Math.min(exploredCount, EXPLORE_GOAL)}/${EXPLORE_GOAL})`,
      done: gateExplore,
    },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug={GUIDE_SLUG} score={100} />
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
            Anonymous Is{" "}
            <span className="text-[var(--color-accent)]">
              Harder Than You Think
            </span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            A clinic deletes every name and publishes its records. You, armed
            with nothing but a public voter roll, will unmask its patients in
            three clicks. Then you switch sides and defend the release with
            k-anonymity, and discover that every unit of privacy is paid for in
            answers.
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Setup + honesty note */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Removing names is not anonymization
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            The clinic in the fictional town of Midvale did what most
            organizations still do: it deleted the name column and called the
            data anonymous. But ZIP code, age, and gender survived, and those
            three fields are quasi-identifiers: harmless alone, a fingerprint
            together. In 2000, Latanya Sweeney estimated that 87 percent of
            Americans are uniquely identified by ZIP code, birth date, and sex
            alone (Sweeney, 2000). That is a cited historical result, not
            something this page recomputes. What this page does recompute, on
            every click, is the same attack in miniature.
          </p>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            How this playground stays honest: both tables below are synthetic,
            with fictional people, and both are fully visible on this page.
            Every match count, k value, group size, and utility percentage is
            computed live in your browser from those visible rows. Nothing is
            faked.
          </p>
        </motion.section>

        {/* Section 1: the attack */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            1 · The attack: link two harmless tables
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-4">
            You are the attacker. On the left, Midvale&apos;s public voter
            roll: names attached to ZIP, age, and gender, as many real voter
            files are. On the right, the clinic&apos;s &quot;anonymized&quot;
            release. Pick a neighbor and join the tables on the three shared
            columns. Whenever exactly one record matches, that person&apos;s
            diagnosis is yours. Re-identify {ATTACK_GOAL} people.
          </p>
          <AttackPhase
            selectedName={selectedName}
            onSelectPerson={handleSelectPerson}
            attempted={attempted}
            reIdentifiedCount={reIdentified.size}
          />
        </motion.section>

        {/* Bridge: what k-anonymity is */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The defense has a name: k-anonymity
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed">
            The attack worked because some rows are unique on (ZIP, age,
            gender). A release is k-anonymous when every row is
            indistinguishable from at least k - 1 others on those
            quasi-identifiers, so the best any linkage attack can do is point
            at a crowd of k people. You get there by generalizing (54801
            becomes district 548**, age 34 becomes 30 to 39) or by suppressing
            a column outright. The catch: every step that blurs the attacker&apos;s
            view blurs the honest analyst&apos;s view too.
          </p>
        </motion.section>

        {/* Section 2: the defense */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            2 · The defense: generalize until k ≥ {TARGET_K}
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-4">
            Now you are the data steward, republishing the same{" "}
            {HEALTH_RECORDS.length} records. Coarsen each column until the
            smallest group of identical rows holds at least {TARGET_K} people,
            and watch what each step does to the attack and to the three
            queries an analyst still needs to answer. There is more than one
            way to reach k = {TARGET_K}; they do not cost the same utility.
          </p>
          <DefensePhase
            settings={settings}
            onChangeZip={handleChangeZip}
            onChangeAge={handleChangeAge}
            onChangeGender={handleChangeGender}
          />
        </motion.section>

        {/* Section 3: the tradeoff curve */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            3 · The tradeoff: privacy is bought with utility
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-4">
            Try at least {EXPLORE_GOAL} different settings and compare where
            they land. Full detail sits at k = 1 with perfect utility; total
            suppression reaches k = {HEALTH_RECORDS.length} and answers
            nothing. Real releases live on the frontier between them, and
            choosing the point on that frontier is an ethical decision, not a
            technical one: it decides whose privacy is protected and which
            questions can still be answered.
          </p>
          <TradeoffChart
            tried={triedList}
            currentKey={settingsKey(settings)}
            exploredCount={exploredCount}
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
                  You Broke It, Then You Fixed It
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You ran a real linkage attack, rebuilt the release to
                  k-anonymity, and traced what the protection cost.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Neighbors you re-identified
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {reIdentified.size} of {totalUnique}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      uniquely linkable in the raw release
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your best defense
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {bestDefense
                        ? `k = ${bestDefense.k} at ${bestDefense.utilityScore.toFixed(0)}%`
                        : "?"}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      highest utility among your k ≥ {TARGET_K} releases
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Release settings you tried
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {exploredCount}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      distinct release settings explored
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Deleting names deletes nothing an attacker needs.
                    Anonymity is a property you must engineer, measure with k,
                    and pay for in utility, and deciding how much to pay is an
                    ethical choice about real people.&quot;
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
