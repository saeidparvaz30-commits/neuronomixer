"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GridSquare, GridFilter, ScenarioType } from "./types";

// ── Marble bag view (marbles scenario only) ───────────────────────────────────

type MarbleColor = "red" | "blue";

interface BagState {
  bagMarbles: MarbleColor[];
  drawnColor: MarbleColor | null;
  highlightColor: MarbleColor | null;
  annotation: string | null;
  title: string;
  sub: string | null;
}

function getBagState(selectedNodeId: string | null): BagState {
  if (!selectedNodeId || selectedNodeId === "root") {
    return {
      bagMarbles: ["red","red","red","red","red","blue","blue","blue"],
      drawnColor: null,
      highlightColor: null,
      annotation: null,
      title: "Full bag: 5 red + 3 blue",
      sub: "Click any tree node to see the conditional sample space.",
    };
  }
  if (selectedNodeId === "r1") {
    return {
      bagMarbles: ["red","red","red","red","blue","blue","blue"],
      drawnColor: "red",
      highlightColor: null,
      annotation: null,
      title: "After drawing Red first",
      sub: "4 red + 3 blue remain (7 total). Click a leaf node to see the favorable outcomes.",
    };
  }
  if (selectedNodeId === "rr") {
    return {
      bagMarbles: ["red","red","red","red","blue","blue","blue"],
      drawnColor: "red",
      highlightColor: "red",
      annotation: "P(Red | 1st Red) = 4/7 ≈ 0.571",
      title: "After drawing Red first",
      sub: "4 of the 7 remaining marbles are red.",
    };
  }
  if (selectedNodeId === "rb") {
    return {
      bagMarbles: ["red","red","red","red","blue","blue","blue"],
      drawnColor: "red",
      highlightColor: "blue",
      annotation: "P(Blue | 1st Red) = 3/7 ≈ 0.429",
      title: "After drawing Red first",
      sub: "3 of the 7 remaining marbles are blue.",
    };
  }
  if (selectedNodeId === "b1") {
    return {
      bagMarbles: ["red","red","red","red","red","blue","blue"],
      drawnColor: "blue",
      highlightColor: null,
      annotation: null,
      title: "After drawing Blue first",
      sub: "5 red + 2 blue remain (7 total). Click a leaf node to see the favorable outcomes.",
    };
  }
  if (selectedNodeId === "br") {
    return {
      bagMarbles: ["red","red","red","red","red","blue","blue"],
      drawnColor: "blue",
      highlightColor: "red",
      annotation: "P(Red | 1st Blue) = 5/7 ≈ 0.714",
      title: "After drawing Blue first",
      sub: "5 of the 7 remaining marbles are red.",
    };
  }
  if (selectedNodeId === "bb") {
    return {
      bagMarbles: ["red","red","red","red","red","blue","blue"],
      drawnColor: "blue",
      highlightColor: "blue",
      annotation: "P(Blue | 1st Blue) = 2/7 ≈ 0.286",
      title: "After drawing Blue first",
      sub: "2 of the 7 remaining marbles are blue.",
    };
  }
  // fallback
  return {
    bagMarbles: ["red","red","red","red","red","blue","blue","blue"],
    drawnColor: null,
    highlightColor: null,
    annotation: null,
    title: "Full bag: 5 red + 3 blue",
    sub: null,
  };
}

function MarbleBagView({ selectedNodeId }: { selectedNodeId: string | null }) {
  const state = getBagState(selectedNodeId);
  const { bagMarbles, drawnColor, highlightColor, annotation, title, sub } = state;

  const R = 17;
  const PITCH = 42;
  const PAD_X = 22;
  const ROW1_Y = 36;
  const ROW2_Y = 82;

  const total = bagMarbles.length; // 7 or 8
  const row1Count = Math.ceil(total / 2);
  const row2Count = total - row1Count;

  // Row 1 positions (left-aligned)
  const row1: Array<{ cx: number; cy: number; color: MarbleColor }> = [];
  for (let i = 0; i < row1Count; i++) {
    row1.push({ cx: PAD_X + R + i * PITCH, cy: ROW1_Y, color: bagMarbles[i] });
  }

  // Row 2 positions (staggered by half a pitch for visual appeal)
  const row2: Array<{ cx: number; cy: number; color: MarbleColor }> = [];
  for (let i = 0; i < row2Count; i++) {
    row2.push({
      cx: PAD_X + R + PITCH / 2 + i * PITCH,
      cy: ROW2_Y,
      color: bagMarbles[row1Count + i],
    });
  }

  const allMarbles = [...row1, ...row2];

  // Bag right edge
  const bagRightEdge = PAD_X + R + (row1Count - 1) * PITCH + R;
  // Drawn area starts after a gap
  const sepX = bagRightEdge + 18;
  const drawnCX = sepX + 20 + R;
  const drawnCY = (ROW1_Y + ROW2_Y) / 2;

  const SVG_W = drawnColor ? drawnCX + R + 16 : bagRightEdge + 16;
  const SVG_H = ROW2_Y + R + 20;

  function fillColor(c: MarbleColor) {
    return c === "red" ? "#ef4444" : "#3b82f6";
  }
  function strokeColor(c: MarbleColor) {
    return c === "red" ? "#dc2626" : "#2563eb";
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <AnimatePresence mode="wait">
        <motion.div
          key={title}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="px-3 py-2 rounded-xl bg-[#1e293b] border border-[#3bb4a4]/20 text-[11px] leading-relaxed"
        >
          <p className="font-semibold text-[#3bb4a4] mb-0.5">{title}</p>
          {sub && <p className="text-[#94a3b8]">{sub}</p>}
        </motion.div>
      </AnimatePresence>

      {/* Count row */}
      <div className="flex items-center gap-2 text-[12px]">
        <span className="text-[#94a3b8]">Remaining</span>
        <span className="font-bold text-white">{bagMarbles.length}</span>
        <span className="text-[#94a3b8]">/ 8</span>
        {drawnColor && (
          <span className="text-[#475569] ml-1">(1 drawn)</span>
        )}
      </div>

      {/* SVG marble bag */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedNodeId ?? "none"}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full"
            style={{ maxHeight: 130 }}
            aria-label="Marble bag visualization"
          >
            <defs>
              <filter id="marble-glow-gold" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Bag marbles */}
            {allMarbles.map((m, i) => {
              const isHighlighted = highlightColor !== null && m.color === highlightColor;
              const isDimmed = highlightColor !== null && !isHighlighted;
              return (
                <circle
                  key={i}
                  cx={m.cx}
                  cy={m.cy}
                  r={R}
                  fill={fillColor(m.color)}
                  stroke={isHighlighted ? "var(--color-accent)" : strokeColor(m.color)}
                  strokeWidth={isHighlighted ? 3 : 1.5}
                  opacity={isDimmed ? 0.28 : 1}
                  filter={isHighlighted ? "url(#marble-glow-gold)" : undefined}
                />
              );
            })}

            {/* Drawn marble section */}
            {drawnColor && (
              <>
                {/* Dashed separator */}
                <line
                  x1={sepX}
                  y1={ROW1_Y - R + 4}
                  x2={sepX}
                  y2={ROW2_Y + R - 4}
                  stroke="#334155"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
                {/* Drawn marble (greyed) */}
                <circle
                  cx={drawnCX}
                  cy={drawnCY}
                  r={R - 2}
                  fill="#334155"
                  stroke="#475569"
                  strokeWidth={1.5}
                  opacity={0.75}
                />
                {/* × symbol */}
                <text
                  x={drawnCX}
                  y={drawnCY + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={15}
                  fill="#475569"
                  fontWeight="bold"
                  style={{ userSelect: "none" }}
                >
                  ×
                </text>
                {/* "drawn" label */}
                <text
                  x={drawnCX}
                  y={drawnCY + R + 12}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#475569"
                  style={{ userSelect: "none" }}
                >
                  drawn
                </text>
              </>
            )}
          </svg>
        </motion.div>
      </AnimatePresence>

      {/* Probability annotation */}
      <AnimatePresence>
        {annotation && (
          <motion.div
            key={annotation}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-4 py-2 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-[13px] font-semibold text-[var(--color-accent)] font-mono text-center"
          >
            {annotation}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Filter logic (medical + manufacturing) ────────────────────────────────────

function isVisible(square: GridSquare, filter: GridFilter): boolean {
  if (filter === "all") return true;
  switch (filter) {
    // medical
    case "disease_people":
      return square.category === "disease_positive" || square.category === "disease_negative";
    case "healthy_people":
      return square.category === "healthy_positive" || square.category === "healthy_negative";
    case "test_positive":
      return square.category === "disease_positive" || square.category === "healthy_positive";
    case "disease_and_positive":
      return square.category === "disease_positive";
    case "disease_and_negative":
      return square.category === "disease_negative";
    case "healthy_and_positive":
      return square.category === "healthy_positive";
    case "healthy_and_negative":
      return square.category === "healthy_negative";
    // marbles (unused by grid — handled by MarbleBagView)
    case "red_first":
      return square.category === "red";
    case "blue_first":
      return square.category === "blue";
    // manufacturing
    case "factory_a_items":
      return square.category === "factory_a_defect" || square.category === "factory_a_ok";
    case "factory_b_items":
      return square.category === "factory_b_defect" || square.category === "factory_b_ok";
    case "defective":
      return square.category === "factory_a_defect" || square.category === "factory_b_defect";
    case "factory_a_defective":
      return square.category === "factory_a_defect";
    case "factory_a_ok_items":
      return square.category === "factory_a_ok";
    case "factory_b_defective":
      return square.category === "factory_b_defect";
    case "factory_b_ok_items":
      return square.category === "factory_b_ok";
    default:
      return true;
  }
}

type FilterInfo = { headline: string; sub: string; annotation?: string };

function filterLabel(filter: GridFilter, _scenario: ScenarioType): FilterInfo | null {
  if (filter === "all") return null;

  const labels: Partial<Record<GridFilter, FilterInfo>> = {
    // medical
    disease_people: {
      headline: "Filtered: People with the disease",
      sub: "1 out of 100 people have the disease (1% prevalence).",
      annotation: "P(Disease) = 0.01",
    },
    healthy_people: {
      headline: "Filtered: Healthy people",
      sub: "99 out of 100 people are healthy.",
      annotation: "P(No Disease) = 0.99",
    },
    test_positive: {
      headline: "Filtered: Everyone who tests positive",
      sub: "Blue = true positive (disease). Gold = false positive (healthy). Only 1 of 11 has the disease.",
      annotation: "P(Test+) ≈ 10.85%: 11 of 100 people",
    },
    disease_and_positive: {
      headline: "Filtered: Disease AND Test+",
      sub: "This is the numerator in P(Disease | Test+). Just 1 person out of 100.",
      annotation: "P(Disease | Test+) = 0.0095 / 0.1085 ≈ 8.8%",
    },
    disease_and_negative: {
      headline: "Filtered: Disease AND Test−",
      sub: "Rare outcome: a disease carrier who tests negative (false negative).",
      annotation: "P(Test− | Disease) = 0.05",
    },
    healthy_and_positive: {
      headline: "Filtered: Healthy AND Test+ (false positives)",
      sub: "10% of healthy people test positive despite having no disease.",
      annotation: "P(Test+ | No Disease) = 0.10",
    },
    healthy_and_negative: {
      headline: "Filtered: Healthy AND Test− (true negatives)",
      sub: "90% of healthy people correctly test negative.",
      annotation: "P(Test− | No Disease) = 0.90",
    },
    // manufacturing
    factory_a_items: {
      headline: "Filtered: Factory A items",
      sub: "Factory A produces 40% of all items. 2 are defective, 38 are OK.",
      annotation: "P(Factory A) = 0.40",
    },
    factory_b_items: {
      headline: "Filtered: Factory B items",
      sub: "Factory B produces 60% of all items. 2 are defective, 58 are OK.",
      annotation: "P(Factory B) = 0.60",
    },
    defective: {
      headline: "Filtered: All defective items",
      sub: "Gold = Factory A defects. Teal = Factory B defects. 4 defective items total.",
      annotation: "P(Defective) = 0.038",
    },
    factory_a_defective: {
      headline: "Filtered: Factory A defective",
      sub: "2 of the 4 defective squares come from Factory A. This 100-square grid rounds Factory B's 1.8 expected defects up to 2; with the exact rates, the split is 52.6% vs 47.4%.",
      annotation: "P(Factory A | Defective) = 2/4 = 50% in grid (exact: 52.6%)",
    },
    factory_a_ok_items: {
      headline: "Filtered: Factory A, OK items",
      sub: "95% of Factory A's items pass quality control.",
      annotation: "P(OK | Factory A) = 0.95",
    },
    factory_b_defective: {
      headline: "Filtered: Factory B defective",
      sub: "2 of the 4 defective squares come from Factory B (rounded up from 1.8 expected). With the exact rates, the split is 47.4% vs 52.6%.",
      annotation: "P(Factory B | Defective) = 2/4 = 50% in grid (exact: 47.4%)",
    },
    factory_b_ok_items: {
      headline: "Filtered: Factory B, OK items",
      sub: "97% of Factory B's items pass quality control.",
      annotation: "P(OK | Factory B) = 0.97",
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
  selectedNodeId?: string | null;
}

export default function SampleSpaceAnimator({
  squares,
  gridSide,
  filter,
  scenario,
  selectedNodeId = null,
}: SampleSpaceAnimatorProps) {
  // Hooks must run unconditionally, before the marble-scenario early return
  const visible = useMemo(() => squares.filter((sq) => isVisible(sq, filter)), [squares, filter]);

  // Marble scenario uses a dedicated bag view
  if (scenario === "marbles") {
    return <MarbleBagView selectedNodeId={selectedNodeId} />;
  }

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
            Full sample space: {total} squares. Click a tree node to filter.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Count + annotation pill */}
      <div className="flex items-center gap-2 text-[12px] flex-wrap">
        <span className="text-[#94a3b8]">Showing</span>
        <span className="font-bold text-white">{visibleCount}</span>
        <span className="text-[#94a3b8]">/ {total}</span>
        {filter !== "all" && (
          <span className="text-[var(--color-accent)] font-semibold ml-1">
            ({((visibleCount / total) * 100).toFixed(1)}%)
          </span>
        )}
        {info?.annotation && (
          <AnimatePresence>
            <motion.span
              key={info.annotation}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="ml-auto px-3 py-1 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-[11px] font-semibold text-[var(--color-accent)] font-mono"
            >
              {info.annotation}
            </motion.span>
          </AnimatePresence>
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
                transition={{ duration: 0.25, delay: show ? 0 : (sq.id % 5) * 0.024 }}
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
        { color: "var(--color-accent)", label: "Healthy + Test+" },
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
      { color: "var(--color-accent)", label: "Factory A: Defective" },
      { color: "#b8860b", label: "Factory A: OK" },
      { color: "#3bb4a4", label: "Factory B: Defective" },
      { color: "#1e5d8a", label: "Factory B: OK" },
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
