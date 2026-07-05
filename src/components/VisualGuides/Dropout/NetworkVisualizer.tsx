"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateNetwork, countActiveNeurons } from "./networkLogic";
import type { NetworkConfig, Neuron } from "./types";

// SVG layout constants
const SVW = 680;
const SVH = 380;
const PADDING_X = 60;
const PADDING_Y = 50;

type LayerLayout = {
  x: number;
  neurons: { id: string; y: number }[];
  label: string;
};

const LAYER_ORDER = ["input", "hidden1", "hidden2", "output"] as const;
const LAYER_SIZES: Record<string, number> = {
  input: 4,
  hidden1: 6,
  hidden2: 6,
  output: 3,
};
const LAYER_LABELS: Record<string, string> = {
  input: "Input (4)",
  hidden1: "Hidden 1 (6)",
  hidden2: "Hidden 2 (6)",
  output: "Output (3)",
};

function getNeuronColor(layer: Neuron["layer"]): string {
  switch (layer) {
    case "input":
      return "#3b82f6"; // blue
    case "hidden1":
    case "hidden2":
      return "#3bb4a4"; // turquoise
    case "output":
      return "var(--color-accent)"; // gold
  }
}

function buildLayout(): LayerLayout[] {
  const xStep = (SVW - PADDING_X * 2) / (LAYER_ORDER.length - 1);
  return LAYER_ORDER.map((layer, li) => {
    const count = LAYER_SIZES[layer];
    const totalHeight = SVH - PADDING_Y * 2;
    const yStep = count > 1 ? totalHeight / (count - 1) : 0;
    return {
      x: PADDING_X + li * xStep,
      neurons: Array.from({ length: count }, (_, ni) => ({
        id: `${layer}-${ni}`,
        y: count === 1 ? SVH / 2 : PADDING_Y + ni * yStep,
      })),
      label: LAYER_LABELS[layer],
    };
  });
}

const LAYOUT = buildLayout();

// Build a quick lookup: neuron id → {x, y}
const NEURON_POS: Record<string, { x: number; y: number }> = {};
LAYOUT.forEach((layer) => {
  layer.neurons.forEach((n) => {
    NEURON_POS[n.id] = { x: layer.x, y: n.y };
  });
});

interface NetworkVisualizerProps {
  config: NetworkConfig;
}

export default function NetworkVisualizer({ config }: NetworkVisualizerProps) {
  const { neurons, connections } = useMemo(() => generateNetwork(config), [config]);
  const stats = useMemo(() => countActiveNeurons(neurons), [neurons]);

  const neuronMap = useMemo(() => {
    const m: Record<string, Neuron> = {};
    neurons.forEach((n) => (m[n.id] = n));
    return m;
  }, [neurons]);

  const totalActive = stats.reduce((s, l) => s + l.active, 0);
  const totalAll = stats.reduce((s, l) => s + l.total, 0);

  return (
    <div className="bg-[#1e293b]/60 border border-white/[0.07] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">Network Diagram</span>
          <span
            className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
            style={{
              background: config.mode === "training" ? "#a855f720" : "#3bb4a420",
              color: config.mode === "training" ? "#a855f7" : "#3bb4a4",
              border: `1px solid ${config.mode === "training" ? "#a855f740" : "#3bb4a440"}`,
            }}
          >
            {config.mode === "training" ? "Training Mode" : "Inference Mode"}
          </span>
        </div>
        <span className="text-[11px] text-[#94a3b8]">
          Active:{" "}
          <span className="font-semibold text-white">
            {totalActive}/{totalAll}
          </span>{" "}
          neurons
        </span>
      </div>

      {/* SVG */}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${SVW} ${SVH}`} className="w-full min-w-[500px]">
          {/* Connections */}
          {connections.map((conn) => {
            const from = NEURON_POS[conn.from];
            const to = NEURON_POS[conn.to];
            if (!from || !to) return null;
            return (
              <line
                key={`${conn.from}-${conn.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={conn.visible ? "#3bb4a4" : "#334155"}
                strokeWidth={conn.visible ? 0.9 : 0.5}
                opacity={conn.visible ? 0.45 : 0.18}
                strokeDasharray={conn.visible ? undefined : "3,3"}
              />
            );
          })}

          {/* Neurons with AnimatePresence-style fade */}
          {LAYOUT.map((layer, li) =>
            layer.neurons.map((nLayout) => {
              const neuron = neuronMap[nLayout.id];
              if (!neuron) return null;
              const layerKey = LAYER_ORDER[li];
              const baseColor = getNeuronColor(layerKey as Neuron["layer"]);
              const nx = layer.x;
              const ny = nLayout.y;

              return (
                <g key={nLayout.id}>
                  {neuron.active ? (
                    <>
                      {/* Glow */}
                      <circle
                        cx={nx}
                        cy={ny}
                        r={18}
                        fill={baseColor}
                        opacity={0.12}
                      />
                      {/* Active neuron */}
                      <motion.circle
                        key={`${nLayout.id}-active`}
                        initial={{ opacity: 0, r: 4 }}
                        animate={{ opacity: 1, r: 11 }}
                        exit={{ opacity: 0, r: 4 }}
                        transition={{ duration: 0.3 }}
                        cx={nx}
                        cy={ny}
                        r={11}
                        fill={baseColor}
                        stroke="#0f172a"
                        strokeWidth={1.5}
                      />
                      {/* Value label for hidden/output neurons */}
                      {(layerKey === "hidden1" || layerKey === "hidden2" || layerKey === "output") && (
                        <text
                          x={nx}
                          y={ny + 3.5}
                          fill="#0f172a"
                          fontSize="7"
                          textAnchor="middle"
                          fontWeight="bold"
                        >
                          {neuron.value.toFixed(2)}
                        </text>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Dropped neuron: faded red with X */}
                      <motion.circle
                        key={`${nLayout.id}-dropped`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        cx={nx}
                        cy={ny}
                        r={11}
                        fill="#7f1d1d"
                        stroke="#ef4444"
                        strokeWidth={1.5}
                        strokeDasharray="3,2"
                        opacity={0.75}
                      />
                      <text
                        x={nx}
                        y={ny + 4}
                        fill="#ef4444"
                        fontSize="11"
                        textAnchor="middle"
                        fontWeight="bold"
                        opacity={0.9}
                      >
                        ✕
                      </text>
                    </>
                  )}
                </g>
              );
            })
          )}

          {/* Layer labels */}
          {LAYOUT.map((layer) => (
            <text
              key={`label-${layer.label}`}
              x={layer.x}
              y={SVH - 8}
              fill="#94a3b8"
              fontSize="9.5"
              textAnchor="middle"
            >
              {layer.label}
            </text>
          ))}

          {/* Per-hidden-layer drop badge */}
          {stats
            .filter((s) => s.layer === "hidden1" || s.layer === "hidden2")
            .map((s) => {
              const li = LAYER_ORDER.indexOf(s.layer as (typeof LAYER_ORDER)[number]);
              const x = LAYOUT[li].x;
              const dropped = s.total - s.active;
              return (
                <g key={`badge-${s.layer}`}>
                  <rect
                    x={x - 26}
                    y={6}
                    width={52}
                    height={18}
                    rx={4}
                    fill={dropped > 0 ? "#7f1d1d40" : "#14532d40"}
                    stroke={dropped > 0 ? "#ef444440" : "#22c55e40"}
                  />
                  <text
                    x={x}
                    y={18}
                    fill={dropped > 0 ? "#ef4444" : "#22c55e"}
                    fontSize="8.5"
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {dropped > 0 ? `Dropped: ${dropped}/${s.total}` : `All active`}
                  </text>
                </g>
              );
            })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-white/[0.07] text-[11px] text-[#94a3b8]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#3b82f6]" />
          <span>Input</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#3bb4a4]" />
          <span>Hidden</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[var(--color-accent)]" />
          <span>Output</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full border border-dashed border-[#ef4444]"
            style={{ background: "#7f1d1d" }}
          />
          <span>Dropped</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-4 h-0.5 bg-[#3bb4a4]" />
          <span>Active connection</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-0.5 border-t border-dashed border-[#334155]"
          />
          <span>Dropped connection</span>
        </div>
      </div>
    </div>
  );
}
