"use client";

import { motion } from "framer-motion";

// Mini network: 3 layers [3, 4, 2], each neuron has an active flag
type MiniNet = boolean[][];

const MINI_NETS: MiniNet[] = [
  // Sub-network 1
  [[true, true, true], [false, true, true, false], [true, true]],
  // Sub-network 2
  [[true, false, true], [true, true, false, true], [true, true]],
  // Sub-network 3
  [[true, true, false], [true, false, true, true], [true, true]],
  // Sub-network 4
  [[false, true, true], [true, true, true, false], [true, true]],
];

const FULL_NET: MiniNet = [
  [true, true, true],
  [true, true, true, true],
  [true, true],
];

const LAYER_COLORS = ["#3b82f6", "#3bb4a4", "#d4af37"];

const MINI_SVW = 130;
const MINI_SVH = 110;

function MiniNetwork({
  net,
  label,
  delay,
  isFull,
}: {
  net: MiniNet;
  label: string;
  delay: number;
  isFull?: boolean;
}) {
  const layerCount = net.length;
  const xStep = (MINI_SVW - 30) / (layerCount - 1);

  const getLayerX = (li: number) => 15 + li * xStep;
  const getNeuronY = (count: number, ni: number) => {
    if (count === 1) return MINI_SVH / 2;
    const step = (MINI_SVH - 20) / (count - 1);
    return 10 + ni * step;
  };

  // Build positions
  const positions: { x: number; y: number; active: boolean }[][] = net.map(
    (layer, li) =>
      layer.map((active, ni) => ({
        x: getLayerX(li),
        y: getNeuronY(layer.length, ni),
        active,
      }))
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
      className="flex flex-col items-center gap-1.5"
    >
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          borderColor: isFull ? "#d4af3750" : "#a855f730",
          background: isFull ? "#d4af3708" : "#a855f708",
        }}
      >
        <svg viewBox={`0 0 ${MINI_SVW} ${MINI_SVH}`} className="w-[130px] h-[110px]">
          {/* Connections */}
          {positions.slice(0, -1).map((fromLayer, li) =>
            fromLayer.map((from, fi) =>
              positions[li + 1].map((to, ti) => {
                const visible = from.active && to.active;
                return (
                  <line
                    key={`${li}-${fi}-${ti}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={visible ? "#3bb4a4" : "#1e293b"}
                    strokeWidth={visible ? 0.8 : 0.4}
                    opacity={visible ? 0.5 : 0.2}
                  />
                );
              })
            )
          )}

          {/* Neurons */}
          {positions.map((layer, li) =>
            layer.map((n, ni) => (
              <g key={`${li}-${ni}`}>
                {n.active ? (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={isFull ? 7 : 6}
                    fill={LAYER_COLORS[li]}
                    stroke="#0f172a"
                    strokeWidth="1"
                  />
                ) : (
                  <>
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={6}
                      fill="#7f1d1d"
                      stroke="#ef4444"
                      strokeWidth="0.8"
                      strokeDasharray="2,1.5"
                      opacity={0.6}
                    />
                    <text
                      x={n.x}
                      y={n.y + 3}
                      fill="#ef4444"
                      fontSize="7"
                      textAnchor="middle"
                      fontWeight="bold"
                      opacity={0.8}
                    >
                      ✕
                    </text>
                  </>
                )}
              </g>
            ))
          )}
        </svg>
      </div>
      <span
        className="text-[10px] font-semibold"
        style={{ color: isFull ? "var(--color-accent)" : "#a855f7" }}
      >
        {label}
      </span>
    </motion.div>
  );
}

export default function EnsembleIntuition() {
  return (
    <div className="bg-[#1e293b]/60 border border-white/[0.07] rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-1">Why This Works: Ensemble Intuition</h3>
      <p className="text-sm text-[#94a3b8] mb-6">
        Each training step uses a different random subset of neurons, effectively training a unique
        sub-network. At inference, the full network approximates the average of all sub-networks.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
        {/* Sub-networks */}
        <div className="flex flex-wrap justify-center gap-3">
          {MINI_NETS.map((net, i) => (
            <MiniNetwork
              key={i}
              net={net}
              label={`Sub-net ${i + 1}`}
              delay={i * 0.12}
            />
          ))}
        </div>

        {/* Arrow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="flex flex-col items-center gap-1"
        >
          <svg viewBox="0 0 40 40" className="w-10 h-10 text-[var(--color-accent)]">
            <path
              d="M4 20 H34 M28 13 L36 20 L28 27"
              stroke="var(--color-accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <span className="text-[9px] text-[#64748b] font-medium text-center">
            Averaged
            <br />
            Ensemble
          </span>
        </motion.div>

        {/* Full network */}
        <MiniNetwork
          net={FULL_NET}
          label="Full Network"
          delay={0.7}
          isFull
        />
      </div>

      {/* Explanation */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {[
          {
            icon: "🎲",
            title: "2ᴺ possible networks",
            desc: "With N neurons, dropout can produce 2^N distinct sub-architectures during training.",
            color: "#a855f7",
          },
          {
            icon: "🤝",
            title: "No co-adaptation",
            desc: "Neurons can't rely on specific partners always being present, so each learns independent features.",
            color: "#3bb4a4",
          },
          {
            icon: "📊",
            title: "Free ensembling",
            desc: "Inference on the full network approximates averaging predictions of all thinned networks.",
            color: "#d4af37",
          },
        ].map(({ icon, title, desc, color }) => (
          <div
            key={title}
            className="p-3 rounded-xl border"
            style={{ borderColor: `${color}25`, background: `${color}08` }}
          >
            <div className="text-base mb-1">{icon}</div>
            <div className="font-semibold mb-1" style={{ color }}>
              {title}
            </div>
            <div className="text-[#94a3b8] leading-relaxed">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
