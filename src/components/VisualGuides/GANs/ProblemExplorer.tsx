"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Problem {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  body: string;
  visual: React.ReactNode;
}

function ModeCollapseVisual() {
  return (
    <div className="mt-3">
      <div className="flex gap-4 items-start">
        {/* Bad: mode collapse — all identical */}
        <div>
          <p className="text-[9px] text-[#ef4444] font-semibold mb-1 uppercase tracking-wide">Mode Collapse</p>
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded border border-[#ef4444]/30"
                style={{ background: "rgb(180,180,180)" }}
              />
            ))}
          </div>
          <p className="text-[8px] text-[#475569] mt-1">All outputs identical</p>
        </div>
        {/* Good: diverse */}
        <div>
          <p className="text-[9px] text-[#22c55e] font-semibold mb-1 uppercase tracking-wide">Healthy G</p>
          <div className="grid grid-cols-4 gap-1">
            {[40, 160, 220, 90, 130, 200, 60, 180].map((v, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded border border-[#22c55e]/30"
                style={{ background: `rgb(${v},${v},${v})` }}
              />
            ))}
          </div>
          <p className="text-[8px] text-[#475569] mt-1">Diverse outputs</p>
        </div>
      </div>
    </div>
  );
}

function InstabilityVisual() {
  const epochs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  // D loss drops to near 0, G loss explodes
  const dLoss = epochs.map((e) => Math.max(0.02, 0.9 - e * 0.08));
  const gLoss = epochs.map((e) => 0.5 + e * 0.3);

  const W = 200;
  const H = 80;
  const toX = (i: number) => 10 + (i / 10) * (W - 20);
  const toY = (v: number) => H - 10 - Math.min((v / 3.5) * (H - 20), H - 20);

  const dPath = dLoss.map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(" ");
  const gPath = gLoss.map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(" ");

  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[220px]">
        <path d={dPath} fill="none" stroke="#3b82f6" strokeWidth={2} />
        <path d={gPath} fill="none" stroke="#ef4444" strokeWidth={2} />
        <text x={10} y={H - 2} fill="#3b82f6" fontSize={7}>D loss → 0 (D wins)</text>
        <text x={10} y={14} fill="#ef4444" fontSize={7}>G loss explodes ↑</text>
      </svg>
      <p className="text-[8px] text-[#475569] mt-1">G can&apos;t learn — gradients vanish when D is perfect</p>
    </div>
  );
}

function MemorizationVisual() {
  return (
    <div className="mt-3 flex items-center gap-4">
      <div className="text-center">
        <div className="w-12 h-12 rounded border border-[#d4af37]/40 flex items-center justify-center text-lg">
          🖼️
        </div>
        <p className="text-[8px] text-[#94a3b8] mt-1">Training<br />sample</p>
      </div>
      <div className="text-[#d4af37] text-lg">≈</div>
      <div className="text-center">
        <div className="w-12 h-12 rounded border border-[#d4af37]/40 flex items-center justify-center text-lg">
          🖼️
        </div>
        <p className="text-[8px] text-[#94a3b8] mt-1">G output<br />(copied)</p>
      </div>
      <div className="text-[#ef4444] text-lg ml-2">✗</div>
      <p className="text-[8px] text-[#475569]">No generalization</p>
    </div>
  );
}

const PROBLEMS: Problem[] = [
  {
    id: "mode-collapse",
    title: "Mode Collapse",
    subtitle: "G generates only one type of output",
    color: "#ef4444",
    body: "When G finds a single output that consistently fools D, it may stop exploring other outputs entirely. The generator gets stuck producing nearly identical samples, ignoring the diversity of the real data distribution.",
    visual: <ModeCollapseVisual />,
  },
  {
    id: "instability",
    title: "Training Instability",
    subtitle: "D crushes G before G can learn",
    color: "#f97316",
    body: "If the discriminator becomes too powerful too quickly, it outputs near-zero probabilities for all fake samples. The gradients flowing back to G vanish, and G cannot learn. The game breaks before convergence.",
    visual: <InstabilityVisual />,
  },
  {
    id: "memorization",
    title: "Memorization",
    subtitle: "G copies training data instead of generalizing",
    color: "#d4af37",
    body: "Instead of learning the underlying distribution, G may memorize specific training examples and reproduce them. This passes the discriminator's test but produces no new creative outputs — the model has overfit.",
    visual: <MemorizationVisual />,
  },
];

interface Props {
  onExpand: () => void;
}

export default function ProblemExplorer({ onExpand }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  function toggle(id: string) {
    const next = expanded === id ? null : id;
    setExpanded(next);
    if (next !== null) onExpand();
  }

  return (
    <div className="flex flex-col gap-3">
      {PROBLEMS.map((p) => {
        const isOpen = expanded === p.id;
        return (
          <div
            key={p.id}
            className="bg-[#1e293b]/60 border rounded-2xl overflow-hidden cursor-pointer"
            style={{ borderColor: isOpen ? p.color + "60" : "#1e293b" }}
            onClick={() => toggle(p.id)}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: p.color }}
                />
                <div>
                  <p className="text-sm font-semibold text-white">{p.title}</p>
                  <p className="text-xs text-[#475569]">{p.subtitle}</p>
                </div>
              </div>
              <span
                className="text-[#94a3b8] text-sm transition-transform"
                style={{
                  transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                  display: "inline-block",
                }}
              >
                ›
              </span>
            </div>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 border-t border-[#1e293b]">
                    <p className="text-xs text-[#94a3b8] leading-relaxed mt-3">
                      {p.body}
                    </p>
                    {p.visual}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
