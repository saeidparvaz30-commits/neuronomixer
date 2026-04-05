"use client";

import { motion } from "framer-motion";

const EARLY_FEATURES = [
  { color: "#1e5d8a", label: "Edges" },
  { color: "#1e7a8a", label: "Curves" },
  { color: "#1e8a6a", label: "Textures" },
];

const LATE_FEATURES = [
  { color: "#d4af37", label: "Classes" },
  { color: "#c9963a", label: "Head" },
];

export default function KnowledgeTransferViz() {
  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox="0 0 760 220"
        className="w-full min-w-[500px]"
        style={{ maxHeight: 220 }}
      >
        {/* ── Left box: ImageNet Model ── */}
        <rect x={10} y={20} width={220} height={180} rx={12} fill="#1e293b" stroke="#334155" strokeWidth={1.5} />
        <text x={120} y={44} fill="#94a3b8" fontSize={11} textAnchor="middle" fontWeight="600">
          ImageNet Model
        </text>
        <text x={120} y={58} fill="#475569" fontSize={9} textAnchor="middle">
          1.2M images · 1000 classes
        </text>

        {/* Early feature squares (blue) */}
        {EARLY_FEATURES.map((f, i) => (
          <motion.g
            key={`left-early-${i}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15, duration: 0.4 }}
          >
            <rect x={25 + i * 58} y={72} width={48} height={48} rx={8}
              fill={f.color} fillOpacity={0.4} stroke={f.color} strokeWidth={1.5} />
            <text x={49 + i * 58} y={100} fill="white" fontSize={8} textAnchor="middle" fontWeight="500">
              {f.label}
            </text>
          </motion.g>
        ))}

        {/* Later (task-specific) squares - ImageNet head */}
        {LATE_FEATURES.map((f, i) => (
          <motion.g
            key={`left-late-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
          >
            <rect x={40 + i * 68} y={138} width={52} height={40} rx={8}
              fill={f.color} fillOpacity={0.25} stroke={f.color} strokeWidth={1.5} strokeDasharray="4 2" />
            <text x={66 + i * 68} y={162} fill={f.color} fontSize={8} textAnchor="middle">
              {f.label}
            </text>
          </motion.g>
        ))}

        {/* ── Arrow ── */}
        <motion.g
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          style={{ originX: "260px" }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#3bb4a4" />
            </marker>
          </defs>
          <line x1={238} y1={110} x2={508} y2={110}
            stroke="#3bb4a4" strokeWidth={2.5}
            markerEnd="url(#arrowhead)" />
          <text x={373} y={103} fill="#3bb4a4" fontSize={10} textAnchor="middle" fontWeight="600">
            Transfer knowledge
          </text>

          {/* Flowing dots */}
          {[0, 1, 2].map((i) => (
            <motion.circle
              key={`dot-${i}`}
              cx={0} cy={110} r={4} fill="#3bb4a4" fillOpacity={0.7}
              animate={{ cx: [248, 500] }}
              transition={{
                delay: 0.9 + i * 0.3,
                duration: 0.9,
                repeat: Infinity,
                repeatDelay: 0.5,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.g>

        {/* ── Right box: Your Task ── */}
        <rect x={518} y={20} width={232} height={180} rx={12} fill="#1e293b" stroke="#334155" strokeWidth={1.5} />
        <text x={634} y={44} fill="#94a3b8" fontSize={11} textAnchor="middle" fontWeight="600">
          Your Task
        </text>
        <text x={634} y={58} fill="#475569" fontSize={9} textAnchor="middle">
          500 images · 5 classes
        </text>

        {/* Shared early features (blue — same as left) */}
        {EARLY_FEATURES.map((f, i) => (
          <motion.g
            key={`right-early-${i}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0 + i * 0.15, duration: 0.4 }}
          >
            <rect x={530 + i * 60} y={72} width={48} height={48} rx={8}
              fill={f.color} fillOpacity={0.5} stroke={f.color} strokeWidth={2} />
            <text x={554 + i * 60} y={100} fill="white" fontSize={8} textAnchor="middle" fontWeight="500">
              {f.label}
            </text>
            {/* "Frozen" lock icon hint */}
            <text x={554 + i * 60} y={113} fill="#1e5d8a" fontSize={9} textAnchor="middle">
              🔒
            </text>
          </motion.g>
        ))}

        {/* Custom head (gold) */}
        <motion.g
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, duration: 0.5, type: "spring" }}
          style={{ originX: "634px", originY: "158px" }}
        >
          <rect x={558} y={138} width={154} height={40} rx={8}
            fill="#d4af37" fillOpacity={0.25} stroke="#d4af37" strokeWidth={2} />
          <text x={635} y={155} fill="#d4af37" fontSize={10} textAnchor="middle" fontWeight="700">
            ✨ New Head
          </text>
          <text x={635} y={170} fill="#d4af37" fontSize={8} textAnchor="middle" opacity={0.7}>
            trained from scratch
          </text>
        </motion.g>

        {/* Legend */}
        <g transform="translate(10, 207)">
          <rect x={0} y={0} width={10} height={10} rx={2} fill="#1e5d8a" fillOpacity={0.7} />
          <text x={14} y={9} fill="#94a3b8" fontSize={8}>Shared (frozen) layers</text>
          <rect x={130} y={0} width={10} height={10} rx={2} fill="#d4af37" fillOpacity={0.7} />
          <text x={144} y={9} fill="#94a3b8" fontSize={8}>New custom head</text>
        </g>
      </svg>
    </div>
  );
}
