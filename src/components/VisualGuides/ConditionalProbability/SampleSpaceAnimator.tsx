"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GridSquare, GridFilter, ScenarioType } from "./types";

// ── Filter logic ──────────────────────────────────────────────────────────────

function isVisible(square: GridSquare, filter: GridFilter): boolean {
  if (filter === "all") return true;

  switch (filter) {
    case "test_positive":
      return square.category === "disease_positive" || square.category === "healthy_positive";
    case "disease_and_positive":
      return square.category === "disease_positive";
    case "red_first":
      return square.category === "red";
    case "blue_first":
      return square.category === "blue";
    case "defective":
      return square.category === "factory_a_defect" || square.category === "factory_b_defect";
    case "factory_a_defective":
      return square.category === "factory_a_defect";
    default:
      return true;
  }
}

function filterLabel(filter: GridFilter, scenario: ScenarioType): { headline: string; sub: string } | null {
  if (filter === "all") return null;

  const labels: Record<GridFilter, { headline: string; sub: string }> = {
    all: { headline: "", sub: "" },
    test_positive: {
      headline: "Filtered: People who test positive",
      sub: "Gray = false positives (healthy but tested +). Blue = true positives (have disease).",
    },
    disease_and_positive: {
      headline: "Filtered: Have disease AND tested positive",
      sub: "This is the numerator in P(Disease | Test+).",
    },
    red_first: {
      headline: "Filtered: First draw = Red marble",
      sub: "5 out of 8 squares remain. Now ask: of these, what fraction is red on draw 2?",
    },
    blue_first: {
      headline: "Filtered: First draw = Blue marble",
      sub: "3 out of 8 squares remain.",
    },
    defective: {
      headline: "Filtered: Defective items only",
      sub: "Gold = Factory A defects. Teal = Factory B defects. Factory A made fewer items but has a higher defect rate.",
    },
    factory_a_defective: {
      headline: "Filtered: Factory A defective",
      sub: "This is P(Factory A and Defective) = 0.02.",
    },
  };

  return labels[filter] ?? null;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SampleSpaceAnimatorProps {
  squares: GridSquare[];
  gridSide: number;
  filter: GridFilter;
  scenario: ScenarioType;
}

export default function SampleSpaceAnimator({
  squares,
  gridSide,
  filter,
  scenario,
}: SampleSpaceAnimatorProps) {
  const visible = useMemo(() => squares.filter((sq) => isVisible(sq, filter)), [squares, filter]);
  const total = squares.length;
  const visibleCount = visible.length;

  const info = filterLabel(filter, scenario);

  return (
    <div className="flex flex-col gap-3">
      {/* Info strip */}
      <AnimatePresence mode="wait">
        {info ? (
          <motion.div
            key={filter}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="px-3 py-2 rounded-xl bg-[#1e293b] border border-[#3bb4a4]/20 text-[11px] leading-relaxed"
          >
            <p className="font-semibold text-[#3bb4a4] mb-0.5">{info.headline}</p>
            <p className="text-[#94a3b8]">{info.sub}</p>
          </motion.div>
        ) : (
          <motion.div
            key="all"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-3 py-2 rounded-xl bg-[#1e293b]/50 border border-[#1e293b] text-[11px] text-[#475569]"
          >
            Full sample space — {total} squares. Click a tree node to filter.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Count */}
      <div className="flex items-center gap-2 text-[12px]">
        <span className="text-[#94a3b8]">Showing</span>
        <span className="font-bold text-white">{visibleCount}</span>
        <span className="text-[#94a3b8]">/ {total}</span>
        {filter !== "all" && (
          <span className="text-[#d4af37] font-semibold ml-1">
            ({((visibleCount / total) * 100).toFixed(1)}%)
          </span>
        )}
      </div>

      {/* Grid */}
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${gridSide}, minmax(0, 1fr))` }}
        aria-label="Sample space grid"
      >
        <AnimatePresence>
          {squares.map((sq) => {
            const show = isVisible(sq, filter);
            return (
              <motion.div
                key={sq.id}
                layout
                initial={false}
                animate={show ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.25, delay: show ? 0 : Math.random() * 0.12 }}
                title={sq.innerLabel ?? sq.category}
                className="aspect-square rounded-[2px] flex items-center justify-center"
                style={{ backgroundColor: sq.color }}
              >
                {sq.innerLabel && sq.innerLabel.length <= 2 && (
                  <span
                    className="text-[6px] font-bold leading-none"
                    style={{ color: "#0f172a", userSelect: "none" }}
                  >
                    {sq.innerLabel}
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <Legend scenario={scenario} />
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend({ scenario }: { scenario: ScenarioType }) {
  const items = useMemo(() => {
    if (scenario === "medical_testing") {
      return [
        { color: "#3b82f6", label: "Disease + Test+" },
        { color: "#1e40af", label: "Disease + Test−" },
        { color: "#d4af37", label: "Healthy + Test+" },
        { color: "#334155", label: "Healthy + Test−" },
      ];
    }
    if (scenario === "marbles") {
      return [
        { color: "#ef4444", label: "Red marble" },
        { color: "#3b82f6", label: "Blue marble" },
      ];
    }
    // manufacturing
    return [
      { color: "#d4af37", label: "Factory A — Defective" },
      { color: "#b8860b", label: "Factory A — OK" },
      { color: "#3bb4a4", label: "Factory B — Defective" },
      { color: "#1e5d8a", label: "Factory B — OK" },
    ];
  }, [scenario]);

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-[2px] flex-shrink-0" style={{ backgroundColor: item.color }} />
          <span className="text-[10px] text-[#94a3b8]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
