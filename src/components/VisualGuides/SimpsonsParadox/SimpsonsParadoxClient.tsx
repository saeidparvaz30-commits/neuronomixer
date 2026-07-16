"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  type CaseStudy,
  type SubgroupRate,
  computeSubgroupRates,
  UC_BERKELEY,
  KIDNEY_STONES,
} from "./types";

// ── Colour constants ──────────────────────────────────────────────────────────
const COL_A    = "#1e5d8a"; // group A — blue
const COL_B    = "#3bb4a4"; // group B — teal
const COL_GOLD = "var(--color-accent)";
const COL_PINK = "#ec4899";

// ── Tiny bar chart used for one subgroup ─────────────────────────────────────
function MiniBarChart({
  subgroup,
  groupALabel,
  groupBLabel,
}: {
  subgroup: SubgroupRate;
  groupALabel: string;
  groupBLabel: string;
}) {
  const { rateA, rateB } = computeSubgroupRates(subgroup);
  const aWins = rateA >= rateB;
  const W = 140;
  const H = 80;
  const barW = 34;
  const gap = 18;
  const xA = (W - 2 * barW - gap) / 2;
  const xB = xA + barW + gap;
  const maxH = H - 24;

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-3 flex flex-col items-center gap-1">
      <span className="text-[10px] font-semibold text-[#94a3b8] text-center leading-tight">
        {subgroup.name}
      </span>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* bar A */}
        <motion.rect
          x={xA}
          y={H - maxH * rateA}
          width={barW}
          height={maxH * rateA}
          rx={3}
          fill={COL_A}
          initial={{ height: 0, y: H }}
          animate={{ height: maxH * rateA, y: H - maxH * rateA }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        />
        {/* bar B */}
        <motion.rect
          x={xB}
          y={H - maxH * rateB}
          width={barW}
          height={maxH * rateB}
          rx={3}
          fill={COL_B}
          initial={{ height: 0, y: H }}
          animate={{ height: maxH * rateB, y: H - maxH * rateB }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.08 }}
        />
        {/* labels above bars */}
        <text x={xA + barW / 2} y={H - maxH * rateA - 4} textAnchor="middle" fontSize="9" fill={COL_A} fontWeight="700">
          {(rateA * 100).toFixed(0)}%
        </text>
        <text x={xB + barW / 2} y={H - maxH * rateB - 4} textAnchor="middle" fontSize="9" fill={COL_B} fontWeight="700">
          {(rateB * 100).toFixed(0)}%
        </text>
        {/* axis labels */}
        <text x={xA + barW / 2} y={H - 1} textAnchor="middle" fontSize="8" fill="#475569">
          {groupALabel.slice(0, 3)}
        </text>
        <text x={xB + barW / 2} y={H - 1} textAnchor="middle" fontSize="8" fill="#475569">
          {groupBLabel.slice(0, 3)}
        </text>
      </svg>
      {/* winner badge */}
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
        style={{
          background: aWins ? `${COL_A}22` : `${COL_B}22`,
          color: aWins ? COL_A : COL_B,
        }}
      >
        {aWins ? groupALabel : groupBLabel} leads
      </span>
    </div>
  );
}

// ── Aggregate bar chart (two large bars) ─────────────────────────────────────
function AggregateBarChart({
  caseStudy,
}: {
  caseStudy: CaseStudy;
}) {
  const { aggregateRateA: rA, aggregateRateB: rB, groupALabel, groupBLabel } = caseStudy;
  const W = 320;
  const H = 160;
  const barW = 70;
  const gap = 40;
  const xA = (W - 2 * barW - gap) / 2;
  const xB = xA + barW + gap;
  const maxH = H - 36;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="max-w-[320px] mx-auto">
      {/* bar A */}
      <motion.rect
        x={xA}
        y={H - maxH * rA}
        width={barW}
        height={maxH * rA}
        rx={5}
        fill={COL_A}
        initial={{ height: 0, y: H }}
        animate={{ height: maxH * rA, y: H - maxH * rA }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      {/* bar B */}
      <motion.rect
        x={xB}
        y={H - maxH * rB}
        width={barW}
        height={maxH * rB}
        rx={5}
        fill={COL_B}
        initial={{ height: 0, y: H }}
        animate={{ height: maxH * rB, y: H - maxH * rB }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
      />
      {/* percentage labels above bars */}
      <text x={xA + barW / 2} y={H - maxH * rA - 7} textAnchor="middle" fontSize="14" fill={COL_A} fontWeight="800">
        {(rA * 100).toFixed(0)}%
      </text>
      <text x={xB + barW / 2} y={H - maxH * rB - 7} textAnchor="middle" fontSize="14" fill={COL_B} fontWeight="800">
        {(rB * 100).toFixed(0)}%
      </text>
      {/* group labels below */}
      <text x={xA + barW / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="#94a3b8" fontWeight="600">
        {groupALabel}
      </text>
      <text x={xB + barW / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="#94a3b8" fontWeight="600">
        {groupBLabel}
      </text>
    </svg>
  );
}

// ── Tab 1: Case Studies ───────────────────────────────────────────────────────
function CaseStudiesTab({
  onBerkeleyExplored,
  onKidneyExplored,
  onLurkingVarIdentified,
  onToggle,
}: {
  onBerkeleyExplored: () => void;
  onKidneyExplored: () => void;
  onLurkingVarIdentified: () => void;
  onToggle: () => void;
}) {
  const [selectedCase, setSelectedCase] = useState<"berkeley" | "kidney">("berkeley");
  const [showSubgroups, setShowSubgroups] = useState(false);
  const [lurkingRevealed, setLurkingRevealed] = useState(false);

  const caseStudy: CaseStudy = selectedCase === "berkeley" ? UC_BERKELEY : KIDNEY_STONES;

  // Everything below is computed from the case-study counts, never hardcoded.
  const aggAWins = caseStudy.aggregateRateA > caseStudy.aggregateRateB;
  const aggWinner = {
    label: aggAWins ? caseStudy.groupALabel : caseStudy.groupBLabel,
    color: aggAWins ? COL_A : COL_B,
    rate: aggAWins ? caseStudy.aggregateRateA : caseStudy.aggregateRateB,
  };
  const aggLoser = {
    label: aggAWins ? caseStudy.groupBLabel : caseStudy.groupALabel,
    color: aggAWins ? COL_B : COL_A,
    rate: aggAWins ? caseStudy.aggregateRateB : caseStudy.aggregateRateA,
  };
  const subgroupRates = caseStudy.subgroups.map(computeSubgroupRates);
  const loserSubgroupWins = subgroupRates.filter((r) =>
    aggAWins ? r.rateB > r.rateA : r.rateA > r.rateB
  ).length;
  const nSubgroups = caseStudy.subgroups.length;

  function handleCaseChange(id: "berkeley" | "kidney") {
    setSelectedCase(id);
    setShowSubgroups(false);
    setLurkingRevealed(false);
  }

  function handleToggle(val: boolean) {
    setShowSubgroups(val);
    onToggle();
    if (val) {
      // mark the relevant case as explored
      if (selectedCase === "berkeley") onBerkeleyExplored();
      else onKidneyExplored();
    }
  }

  function handleRevealLurking() {
    setLurkingRevealed(true);
    onLurkingVarIdentified();
  }

  return (
    <div className="space-y-6">
      {/* Case selector */}
      <div className="flex gap-3 flex-wrap">
        {(["berkeley", "kidney"] as const).map((id) => {
          const cs = id === "berkeley" ? UC_BERKELEY : KIDNEY_STONES;
          const active = selectedCase === id;
          return (
            <button
              key={id}
              onClick={() => handleCaseChange(id)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: active ? COL_GOLD : "transparent",
                color: active ? "#0a0e1a" : "#94a3b8",
                border: `1px solid ${active ? COL_GOLD : "#1e293b"}`,
              }}
            >
              {cs.title}
            </button>
          );
        })}
      </div>

      {/* Case card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedCase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
        >
          <h3 className="text-[17px] font-bold text-white mb-1">{caseStudy.title}</h3>
          <p className="text-[13px] text-[#94a3b8] mb-5">{caseStudy.context}</p>

          {/* Aggregate / By Subgroup toggle */}
          <div className="flex items-center gap-2 mb-5" role="radiogroup" aria-label="Chart view">
            <button
              role="radio"
              aria-checked={!showSubgroups}
              onClick={() => handleToggle(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: !showSubgroups ? "#1e5d8a" : "transparent",
                color: !showSubgroups ? "#f1f5f9" : "#94a3b8",
                border: `1px solid ${!showSubgroups ? "#1e5d8a" : "#1e293b"}`,
              }}
            >
              Aggregate View
            </button>
            <button
              role="radio"
              aria-checked={showSubgroups}
              onClick={() => handleToggle(true)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: showSubgroups ? "#3bb4a4" : "transparent",
                color: showSubgroups ? "#0a0e1a" : "#94a3b8",
                border: `1px solid ${showSubgroups ? "#3bb4a4" : "#1e293b"}`,
              }}
            >
              By Subgroup
            </button>
          </div>

          <AnimatePresence mode="wait">
            {!showSubgroups ? (
              <motion.div
                key="aggregate"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                {/* Aggregate bar chart */}
                <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-4 mb-4">
                  <AggregateBarChart caseStudy={caseStudy} />
                </div>

                {/* Misleading label (leader computed from the data) */}
                <div className="rounded-xl bg-[#1e293b]/60 border border-[#1e293b] px-4 py-3 mb-4 flex items-center gap-2">
                  <span className="text-[13px] text-[#94a3b8]">
                    Based on overall data,{" "}
                    <span style={{ color: aggWinner.color }} className="font-bold">
                      {aggWinner.label}
                    </span>{" "}
                    appears to have a higher success rate (
                    {(aggWinner.rate * 100).toFixed(0)}% vs{" "}
                    {(aggLoser.rate * 100).toFixed(0)}%)
                  </span>
                </div>

                <button
                  onClick={() => handleToggle(true)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
                >
                  Reveal Subgroup Breakdown →
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="subgroups"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                {/* Paradox badge */}
                <div
                  className="rounded-xl border px-4 py-3 mb-5 flex items-start gap-3"
                  style={{ borderColor: COL_PINK, background: `${COL_PINK}11` }}
                >
                  <span className="text-[20px] flex-shrink-0">⚠️</span>
                  <div>
                    <p className="text-[13px] font-bold mb-0.5" style={{ color: COL_PINK }}>
                      DIRECTION REVERSES!
                    </p>
                    <p className="text-[12px] text-[#94a3b8]">
                      <span style={{ color: aggLoser.color }} className="font-semibold">
                        {aggLoser.label}
                      </span>
                      : ahead in {loserSubgroupWins} of {nSubgroups} subgroups (check the badges below),
                      yet behind in the aggregate ({(aggLoser.rate * 100).toFixed(0)}% vs{" "}
                      {(aggWinner.rate * 100).toFixed(0)}%)!
                    </p>
                  </div>
                </div>

                {/* Subgroup mini charts grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
                  {caseStudy.subgroups.map((sg) => (
                    <MiniBarChart
                      key={sg.name}
                      subgroup={sg}
                      groupALabel={caseStudy.groupALabel}
                      groupBLabel={caseStudy.groupBLabel}
                    />
                  ))}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mb-5 text-[11px] text-[#94a3b8]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm inline-block flex-shrink-0" style={{ background: COL_A }} />
                    {caseStudy.groupALabel}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm inline-block flex-shrink-0" style={{ background: COL_B }} />
                    {caseStudy.groupBLabel}
                  </span>
                </div>

                {/* Lurking variable reveal */}
                {!lurkingRevealed ? (
                  <button
                    onClick={handleRevealLurking}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                  >
                    Identify the Lurking Variable →
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="rounded-xl border px-4 py-4"
                    style={{ borderColor: COL_GOLD, background: `#d4af370d` }}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: COL_GOLD }}>
                      Lurking Variable Identified
                    </p>
                    <p className="text-[13px] font-semibold text-white mb-2">
                      {caseStudy.lurkingVariable}
                    </p>
                    <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                      {caseStudy.explanation}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Builder input cell ────────────────────────────────────────────────────────
function NumInput({
  value,
  onChange,
  min = 0,
  max = 9999,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10);
        if (!isNaN(v) && v >= min && v <= max) onChange(v);
      }}
      className="w-20 rounded-lg border border-[#1e293b] bg-[#0a0e1a] text-white text-center text-sm font-mono py-1.5 px-2 focus:outline-none focus:border-[#3bb4a4] transition-colors"
    />
  );
}

// ── Tab 2: Build Your Own ─────────────────────────────────────────────────────
interface SubgroupInputs {
  successA: number;
  totalA: number;
  successB: number;
  totalB: number;
}

const DEFAULT_SUB1: SubgroupInputs = { successA: 15, totalA: 20, successB: 100, totalB: 200 };
const DEFAULT_SUB2: SubgroupInputs = { successA: 100, totalA: 150, successB: 10, totalB: 40 };

// Visual mini bar (inline SVG for rates side-by-side) — defined outside component
function RatePair({ rA, rB, label }: { rA: number; rB: number; label: string }) {
  const barH = 48;
  const barW = 22;
  const gap = 8;
  const totalW = 2 * barW + gap + 28;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-[#475569] font-medium">{label}</span>
      <svg width={totalW} height={barH + 16} viewBox={`0 0 ${totalW} ${barH + 16}`}>
        <motion.rect
          x={14}
          y={barH * (1 - rA)}
          width={barW}
          height={barH * rA}
          rx={2}
          fill={COL_A}
          animate={{ height: barH * rA, y: barH * (1 - rA) }}
          transition={{ duration: 0.3 }}
        />
        <motion.rect
          x={14 + barW + gap}
          y={barH * (1 - rB)}
          width={barW}
          height={barH * rB}
          rx={2}
          fill={COL_B}
          animate={{ height: barH * rB, y: barH * (1 - rB) }}
          transition={{ duration: 0.3 }}
        />
        <text x={14 + barW / 2} y={barH * (1 - rA) - 2} textAnchor="middle" fontSize="8" fill={COL_A} fontWeight="700">
          {(rA * 100).toFixed(0)}%
        </text>
        <text x={14 + barW + gap + barW / 2} y={barH * (1 - rB) - 2} textAnchor="middle" fontSize="8" fill={COL_B} fontWeight="700">
          {(rB * 100).toFixed(0)}%
        </text>
        <text x={14 + barW / 2} y={barH + 12} textAnchor="middle" fontSize="7" fill="#475569">A</text>
        <text x={14 + barW + gap + barW / 2} y={barH + 12} textAnchor="middle" fontSize="7" fill="#475569">B</text>
      </svg>
    </div>
  );
}

function BuildYourOwnTab({ onAttempted }: { onAttempted: () => void }) {
  const [sub1, setSub1] = useState<SubgroupInputs>(DEFAULT_SUB1);
  const [sub2, setSub2] = useState<SubgroupInputs>(DEFAULT_SUB2);
  const [showHint, setShowHint] = useState(false);
  const attempted = useRef(false);

  function markAttempted() {
    if (!attempted.current) {
      attempted.current = true;
      onAttempted();
    }
  }

  function handleSub1Change(field: keyof SubgroupInputs, val: number) {
    const updated = { ...sub1, [field]: val };
    // Ensure success <= total
    if (field === "successA" && val > updated.totalA) updated.totalA = val;
    if (field === "totalA" && val < updated.successA) updated.successA = val;
    if (field === "successB" && val > updated.totalB) updated.totalB = val;
    if (field === "totalB" && val < updated.successB) updated.successB = val;
    setSub1(updated);
    markAttempted();
  }

  function handleSub2Change(field: keyof SubgroupInputs, val: number) {
    const updated = { ...sub2, [field]: val };
    if (field === "successA" && val > updated.totalA) updated.totalA = val;
    if (field === "totalA" && val < updated.successA) updated.successA = val;
    if (field === "successB" && val > updated.totalB) updated.totalB = val;
    if (field === "totalB" && val < updated.successB) updated.successB = val;
    setSub2(updated);
    markAttempted();
  }

  // Derived rates
  const rateA1 = sub1.totalA > 0 ? sub1.successA / sub1.totalA : 0;
  const rateB1 = sub1.totalB > 0 ? sub1.successB / sub1.totalB : 0;
  const rateA2 = sub2.totalA > 0 ? sub2.successA / sub2.totalA : 0;
  const rateB2 = sub2.totalB > 0 ? sub2.successB / sub2.totalB : 0;

  const aggSuccessA = sub1.successA + sub2.successA;
  const aggTotalA   = sub1.totalA  + sub2.totalA;
  const aggSuccessB = sub1.successB + sub2.successB;
  const aggTotalB   = sub1.totalB  + sub2.totalB;

  const aggRateA = aggTotalA > 0 ? aggSuccessA / aggTotalA : 0;
  const aggRateB = aggTotalB > 0 ? aggSuccessB / aggTotalB : 0;

  // Paradox: A beats B in both subgroups, but B beats A overall
  const paradoxDetected =
    rateA1 > rateB1 &&
    rateA2 > rateB2 &&
    aggRateA < aggRateB;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
        <h3 className="text-[17px] font-bold text-white mb-1">Build Your Own Simpson&apos;s Paradox</h3>
        <p className="text-[13px] text-[#94a3b8] mb-5">
          Enter success/total counts for two treatments (A and B) across two subgroups. Try to make A
          win in each subgroup but lose overall.
        </p>

        {/* Input table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-[12px]" cellPadding={6}>
            <thead>
              <tr>
                <th className="text-left text-[#475569] font-medium" />
                <th colSpan={2} className="text-center font-semibold" style={{ color: COL_A }}>
                  Subgroup 1
                </th>
                <th colSpan={2} className="text-center font-semibold" style={{ color: COL_B }}>
                  Subgroup 2
                </th>
              </tr>
              <tr>
                <th className="text-left text-[#475569] font-medium pb-2" />
                <th className="text-center text-[#94a3b8] font-medium pb-2">Treatment A</th>
                <th className="text-center text-[#94a3b8] font-medium pb-2">Treatment B</th>
                <th className="text-center text-[#94a3b8] font-medium pb-2">Treatment A</th>
                <th className="text-center text-[#94a3b8] font-medium pb-2">Treatment B</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-[#94a3b8] font-medium py-2">Successes</td>
                <td className="text-center py-2">
                  <NumInput value={sub1.successA} onChange={(v) => handleSub1Change("successA", v)} max={sub1.totalA} />
                </td>
                <td className="text-center py-2">
                  <NumInput value={sub1.successB} onChange={(v) => handleSub1Change("successB", v)} max={sub1.totalB} />
                </td>
                <td className="text-center py-2">
                  <NumInput value={sub2.successA} onChange={(v) => handleSub2Change("successA", v)} max={sub2.totalA} />
                </td>
                <td className="text-center py-2">
                  <NumInput value={sub2.successB} onChange={(v) => handleSub2Change("successB", v)} max={sub2.totalB} />
                </td>
              </tr>
              <tr>
                <td className="text-[#94a3b8] font-medium py-2">Total</td>
                <td className="text-center py-2">
                  <NumInput value={sub1.totalA} onChange={(v) => handleSub1Change("totalA", v)} min={sub1.successA} />
                </td>
                <td className="text-center py-2">
                  <NumInput value={sub1.totalB} onChange={(v) => handleSub1Change("totalB", v)} min={sub1.successB} />
                </td>
                <td className="text-center py-2">
                  <NumInput value={sub2.totalA} onChange={(v) => handleSub2Change("totalA", v)} min={sub2.successA} />
                </td>
                <td className="text-center py-2">
                  <NumInput value={sub2.totalB} onChange={(v) => handleSub2Change("totalB", v)} min={sub2.successB} />
                </td>
              </tr>
              <tr>
                <td className="text-[#475569] font-medium py-1 text-[11px]">Rate</td>
                <td className="text-center py-1 text-[11px]" style={{ color: COL_A }}>
                  {(rateA1 * 100).toFixed(1)}%
                </td>
                <td className="text-center py-1 text-[11px]" style={{ color: COL_B }}>
                  {(rateB1 * 100).toFixed(1)}%
                </td>
                <td className="text-center py-1 text-[11px]" style={{ color: COL_A }}>
                  {(rateA2 * 100).toFixed(1)}%
                </td>
                <td className="text-center py-1 text-[11px]" style={{ color: COL_B }}>
                  {(rateB2 * 100).toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Live visualisation */}
        <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-4 mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#475569] mb-3">
            Live Rates
          </p>
          <div className="flex items-end gap-6 flex-wrap">
            <RatePair rA={rateA1} rB={rateB1} label="Subgroup 1" />
            <RatePair rA={rateA2} rB={rateB2} label="Subgroup 2" />
            <div className="w-px h-12 bg-[#1e293b] self-center hidden sm:block" />
            <RatePair rA={aggRateA} rB={aggRateB} label="Overall" />
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-[#475569]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COL_A, display: "inline-block" }} />
              Treatment A
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COL_B, display: "inline-block" }} />
              Treatment B
            </span>
          </div>
        </div>

        {/* Subgroup winner checks */}
        <div className="flex gap-4 flex-wrap mb-5 text-[12px]">
          <span className={`flex items-center gap-1.5 ${rateA1 > rateB1 ? "text-[#3bb4a4]" : "text-[#475569]"}`}>
            <span>{rateA1 > rateB1 ? "✓" : "○"}</span>
            A wins Subgroup 1
          </span>
          <span className={`flex items-center gap-1.5 ${rateA2 > rateB2 ? "text-[#3bb4a4]" : "text-[#475569]"}`}>
            <span>{rateA2 > rateB2 ? "✓" : "○"}</span>
            A wins Subgroup 2
          </span>
          <span className={`flex items-center gap-1.5 ${aggRateA < aggRateB ? "text-[#3bb4a4]" : "text-[#475569]"}`}>
            <span>{aggRateA < aggRateB ? "✓" : "○"}</span>
            B wins Overall
          </span>
        </div>

        {/* Success / Failure state */}
        <AnimatePresence>
          {paradoxDetected ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-xl border px-4 py-4"
              style={{ borderColor: COL_GOLD, background: `#d4af3711` }}
            >
              <p className="text-[15px] font-black mb-1" style={{ color: COL_GOLD }}>
                🎉 You created Simpson&apos;s Paradox!
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Treatment A beats B in Subgroup 1 ({(rateA1 * 100).toFixed(1)}% vs {(rateB1 * 100).toFixed(1)}%)
                and in Subgroup 2 ({(rateA2 * 100).toFixed(1)}% vs {(rateB2 * 100).toFixed(1)}%).
                Yet overall, B appears to win ({(aggRateB * 100).toFixed(1)}% vs {(aggRateA * 100).toFixed(1)}%).
                The key is that the subgroup sizes are unequal: B is represented more in the subgroup
                where the overall rates are highest.
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] px-4 py-3 text-[12px] text-[#475569]"
            >
              {rateA1 > rateB1 && rateA2 > rateB2
                ? "A wins both subgroups. Now make total sizes unequal so B wins overall!"
                : "Adjust the values so Treatment A wins in both subgroups individually."}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint */}
        <div className="mt-4">
          <button
            onClick={() => setShowHint((h) => !h)}
            className="text-[12px] text-[#475569] hover:text-[#94a3b8] transition-colors underline underline-offset-2"
          >
            {showHint ? "Hide hint" : "Show hint"}
          </button>
          <AnimatePresence>
            {showHint && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-[12px] text-[#94a3b8] mt-2 leading-relaxed overflow-hidden"
              >
                Try making one subgroup much larger than the other. For example, give Treatment B a huge
                sample in the subgroup where rates are naturally high, and this pulls its aggregate rate up
                artificially, even if A outperforms B within each individual subgroup.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Expandable card for Tab 3 ─────────────────────────────────────────────────
interface ConceptCard {
  title: string;
  icon: string;
  summary: string;
  detail: string;
  example: string;
}

const CONCEPT_CARDS: ConceptCard[] = [
  {
    title: "Common Cause (Confounding)",
    icon: "🔀",
    summary: "A hidden third variable Z causes both X and Y, creating a spurious correlation.",
    detail:
      "When Z drives both your predictor X and your outcome Y, any observed X–Y association may be entirely explained by Z. Controlling for Z removes the apparent effect.",
    example:
      "Ice cream sales (X) and drowning rates (Y) are correlated. The lurking variable Z = summer temperature drives both. Remove summer and the correlation disappears.",
  },
  {
    title: "Confounding by Indication",
    icon: "🎯",
    summary: "Treatment assignment isn't random: the severity of a case influences which treatment it gets AND how it turns out.",
    detail:
      "When doctors (or any decision process) assign harder cases to one treatment, severity confounds the comparison: it drives both the treatment choice and the outcome, so the groups are not comparable. This is distinct from selection bias, which distorts WHO enters your dataset in the first place. Observational data is especially prone to both; randomized controlled trials are designed to break the link between severity and assignment.",
    example:
      "In the kidney stone study, doctors sent the harder large-stone cases to open surgery. Surgery's overall success rate looks lower because it treats tougher patients, not because surgery is worse.",
  },
  {
    title: "Ecological Fallacy",
    icon: "🗺️",
    summary: "Patterns observed at the group level don't necessarily hold at the individual level.",
    detail:
      "Aggregate correlations can be misleading about individual-level relationships. A country-level positive correlation between wealth and health doesn't mean every wealthy individual is healthier. Always examine the level of analysis that matches your question.",
    example:
      "A city where the average test score is high may still have many individual students who struggle. Reporting only city averages hides within-group variation.",
  },
];

function LurkingVariablesTab() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      {/* Concept cards */}
      {CONCEPT_CARDS.map((card, idx) => {
        const isOpen = expanded === idx;
        return (
          <div
            key={card.title}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden"
          >
            <button
              onClick={() => setExpanded(isOpen ? null : idx)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#1e293b]/40 transition-colors"
            >
              <span className="text-2xl">{card.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-white mb-0.5">{card.title}</p>
                <p className="text-[12px] text-[#94a3b8]">{card.summary}</p>
              </div>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="text-[#475569] flex-shrink-0 text-lg leading-none"
              >
                ▾
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 space-y-3 border-t border-[#1e293b]">
                    <p className="text-[13px] text-[#f1f5f9] leading-relaxed pt-3">
                      {card.detail}
                    </p>
                    <div className="rounded-xl bg-[#0a0e1a] border border-[#1e293b] px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569] mb-1">
                        Example
                      </p>
                      <p className="text-[12px] text-[#94a3b8] leading-relaxed">{card.example}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Key takeaway card */}
      <div
        className="rounded-2xl border px-5 py-5"
        style={{ borderColor: COL_GOLD, background: `#d4af3709` }}
      >
        <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: COL_GOLD }}>
          How to Avoid Simpson&apos;s Paradox
        </p>
        <ol className="space-y-2 text-[13px] text-[#f1f5f9]">
          <li className="flex gap-2">
            <span style={{ color: COL_GOLD }} className="font-bold flex-shrink-0">1.</span>
            Always disaggregate your data by key subgroups before drawing conclusions.
          </li>
          <li className="flex gap-2">
            <span style={{ color: COL_GOLD }} className="font-bold flex-shrink-0">2.</span>
            Look for variables that determine or influence group membership.
          </li>
          <li className="flex gap-2">
            <span style={{ color: COL_GOLD }} className="font-bold flex-shrink-0">3.</span>
            Report subgroup analyses alongside aggregate results.
          </li>
          <li className="flex gap-2">
            <span style={{ color: COL_GOLD }} className="font-bold flex-shrink-0">4.</span>
            Use stratification or regression to control for known confounders.
          </li>
        </ol>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const NEXT_GUIDE_SLUG = "simple-linear-regression";

export default function SimpsonsParadoxClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const completionFired = useRef(false);

  // Progress state
  const [berkeleyExplored,       setBerkeleyExplored]       = useState(false);
  const [kidneyExplored,         setKidneyExplored]         = useState(false);
  const [lurkingVarIdentified,   setLurkingVarIdentified]   = useState(false);
  const [toggleCount,            setToggleCount]            = useState(0);
  const [paradoxBuilderAttempted, setParadoxBuilderAttempted] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);

  const allComplete =
    berkeleyExplored &&
    kidneyExplored &&
    lurkingVarIdentified &&
    toggleCount >= 3 &&
    paradoxBuilderAttempted;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "simpsons-paradox", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  const progress = [
    { label: "Berkeley case explored",     done: berkeleyExplored },
    { label: "Kidney stones explored",     done: kidneyExplored },
    { label: "Lurking variable identified", done: lurkingVarIdentified },
    { label: `Toggle used ${toggleCount}/3 times`, done: toggleCount >= 3 },
    { label: "Paradox builder attempted",  done: paradoxBuilderAttempted },
  ];

  function handleReset() {
    setBerkeleyExplored(false);
    setKidneyExplored(false);
    setLurkingVarIdentified(false);
    setToggleCount(0);
    setParadoxBuilderAttempted(false);
    setActiveTab(0);
  }

  const TABS = ["Case Studies", "Build Your Own", "Lurking Variables"] as const;

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Simpson&apos;s Paradox</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              UNIT 9: ASSOCIATION &amp; DEPENDENCE
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Simpson&apos;s Paradox{" "}
            <span className="text-[var(--color-accent)]">&amp; Lurking Variables</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[620px]">
            Discover how aggregate trends can reverse when you look at subgroups. A lurking variable
            can completely flip your conclusion, and it happens more often than you&apos;d think.
          </p>
        </section>

        {/* Progress tracker */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: done ? "#3bb4a4" : "#1e293b" }}
              />
              <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>{label}</span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">
                Sign in
              </Link>{" "}
              to track progress
            </p>
          )}
          <AnimatePresence>
            {allComplete && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 p-1 rounded-xl bg-[#1e293b]/50 border border-[#1e293b] mb-6 w-fit flex-wrap">
          {TABS.map((label, idx) => {
            const active = activeTab === idx;
            return (
              <button
                key={label}
                onClick={() => setActiveTab(idx as 0 | 1 | 2)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: active ? "#1e5d8a" : "transparent",
                  color: active ? "#f1f5f9" : "#475569",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 0 && (
              <CaseStudiesTab
                onBerkeleyExplored={() => setBerkeleyExplored(true)}
                onKidneyExplored={() => setKidneyExplored(true)}
                onLurkingVarIdentified={() => setLurkingVarIdentified(true)}
                onToggle={() => setToggleCount((c) => c + 1)}
              />
            )}
            {activeTab === 1 && (
              <BuildYourOwnTab onAttempted={() => setParadoxBuilderAttempted(true)} />
            )}
            {activeTab === 2 && <LurkingVariablesTab />}
          </motion.div>
        </AnimatePresence>

        {/* Completion card */}
        <AnimatePresence>
          {allComplete && (
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
                  You Flipped the Trend
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You watched aggregate conclusions reverse under
                  stratification, named the lurking variables behind them, and
                  engineered a paradox of your own.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Case studies explored
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {(berkeleyExplored ? 1 : 0) + (kidneyExplored ? 1 : 0)} of 2
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      admissions and kidney stones
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Aggregate vs subgroup toggles
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {toggleCount}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      each one can flip the story
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Milestones completed
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {progress.filter((p) => p.done).length} of {progress.length}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      including your own built paradox
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;An aggregate rate is a weighted average of hidden
                    groups; until you ask who is in each group and how big they
                    are, the trend you see can reverse the moment you split the
                    data.&quot;
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
        {!allComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link
              href="/visual-guides/chi-square-independence"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← Chi-Square Independence
            </Link>
            <Link
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Simple Linear Regression →
            </Link>
          </div>
        )}

        <GuideCompletion isComplete={allComplete} guideSlug="simpsons-paradox" score={100} />
      </div>
    </div>
  );
}
