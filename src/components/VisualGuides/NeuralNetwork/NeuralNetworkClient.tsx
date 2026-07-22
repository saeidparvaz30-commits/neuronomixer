"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import { useGuideMotion } from "@/lib/guideMotion";

// ── Network architecture ────────────────────────────────────────────────────────
type ActivationId = "relu" | "sigmoid" | "tanh" | "linear";

const ACTIVATIONS: Record<ActivationId, { label: string; fn: (x: number) => number; desc: string }> = {
  relu: { label: "ReLU", fn: x => Math.max(0, x), desc: "max(0, x): most common in deep networks" },
  sigmoid: { label: "Sigmoid", fn: x => 1 / (1 + Math.exp(-x)), desc: "1/(1+e^-x): squashes to (0,1)" },
  tanh: { label: "Tanh", fn: x => Math.tanh(x), desc: "tanh(x): squashes to (-1,1)" },
  linear: { label: "Linear", fn: x => x, desc: "f(x) = x: no non-linearity" },
};

interface LayerConfig { neurons: number; activation: ActivationId }

const PRESETS: { label: string; layers: LayerConfig[] }[] = [
  { label: "Minimal (1 hidden)", layers: [{ neurons: 4, activation: "relu" }, { neurons: 2, activation: "sigmoid" }] },
  { label: "Standard (2 hidden)", layers: [{ neurons: 8, activation: "relu" }, { neurons: 4, activation: "relu" }, { neurons: 2, activation: "sigmoid" }] },
  { label: "Deep (3 hidden)", layers: [{ neurons: 8, activation: "relu" }, { neurons: 8, activation: "relu" }, { neurons: 4, activation: "relu" }, { neurons: 2, activation: "sigmoid" }] },
  { label: "Wide (1 big)", layers: [{ neurons: 16, activation: "relu" }, { neurons: 2, activation: "sigmoid" }] },
];

// ── Forward pass ──────────────────────────────────────────────────────────────
function forwardPass(input: number[], layers: LayerConfig[], weights: number[][][], biases: number[][]): number[][] {
  const activations: number[][] = [input];
  let prev = input;
  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    const W = weights[li];
    const b = biases[li];
    const actFn = ACTIVATIONS[layer.activation].fn;
    const next = Array.from({ length: layer.neurons }, (_, j) => {
      const z = prev.reduce((s, v, i) => s + v * W[j][i], 0) + b[j];
      return actFn(z);
    });
    activations.push(next);
    prev = next;
  }
  return activations;
}

// Initialize random weights
function initWeights(inputSize: number, layers: LayerConfig[]): { weights: number[][][]; biases: number[][] } {
  const weights: number[][][] = [];
  const biases: number[][] = [];
  let prevSize = inputSize;
  for (const layer of layers) {
    const W = Array.from({ length: layer.neurons }, () =>
      Array.from({ length: prevSize }, () => (Math.random() * 2 - 1) * 0.5)
    );
    const b = Array.from({ length: layer.neurons }, () => (Math.random() * 2 - 1) * 0.1);
    weights.push(W);
    biases.push(b);
    prevSize = layer.neurons;
  }
  return { weights, biases };
}

// ── SVG layout ─────────────────────────────────────────────────────────────────
const SVW = 700; const SVH = 560;
const INPUT_SIZE = 3; // 3 inputs: x1, x2, x3

function getLayerPositions(inputSize: number, layers: LayerConfig[]) {
  const allLayers = [{ neurons: inputSize, activation: "linear" as ActivationId }, ...layers];
  const nLayers = allLayers.length;
  const xStep = (SVW - 60) / (nLayers - 1);
  return allLayers.map((layer, li) => {
    const x = 30 + li * xStep;
    const nNeurons = Math.min(layer.neurons, 12); // cap visual neurons
    const yStep = nNeurons > 1 ? (SVH - 150) / (nNeurons - 1) : 0;
    return {
      x,
      neurons: Array.from({ length: nNeurons }, (_, ni) => ({
        y: nNeurons === 1 ? SVH / 2 : 40 + ni * yStep,
        actual: ni,
      })),
      label: li === 0 ? "Input" : li === nLayers - 1 ? "Output" : `Hidden ${li}`,
      activation: layer.activation,
      totalNeurons: layer.neurons,
    };
  });
}

// ── Activation curve SVG ───────────────────────────────────────────────────────
function ActivationCurve({ id }: { id: ActivationId }) {
  const fn = ACTIVATIONS[id].fn;
  const W = 120; const H = 60; const P = 10;
  const pts = Array.from({ length: 50 }, (_, i) => {
    const x = -3 + (i / 49) * 6;
    const y = fn(x);
    const sx = P + ((x + 3) / 6) * (W - 2 * P);
    const sy = H - P - ((Math.max(-1.2, Math.min(1.2, y)) + 1.2) / 2.4) * (H - 2 * P);
    return `${sx},${sy}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[120px]">
      <line x1={P} y1={H / 2} x2={W - P} y2={H / 2} stroke="#334155" strokeWidth="1" />
      <line x1={W / 2} y1={P} x2={W / 2} y2={H - P} stroke="#334155" strokeWidth="1" />
      <polyline points={pts} fill="none" stroke="var(--color-accent)" strokeWidth="2" />
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function NeuralNetworkClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const [layers, setLayers] = useState<LayerConfig[]>(PRESETS[1].layers);
  const [inputVals, setInputVals] = useState([0.7, 0.3, 0.5]);
  const [activationId, setActivationId] = useState<ActivationId>("relu");
  const [highlightedNeuron, setHighlightedNeuron] = useState<{ layer: number; neuron: number } | null>(null);
  const [presetsUsed, setPresetsUsed] = useState<Set<number>>(new Set([1]));
  const [inputChanges, setInputChanges] = useState(0);
  const [activationsSwapped, setActivationsSwapped] = useState<Set<ActivationId>>(new Set(["relu"]));
  const completionFired = useRef(false);

  const { weights, biases } = useMemo(() => initWeights(INPUT_SIZE, layers), [layers]);
  const activationValues = useMemo(() => forwardPass(inputVals, layers, weights, biases), [inputVals, layers, weights, biases]);

  const layerPositions = useMemo(() => getLayerPositions(INPUT_SIZE, layers), [layers]);

  function loadPreset(idx: number) {
    setLayers(PRESETS[idx].layers);
    setPresetsUsed(prev => new Set([...prev, idx]));
  }

  function swapActivation(id: ActivationId) {
    setActivationId(id);
    setActivationsSwapped(prev => new Set([...prev, id]));
    // Apply to all hidden layers
    setLayers(prev => prev.map((l, i) => i < prev.length - 1 ? { ...l, activation: id } : l));
  }

  // Completion: 2+ presets, 3+ input changes, 2+ activation functions
  const isComplete = presetsUsed.size >= 2 && inputChanges >= 3 && activationsSwapped.size >= 2;

  function handleReset() {
    setLayers(PRESETS[1].layers);
    setInputVals([0.7, 0.3, 0.5]);
    setActivationId("relu");
    setHighlightedNeuron(null);
    setPresetsUsed(new Set([1]));
    setInputChanges(0);
    setActivationsSwapped(new Set(["relu"]));
  }

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "neural-network", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  function getActivationColor(v: number): string {
    // 0 → dark blue, 1 → gold/teal
    const clamped = Math.max(0, Math.min(1, Math.abs(v)));
    const r = Math.round(30 + clamped * 179);
    const g = Math.round(100 + clamped * 80);
    const b = Math.round(180 - clamped * 60);
    return `rgb(${r},${g},${b})`;
  }

  const highlightedActivation = highlightedNeuron
    ? activationValues[highlightedNeuron.layer]?.[highlightedNeuron.neuron]
    : null;

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="neural-network" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">What Is a Neural Network?</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Deep Learning</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            What Is a <span className="text-[var(--color-accent)]">Neural Network</span>?
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            Build a neural network layer by layer. Change the architecture, swap activation functions,
            and watch how signals flow from input to output. Hover over neurons to inspect their activation values.
          </p>
        </section>

        {/* Progress */}
        <div className="mb-8 bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#94a3b8]">Exploration Progress</span>
            <span className="text-sm font-semibold text-white">
              {presetsUsed.size}/2 architectures · {Math.min(inputChanges, 3)}/3 input changes · {activationsSwapped.size}/2 activations
            </span>
          </div>
          <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#a855f7] to-[#3bb4a4] rounded-full"
              animate={{ width: `${(Math.min(presetsUsed.size, 2) / 2 * 34 + Math.min(inputChanges, 3) / 3 * 33 + Math.min(activationsSwapped.size, 2) / 2 * 33)}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          {isComplete && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-xs text-[var(--color-success)] font-semibold">
              Guide complete!
            </motion.div>
          )}
          {!session?.user && (
            <p className="mt-2 text-xs text-[#94a3b8]">
              <Link href="/auth/sign-in" className="text-[var(--color-accent)] hover:underline">Sign in</Link> to save your progress.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
          {/* Network diagram */}
          <div className="flex flex-col gap-4">
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-[#1e293b] flex items-center gap-3 text-xs text-[#94a3b8] flex-wrap">
                <span className="text-white font-semibold">Network Diagram</span>
                <span>hover neurons to inspect values</span>
                {highlightedNeuron && highlightedActivation !== null && (
                  <span className="ml-auto text-[var(--color-accent)] font-semibold">
                    activation = {highlightedActivation.toFixed(4)}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${SVW} ${SVH}`} className="w-full min-w-[500px]">
                  {/* Connections (draw behind neurons) */}
                  {layerPositions.slice(0, -1).map((fromLayer, li) =>
                    fromLayer.neurons.map((fromN) =>
                      layerPositions[li + 1].neurons.map((toN) => {
                        const fromAct = activationValues[li]?.[fromN.actual] ?? 0;
                        const weight = weights[li]?.[toN.actual]?.[fromN.actual] ?? 0;
                        const signalStrength = Math.abs(fromAct * weight);
                        const opacity = Math.min(0.6, 0.05 + signalStrength * 0.5);
                        const isHighlighted = highlightedNeuron && (
                          (highlightedNeuron.layer === li && highlightedNeuron.neuron === fromN.actual) ||
                          (highlightedNeuron.layer === li + 1 && highlightedNeuron.neuron === toN.actual)
                        );
                        return (
                          <line
                            key={`${li}-${fromN.actual}-${toN.actual}`}
                            x1={fromLayer.x} y1={fromN.y}
                            x2={layerPositions[li + 1].x} y2={toN.y}
                            stroke={weight > 0 ? "#3bb4a4" : "var(--color-accent)"}
                            strokeWidth={isHighlighted ? 2 : 0.8}
                            opacity={isHighlighted ? 0.9 : opacity}
                          />
                        );
                      })
                    )
                  )}

                  {/* Neurons */}
                  {layerPositions.map((layer, li) =>
                    layer.neurons.map((n) => {
                      const actVal = activationValues[li]?.[n.actual] ?? 0;
                      const isHovered = highlightedNeuron?.layer === li && highlightedNeuron?.neuron === n.actual;
                      return (
                        <g
                          key={`${li}-${n.actual}`}
                          onMouseEnter={() => setHighlightedNeuron({ layer: li, neuron: n.actual })}
                          onMouseLeave={() => setHighlightedNeuron(null)}
                          className="cursor-pointer"
                        >
                          {isHovered && (
                            <circle cx={layer.x} cy={n.y} r={16} fill={getActivationColor(actVal)} opacity={0.2} />
                          )}
                          <circle
                            cx={layer.x} cy={n.y} r={isHovered ? 12 : 9}
                            fill={getActivationColor(actVal)}
                            stroke={isHovered ? "white" : "#0f172a"}
                            strokeWidth={isHovered ? 2 : 1.5}
                          />
                          {isHovered && (
                            <text x={layer.x} y={n.y + 7} fill="white" fontSize="22" textAnchor="middle" fontWeight="bold">
                              {actVal.toFixed(2)}
                            </text>
                          )}
                        </g>
                      );
                    })
                  )}

                  {/* Layer labels + activation */}
                  {layerPositions.map((layer, li) => (
                    <g key={`label-${li}`}>
                      <text x={layer.x} y={SVH - 48} fill="#94a3b8" fontSize="24" textAnchor="middle">
                        {layer.label}
                      </text>
                      <text x={layer.x} y={SVH - 20} fill="#475569" fontSize="22" textAnchor="middle">
                        {layer.activation !== "linear" ? `[${ACTIVATIONS[layer.activation].label}]` : ""}
                      </text>
                      {layer.totalNeurons > 12 && (
                        <text x={layer.x} y={SVH - 76} fill="#475569" fontSize="22" textAnchor="middle">
                          ({layer.totalNeurons})
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* Input controls */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Input Values (x₁, x₂, x₃)</h3>
              <div className="flex flex-col gap-3">
                {inputVals.map((v, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-[#94a3b8] w-6">x{i + 1}</span>
                    <input
                      type="range" min="0" max="1" step="0.01" value={v}
                      aria-label={`Input x${i + 1}`}
                      onChange={e => {
                        const nv = [...inputVals];
                        nv[i] = parseFloat(e.target.value);
                        setInputVals(nv);
                        setInputChanges(p => p + 1);
                      }}
                      className="flex-1 accent-[#a855f7]"
                    />
                    <span className="text-xs font-mono text-[#a855f7] w-10 text-right">{v.toFixed(2)}</span>
                    <div className="w-6 h-6 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getActivationColor(v), border: "1px solid #334155" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4">
            {/* Architecture presets */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Architecture Presets</h3>
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Architecture presets">
                {PRESETS.map((preset, i) => (
                  <button key={i} onClick={() => loadPreset(i)}
                    role="radio" aria-checked={JSON.stringify(preset.layers) === JSON.stringify(layers)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium text-left border transition-all ${JSON.stringify(preset.layers) === JSON.stringify(layers) ? "bg-[#a855f7]/20 border-[#a855f7]/60 text-[#a855f7]" : "border-[#334155] text-[#94a3b8] hover:border-[#475569]"}`}
                  >
                    {preset.label}
                    <span className="ml-1 text-[10px] opacity-60">
                      [{INPUT_SIZE} → {preset.layers.map(l => l.neurons).join(" → ")}]
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Activation function */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Hidden Activation Function</h3>
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Hidden activation function">
                {(Object.entries(ACTIVATIONS) as [ActivationId, { label: string; desc: string }][]).map(([id, a]) => (
                  <button key={id} onClick={() => swapActivation(id)}
                    role="radio" aria-checked={activationId === id}
                    className={`px-3 py-2 rounded-lg text-xs font-medium text-left border transition-all ${activationId === id ? "bg-[var(--color-accent)]/20 border-[var(--color-accent)]/60 text-[var(--color-accent)]" : "border-[#334155] text-[#94a3b8] hover:border-[#475569]"}`}
                  >
                    <div className="font-semibold">{a.label}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{a.desc}</div>
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <ActivationCurve id={activationId} />
              </div>
            </div>

            {/* Output values */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Output Neurons</h3>
              {activationValues[activationValues.length - 1]?.map((v, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-[#94a3b8] w-16">Output {i + 1}</span>
                  <div className="flex-1 h-4 bg-[#0f172a] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: getActivationColor(v) }}
                      animate={{ width: `${Math.abs(v) * 100}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                  <span className="text-xs font-mono text-white w-12 text-right">{v.toFixed(3)}</span>
                </div>
              ))}
            </div>

            <div className="bg-[#1e293b]/60 border border-[var(--color-accent)]/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-2">Key Insight</h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Each neuron computes a <span className="text-white">weighted sum</span> of its inputs plus a bias,
                then passes it through an <span className="text-white">activation function</span>.
                Without non-linear activations, any deep network collapses to a single linear function.
              </p>
            </div>
          </div>
        </div>

        {/* Completion card */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              variants={card}
              initial="hidden"
              animate="visible"
              className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0f172a] overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-px bg-[var(--color-accent)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">
                    Guide Complete
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">Neural Networks Demystified!</h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You rebuilt the architecture, changed the inputs, and swapped activation functions to see how signals flow.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Architectures tried", value: `${Math.min(presetsUsed.size, PRESETS.length)} / ${PRESETS.length}`, color: "#a855f7" },
                    { label: "Input changes", value: `${Math.min(inputChanges, 99)}`, color: "#3bb4a4" },
                    { label: "Activations swapped", value: `${activationsSwapped.size} / 4`, color: "var(--color-accent)" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">{item.label}</p>
                      <p className="text-[14px] font-mono font-bold" style={{ color: item.color }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">Key Takeaway</p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;A neural network is just weighted sums passed through non-linear functions, stacked. The non-linearity is the magic: without it, any depth collapses to one linear layer.&quot;
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link href="/visual-guides"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
                  ← All Guides
                </Link>
                <div className="flex items-center gap-3">
                  <button onClick={handleReset}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
                    Try Again
                  </button>
                  <Link href="/visual-guides/activation-functions"
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
                    Next Guide →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer nav */}
        {!isComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link href="/visual-guides"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
              ← All Guides
            </Link>
            <Link href="/visual-guides/activation-functions"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
              Next Guide →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
