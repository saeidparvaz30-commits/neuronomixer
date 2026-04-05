"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LayerHierarchyProps {
  onView: () => void;
}

type LayerDetail = {
  id: number;
  label: string;
  depth: string;
  color: string;
  detects: string;
  examples: string[];
  filterColors: string[];
};

const LAYERS: LayerDetail[] = [
  {
    id: 1,
    label: "Layer 1",
    depth: "Early",
    color: "#3bb4a4",
    detects: "Edges & lines",
    examples: [
      "Horizontal edges",
      "Vertical edges",
      "Diagonal lines",
      "Color boundaries",
    ],
    filterColors: ["#3bb4a4", "#1e5d8a", "#a855f7", "#d4af37"],
  },
  {
    id: 2,
    label: "Layer 2",
    depth: "Mid",
    color: "#d4af37",
    detects: "Shapes & textures",
    examples: [
      "Corners & junctions",
      "Curves & arcs",
      "Textures & patterns",
      "Grids & stripes",
    ],
    filterColors: ["#d4af37", "#ec4899", "#94a3b8", "#3bb4a4"],
  },
  {
    id: 3,
    label: "Layer 3+",
    depth: "Deep",
    color: "#a855f7",
    detects: "Objects & concepts",
    examples: [
      "Eyes & faces",
      "Wheels & vehicles",
      "Animals & objects",
      "Abstract concepts",
    ],
    filterColors: ["#a855f7", "#ef4444", "#ec4899", "#d4af37"],
  },
];

export default function LayerHierarchy({ onView }: LayerHierarchyProps) {
  const [activeLayer, setActiveLayer] = useState<number | null>(null);
  const [hasViewed, setHasViewed] = useState(false);

  function handleLayerClick(id: number) {
    setActiveLayer(activeLayer === id ? null : id);
    if (!hasViewed) {
      setHasViewed(true);
      onView();
    }
  }

  const active = LAYERS.find((l) => l.id === activeLayer);

  return (
    <div className="bg-[#1e293b]/60 border border-white/[0.07] rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-1">How Layers Stack</h3>
      <p className="text-[11px] text-[#94a3b8] mb-5">
        Click each layer to see what it detects. Each layer builds on the previous.
      </p>

      {/* SVG diagram */}
      <div className="overflow-x-auto mb-4">
        <svg viewBox="0 0 700 160" className="w-full min-w-[560px]">
          {/* Input */}
          <g>
            <rect x="10" y="55" width="70" height="50" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
            <text x="45" y="82" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="600">Input</text>
            <text x="45" y="95" fill="#475569" fontSize="8" textAnchor="middle">8×8</text>
          </g>

          {/* Arrows input → layer1 */}
          <motion.path
            d="M80 80 L140 80"
            stroke="#334155" strokeWidth="1.5" fill="none"
            strokeDasharray="4 3"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.1 }}
          />
          <polygon points="140,75 150,80 140,85" fill="#334155" />

          {/* Layer 1 */}
          {LAYERS.map((layer, li) => {
            const x = 150 + li * 180;
            const isActive = activeLayer === layer.id;
            return (
              <g key={layer.id}>
                <motion.rect
                  x={x} y="30" width="120" height="100" rx="12"
                  fill={isActive ? `${layer.color}20` : "#0f172a"}
                  stroke={isActive ? layer.color : "#334155"}
                  strokeWidth={isActive ? 2 : 1.5}
                  className="cursor-pointer"
                  onClick={() => handleLayerClick(layer.id)}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.15 }}
                />
                <text
                  x={x + 60} y="55"
                  fill={isActive ? layer.color : "#94a3b8"}
                  fontSize="11" textAnchor="middle" fontWeight="700"
                  className="pointer-events-none"
                >
                  {layer.label}
                </text>
                <text
                  x={x + 60} y="70"
                  fill={isActive ? layer.color : "#475569"}
                  fontSize="9" textAnchor="middle"
                  className="pointer-events-none"
                >
                  {layer.depth} Layer
                </text>
                <text
                  x={x + 60} y="90"
                  fill={isActive ? "#e2e8f0" : "#94a3b8"}
                  fontSize="9.5" textAnchor="middle" fontWeight="500"
                  className="pointer-events-none"
                >
                  {layer.detects}
                </text>
                {/* Filter color squares */}
                <g>
                  {layer.filterColors.map((color, fi) => (
                    <rect
                      key={fi}
                      x={x + 20 + fi * 22}
                      y="105"
                      width="16" height="16" rx="3"
                      fill={color}
                      opacity={isActive ? 0.8 : 0.4}
                      className="pointer-events-none"
                    />
                  ))}
                </g>
                {/* Click hint */}
                <text
                  x={x + 60} y="145"
                  fill={isActive ? layer.color : "#334155"}
                  fontSize="8" textAnchor="middle"
                  className="pointer-events-none"
                >
                  {isActive ? "▲ click to close" : "click to explore"}
                </text>
              </g>
            );
          })}

          {/* Arrows between layers */}
          {[0, 1].map((i) => {
            const x = 270 + i * 180;
            return (
              <g key={i}>
                <motion.path
                  d={`M${x} 80 L${x + 60} 80`}
                  stroke="#334155" strokeWidth="1.5" fill="none"
                  strokeDasharray="4 3"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.2 }}
                />
                <polygon points={`${x + 60},75 ${x + 70},80 ${x + 60},85`} fill="#334155" />
              </g>
            );
          })}

          {/* Output */}
          <g>
            <rect x="620" y="55" width="70" height="50" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
            <text x="655" y="78" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="600">Output</text>
            <text x="655" y="91" fill="#475569" fontSize="8" textAnchor="middle">Prediction</text>
          </g>
        </svg>
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {active && (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div
              className="border rounded-xl p-4"
              style={{ borderColor: `${active.color}40`, background: `${active.color}10` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: active.color }}
                />
                <h4 className="text-sm font-semibold" style={{ color: active.color }}>
                  {active.label} — {active.depth} Layer: {active.detects}
                </h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {active.examples.map((ex) => (
                  <div
                    key={ex}
                    className="bg-[#0f172a]/60 border border-white/[0.08] rounded-lg px-3 py-2 text-center"
                  >
                    <span className="text-[11px] text-[#e2e8f0]">{ex}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#94a3b8] mt-3 leading-relaxed">
                {active.depth === "Early" &&
                  "First-layer filters respond to simple local patterns — exactly like the kernels you explored above."}
                {active.depth === "Mid" &&
                  "Mid-layer features combine early edges to detect more complex patterns. Think of curves built from straight edges."}
                {active.depth === "Deep" &&
                  "Deep features encode high-level semantics: parts of objects, full objects, and even abstract concepts."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!hasViewed && (
        <p className="text-[11px] text-[#475569] mt-3 text-center">
          Click a layer above to complete this section
        </p>
      )}
      {hasViewed && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[11px] text-[#3bb4a4] mt-3 text-center font-medium"
        >
          Layer hierarchy explored
        </motion.p>
      )}
    </div>
  );
}
