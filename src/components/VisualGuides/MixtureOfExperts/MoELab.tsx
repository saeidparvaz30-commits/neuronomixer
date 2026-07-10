"use client";

import React, { useMemo } from "react";
import {
  MoEParams,
  moeForward,
  gridRmse,
  targetFn,
  allEnabled,
  activeParamCount,
  activeFlopCount,
  totalParamCount,
  EXPERT_COLORS,
  NUM_EXPERTS,
  TOP_K,
} from "./moeMath";

type Props = {
  params: MoEParams;
  enabled: readonly boolean[];
  x1: number;
  x2: number;
  onInputChange: (x1: number, x2: number) => void;
  onToggleExpert: (index: number) => void;
  trained: boolean;
};

export default function MoELab({
  params,
  enabled,
  x1,
  x2,
  onInputChange,
  onToggleExpert,
  trained,
}: Props) {
  const fwd = useMemo(
    () => moeForward(params, [x1, x2], enabled),
    [params, x1, x2, enabled]
  );
  const target = targetFn(x1, x2);
  const enabledCount = enabled.filter(Boolean).length;
  const anyDisabled = enabledCount < NUM_EXPERTS;

  const rmseFull = useMemo(() => gridRmse(params, allEnabled()), [params]);
  const rmseCurrent = useMemo(
    () => (anyDisabled ? gridRmse(params, enabled) : null),
    [params, enabled, anyDisabled]
  );

  const activeK = Math.min(TOP_K, enabledCount);
  const activeParams = activeParamCount(activeK);
  const activeFlops = activeFlopCount(activeK);
  const gateOf = (i: number): number | null => {
    const k = fwd.top.indexOf(i);
    return k >= 0 ? fwd.gates[k] : null;
  };
  const maxProb = Math.max(...fwd.probs);

  return (
    <div>
      {/* Input controls + router distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[12px] font-semibold text-white mb-3">
            The input token: a point x = (x1, x2)
          </p>
          {(
            [
              ["x1", x1, (v: number) => onInputChange(v, x2)],
              ["x2", x2, (v: number) => onInputChange(x1, v)],
            ] as Array<[string, number, (v: number) => void]>
          ).map(([name, value, setter]) => (
            <div key={name} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor={`moe-${name}`}
                  className="text-[11px] font-semibold text-[#94a3b8]"
                >
                  {name}
                </label>
                <span className="text-[12px] font-mono font-bold text-[#f1f5f9]">
                  {value.toFixed(2)}
                </span>
              </div>
              <input
                id={`moe-${name}`}
                type="range"
                min={-1}
                max={1}
                step={0.05}
                value={value}
                onChange={(e) => setter(Number(e.target.value))}
                aria-label={`Input coordinate ${name}, from -1 to 1`}
                className="w-full accent-[#d4af37]"
              />
            </div>
          ))}
          <p className="text-[11px] text-[#475569] leading-relaxed">
            In a real transformer this would be a token&apos;s hidden vector
            (thousands of dimensions). Two dimensions keep every routing
            decision visible.
          </p>
        </div>

        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[12px] font-semibold text-white mb-3">
            Router distribution: softmax over the {NUM_EXPERTS} experts
          </p>
          <div className="flex flex-col gap-1.5">
            {fwd.probs.map((p, i) => {
              const gate = gateOf(i);
              const selected = gate !== null;
              return (
                <div
                  key={i}
                  className="grid grid-cols-[52px_1fr_150px] items-center gap-2"
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-3 h-3 rounded-sm"
                      style={{ background: EXPERT_COLORS[i] }}
                      aria-hidden="true"
                    />
                    <span
                      className={`text-[11px] font-mono ${enabled[i] ? "text-[#94a3b8]" : "text-[#475569] line-through"}`}
                    >
                      E{i + 1}
                    </span>
                  </span>
                  <div className="h-2.5 rounded-full bg-[#1e293b] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-200"
                      style={{
                        width: `${((100 * p) / maxProb).toFixed(2)}%`,
                        background: enabled[i] ? EXPERT_COLORS[i] : "#334155",
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-[#f1f5f9]">
                    {(100 * p).toFixed(1)}%
                    {selected && (
                      <span className="text-[var(--color-accent)] ml-1.5 font-semibold">
                        top-{TOP_K}, gate {gate.toFixed(2)}
                      </span>
                    )}
                    {!enabled[i] && (
                      <span className="text-[#ef4444] ml-1.5">off</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-[#475569] leading-relaxed mt-3">
            The router always scores all {NUM_EXPERTS} experts, but only the
            top-{TOP_K} enabled ones run. Their probabilities are renormalized
            into the gates that weight the mixture.
          </p>
        </div>
      </div>

      {/* Expert cards */}
      <p className="text-[12px] font-semibold text-white mb-2">
        The {NUM_EXPERTS} experts: identical tiny MLPs, different learned jobs
      </p>
      <div
        role="group"
        aria-label="Expert ablation toggles"
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
      >
        {fwd.expertOuts.map((out, i) => {
          const gate = gateOf(i);
          const selected = gate !== null;
          const lastEnabled = enabled[i] && enabledCount === 1;
          return (
            <div
              key={i}
              className="rounded-xl border p-3 transition-colors"
              style={{
                borderColor: selected ? EXPERT_COLORS[i] : "#1e293b",
                opacity: enabled[i] ? 1 : 0.55,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-3 h-3 rounded-sm"
                    style={{ background: EXPERT_COLORS[i] }}
                    aria-hidden="true"
                  />
                  <span className="text-[12px] font-bold text-[#f1f5f9]">
                    E{i + 1}
                  </span>
                  {selected && (
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                      active
                    </span>
                  )}
                </span>
                <button
                  onClick={() => onToggleExpert(i)}
                  aria-pressed={enabled[i]}
                  disabled={lastEnabled}
                  aria-label={`Expert ${i + 1} ${enabled[i] ? "enabled, press to disable" : "disabled, press to enable"}`}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                    lastEnabled
                      ? "border-[#1e293b] text-[#475569] cursor-not-allowed"
                      : enabled[i]
                        ? "border-[var(--color-success)]/60 text-[var(--color-success)]"
                        : "border-[#ef4444]/60 text-[#ef4444]"
                  }`}
                >
                  {enabled[i] ? "On" : "Off"}
                </button>
              </div>
              <p className="text-[10px] text-[#475569]">
                output e<sub>{i + 1}</sub>(x)
              </p>
              <p
                className={`text-[15px] font-mono font-bold ${selected ? "text-[#f1f5f9]" : "text-[#475569]"}`}
              >
                {out.toFixed(3)}
              </p>
              {selected && (
                <p className="text-[10px] font-mono text-[var(--color-accent)] mt-1">
                  contributes {gate.toFixed(2)} × {out.toFixed(3)} ={" "}
                  {(gate * out).toFixed(3)}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-[#475569] leading-relaxed mb-4">
        Every expert computes its output for display, but only the highlighted
        top-{TOP_K} contribute to the prediction (and, during training, only
        they receive gradient at this input). Turn an active expert Off to
        force the router onto its runners-up. The last enabled expert cannot
        be turned off.
      </p>

      {/* Output + degradation + live cost counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <div className="rounded-xl border border-[var(--color-accent)]/40 p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            MoE prediction ŷ
          </p>
          <p className="text-2xl font-black font-mono text-[var(--color-accent)]">
            {fwd.y.toFixed(3)}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            target f(x) = {target.toFixed(3)}, error{" "}
            {Math.abs(fwd.y - target).toFixed(3)}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Grid RMSE now
          </p>
          <p
            className={`text-2xl font-black font-mono ${
              rmseCurrent !== null && rmseCurrent > rmseFull * 1.05
                ? "text-[#ef4444]"
                : "text-[#f1f5f9]"
            }`}
          >
            {(rmseCurrent ?? rmseFull).toFixed(4)}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            {anyDisabled
              ? `vs ${rmseFull.toFixed(4)} with all ${NUM_EXPERTS} on`
              : `all ${NUM_EXPERTS} experts on`}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Active parameters
          </p>
          <p className="text-2xl font-black font-mono text-[#f1f5f9]">
            {activeParams}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            of {totalParamCount()} stored ({activeK} expert
            {activeK === 1 ? "" : "s"} + router)
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            FLOPs this forward
          </p>
          <p className="text-2xl font-black font-mono text-[#f1f5f9]">
            {activeFlops}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            linear layers only; tanh and softmax excluded
          </p>
        </div>
      </div>
      {anyDisabled && rmseCurrent !== null && (
        <p
          className="text-[11px] leading-relaxed"
          style={{
            color:
              rmseCurrent > rmseFull * 1.05 ? "#ef4444" : "var(--color-success)",
          }}
        >
          {rmseCurrent > rmseFull * 1.05
            ? `Ablation is hurting: grid RMSE rose from ${rmseFull.toFixed(4)} to ${rmseCurrent.toFixed(4)}. The surviving experts never trained on the disabled experts' regions.`
            : `The disabled experts carried little routing mass, so grid RMSE barely moved (${rmseFull.toFixed(4)} to ${rmseCurrent.toFixed(4)}).`}
        </p>
      )}
      {!trained && (
        <p className="text-[11px] text-[var(--color-warning)] leading-relaxed">
          The layer is untrained: predictions and routing are meaningless until
          you train it above.
        </p>
      )}
    </div>
  );
}
