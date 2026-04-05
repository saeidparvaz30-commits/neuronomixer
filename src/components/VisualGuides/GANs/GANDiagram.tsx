"use client";

import { motion } from "framer-motion";
import type { TrainingPhase, TrainingStep } from "./types";

interface Props {
  phase: TrainingPhase;
  step: TrainingStep;
}

export default function GANDiagram({ phase, step }: Props) {
  const dAccPct = Math.round(step.dAccuracy * 100);
  const fakePct = Math.round((1 - step.dAccuracy) * 100);

  const highlightG = phase === "train-g";
  const highlightD = phase === "train-d" || phase === "train-g";
  const showGradient = phase === "train-g";

  return (
    <div className="w-full">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-3 text-center">
        Adversarial Training Architecture
      </p>
      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 700 220"
          className="w-full max-w-[700px] mx-auto block"
          style={{ minWidth: 340 }}
        >
          {/* ── Noise z ── */}
          <g>
            <rect x={8} y={70} width={80} height={50} rx={8} fill="#1e293b" stroke="#475569" strokeWidth={1} />
            <text x={48} y={90} textAnchor="middle" fill="#94a3b8" fontSize={9} fontWeight={600}>
              Noise z
            </text>
            {/* mini cloud dots */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <circle
                key={i}
                cx={22 + (i % 3) * 18}
                cy={103 + Math.floor(i / 3) * 8}
                r={2.5}
                fill="#475569"
              />
            ))}
          </g>

          {/* Noise → G arrow */}
          <motion.line
            x1={88} y1={95} x2={148} y2={95}
            stroke={highlightG ? "#a855f7" : "#334155"}
            strokeWidth={highlightG ? 2.5 : 1.5}
            strokeDasharray={highlightG ? "0" : "4 3"}
            animate={{ stroke: highlightG ? "#a855f7" : "#334155", strokeWidth: highlightG ? 2.5 : 1.5 }}
            transition={{ duration: 0.3 }}
          />
          <polygon points="148,91 158,95 148,99" fill={highlightG ? "#a855f7" : "#334155"} />

          {/* ── Generator G ── */}
          <motion.rect
            x={158} y={60} width={110} height={70} rx={10}
            fill={highlightG ? "#a855f720" : "#1e293b"}
            stroke={highlightG ? "#a855f7" : "#475569"}
            strokeWidth={highlightG ? 2 : 1}
            animate={{
              fill: highlightG ? "#a855f720" : "#1e293b",
              stroke: highlightG ? "#a855f7" : "#475569",
            }}
            transition={{ duration: 0.3 }}
          />
          <text x={213} y={88} textAnchor="middle" fill={highlightG ? "#a855f7" : "#94a3b8"} fontSize={11} fontWeight={700}>
            Generator
          </text>
          <text x={213} y={104} textAnchor="middle" fill="#475569" fontSize={9}>
            G(z) → fake
          </text>
          <text x={213} y={118} textAnchor="middle" fill="#475569" fontSize={8}>
            Loss: {step.generatorLoss.toFixed(2)}
          </text>

          {/* G → Fake Image label */}
          <motion.line
            x1={268} y1={95} x2={318} y2={95}
            stroke={highlightG ? "#a855f7" : "#334155"}
            strokeWidth={highlightG ? 2.5 : 1.5}
            animate={{ stroke: highlightG ? "#a855f7" : "#334155" }}
            transition={{ duration: 0.3 }}
          />
          <polygon points="318,91 328,95 318,99" fill={highlightG ? "#a855f7" : "#334155"} />

          {/* ── Fake Image mini grid ── */}
          <g>
            <text x={356} y={52} textAnchor="middle" fill="#94a3b8" fontSize={8} fontWeight={600}>
              Fake Image
            </text>
            {step.fakeImage.map((row, ri) =>
              row.map((val, ci) => (
                <rect
                  key={`${ri}-${ci}`}
                  x={328 + ci * 7}
                  y={57 + ri * 7}
                  width={6}
                  height={6}
                  fill={`rgb(${val},${val},${val})`}
                />
              ))
            )}
            {/* orange border */}
            <rect x={328} y={57} width={56} height={56} fill="none" stroke="#f97316" strokeWidth={1.5} rx={2} />
          </g>

          {/* Fake → D arrow (orange) */}
          <motion.line
            x1={384} y1={85} x2={428} y2={110}
            stroke={highlightD ? "#f97316" : "#334155"}
            strokeWidth={highlightD ? 2 : 1.5}
            animate={{ stroke: highlightD ? "#f97316" : "#334155" }}
            transition={{ duration: 0.3 }}
          />
          <polygon points="422,107 432,114 428,104" fill={highlightD ? "#f97316" : "#334155"} />
          <text x={396} y={102} fill="#f97316" fontSize={8} fontWeight={600}>fake</text>

          {/* ── Real Images (database icon) ── */}
          <g>
            <text x={356} y={175} textAnchor="middle" fill="#94a3b8" fontSize={8} fontWeight={600}>
              Real Data
            </text>
            <ellipse cx={356} cy={155} rx={22} ry={7} fill="#1e293b" stroke="#22c55e" strokeWidth={1.5} />
            <rect x={334} y={155} width={44} height={12} fill="#1e293b" stroke="#22c55e" strokeWidth={1.5} />
            <ellipse cx={356} cy={167} rx={22} ry={7} fill="#1e293b" stroke="#22c55e" strokeWidth={1.5} />
            <text x={356} y={159} textAnchor="middle" fill="#22c55e" fontSize={7} fontWeight={600}>DB</text>
          </g>

          {/* Real → D arrow (green) */}
          <motion.line
            x1={380} y1={158} x2={428} y2={135}
            stroke={highlightD ? "#22c55e" : "#334155"}
            strokeWidth={highlightD ? 2 : 1.5}
            animate={{ stroke: highlightD ? "#22c55e" : "#334155" }}
            transition={{ duration: 0.3 }}
          />
          <polygon points="422,131 432,128 430,138" fill={highlightD ? "#22c55e" : "#334155"} />
          <text x={396} y={153} fill="#22c55e" fontSize={8} fontWeight={600}>real</text>

          {/* ── Discriminator D ── */}
          <motion.rect
            x={432} y={90} width={110} height={70} rx={10}
            fill={highlightD ? "#1e5d8a20" : "#1e293b"}
            stroke={highlightD ? "#1e5d8a" : "#475569"}
            strokeWidth={highlightD ? 2 : 1}
            animate={{
              fill: highlightD ? "#1e5d8a20" : "#1e293b",
              stroke: highlightD ? "#1e5d8a" : "#475569",
            }}
            transition={{ duration: 0.3 }}
          />
          <text x={487} y={118} textAnchor="middle" fill={highlightD ? "#60a5fa" : "#94a3b8"} fontSize={11} fontWeight={700}>
            Discriminator
          </text>
          <text x={487} y={134} textAnchor="middle" fill="#475569" fontSize={9}>
            D(x) → [0,1]
          </text>
          <text x={487} y={148} textAnchor="middle" fill="#475569" fontSize={8}>
            Loss: {step.discriminatorLoss.toFixed(2)}
          </text>

          {/* D → output arrow */}
          <motion.line
            x1={542} y1={125} x2={582} y2={125}
            stroke={highlightD ? "#1e5d8a" : "#334155"}
            strokeWidth={1.5}
            animate={{ stroke: highlightD ? "#60a5fa" : "#334155" }}
            transition={{ duration: 0.3 }}
          />
          <polygon points="582,121 592,125 582,129" fill={highlightD ? "#60a5fa" : "#334155"} />

          {/* ── Output probability bar ── */}
          <g>
            <text x={640} y={88} textAnchor="middle" fill="#94a3b8" fontSize={8} fontWeight={600}>
              Output P(real)
            </text>
            {/* bar background */}
            <rect x={615} y={94} width={50} height={10} rx={3} fill="#0f172a" stroke="#334155" strokeWidth={1} />
            {/* bar fill */}
            <motion.rect
              x={615} y={94}
              width={Math.round((1 - step.dAccuracy + 0.1) * 50)}
              height={10}
              rx={3}
              fill="#1e5d8a"
              animate={{ width: Math.round((1 - step.dAccuracy + 0.1) * 50) }}
              transition={{ duration: 0.4 }}
            />
            <text x={640} y={118} textAnchor="middle" fill="#60a5fa" fontSize={10} fontWeight={700}>
              {fakePct}% real
            </text>
            <text x={640} y={130} textAnchor="middle" fill="#475569" fontSize={7}>
              (for fake inputs)
            </text>
            {/* D accuracy */}
            <text x={640} y={148} textAnchor="middle" fill="#94a3b8" fontSize={8}>
              D accuracy:
            </text>
            <text x={640} y={160} textAnchor="middle" fill="#d4af37" fontSize={10} fontWeight={700}>
              {dAccPct}%
            </text>
          </g>

          {/* Gradient feedback arrow (train-g only) */}
          {showGradient && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <path
                d="M 487 160 Q 487 200 213 195 Q 213 185 213 130"
                fill="none"
                stroke="#a855f7"
                strokeWidth={1.5}
                strokeDasharray="5 4"
              />
              <polygon points="209,130 213,120 217,130" fill="#a855f7" />
              <text x={350} y={212} textAnchor="middle" fill="#a855f7" fontSize={8} fontWeight={600}>
                gradient flows back to update G
              </text>
            </motion.g>
          )}
        </svg>
      </div>

      {/* Phase label */}
      <div className="flex justify-center mt-2">
        {phase === "idle" && (
          <span className="text-xs text-[#475569] italic">Training not started</span>
        )}
        {phase === "train-d" && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#1e5d8a]/20 border border-[#1e5d8a]/40 text-[#60a5fa]">
            Training D: learning to distinguish real from fake
          </span>
        )}
        {phase === "train-g" && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#a855f7]/20 border border-[#a855f7]/40 text-[#a855f7]">
            Training G: trying to fool the discriminator
          </span>
        )}
      </div>
    </div>
  );
}
