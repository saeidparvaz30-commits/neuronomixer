"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { CNNLayer, LayerState } from "./types";

interface Props {
  layers: CNNLayer[];
  onChange: (layers: CNNLayer[]) => void;
}

function stateLabel(state: LayerState): string {
  if (state === "frozen") return "🔒 Frozen";
  if (state === "fine-tune") return "🔥 Fine-tuning";
  return "✨ New Layer";
}

function nextState(current: LayerState): LayerState {
  if (current === "frozen") return "fine-tune";
  if (current === "fine-tune") return "frozen";
  return "new";
}

function layerBg(state: LayerState): string {
  if (state === "frozen") return "bg-[#1e5d8a]/30 border border-[#1e5d8a]/50";
  if (state === "fine-tune") return "bg-[#d4af37]/10 border border-[#d4af37]/40";
  return "bg-[#a855f7]/15 border border-[#a855f7]/40";
}

function badgeBg(state: LayerState): string {
  if (state === "frozen") return "bg-[#1e5d8a]/40 text-[#93c5fd]";
  if (state === "fine-tune") return "bg-[#d4af37]/20 text-[var(--color-accent)]";
  return "bg-[#a855f7]/20 text-[#a855f7]";
}

function featureColor(state: LayerState): string {
  if (state === "frozen") return "text-[#475569]";
  if (state === "fine-tune") return "text-[#94a3b8]";
  return "text-[#3bb4a4]";
}

export default function LayerFreezer({ layers, onChange }: Props) {
  const totalParams = layers.reduce((s, l) => s + l.paramCount, 0);
  const frozenParams = layers
    .filter((l) => l.state === "frozen")
    .reduce((s, l) => s + l.paramCount, 0);
  const trainableParams = layers
    .filter((l) => l.state !== "frozen")
    .reduce((s, l) => s + l.paramCount, 0);

  const frozenPct = (frozenParams / totalParams) * 100;

  function handleClick(idx: number) {
    const layer = layers[idx];
    if (layer.depth === 6) return; // Classification Head always "new"
    const updated = layers.map((l, i) =>
      i === idx ? { ...l, state: nextState(l.state), trainable: nextState(l.state) !== "frozen" } : l
    );
    onChange(updated);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Layers — rendered top to bottom (depth 6 → 1 for visual "top = output") */}
      {[...layers].reverse().map((layer, revIdx) => {
        const idx = layers.length - 1 - revIdx;
        const isClickable = layer.depth < 6;
        return (
          <motion.div
            key={layer.id}
            layout
            onClick={() => handleClick(idx)}
            className={`relative flex items-center gap-3 rounded-xl px-4 py-3 transition-all select-none ${layerBg(layer.state)} ${isClickable ? "cursor-pointer hover:brightness-110" : "cursor-default"}`}
            whileHover={isClickable ? { scale: 1.01 } : {}}
            whileTap={isClickable ? { scale: 0.99 } : {}}
          >
            {/* Depth indicator bar on left */}
            <div
              className="w-1 rounded-full flex-shrink-0"
              style={{
                height: "40px",
                background:
                  layer.state === "frozen"
                    ? "#1e5d8a"
                    : layer.state === "fine-tune"
                    ? "var(--color-accent)"
                    : "#a855f7",
                opacity: 0.7,
              }}
            />

            {/* Layer info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-white truncate">{layer.name}</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={layer.state}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeBg(layer.state)}`}
                  >
                    {stateLabel(layer.state)}
                  </motion.span>
                </AnimatePresence>
              </div>
              <span className={`text-xs ${featureColor(layer.state)}`}>{layer.features}</span>
            </div>

            {/* Param count */}
            <div className="text-right flex-shrink-0">
              <div className="text-[11px] font-mono text-[#94a3b8]">
                {(layer.paramCount / 1000).toFixed(1)}K
              </div>
              <div className="text-[10px] text-[#475569]">params</div>
            </div>
          </motion.div>
        );
      })}

      {/* Stats */}
      <div className="mt-3 bg-[#0f172a]/60 border border-white/[0.06] rounded-xl p-4 flex flex-col gap-3">
        <div>
          <div className="flex items-center justify-between mb-1.5 text-xs text-[#94a3b8]">
            <span>Frozen parameters</span>
            <span className="font-mono">{(frozenParams / 1000).toFixed(0)}K / {(totalParams / 1000).toFixed(0)}K total</span>
          </div>
          <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[#1e5d8a]"
              animate={{ width: `${frozenPct}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#94a3b8]">Trainable parameters</span>
          <span className="font-mono font-semibold text-[var(--color-accent)]">
            {(trainableParams / 1000).toFixed(0)}K
          </span>
        </div>
        <p className="text-[11px] text-[#475569] italic">
          Click frozen / fine-tuning layers to toggle state. The Classification Head is always new.
        </p>
      </div>
    </div>
  );
}
