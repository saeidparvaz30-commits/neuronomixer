"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WeightingRow } from "./types";

interface Props {
  surveyCardsViewed: Set<string>;
  weightingRows: WeightingRow[];
  onCardView: (id: string) => void;
  onWeightingChange: (rows: WeightingRow[]) => void;
}

interface Card {
  id: string;
  title: string;
}

const CARDS: Card[] = [
  { id: "weighting", title: "Post-Survey Weighting" },
  { id: "stratification", title: "Stratified Sampling Design" },
  { id: "nonresponse", title: "Non-Response & Bias" },
];

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ── Weighting table ───────────────────────────────────────────────────────────

function WeightingTable({
  rows,
  onChange,
}: {
  rows: WeightingRow[];
  onChange: (rows: WeightingRow[]) => void;
}) {
  function handleAchievedChange(idx: number, value: string) {
    const achieved = Math.max(1, Math.min(99, parseFloat(value) || 1));
    const newRows = rows.map((r, i) =>
      i === idx
        ? { ...r, achieved, weight: parseFloat((r.target / achieved).toFixed(4)) }
        : r
    );
    onChange(newRows);
  }

  return (
    <div className="overflow-x-auto mt-3">
      <table className="w-full text-[12px]" role="table">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th scope="col" className="text-left py-2 pr-3 text-[10px] font-semibold uppercase tracking-[1px] text-[#475569]">
              Group
            </th>
            <th scope="col" className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-[1px] text-[#475569]">
              Target %
            </th>
            <th scope="col" className="text-right py-2 px-3 text-[10px] font-semibold uppercase tracking-[1px] text-[#475569]">
              Achieved %
            </th>
            <th scope="col" className="text-right py-2 pl-3 text-[10px] font-semibold uppercase tracking-[1px] text-[#475569]">
              Weight
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.group} className="border-b border-white/[0.03]">
              <td className="py-2.5 pr-3 font-semibold text-white">
                {row.group}
              </td>
              <td className="text-right py-2.5 px-3 text-[#3bb4a4]">
                {row.target}%
              </td>
              <td className="text-right py-2.5 px-3">
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={row.achieved}
                  onChange={(e) => handleAchievedChange(idx, e.target.value)}
                  className="w-16 bg-[#1e293b] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white text-right focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                  aria-label={`${row.group} achieved percentage`}
                />
              </td>
              <td className="text-right py-2.5 pl-3">
                <span
                  className={`font-mono font-bold text-[13px] ${
                    row.weight < 0.9
                      ? "text-[var(--color-warning)]"
                      : row.weight > 1.1
                      ? "text-[#3bb4a4]"
                      : "text-white"
                  }`}
                >
                  {row.weight.toFixed(2)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-[#94a3b8] mt-3">
        <span className="text-[var(--color-accent)] font-semibold">Key lesson:</span>{" "}
        Weighting corrects for unequal sampling probabilities. Edit the
        Achieved % to see weights update.
      </p>
    </div>
  );
}

// ── Stratification visual ─────────────────────────────────────────────────────

function StratificationContent() {
  return (
    <div className="mt-3 space-y-4">
      <p className="text-[12px] text-[#94a3b8] leading-relaxed">
        Stratified sampling divides the population into non-overlapping subgroups
        (strata), then samples each stratum separately. This ensures all groups
        are represented and can reduce overall variance.
      </p>

      {/* Simple diagram */}
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[120px] rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-3 text-center">
          <p className="text-[11px] font-bold text-[#94a3b8] mb-2">
            Population
          </p>
          <div className="space-y-1.5">
            <div className="rounded-lg bg-[#1e5d8a]/30 border border-[#1e5d8a]/40 py-1.5">
              <span className="text-[11px] text-white">Rural (40%)</span>
            </div>
            <div className="rounded-lg bg-[#3bb4a4]/20 border border-[#3bb4a4]/40 py-1.5">
              <span className="text-[11px] text-white">Urban (60%)</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center gap-2 py-4">
          <svg className="w-6 h-6 text-[#475569]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <span className="text-[10px] text-[#475569]">sample</span>
        </div>

        <div className="flex-1 min-w-[120px] space-y-1.5">
          <div className="rounded-xl border border-[#1e5d8a]/40 bg-[#1e5d8a]/20 p-3 text-center">
            <p className="text-[10px] text-[#94a3b8] mb-1">Rural stratum</p>
            <p className="text-[12px] font-bold text-white">n₁ = 400</p>
          </div>
          <div className="rounded-xl border border-[#3bb4a4]/40 bg-[#3bb4a4]/10 p-3 text-center">
            <p className="text-[10px] text-[#94a3b8] mb-1">Urban stratum</p>
            <p className="text-[12px] font-bold text-white">n₂ = 600</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-[#1e293b]/40 p-3 border border-white/[0.05]">
        <p className="text-[11px] font-mono text-[#94a3b8]">
          SE² = Σ (Wₕ²) × pₕ(1−pₕ) / nₕ
        </p>
        <p className="text-[11px] text-[#475569] mt-1">
          SE is smaller when you stratify by a variable correlated with the
          outcome
        </p>
      </div>
    </div>
  );
}

// ── Non-response content ──────────────────────────────────────────────────────

function NonResponseContent() {
  return (
    <div className="mt-3 space-y-4">
      <p className="text-[12px] text-[#94a3b8] leading-relaxed">
        Not all contacted people respond. Low response rates introduce
        non-response bias if those who respond differ systematically from
        those who don&apos;t.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { method: "Phone", range: "5–15%", color: "var(--color-warning)" },
          { method: "Mail", range: "20–30%", color: "var(--color-accent)" },
          { method: "Online opt-in", range: "10–20%", color: "#3bb4a4" },
        ].map(({ method, range, color }) => (
          <div
            key={method}
            className="rounded-xl bg-[#1e293b]/40 p-3 text-center"
          >
            <p className="text-[11px] text-[#94a3b8] mb-1">{method}</p>
            <p
              className="text-[15px] font-bold"
              style={{ color }}
            >
              {range}
            </p>
            <p className="text-[10px] text-[#475569]">response rate</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-[11px] font-semibold text-white mb-2">Solutions</p>
        <ul className="space-y-1">
          {[
            "Offer incentives to increase participation",
            "Follow-up contacts (phone, mail, email)",
            "Propensity-score weighting by response likelihood",
            "Compare early vs. late respondents",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-[11px] text-[#94a3b8]">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#3bb4a4] flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-3">
        <p className="text-[11px] text-[var(--color-warning)] font-semibold mb-1">
          Caution
        </p>
        <p className="text-[11px] text-[#94a3b8]">
          No statistical adjustment fully eliminates non-response bias. The
          best remedy is a higher response rate.
        </p>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SurveyDesignSection({
  surveyCardsViewed,
  weightingRows,
  onCardView,
  onWeightingChange,
}: Props) {
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());

  function toggleCard(id: string) {
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        onCardView(id);
      }
      return next;
    });
  }

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[15px] font-bold text-white">
          Survey Design Principles
        </p>
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full transition-colors"
            style={{
              background:
                surveyCardsViewed.size >= 3 ? "#3bb4a4" : "#1e293b",
            }}
          />
          <span className="text-[10px] text-[#475569]">
            {surveyCardsViewed.size}/3 explored
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {CARDS.map(({ id, title }) => {
          const isOpen = openCards.has(id);
          const viewed = surveyCardsViewed.has(id);

          return (
            <div
              key={id}
              className="rounded-xl border border-[#1e293b] overflow-hidden transition-colors hover:border-[#1e293b]/80"
            >
              <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() => toggleCard(id)}
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 transition-colors"
                    style={{ background: viewed ? "#3bb4a4" : "#334155" }}
                  />
                  <span className="text-[13px] font-semibold text-white">
                    {title}
                  </span>
                </div>
                <span className="text-[#475569]">
                  <ChevronIcon open={isOpen} />
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-white/[0.04]">
                      {id === "weighting" && (
                        <WeightingTable
                          rows={weightingRows}
                          onChange={onWeightingChange}
                        />
                      )}
                      {id === "stratification" && <StratificationContent />}
                      {id === "nonresponse" && <NonResponseContent />}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
