"use client";

import React from "react";
import Link from "next/link";
import { Activation } from "./types";

interface Props {
  activation: Activation;
  weightScale: number;
  onApplyRelu: () => void;
  onApplyUnitScale: () => void;
}

function FixesPanelInner({
  activation,
  weightScale,
  onApplyRelu,
  onApplyUnitScale,
}: Props) {
  const reluActive = activation === "relu";
  const unitScaleActive = Math.abs(weightScale - 1.0) < 1e-9;

  return (
    <div className="space-y-4">
      {/* Interactive fixes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
          <p className="text-[12px] font-semibold text-[#ec4899] uppercase tracking-wide mb-2">
            Fix 1: Switch to ReLU
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            ReLU&apos;s derivative is exactly 1 everywhere the unit is active, so
            the activation contributes no shrinkage to the backward product.
            Rerun the exact same network with ReLU and watch the bars flatten
            toward a horizontal line.
          </p>
          <button
            onClick={onApplyRelu}
            disabled={reluActive}
            className={`px-4 py-2 rounded-xl text-[12px] font-semibold border transition-colors ${
              reluActive
                ? "border-[#1e293b] text-[#475569] cursor-default"
                : "border-[#ec4899]/50 text-[#ec4899] hover:bg-[#ec4899]/10"
            }`}
          >
            {reluActive ? "ReLU is active" : "Rerun with ReLU"}
          </button>
        </div>

        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
          <p className="text-[12px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-2">
            Fix 2: He / Xavier initialization
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            The weight scale slider above IS this fix. Xavier and He
            initialization choose the weight variance (1/n and 2/n for a layer
            with n inputs) precisely so each backward factor sits near 1. In
            this one unit per layer network, that corresponds to a scale near
            1.0: drag the slider back there and the product stops running away.
          </p>
          <button
            onClick={onApplyUnitScale}
            disabled={unitScaleActive}
            className={`px-4 py-2 rounded-xl text-[12px] font-semibold border transition-colors ${
              unitScaleActive
                ? "border-[#1e293b] text-[#475569] cursor-default"
                : "border-[#d4af37]/50 text-[var(--color-accent)] hover:bg-[#d4af37]/10"
            }`}
          >
            {unitScaleActive ? "Weight scale is 1.00x" : "Set weight scale to 1.0"}
          </button>
        </div>
      </div>

      {/* Prose fixes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
          <p className="text-[11px] font-semibold text-[#3bb4a4] uppercase tracking-wide mb-2">
            Batch normalization
          </p>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            Re-centers and re-scales each layer&apos;s activations every step, so
            pre-activations stay out of the saturated flat zones where
            derivatives collapse. See the{" "}
            <Link
              href="/visual-guides/batch-normalization"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              batch normalization guide
            </Link>{" "}
            for the full mechanics.
          </p>
        </div>

        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
          <p className="text-[11px] font-semibold text-[#a855f7] uppercase tracking-wide mb-2">
            Residual connections
          </p>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            A skip connection computes a + F(a), so the local derivative is
            1 + F&apos;(a). The gradient gets an identity highway: even if the
            transform branch shrinks it, the skip path carries it backwards
            unattenuated. This is what makes 100+ layer ResNets trainable.
          </p>
        </div>

        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
          <p className="text-[11px] font-semibold text-[var(--color-warning)] uppercase tracking-wide mb-2">
            Gradient clipping
          </p>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed mb-2">
            The blunt but effective fix for the exploding side: if the gradient
            norm exceeds a threshold, rescale it back down before the update.
          </p>
          <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] rounded-lg p-2.5 overflow-x-auto">
            g &#8592; g &#183; min(1, &#952; / &#8214;g&#8214;)
          </pre>
        </div>
      </div>
    </div>
  );
}

const FixesPanel = React.memo(FixesPanelInner);
export default FixesPanel;
