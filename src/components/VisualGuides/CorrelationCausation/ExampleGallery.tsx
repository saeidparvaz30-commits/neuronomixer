"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { REAL_EXAMPLES, linearRegression } from "./types";

// Mini scatter
const CW = 280, CH = 160, CP = { l: 26, r: 8, t: 8, b: 26 };

function MiniScatter({ data, groupColors }: { data: { x: number; y: number; group: string }[]; groupColors: Record<string, string> }) {
  if (!data.length) return null;
  const xs = data.map(p => p.x), ys = data.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xP = (xMax - xMin) * 0.1 || 1, yP = (yMax - yMin) * 0.1 || 1;
  const tw = CW - CP.l - CP.r, th = CH - CP.t - CP.b;
  const tx = (v: number) => CP.l + ((v - xMin + xP) / (xMax - xMin + 2 * xP)) * tw;
  const ty = (v: number) => CP.t + (1 - (v - yMin + yP) / (yMax - yMin + 2 * yP)) * th;
  const reg = linearRegression(data);

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" className="block">
      <line x1={CP.l} y1={CP.t} x2={CP.l} y2={CP.t + th} stroke="#334155" strokeWidth="1" />
      <line x1={CP.l} y1={CP.t + th} x2={CW - CP.r} y2={CP.t + th} stroke="#334155" strokeWidth="1" />
      <line
        x1={tx(xMin - xP)} y1={ty(reg.intercept + reg.slope * (xMin - xP))}
        x2={tx(xMax + xP)} y2={ty(reg.intercept + reg.slope * (xMax + xP))}
        stroke="#d4af37" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.7"
      />
      {data.map((pt, i) => (
        <circle key={i} cx={tx(pt.x)} cy={ty(pt.y)} r="5.5" fill={groupColors[pt.group] || "#3bb4a4"} opacity="0.9" />
      ))}
    </svg>
  );
}

const GROUP_COLORS: Record<number, Record<string, string>> = {
  0: { "non-smoker": "#3bb4a4", "smoker": "#ef4444" },
  1: { "low-ses": "#3b82f6", "high-ses": "#d4af37" },
  2: { "developing": "#6b7280", "emerging": "#f97316", "developed": "#d4af37" },
  3: { "active": "#3bb4a4", "passive": "#ef4444" },
  4: { "low-density": "#3bb4a4", "high-density": "#f97316" },
};

export default function ExampleGallery() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div>
      <p className="text-[10px] text-[#475569] leading-relaxed mb-3">
        Each card uses a small illustrative dataset that sketches the real-world pattern; the r shown is computed from the plotted points, not taken from a published study.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {REAL_EXAMPLES.map(ex => {
        const isExpanded  = expandedId === ex.id;
        const groupColors = GROUP_COLORS[ex.id] || {};

        return (
          <div key={ex.id} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden">
            <button
              className="w-full p-4 text-left hover:bg-[#1e293b]/30 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : ex.id)}
              aria-expanded={isExpanded}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] font-semibold text-white leading-snug">{ex.title}</p>
                <span className="text-[11px] font-bold text-[#d4af37] flex-shrink-0">r {ex.r}</span>
              </div>
              <p className="text-[10px] text-[#475569] mt-1.5 truncate">{ex.var1} vs {ex.var2}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ex.confoundColor }} />
                <span className="text-[10px] text-[#94a3b8]">Confound: {ex.confound}</span>
              </div>
              <p className="text-[9px] text-[#475569] mt-2">{isExpanded ? "▲ collapse" : "▼ expand"}</p>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden border-t border-[#1e293b]"
                >
                  <div className="p-4">
                    <MiniScatter data={ex.data} groupColors={groupColors} />
                    {/* Group legend */}
                    <div className="flex flex-wrap gap-2 mt-2 mb-3">
                      {Object.entries(groupColors).map(([g, c]) => (
                        <div key={g} className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                          <span className="text-[9px] text-[#94a3b8] capitalize">{g.replace("-", " ")}</span>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg border-l-4 p-2.5"
                      style={{ borderColor: ex.confoundColor, background: ex.confoundColor + "08" }}>
                      <p className="text-[11px] text-[#94a3b8] leading-relaxed">{ex.explanation}</p>
                    </div>
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
