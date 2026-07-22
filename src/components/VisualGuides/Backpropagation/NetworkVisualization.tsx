"use client";

import React, { useState } from "react";
import { Step, FORWARD_DATA, FIXED_WEIGHTS_IH, FIXED_WEIGHTS_HO } from "./types";

// ── Layout constants ────────────────────────────────────────────────────────────
const SVW = 660;
const SVH = 440;

// Layer x positions
const LAYER_X = [80, 260, 440, 620];

// Neuron counts per layer
const N_INPUT = 4;
const N_HIDDEN = 5;
const N_OUTPUT = 3;

// Neuron radius
const R = 24;

// Compute y positions for a layer with N neurons, centered vertically
function layerY(n: number): number[] {
  const totalH = (n - 1) * 72 + 2 * R;
  const startY = (SVH - totalH) / 2 + R;
  return Array.from({ length: n }, (_, i) => startY + i * 72);
}

const INPUT_Y = layerY(N_INPUT);
const HIDDEN_Y = layerY(N_HIDDEN);
const OUTPUT_Y = layerY(N_OUTPUT);

// ── Phase colour helpers ────────────────────────────────────────────────────────
// forward pass: connections light up turquoise
// backward pass: connections light up red/orange
// update: neurons glow green

function getConnectionColor(phase: string, hasGrad: boolean): string {
  if (phase === "forward") return "#3bb4a4";
  if (phase === "loss") return "#94a3b8";
  if (phase === "backward" && hasGrad) return "#f87171";
  if (phase === "update" && hasGrad) return "#4ade80";
  return "#334155";
}

function getNeuronFill(
  layer: "input" | "hidden" | "output",
  index: number,
  step: Step,
  isHovered: boolean
): string {
  // Step 1: only input neurons lit
  if (step === 1) {
    if (layer === "input") return isHovered ? "#0e7490" : "#0f766e";
    return "#1e293b";
  }
  // Steps 2–3: forward through network
  if (step === 2) {
    if (layer === "input") return "#0f766e";
    if (layer === "hidden") return isHovered ? "#0e7490" : "#0f766e";
    return "#1e293b";
  }
  if (step === 3) {
    if (layer === "input") return "#0f766e";
    if (layer === "hidden") return "#0f766e";
    if (layer === "output") return isHovered ? "#0e7490" : "#0f766e";
  }
  // Step 4: loss – output highlighted amber
  if (step === 4) {
    if (layer === "output") return "#b45309";
    if (layer === "hidden") return "#0f766e";
    if (layer === "input") return "#0f766e";
  }
  // Steps 5–7: backward pass – red tint on backward-active layers
  if (step === 5) {
    if (layer === "output") return isHovered ? "#b91c1c" : "#991b1b";
    if (layer === "hidden") return "#1e293b";
    if (layer === "input") return "#1e293b";
  }
  if (step === 6) {
    if (layer === "output") return "#7f1d1d";
    if (layer === "hidden") return isHovered ? "#b91c1c" : "#991b1b";
    if (layer === "input") return "#1e293b";
  }
  if (step === 7) {
    if (layer === "output") return "#7f1d1d";
    if (layer === "hidden") return "#7f1d1d";
    if (layer === "input") return isHovered ? "#b91c1c" : "#991b1b";
  }
  // Step 8: weight update – green glow on all
  if (step === 8) {
    if (layer === "output") return "#166534";
    if (layer === "hidden") return "#166534";
    if (layer === "input") return "#166534";
  }
  return "#1e293b";
}

function getNeuronStroke(layer: "input" | "hidden" | "output", step: Step): string {
  if (step === 8) return "#4ade80";
  if (step >= 5 && step <= 7) {
    if (layer === "output" && step >= 5) return "#f87171";
    if (layer === "hidden" && step >= 6) return "#f87171";
    if (layer === "input" && step >= 7) return "#f87171";
  }
  if (step >= 1 && step <= 4) return "#3bb4a4";
  return "#475569";
}

function getConnectionOpacity(
  fromLayer: "ih" | "ho",
  step: Step
): { stroke: string; opacity: number; strokeWidth: number } {
  // ih = input→hidden, ho = hidden→output
  if (step === 1) {
    return { stroke: "#94a3b8", opacity: 0.08, strokeWidth: 0.8 };
  }
  if (step === 2) {
    if (fromLayer === "ih") return { stroke: "#3bb4a4", opacity: 0.45, strokeWidth: 1.0 };
    return { stroke: "#94a3b8", opacity: 0.06, strokeWidth: 0.6 };
  }
  if (step === 3) {
    if (fromLayer === "ih") return { stroke: "#3bb4a4", opacity: 0.25, strokeWidth: 0.8 };
    if (fromLayer === "ho") return { stroke: "#3bb4a4", opacity: 0.45, strokeWidth: 1.0 };
  }
  if (step === 4) {
    return { stroke: "var(--color-accent)", opacity: 0.3, strokeWidth: 0.8 };
  }
  if (step === 5) {
    if (fromLayer === "ho") return { stroke: "#f87171", opacity: 0.55, strokeWidth: 1.0 };
    return { stroke: "#94a3b8", opacity: 0.07, strokeWidth: 0.6 };
  }
  if (step === 6) {
    if (fromLayer === "ho") return { stroke: "#f87171", opacity: 0.45, strokeWidth: 1.0 };
    if (fromLayer === "ih") return { stroke: "#f87171", opacity: 0.5, strokeWidth: 1.0 };
  }
  if (step === 7) {
    return { stroke: "#f87171", opacity: 0.4, strokeWidth: 1.0 };
  }
  if (step === 8) {
    return { stroke: "#4ade80", opacity: 0.45, strokeWidth: 1.0 };
  }
  return { stroke: "#334155", opacity: 0.1, strokeWidth: 0.6 };
}

// ── Tooltip helpers ─────────────────────────────────────────────────────────────
type TooltipInfo = {
  x: number;
  y: number;
  label: string;
  value: string;
  sub?: string;
};

// ── Neuron display value ────────────────────────────────────────────────────────
function getNeuronDisplayValue(
  layer: "input" | "hidden" | "output",
  index: number,
  step: Step
): string | null {
  if (step === 1 && layer === "input") {
    return FORWARD_DATA.x[index].toFixed(2);
  }
  if (step >= 2 && layer === "input") {
    return FORWARD_DATA.x[index].toFixed(2);
  }
  if (step >= 2 && layer === "hidden") {
    if (step >= 5) {
      // Show gradient in backward steps
      const grad = FORWARD_DATA.dH[index];
      return grad.toFixed(2);
    }
    return FORWARD_DATA.aH[index].toFixed(2);
  }
  if (step >= 3 && layer === "output") {
    if (step >= 5) {
      const grad = FORWARD_DATA.dO[index];
      return grad.toFixed(2);
    }
    return FORWARD_DATA.aO[index].toFixed(2);
  }
  return null;
}

// ── Main Component ──────────────────────────────────────────────────────────────
interface Props {
  step: Step;
}

export default function NetworkVisualization({ step }: Props) {
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [hoveredNeuron, setHoveredNeuron] = useState<{ layer: "input" | "hidden" | "output"; index: number } | null>(null);

  const ihConn = getConnectionOpacity("ih", step);
  const hoConn = getConnectionOpacity("ho", step);

  function handleNeuronEnter(
    layer: "input" | "hidden" | "output",
    index: number,
    cx: number,
    cy: number
  ) {
    setHoveredNeuron({ layer, index });
    let label = "";
    let value = "";
    let sub: string | undefined;

    if (layer === "input") {
      label = `x${index + 1}`;
      value = FORWARD_DATA.x[index].toFixed(4);
    } else if (layer === "hidden") {
      label = `h${index + 1}`;
      if (step >= 5) {
        value = `∂L/∂z = ${FORWARD_DATA.dH[index].toFixed(4)}`;
        sub = `a = ${FORWARD_DATA.aH[index].toFixed(4)}`;
      } else {
        value = `a = ${FORWARD_DATA.aH[index].toFixed(4)}`;
        sub = `z = ${FORWARD_DATA.zH[index].toFixed(4)}`;
      }
    } else {
      label = `o${index + 1}`;
      if (step >= 5) {
        value = `∂L/∂o = ${FORWARD_DATA.dO[index].toFixed(4)}`;
        sub = `ŷ = ${FORWARD_DATA.aO[index].toFixed(4)}`;
      } else {
        value = `ŷ = ${FORWARD_DATA.aO[index].toFixed(4)}`;
        sub = `z = ${FORWARD_DATA.zO[index].toFixed(4)}`;
      }
    }
    setTooltip({ x: cx, y: cy, label, value, sub });
  }

  function handleNeuronLeave() {
    setHoveredNeuron(null);
    setTooltip(null);
  }

  const phaseLabel: Record<Step, string> = {
    1: "Forward Pass",
    2: "Forward Pass",
    3: "Forward Pass",
    4: "Loss",
    5: "Backward Pass",
    6: "Backward Pass",
    7: "Backward Pass",
    8: "Weight Update",
  };

  const phaseBadgeColor: Record<Step, string> = {
    1: "#3bb4a4",
    2: "#3bb4a4",
    3: "#3bb4a4",
    4: "#d4af37",
    5: "#f87171",
    6: "#f87171",
    7: "#f87171",
    8: "#4ade80",
  };

  return (
    <div className="relative bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1e293b] flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Network Diagram</span>
        <span
          className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{
            color: phaseBadgeColor[step],
            background: `${phaseBadgeColor[step]}20`,
            border: `1px solid ${phaseBadgeColor[step]}40`,
          }}
        >
          {phaseLabel[step]}
        </span>
      </div>

      {/* SVG */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVW} ${SVH}`}
          className="w-full min-w-[400px]"
          style={{ maxHeight: "440px" }}
          onMouseLeave={handleNeuronLeave}
        >
          {/* ── Input → Hidden connections ── */}
          {INPUT_Y.map((iy, ii) =>
            HIDDEN_Y.map((hy, hi) => {
              const w = FIXED_WEIGHTS_IH[hi][ii];
              const positiveWeight = w > 0;
              const base = getConnectionColor("forward", false);
              void base; void positiveWeight;
              return (
                <line
                  key={`ih-${ii}-${hi}`}
                  x1={LAYER_X[0]}
                  y1={iy}
                  x2={LAYER_X[1]}
                  y2={hy}
                  stroke={ihConn.stroke}
                  strokeWidth={ihConn.strokeWidth}
                  opacity={ihConn.opacity}
                />
              );
            })
          )}

          {/* ── Hidden → Output connections ── */}
          {HIDDEN_Y.map((hy, hi) =>
            OUTPUT_Y.map((oy, oi) => {
              return (
                <line
                  key={`ho-${hi}-${oi}`}
                  x1={LAYER_X[1]}
                  y1={hy}
                  x2={LAYER_X[2]}
                  y2={oy}
                  stroke={hoConn.stroke}
                  strokeWidth={hoConn.strokeWidth}
                  opacity={hoConn.opacity}
                />
              );
            })
          )}

          {/* ── Input neurons ── */}
          {INPUT_Y.map((cy, i) => {
            const isHov = hoveredNeuron?.layer === "input" && hoveredNeuron?.index === i;
            const fill = getNeuronFill("input", i, step, isHov);
            const stroke = getNeuronStroke("input", step);
            const displayVal = getNeuronDisplayValue("input", i, step);
            return (
              <g
                key={`in-${i}`}
                className="cursor-pointer"
                onMouseEnter={() => handleNeuronEnter("input", i, LAYER_X[0], cy)}
                onClick={() => handleNeuronEnter("input", i, LAYER_X[0], cy)}
              >
                {isHov && <circle cx={LAYER_X[0]} cy={cy} r={R + 6} fill={fill} opacity={0.2} />}
                <circle
                  cx={LAYER_X[0]}
                  cy={cy}
                  r={isHov ? R + 2 : R}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isHov ? 2 : 1.5}
                />
                {displayVal !== null ? (
                  <text
                    x={LAYER_X[0]}
                    y={cy + 6}
                    fill="white"
                    fontSize="17"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {displayVal}
                  </text>
                ) : (
                  <text x={LAYER_X[0]} y={cy + 6} fill="#94a3b8" fontSize="17" textAnchor="middle">
                    x{i + 1}
                  </text>
                )}
              </g>
            );
          })}

          {/* ── Hidden neurons ── */}
          {HIDDEN_Y.map((cy, i) => {
            const isHov = hoveredNeuron?.layer === "hidden" && hoveredNeuron?.index === i;
            const fill = getNeuronFill("hidden", i, step, isHov);
            const stroke = getNeuronStroke("hidden", step);
            const displayVal = step >= 2 ? getNeuronDisplayValue("hidden", i, step) : null;
            const isDead = FORWARD_DATA.aH[i] === 0;
            return (
              <g
                key={`h-${i}`}
                className="cursor-pointer"
                onMouseEnter={() => step >= 2 ? handleNeuronEnter("hidden", i, LAYER_X[1], cy) : undefined}
                onClick={() => step >= 2 ? handleNeuronEnter("hidden", i, LAYER_X[1], cy) : undefined}
              >
                {isHov && <circle cx={LAYER_X[1]} cy={cy} r={R + 6} fill={fill} opacity={0.2} />}
                <circle
                  cx={LAYER_X[1]}
                  cy={cy}
                  r={isHov ? R + 2 : R}
                  fill={fill}
                  stroke={step >= 2 ? stroke : "#334155"}
                  strokeWidth={isHov ? 2 : 1.5}
                  strokeDasharray={isDead && step >= 2 ? "3 2" : undefined}
                />
                {displayVal !== null ? (
                  <text
                    x={LAYER_X[1]}
                    y={cy + 6}
                    fill={isDead ? "#94a3b8" : "white"}
                    fontSize="17"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {displayVal}
                  </text>
                ) : (
                  <text x={LAYER_X[1]} y={cy + 6} fill="#475569" fontSize="17" textAnchor="middle">
                    h{i + 1}
                  </text>
                )}
                {/* Dead neuron indicator */}
                {isDead && step >= 2 && (
                  <text x={LAYER_X[1]} y={cy - R - 5} fill="#64748b" fontSize="17" textAnchor="middle">
                    dead
                  </text>
                )}
              </g>
            );
          })}

          {/* ── Output neurons ── */}
          {OUTPUT_Y.map((cy, i) => {
            const isHov = hoveredNeuron?.layer === "output" && hoveredNeuron?.index === i;
            const fill = getNeuronFill("output", i, step, isHov);
            const stroke = getNeuronStroke("output", step);
            const displayVal = step >= 3 ? getNeuronDisplayValue("output", i, step) : null;
            return (
              <g
                key={`out-${i}`}
                className="cursor-pointer"
                onMouseEnter={() => step >= 3 ? handleNeuronEnter("output", i, LAYER_X[2], cy) : undefined}
                onClick={() => step >= 3 ? handleNeuronEnter("output", i, LAYER_X[2], cy) : undefined}
              >
                {isHov && <circle cx={LAYER_X[2]} cy={cy} r={R + 6} fill={fill} opacity={0.2} />}
                <circle
                  cx={LAYER_X[2]}
                  cy={cy}
                  r={isHov ? R + 2 : R}
                  fill={fill}
                  stroke={step >= 3 ? stroke : "#334155"}
                  strokeWidth={isHov ? 2 : 1.5}
                />
                {displayVal !== null ? (
                  <text
                    x={LAYER_X[2]}
                    y={cy + 6}
                    fill="white"
                    fontSize="17"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {displayVal}
                  </text>
                ) : (
                  <text x={LAYER_X[2]} y={cy + 6} fill="#475569" fontSize="17" textAnchor="middle">
                    o{i + 1}
                  </text>
                )}
                {/* Target value label on step 4+ */}
                {step >= 4 && (
                  <text
                    x={LAYER_X[2] + R + 8}
                    y={cy + 6}
                    fill="var(--color-accent)"
                    fontSize="17"
                    fontWeight="600"
                  >
                    y={[1, 0, 0][i]}
                  </text>
                )}
              </g>
            );
          })}

          {/* ── Directional arrow for current phase ── */}
          {(step === 2 || step === 3) && (
            <g opacity={0.7}>
              <defs>
                <marker id="arrowFwd" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#3bb4a4" />
                </marker>
              </defs>
              <line
                x1={step === 2 ? LAYER_X[0] + R + 4 : LAYER_X[1] + R + 4}
                y1={SVH / 2}
                x2={step === 2 ? LAYER_X[1] - R - 4 : LAYER_X[2] - R - 4}
                y2={SVH / 2}
                stroke="#3bb4a4"
                strokeWidth="1.5"
                strokeDasharray="5 3"
                markerEnd="url(#arrowFwd)"
              />
            </g>
          )}
          {(step === 6 || step === 7) && (
            <g opacity={0.7}>
              <defs>
                <marker id="arrowBwd" markerWidth="8" markerHeight="8" refX="2" refY="3" orient="auto">
                  <path d="M6,0 L0,3 L6,6 Z" fill="#f87171" />
                </marker>
              </defs>
              <line
                x1={step === 6 ? LAYER_X[2] - R - 4 : LAYER_X[1] - R - 4}
                y1={SVH / 2}
                x2={step === 6 ? LAYER_X[1] + R + 4 : LAYER_X[0] + R + 4}
                y2={SVH / 2}
                stroke="#f87171"
                strokeWidth="1.5"
                strokeDasharray="5 3"
                markerEnd="url(#arrowBwd)"
              />
            </g>
          )}

          {/* ── Layer labels ── */}
          {[
            { x: LAYER_X[0], label: "Input", sub: "(4)" },
            { x: LAYER_X[1], label: "Hidden", sub: "(5, ReLU)" },
            { x: LAYER_X[2], label: "Output", sub: "(3, Softmax)" },
          ].map(({ x, label, sub }) => (
            <g key={label}>
              <text x={x} y={SVH - 26} fill="#94a3b8" fontSize="18" textAnchor="middle" fontWeight="600">
                {label}
              </text>
              <text x={x} y={SVH - 6} fill="#475569" fontSize="17" textAnchor="middle">
                {sub}
              </text>
            </g>
          ))}

          {/* ── Tooltip ── */}
          {tooltip && (() => {
            const tw = 180;
            const th = tooltip.sub ? 74 : 52;
            const tx = Math.min(Math.max(tooltip.x - tw / 2, 8), SVW - tw - 8);
            const ty = tooltip.y - R - th - 10;
            const clampedTy = ty < 8 ? tooltip.y + R + 10 : ty;
            return (
              <g>
                <rect
                  x={tx}
                  y={clampedTy}
                  width={tw}
                  height={th}
                  rx={6}
                  fill="#0f172a"
                  stroke="#334155"
                  strokeWidth="1"
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                />
                <text
                  x={tx + 8}
                  y={clampedTy + 20}
                  fill="var(--color-accent)"
                  fontSize="17"
                  fontWeight="700"
                >
                  {tooltip.label}
                </text>
                <text
                  x={tx + 8}
                  y={clampedTy + 44}
                  fill="white"
                  fontSize="17"
                >
                  {tooltip.value}
                </text>
                {tooltip.sub && (
                  <text
                    x={tx + 8}
                    y={clampedTy + 68}
                    fill="#94a3b8"
                    fontSize="17"
                  >
                    {tooltip.sub}
                  </text>
                )}
              </g>
            );
          })()}

          {/* ── Weight update legend on step 8 ── */}
          {step === 8 && (
            <g>
              <rect x={8} y={8} width={266} height={84} rx={6} fill="#0f172a" stroke="#4ade80" strokeWidth="1" opacity={0.9} />
              <text x={16} y={30} fill="#4ade80" fontSize="17" fontWeight="700">Weight Update Preview</text>
              <text x={16} y={54} fill="#94a3b8" fontSize="17">
                W_IH[0][0]: {FIXED_WEIGHTS_IH[0][0].toFixed(4)} → {FORWARD_DATA.newW_IH[0][0].toFixed(4)}
              </text>
              <text x={16} y={78} fill="#94a3b8" fontSize="17">
                W_HO[0][0]: {FIXED_WEIGHTS_HO[0][0].toFixed(4)} → {FORWARD_DATA.newW_HO[0][0].toFixed(4)}
              </text>
            </g>
          )}

          {/* ── Loss badge on step 4 ── */}
          {step === 4 && (
            <g>
              <rect x={SVW / 2 - 80} y={8} width={160} height={34} rx={8} fill="#b45309" opacity={0.9} />
              <text x={SVW / 2} y={31} fill="white" fontSize="18" fontWeight="700" textAnchor="middle">
                Loss = {FORWARD_DATA.loss.toFixed(4)}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="px-4 pb-3 flex flex-wrap gap-4 text-[11px] text-[#94a3b8]">
        {step <= 3 && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#0f766e] inline-block" />
            Active neuron
          </span>
        )}
        {step >= 5 && step <= 7 && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#991b1b] inline-block" />
            Gradient flowing
          </span>
        )}
        {step === 8 && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#166534] inline-block" />
            Weights updated
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-px border-t border-dashed border-[#64748b] inline-block" />
          Dead neuron (ReLU=0)
        </span>
        <span className="ml-auto text-[10px] text-[#475569]">Tap or hover neurons to inspect values</span>
      </div>
    </div>
  );
}
