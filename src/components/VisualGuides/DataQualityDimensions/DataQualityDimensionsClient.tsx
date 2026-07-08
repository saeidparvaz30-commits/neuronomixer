"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  BASE_ROWS,
  DIMENSIONS,
  DefectId,
  FieldName,
  GROUND_TRUTH,
  NO_DEFECTS,
  REFERENCE_TODAY,
  RuleId,
  buildDataset,
  computeDimensions,
  evaluateRule,
  ruleApplicable,
} from "./data";
import DimensionMeters from "./DimensionMeters";
import DefectPanel from "./DefectPanel";
import RecordsTable from "./RecordsTable";
import RuleBuilder, { ActiveRule } from "./RuleBuilder";

const GUIDE_TITLE = "The Six Faces of Bad Data";
const NEXT_GUIDE_SLUG = "eda-workflow";

const DEFECT_GATE_TARGET = 3;
const RULE_GATE_TARGET = 2;

interface RuleSpec {
  column: FieldName;
  rule: RuleId;
}

export default function DataQualityDimensionsClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  const [active, setActive] = useState<Record<DefectId, boolean>>({ ...NO_DEFECTS });
  const [cycled, setCycled] = useState<Set<DefectId>>(new Set());

  const [selCol, setSelCol] = useState<FieldName>("email");
  const [selRule, setSelRule] = useState<RuleId>("not-null");
  const [rules, setRules] = useState<RuleSpec[]>([]);
  const [builtEver, setBuiltEver] = useState<Set<string>>(new Set());
  const [addNote, setAddNote] = useState<string | null>(null);

  // ── Live computation from the on-screen dataset ────────────────────────────
  const dataset = useMemo(() => buildDataset(active), [active]);
  const dims = useMemo(() => computeDimensions(dataset), [dataset]);

  const ruleResults: ActiveRule[] = useMemo(
    () =>
      rules.map((r) => ({
        ...r,
        offenders: evaluateRule(dataset, r.column, r.rule),
      })),
    [rules, dataset]
  );

  const cellFlags = useMemo(() => {
    const m = new Map<number, Set<FieldName>>();
    for (const rr of ruleResults) {
      for (const idx of rr.offenders) {
        const s = m.get(idx) ?? new Set<FieldName>();
        s.add(rr.column);
        m.set(idx, s);
      }
    }
    return m;
  }, [ruleResults]);

  const metersClean = useMemo(
    () => DIMENSIONS.filter((d) => dims[d.id].pct >= 0.9995).length,
    [dims]
  );

  // ── Gates (derived from real interactions) ─────────────────────────────────
  const gateDefects = cycled.size >= DEFECT_GATE_TARGET;
  const gateRules = builtEver.size >= RULE_GATE_TARGET;
  const isComplete = gateDefects && gateRules;

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleToggleDefect(id: DefectId) {
    const wasOn = active[id];
    setActive({ ...active, [id]: !wasOn });
    if (wasOn) {
      const next = new Set(cycled);
      next.add(id);
      setCycled(next);
    }
  }

  function handleSelCol(c: FieldName) {
    setSelCol(c);
    setAddNote(null);
    if (!ruleApplicable(c, selRule)) setSelRule("not-null");
  }

  function handleSelRule(r: RuleId) {
    setSelRule(r);
    setAddNote(null);
  }

  function handleAddRule() {
    const key = `${selCol}:${selRule}`;
    if (rules.some((r) => `${r.column}:${r.rule}` === key)) {
      setAddNote(`${selCol} · ${selRule} is already in your rule list.`);
      return;
    }
    setAddNote(null);
    setRules([...rules, { column: selCol, rule: selRule }]);
    const next = new Set(builtEver);
    next.add(key);
    setBuiltEver(next);
  }

  function handleRemoveRule(key: string) {
    setRules(rules.filter((r) => `${r.column}:${r.rule}` !== key));
  }

  function handleReset() {
    setActive({ ...NO_DEFECTS });
    setCycled(new Set());
    setSelCol("email");
    setSelRule("not-null");
    setRules([]);
    setBuiltEver(new Set());
    setAddNote(null);
  }

  const progressItems = [
    {
      id: "defects",
      label: `Inject and repair ${DEFECT_GATE_TARGET} defect types (${Math.min(cycled.size, DEFECT_GATE_TARGET)}/${DEFECT_GATE_TARGET})`,
      done: gateDefects,
    },
    {
      id: "rules",
      label: `Build ${RULE_GATE_TARGET} validation rules (${Math.min(builtEver.size, RULE_GATE_TARGET)}/${RULE_GATE_TARGET})`,
      done: gateRules,
    },
  ];

  // Ground truth grouped by customer for display
  const truthRows = useMemo(() => {
    const byId = new Map<number, { id: number; name?: string; email?: string }>();
    for (const t of GROUND_TRUTH) {
      const e = byId.get(t.id) ?? { id: t.id };
      if (t.field === "name") e.name = t.value;
      else e.email = t.value;
      byId.set(t.id, e);
    }
    return Array.from(byId.values()).sort((a, b) => a.id - b.id);
  }, []);

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="data-quality-dimensions" score={100} />
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
            The Six Faces of <span className="text-[var(--color-accent)]">Bad Data</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            A record can look perfect and still lie. Six live meters, each computed
            from one small customer table, turn a vague feeling that the data is off
            into a named, testable diagnosis.
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

        {/* The six dimensions */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Six different diseases, six different tests
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            The vocabulary goes back to Wang and Strong&apos;s 1996 study of what data
            quality means to the people who consume it. Six dimensions survived into
            nearly every modern data-quality tool, and each one answers a different
            question about the same cell. The point of this guide is that they are
            separable: you can break exactly one at a time and watch exactly one meter
            move.
          </p>
          <div className="overflow-x-auto rounded-xl border border-[#1e293b] mb-4">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#1e293b] text-[#94a3b8] text-left">
                  <th className="px-3 py-2 font-semibold">Dimension</th>
                  <th className="px-3 py-2 font-semibold">The question it asks</th>
                  <th className="px-3 py-2 font-semibold">How this page computes it</th>
                </tr>
              </thead>
              <tbody>
                {DIMENSIONS.map((d, i) => (
                  <tr key={d.id} style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}>
                    <td className="px-3 py-2 font-semibold text-white whitespace-nowrap">{d.label}</td>
                    <td className="px-3 py-2 text-[#94a3b8]">{d.question}</td>
                    <td className="px-3 py-2 text-[#94a3b8]">{d.test}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            How this page stays honest: every number is computed in your browser from
            the {BASE_ROWS.length}-row customer table below, plus a small verified
            contract file for the accuracy check. The audit date is pinned to the
            constant {REFERENCE_TODAY}, so the timeliness math never shifts under you.
            Nothing is faked.
          </p>
        </motion.section>

        {/* Lab: defects + meters */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="lg:col-span-2"
          >
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-2">
                Corruption Lab
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Each button injects one specific defect into the table, then repairs
                it on the second press. Predict which meter will move before you
                press. Inject and repair at least {DEFECT_GATE_TARGET} different
                defect types to earn the diagnosis badges.
              </p>
            </div>
            <DefectPanel active={active} cycled={cycled} onToggle={handleToggleDefect} />
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="lg:col-span-3"
          >
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 mb-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8]">
                  Dimension Meters
                </p>
                <p className="text-[11px] text-[#475569]">
                  {metersClean} of {DIMENSIONS.length} meters clean
                </p>
              </div>
            </div>
            <DimensionMeters dims={dims} />
          </motion.div>
        </div>

        {/* Dataset */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <p className="text-[13px] font-semibold text-white">The customer table</p>
            <p className="text-[11px] text-[#475569]">
              {dataset.length} rows · audit date pinned to {REFERENCE_TODAY}
            </p>
          </div>
          <RecordsTable rows={dataset} cellFlags={cellFlags} />
          <p className="text-[11px] text-[#475569] leading-relaxed mt-3">
            Rows marked verified appear in the contract file below, which is what the
            accuracy meter compares against. Cells outlined in orange are flagged by
            the rules you build in the next section.
          </p>
        </motion.section>

        {/* Ground truth */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The contract file (ground truth for accuracy)
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            Accuracy is the only dimension you cannot compute from the table alone. It
            needs an external source of truth. Here that source is a set of six
            customers whose name and email were verified against signed onboarding
            contracts. The accuracy meter compares each verified field in the table
            against this file and counts mismatches.
          </p>
          <div className="overflow-x-auto rounded-xl border border-[#1e293b]">
            <table className="w-full border-collapse text-[11px] font-mono whitespace-nowrap">
              <thead>
                <tr className="bg-[#1e293b] text-[#94a3b8] text-left">
                  <th className="px-3 py-2 font-semibold">id</th>
                  <th className="px-3 py-2 font-semibold">verified name</th>
                  <th className="px-3 py-2 font-semibold">verified email</th>
                </tr>
              </thead>
              <tbody>
                {truthRows.map((t, i) => (
                  <tr key={t.id} style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}>
                    <td className="px-3 py-1.5 text-[#94a3b8]">{t.id}</td>
                    <td className="px-3 py-1.5 text-[#f1f5f9]">{t.name}</td>
                    <td className="px-3 py-1.5 text-[#f1f5f9]">{t.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Rule builder */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Build the rules that catch it
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-5 max-w-[720px]">
            Meters diagnose; rules enforce. A validation rule is one column plus one
            assertion, evaluated against every row. Build at least {RULE_GATE_TARGET}{" "}
            rules and watch the offending rows light up in the table above. Note that
            null values are skipped by every rule except not-null: each rule tests
            exactly one thing, which is what makes a failing rule diagnostic.
          </p>
          <RuleBuilder
            selCol={selCol}
            selRule={selRule}
            onSelCol={handleSelCol}
            onSelRule={handleSelRule}
            onAdd={handleAddRule}
            onRemove={handleRemoveRule}
            rules={ruleResults}
            addNote={addNote}
          />
        </motion.section>

        {/* Validity vs accuracy */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The trap: validity is not accuracy
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            Inject the &quot;Drift from the truth&quot; defect and look closely:
            jon.smith@acmecorp.com passes the email regex, is unique, agrees with
            every other field, and was updated recently. Five meters stay green. Only
            accuracy falls, and only because this page happens to have a contract file
            to compare against. That asymmetry is the most expensive lesson in data
            quality: validity checks are cheap and local, while accuracy needs an
            external source of truth that usually does not exist for most of your
            columns. In practice you automate the five cheap dimensions as rules in
            your pipeline, and you buy accuracy where it matters with audits, double
            entry, or reconciliation against an authoritative system.
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed">
            The reverse confusion also costs money: a stale record is not invalid.
            Every aged last-updated date in this table still parses and sits inside
            the allowed range, so an in-range rule will never catch staleness. If a
            meter feels redundant, inject its defect and check which rules fire.
            Where none do, that dimension needs its own test. For what to do after
            the diagnosis, the next guide walks the exploratory workflow that turns a
            suspect table into an understood one.
          </p>
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
                  Diagnosis Complete!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You broke a dataset six different ways, matched each defect to the
                  one dimension it damages, and wrote the rules that catch it.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Defect types cycled</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {cycled.size} of {DEFECT_GATE_TARGET} required
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Rules built</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {builtEver.size} of {RULE_GATE_TARGET} required
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Meters clean right now</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {metersClean} of {DIMENSIONS.length}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Bad data is not one disease but six. Name the dimension
                    first: a value can be present, unique, well formed, internally
                    consistent, and fresh, and still be flat wrong.&quot;
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
