"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CausalDiagram } from "./types";

// ── SVG Causal Diagrams ────────────────────────────────────────────────────

function IncorrectDiagram() {
  return (
    <svg viewBox="0 0 280 80" width="100%" className="block">
      <rect x="8" y="26" width="95" height="28" rx="5" fill="#1e293b" stroke="#475569" strokeWidth="1" />
      <text x="56" y="44" textAnchor="middle" fontSize="8.5" fill="#f1f5f9" fontFamily="Inter,sans-serif">Ice Cream Sales</text>
      <line x1="106" y1="40" x2="168" y2="40" stroke="#ef4444" strokeWidth="2" />
      <polygon points="175,40 166,35 166,45" fill="#ef4444" />
      <rect x="178" y="26" width="94" height="28" rx="5" fill="#1e293b" stroke="#475569" strokeWidth="1" />
      <text x="225" y="44" textAnchor="middle" fontSize="8.5" fill="#f1f5f9" fontFamily="Inter,sans-serif">Shark Attacks</text>
      <circle cx="141" cy="14" r="10" fill="#ef444420" stroke="#ef4444" strokeWidth="1.5" />
      <text x="141" y="19" textAnchor="middle" fontSize="11" fill="#ef4444" fontFamily="Inter,sans-serif">✗</text>
      <text x="141" y="70" textAnchor="middle" fontSize="8" fill="#ef4444" fontFamily="Inter,sans-serif">No mechanism</text>
    </svg>
  );
}

function CorrectDiagram() {
  return (
    <svg viewBox="0 0 280 120" width="100%" className="block">
      <rect x="90" y="4" width="100" height="28" rx="5" fill="#1e293b" stroke="#3bb4a4" strokeWidth="1.5" />
      <text x="140" y="22" textAnchor="middle" fontSize="9" fill="#3bb4a4" fontFamily="Inter,sans-serif">Temperature</text>
      <line x1="112" y1="33" x2="60" y2="78" stroke="#3bb4a4" strokeWidth="1.5" />
      <polygon points="54,80 62,72 67,82" fill="#3bb4a4" />
      <line x1="168" y1="33" x2="220" y2="78" stroke="#3bb4a4" strokeWidth="1.5" />
      <polygon points="226,80 218,72 213,82" fill="#3bb4a4" />
      <rect x="4" y="80" width="95" height="28" rx="5" fill="#1e293b" stroke="#475569" strokeWidth="1" />
      <text x="52" y="98" textAnchor="middle" fontSize="8.5" fill="#f1f5f9" fontFamily="Inter,sans-serif">Ice Cream Sales</text>
      <rect x="181" y="80" width="95" height="28" rx="5" fill="#1e293b" stroke="#475569" strokeWidth="1" />
      <text x="229" y="98" textAnchor="middle" fontSize="8.5" fill="#f1f5f9" fontFamily="Inter,sans-serif">Shark Attacks</text>
      <line x1="102" y1="94" x2="178" y2="94" stroke="#475569" strokeWidth="1" strokeDasharray="4 3" />
      <text x="140" y="114" textAnchor="middle" fontSize="8" fill="#475569" fontFamily="Inter,sans-serif">correlated, not causal</text>
    </svg>
  );
}

function ChainDiagram() {
  return (
    <svg viewBox="0 0 320 90" width="100%" className="block">
      <rect x="4" y="30" width="76" height="28" rx="5" fill="#1e293b" stroke="#d4af37" strokeWidth="1.5" />
      <text x="42" y="48" textAnchor="middle" fontSize="8.5" fill="#d4af37" fontFamily="Inter,sans-serif">Temperature</text>
      <line x1="82" y1="44" x2="110" y2="44" stroke="#d4af37" strokeWidth="1.5" />
      <polygon points="117,44 108,39 108,49" fill="#d4af37" />
      <rect x="119" y="30" width="82" height="28" rx="5" fill="#1e293b" stroke="#d4af37" strokeWidth="1.5" />
      <text x="160" y="48" textAnchor="middle" fontSize="8.5" fill="#d4af37" fontFamily="Inter,sans-serif">Beach Visitors</text>
      <line x1="203" y1="44" x2="231" y2="44" stroke="#d4af37" strokeWidth="1.5" />
      <polygon points="238,44 229,39 229,49" fill="#d4af37" />
      <rect x="240" y="30" width="76" height="28" rx="5" fill="#1e293b" stroke="#475569" strokeWidth="1" />
      <text x="278" y="44" textAnchor="middle" fontSize="8.5" fill="#f1f5f9" fontFamily="Inter,sans-serif">Shark</text>
      <text x="278" y="55" textAnchor="middle" fontSize="8.5" fill="#f1f5f9" fontFamily="Inter,sans-serif">Attacks</text>
      <line x1="160" y1="58" x2="160" y2="72" stroke="#d4af37" strokeWidth="1" strokeDasharray="3 2" />
      <text x="160" y="82" textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="Inter,sans-serif">Ice Cream Sales also via Beach Visitors</text>
    </svg>
  );
}

const DIAGRAM_SVGS: Record<CausalDiagram, React.ReactNode> = {
  incorrect: <IncorrectDiagram />,
  correct:   <CorrectDiagram />,
  chain:     <ChainDiagram />,
};

const DIAGRAMS: {
  id: CausalDiagram;
  title: string;
  badge: string;
  color: string;
  explanation: string;
}[] = [
  {
    id: "incorrect",
    title: "Direct Causation",
    badge: "Incorrect",
    color: "#ef4444",
    explanation: "Assuming ice cream causes shark attacks because they correlate. No mechanism exists — this is a spurious causal claim. Correlation alone can never establish causation.",
  },
  {
    id: "correct",
    title: "Common Cause",
    badge: "Correct ✓",
    color: "#3bb4a4",
    explanation: "Temperature (season) causes both ice cream sales and shark attacks. They're correlated but neither causes the other. This is confounding — the third variable explains everything.",
  },
  {
    id: "chain",
    title: "Causal Chain",
    badge: "Also valid",
    color: "#d4af37",
    explanation: "Temperature drives beach visitors, which drives both shark attacks and ice cream sales. The effect is mediated — still causal, but indirect through an intermediate variable.",
  },
];

interface Props { onSelect?: () => void }

export default function BuildYourOwn({ onSelect }: Props) {
  const [selected, setSelected] = useState<CausalDiagram | null>(null);

  function handleSelect(id: CausalDiagram) {
    const isFirst = selected === null;
    setSelected(id);
    if (isFirst) onSelect?.();
  }

  const sel = DIAGRAMS.find(d => d.id === selected);

  return (
    <>
      {/* Keyframe defined once — pure CSS, guaranteed to work */}
      <style>{`
        @keyframes diagram-beam-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {DIAGRAMS.map((d, i) => {
            const isSelected = selected === d.id;
            return (
              <div
                key={d.id}
                className="relative rounded-2xl overflow-hidden"
                style={{ padding: "2px" }}
              >
                {/* Border background — colored when selected, dark otherwise */}
                <div
                  className="absolute inset-0 rounded-2xl transition-colors duration-300"
                  style={{ background: isSelected ? d.color : "#1e293b" }}
                />

                {/* Spinning beam — only while unselected */}
                {!isSelected && (
                  <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                    <div
                      style={{
                        position: "absolute",
                        width: "200%",
                        height: "200%",
                        top: "-50%",
                        left: "-50%",
                        background: `conic-gradient(from 0deg, transparent 0%, ${d.color}88 7%, ${d.color} 12%, ${d.color}88 17%, transparent 24%)`,
                        transformOrigin: "50% 50%",
                        animation: "diagram-beam-spin 2.4s linear infinite",
                        animationDelay: `${-(i * 0.8)}s`,
                      }}
                    />
                  </div>
                )}

                {/* Card — h-full so it fills the wrapper completely, leaving only the 2px border visible */}
                <button
                  onClick={() => handleSelect(d.id)}
                  role="radio"
                  aria-checked={isSelected}
                  className="relative z-10 w-full h-full rounded-[14px] p-4 text-left flex flex-col cursor-pointer"
                  style={{ background: "#0f172a" }}
                >
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <p className="text-[11px] font-semibold text-white">{d.title}</p>
                    <span
                      className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: d.color, background: d.color + "20", border: `1px solid ${d.color}44` }}
                    >
                      {d.badge}
                    </span>
                  </div>
                  {/* SVG fills remaining height — all cards grow to match the tallest */}
                  <div className="flex-1 flex items-center">
                    {DIAGRAM_SVGS[d.id]}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {sel ? (
            <motion.div
              key={sel.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="rounded-xl border-l-4 p-3"
              style={{ borderColor: sel.color, background: sel.color + "0d" }}
            >
              <p className="text-[11px] font-semibold mb-1" style={{ color: sel.color }}>{sel.title}</p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">{sel.explanation}</p>
            </motion.div>
          ) : (
            <motion.div
              key="none"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-xl border border-[#1e293b] bg-[#1e293b]/20 p-3 text-center text-[12px] text-[#ef4444]"
            >
              Click a causal diagram above to read its explanation.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
