"use client";

import type { TrainingPhase } from "./types";

interface Props {
  isPlaying: boolean;
  currentEpoch: number;
  speed: 1 | 2;
  phase: TrainingPhase;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onSpeedChange: (s: 1 | 2) => void;
}

export default function TrainingControls({
  isPlaying,
  currentEpoch,
  speed,
  phase,
  onPlay,
  onPause,
  onReset,
  onSpeedChange,
}: Props) {
  const isDone = currentEpoch >= 30;

  return (
    <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl p-4">
      {/* Epoch counter + phase badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#94a3b8]">Epoch:</span>
          <span className="text-lg font-bold text-white tabular-nums">{currentEpoch}</span>
          <span className="text-sm text-[#475569]">/ 30</span>
        </div>

        {phase === "idle" && (
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#334155] text-[#94a3b8] font-semibold uppercase tracking-wide">
            Idle
          </span>
        )}
        {phase === "train-d" && (
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#1e5d8a]/30 border border-[#1e5d8a]/50 text-[#93c5fd] font-semibold uppercase tracking-wide">
            Training D
          </span>
        )}
        {phase === "train-g" && (
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#a855f7]/20 border border-[#a855f7]/40 text-[#a855f7] font-semibold uppercase tracking-wide">
            Training G
          </span>
        )}
      </div>

      {/* Epoch progress bar */}
      <div className="h-1.5 bg-[#0f172a] rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${(currentEpoch / 30) * 100}%`,
            background: "linear-gradient(90deg, #1e5d8a, #a855f7)",
          }}
        />
      </div>

      {/* Buttons row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Play / Pause */}
        {isPlaying ? (
          <button
            onClick={onPause}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e5d8a]/30 border border-[#1e5d8a]/50 text-[#93c5fd] text-sm font-semibold hover:bg-[#1e5d8a]/40 transition-colors"
          >
            <span>⏸</span>
            <span>Pause</span>
          </button>
        ) : (
          <button
            onClick={onPlay}
            disabled={isDone}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#a855f7]/20 border border-[#a855f7]/40 text-[#a855f7] text-sm font-semibold hover:bg-[#a855f7]/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>▶</span>
            <span>{isDone ? "Done" : "Start Training"}</span>
          </button>
        )}

        {/* Reset */}
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0f172a] border border-[#334155] text-[#94a3b8] text-sm font-semibold hover:border-[#475569] hover:text-white transition-colors"
        >
          <span>↺</span>
          <span>Reset</span>
        </button>

        {/* Speed selector */}
        <div className="ml-auto flex items-center gap-1" role="radiogroup" aria-label="Training speed">
          <span className="text-[10px] text-[#475569] mr-1">Speed:</span>
          {([1, 2] as const).map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              role="radio"
              aria-checked={speed === s}
              className={`w-8 h-7 rounded-lg text-xs font-bold transition-colors ${
                speed === s
                  ? "bg-[var(--color-accent)] text-[#0f172a]"
                  : "bg-[#0f172a] border border-[#334155] text-[#94a3b8] hover:border-[#475569]"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {isDone && (
        <p className="text-[10px] text-[#3bb4a4] mt-2 font-semibold text-center">
          Training complete! G and D have reached equilibrium.
        </p>
      )}
    </div>
  );
}
