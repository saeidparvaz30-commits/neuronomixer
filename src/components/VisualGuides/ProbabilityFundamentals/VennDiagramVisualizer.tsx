"use client";

import React from "react";
import { type VennMode } from "./types";

// ── Fixed scenario: A = die even (2,4,6), B = die > 3 (4,5,6)
// Intersection = 4,6 (2 outcomes)
// A only = 2 (1 outcome)
// B only = 5 (1 outcome)
// Neither = 1, 3 (2 outcomes)
// Total = 6

interface Region {
  id: "a_only" | "intersection" | "b_only" | "neither";
  label: string;
  outcomes: string;
  count: number;
  total: number;
}

const REGIONS: Region[] = [
  {
    id: "a_only",
    label: "A only",
    outcomes: "Die = 2",
    count: 1,
    total: 6,
  },
  {
    id: "intersection",
    label: "A AND B",
    outcomes: "Die = 4 or 6",
    count: 2,
    total: 6,
  },
  {
    id: "b_only",
    label: "B only",
    outcomes: "Die = 5",
    count: 1,
    total: 6,
  },
  {
    id: "neither",
    label: "Neither",
    outcomes: "Die = 1 or 3",
    count: 2,
    total: 6,
  },
];

/** Returns which region ids should be highlighted gold for each mode */
function highlightedRegions(mode: VennMode): Set<Region["id"]> {
  if (mode === "AND") return new Set(["intersection"]);
  if (mode === "OR") return new Set(["a_only", "intersection", "b_only"]);
  // NOT A
  return new Set(["b_only", "neither"]);
}

interface VennDiagramVisualizerProps {
  vennMode: VennMode;
  vennRegionsClicked: string[];
  onModeChange: (mode: VennMode) => void;
  onRegionClick: (regionId: string) => void;
}

export default function VennDiagramVisualizer({
  vennMode,
  vennRegionsClicked,
  onModeChange,
  onRegionClick,
}: VennDiagramVisualizerProps) {
  const highlighted = highlightedRegions(vennMode);

  // Count highlighted outcomes
  const highlightedCount = REGIONS.filter((r) => highlighted.has(r.id)).reduce(
    (sum, r) => sum + r.count,
    0,
  );
  const highlightedP = (highlightedCount / 6).toFixed(3);

  return (
    <div className="space-y-5">
      {/* Scenario description */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a]/60 px-4 py-3 text-[12px] text-[#94a3b8] leading-relaxed">
        <span className="text-white font-semibold">Fixed scenario: </span>
        A die is rolled once.{" "}
        <span className="text-[#3bb4a4]">Circle A = even result {"{2, 4, 6}"}</span>.{" "}
        <span className="text-[#d4af37]">Circle B = result {">"} 3 {"{4, 5, 6}"}</span>.
        Intersection = {"{4, 6}"}.
      </div>

      {/* Mode selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["AND", "OR", "NOT"] as VennMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-4 py-1.5 text-[12px] rounded-lg font-semibold transition-colors ${
              vennMode === m
                ? "bg-[#d4af37] text-[#0a0e1a]"
                : "border border-[#1e293b] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37]"
            }`}
          >
            {m === "NOT" ? "NOT A" : `A ${m} B`}
          </button>
        ))}
      </div>

      {/* SVG Venn diagram */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0a0e1a] p-4">
        <VennSVG highlighted={highlighted} onRegionClick={onRegionClick} />

        {/* Region info */}
        <div className="mt-3 rounded-xl border border-[#1e293b] bg-[#0f172a] px-4 py-2.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#d4af37] mb-0.5">
            Highlighted:{" "}
            {vennMode === "NOT"
              ? "NOT A (everything outside A)"
              : `A ${vennMode} B`}
          </p>
          <p className="text-xl font-black text-white font-mono">
            {highlightedCount}/6 outcomes — P = {highlightedP}
          </p>
        </div>
      </div>

      {/* Clickable region breakdown */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-2">
          Click a region to explore
        </p>
        <div className="grid grid-cols-2 gap-2">
          {REGIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => onRegionClick(r.id)}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                vennRegionsClicked.includes(r.id)
                  ? "border-[#3bb4a4]/50 bg-[#3bb4a4]/10"
                  : "border-[#1e293b] hover:border-[#d4af37]/50"
              }`}
            >
              <p className="text-[11px] font-semibold text-white mb-0.5">{r.label}</p>
              <p className="text-[11px] text-[#94a3b8]">{r.outcomes}</p>
              <p className="text-[11px] font-mono text-[#d4af37] mt-1">
                {r.count}/{r.total} = {(r.count / r.total).toFixed(3)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {vennRegionsClicked.length > 0 && (
        <p className="text-[11px] text-[#3bb4a4]">
          Regions explored: {vennRegionsClicked.join(", ")} ({vennRegionsClicked.length}/4)
        </p>
      )}
    </div>
  );
}

// ── SVG component ─────────────────────────────────────────────────────────────

interface VennSVGProps {
  highlighted: Set<Region["id"]>;
  onRegionClick: (id: string) => void;
}

function VennSVG({ highlighted, onRegionClick }: VennSVGProps) {
  const W = 480;
  const H = 220;

  // Circle centres and radius
  const r = 80;
  const cy = H / 2;
  const cxA = W / 2 - 55;
  const cxB = W / 2 + 55;

  // Colours
  const GOLD = "#d4af37";
  const TEAL = "#3bb4a4";
  const DIM = "#1e293b";
  const GOLD_FILL = "rgba(212,175,55,0.18)";
  const DIM_FILL = "rgba(30,41,59,0.3)";
  const NEITHER_FILL = "rgba(30,41,59,0.5)";

  const aOnlyHighlight = highlighted.has("a_only");
  const intHighlight = highlighted.has("intersection");
  const bOnlyHighlight = highlighted.has("b_only");
  const neitherHighlight = highlighted.has("neither");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
      {/* Clip paths for A-only and B-only regions */}
      <defs>
        {/* A region = circle A */}
        <clipPath id="clipA">
          <circle cx={cxA} cy={cy} r={r} />
        </clipPath>
        {/* B region = circle B */}
        <clipPath id="clipB">
          <circle cx={cxB} cy={cy} r={r} />
        </clipPath>
      </defs>

      {/* Neither region: large rect minus both circles — click target */}
      <rect
        x={0}
        y={0}
        width={W}
        height={H}
        fill={neitherHighlight ? GOLD_FILL : NEITHER_FILL}
        style={{ cursor: "pointer" }}
        onClick={() => onRegionClick("neither")}
      />

      {/* A-only fill (clipped to A, paint over B to show only A-only) */}
      <circle
        cx={cxA}
        cy={cy}
        r={r}
        fill={aOnlyHighlight ? GOLD_FILL : DIM_FILL}
        stroke={TEAL}
        strokeWidth={1.5}
        style={{ cursor: "pointer" }}
        onClick={() => onRegionClick("a_only")}
      />

      {/* B-only fill */}
      <circle
        cx={cxB}
        cy={cy}
        r={r}
        fill={bOnlyHighlight ? GOLD_FILL : DIM_FILL}
        stroke={GOLD}
        strokeWidth={1.5}
        style={{ cursor: "pointer" }}
        onClick={() => onRegionClick("b_only")}
      />

      {/* Intersection — painted on top */}
      {/* We approximate the lens shape with a path */}
      <IntersectionLens
        cxA={cxA}
        cxB={cxB}
        cy={cy}
        r={r}
        fill={intHighlight ? "rgba(212,175,55,0.55)" : "rgba(100,116,139,0.25)"}
        onClick={() => onRegionClick("intersection")}
      />

      {/* Circle outlines on top (no fill — just strokes) */}
      <circle cx={cxA} cy={cy} r={r} fill="none" stroke={TEAL} strokeWidth={1.5} />
      <circle cx={cxB} cy={cy} r={r} fill="none" stroke={GOLD} strokeWidth={1.5} />

      {/* Labels */}
      <text x={cxA - r * 0.55} y={cy} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold">
        A
      </text>
      <text x={cxA - r * 0.55} y={cy + 16} textAnchor="middle" fill={TEAL} fontSize={9}>
        Even
      </text>

      <text x={cxB + r * 0.55} y={cy} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold">
        B
      </text>
      <text x={cxB + r * 0.55} y={cy + 16} textAnchor="middle" fill={GOLD} fontSize={9}>
        {"> 3"}
      </text>

      {/* A-only label */}
      <text x={cxA - 28} y={cy - 8} textAnchor="middle" fill="#94a3b8" fontSize={9}>
        1/6
      </text>
      <text x={cxA - 28} y={cy + 6} textAnchor="middle" fill="#94a3b8" fontSize={9}>
        (die=2)
      </text>

      {/* Intersection label */}
      <text x={(cxA + cxB) / 2} y={cy - 8} textAnchor="middle" fill="#fff" fontSize={9}>
        2/6
      </text>
      <text x={(cxA + cxB) / 2} y={cy + 6} textAnchor="middle" fill="#94a3b8" fontSize={9}>
        (4,6)
      </text>

      {/* B-only label */}
      <text x={cxB + 28} y={cy - 8} textAnchor="middle" fill="#94a3b8" fontSize={9}>
        1/6
      </text>
      <text x={cxB + 28} y={cy + 6} textAnchor="middle" fill="#94a3b8" fontSize={9}>
        (die=5)
      </text>

      {/* Neither label */}
      <text x={24} y={20} fill="#475569" fontSize={9} textAnchor="start">
        Neither
      </text>
      <text x={24} y={32} fill="#475569" fontSize={9} textAnchor="start">
        2/6 (1,3)
      </text>
    </svg>
  );
}

// ── Lens intersection path helper ─────────────────────────────────────────────

interface LensProps {
  cxA: number;
  cxB: number;
  cy: number;
  r: number;
  fill: string;
  onClick: () => void;
}

function IntersectionLens({ cxA, cxB, cy, r, fill, onClick }: LensProps) {
  // Calculate intersection points of the two circles
  const d = cxB - cxA; // distance between centres
  // Using circle intersection formula
  const a = (r * r - r * r + d * d) / (2 * d); // = d/2 (equal radii)
  const h = Math.sqrt(Math.max(0, r * r - a * a));

  const midX = cxA + a;
  const topY = cy - h;
  const botY = cy + h;

  // Arc from top intersection to bottom via circle A (right arc of A)
  // Then arc from bottom to top via circle B (left arc of B)
  const path = [
    `M ${midX} ${topY}`,
    `A ${r} ${r} 0 0 1 ${midX} ${botY}`, // arc along circle A (sweep right)
    `A ${r} ${r} 0 0 1 ${midX} ${topY}`, // arc along circle B (sweep left)
    "Z",
  ].join(" ");

  return (
    <path
      d={path}
      fill={fill}
      style={{ cursor: "pointer" }}
      onClick={onClick}
    />
  );
}
