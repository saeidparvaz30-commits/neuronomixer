"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  JoinType,
  ALL_JOIN_TYPES,
  CUSTOMERS,
  ORDERS,
  executeJoin,
} from "./types";
import JoinLab from "./JoinLab";
import FanOutDemo from "./FanOutDemo";
import JoinChallenge from "./JoinChallenge";

const GUIDE_TITLE = "Joins: How Tables Find Each Other";
const NEXT_GUIDE_SLUG = "groupby-aggregation";

export default function JoinsKeysClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Interaction state (mount defaults; Try Again restores exactly these) ──
  const [joinType, setJoinType] = useState<JoinType>("inner");
  const [triedJoins, setTriedJoins] = useState<ReadonlySet<JoinType>>(
    () => new Set<JoinType>(["inner"])
  );
  const [copies, setCopies] = useState(1);
  const [fanSnapshot, setFanSnapshot] = useState<{ copies: number; total: number } | null>(
    null
  );
  const [challengePick, setChallengePick] = useState<JoinType | null>(null);
  const [challengeSolved, setChallengeSolved] = useState(false);

  // ── Derived gates ──────────────────────────────────────────────────────────
  const gateJoins = triedJoins.size === ALL_JOIN_TYPES.length;
  const gateFanOut = fanSnapshot !== null;
  const isComplete = gateJoins && gateFanOut && challengeSolved;

  // Names of customers with no orders, computed by running the left join.
  const noOrderNames = useMemo(
    () =>
      executeJoin(CUSTOMERS, ORDERS, "left")
        .filter((r) => r.order === null)
        .map((r) => (r.customer ? r.customer.name : "")),
    []
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleJoinTypeChange = useCallback((t: JoinType) => {
    setJoinType(t);
    setTriedJoins((prev) => {
      if (prev.has(t)) return prev;
      const next = new Set(prev);
      next.add(t);
      return next;
    });
  }, []);

  const handleFanAck = useCallback(
    (snapshot: { copies: number; total: number }) => setFanSnapshot(snapshot),
    []
  );

  const handleChallengePick = useCallback((t: JoinType) => {
    setChallengePick(t);
    if (t === "left") setChallengeSolved(true);
  }, []);

  function handleReset() {
    setJoinType("inner");
    setTriedJoins(new Set<JoinType>(["inner"]));
    setCopies(1);
    setFanSnapshot(null);
    setChallengePick(null);
    setChallengeSolved(false);
  }

  const progressItems = [
    {
      id: "joins",
      label: `Try all four joins (${triedJoins.size}/4)`,
      done: gateJoins,
    },
    { id: "fanout", label: "Trigger the fan-out", done: gateFanOut },
    { id: "challenge", label: "Solve the challenge", done: challengeSolved },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="joins-and-keys" score={100} />
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
            Joins: How Tables{" "}
            <span className="text-[var(--color-accent)]">Find Each Other</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Keys identify rows; the join type decides what happens to rows that do not
            match. Run all four joins on two live tables, then break a primary key and
            watch the row count multiply.
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

        {/* Keys: primary and foreign */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-3">
            Keys: how a row says who it is
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Primary key
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                <span className="font-mono text-[#93c5fd]">customers.id</span> is unique
                per row and never NULL. It is the row&apos;s identity: &quot;customer
                1&quot; means exactly one person. The orders table has its own primary
                key, <span className="font-mono text-[#93c5fd]">order_id</span>.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Foreign key
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                <span className="font-mono text-[#93c5fd]">orders.customer_id</span>{" "}
                stores another table&apos;s primary key to point at it. Each order carries
                the id of the customer who placed it. That pointer is the thing a join
                follows.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            One pointer below is broken on purpose: order 106 references customer 6, and
            no such customer exists (imagine the customer was deleted without cleaning up
            their orders). Databases call this an orphan row; a foreign key constraint
            would have rejected it. Watch what the outer joins do with it.
          </p>
        </motion.section>

        {/* Join lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">The join lab</p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            Pick a join type and the query below actually executes on these two tables.
            Key columns are color coded by value so you can watch rows find their
            partners. The fate column tells each input row what the current join will do
            with it, and every row count is computed from the executed result.
          </p>
          <JoinLab joinType={joinType} onJoinTypeChange={handleJoinTypeChange} />
        </motion.section>

        {/* Fan-out */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Break the key: the fan-out hazard
          </p>
          <FanOutDemo
            copies={copies}
            onCopiesChange={setCopies}
            acked={gateFanOut}
            onAck={handleFanAck}
          />
        </motion.section>

        {/* Challenge */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-4">Mini challenge</p>
          <JoinChallenge
            pick={challengePick}
            onPick={handleChallengePick}
            solved={challengeSolved}
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
                  Tables Joined!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You ran all four join types, multiplied a result by breaking a primary
                  key, and picked the right join to find the missing customers.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Join types explored</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {triedJoins.size} of {ALL_JOIN_TYPES.length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Fan-out you triggered</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {fanSnapshot
                        ? `${fanSnapshot.copies} copies, ${fanSnapshot.total} rows`
                        : "?"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Customers with no orders
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {noOrderNames.join(", ")}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;A join is only as trustworthy as its key. The join type decides
                    what happens to rows that do not match, and a non-unique key quietly
                    multiplies every row it touches. Check the row count after every
                    join.&quot;
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
