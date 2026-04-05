"use client";

import { PoolingConfig } from "./types";
import { getOutputSize } from "./poolingLogic";

type Props = {
  config: PoolingConfig;
  onKernelChange: (k: 2 | 3) => void;
  onStrideChange: (s: 1 | 2) => void;
  inputSize?: number;
};

export default function PoolingControls({
  config,
  onKernelChange,
  onStrideChange,
  inputSize = 8,
}: Props) {
  const outputSize = getOutputSize(inputSize, config.kernelSize, config.stride);
  const formula = `⌊(${inputSize} − ${config.kernelSize}) / ${config.stride}⌋ + 1 = ${outputSize}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Kernel Size row */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-[13px] font-semibold text-[#94a3b8] w-24 flex-shrink-0">
          Kernel Size
        </span>
        <div className="flex gap-2">
          {([2, 3] as const).map((k) => (
            <button
              key={k}
              onClick={() => onKernelChange(k)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all"
              style={{
                borderColor:
                  config.kernelSize === k ? "#3bb4a4" : "rgba(255,255,255,0.1)",
                color: config.kernelSize === k ? "#3bb4a4" : "#94a3b8",
                background:
                  config.kernelSize === k ? "rgba(59,180,164,0.12)" : "transparent",
              }}
            >
              {k}&times;{k}
            </button>
          ))}
        </div>
      </div>

      {/* Stride row */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-[13px] font-semibold text-[#94a3b8] w-24 flex-shrink-0">
          Stride
        </span>
        <div className="flex gap-2">
          {([1, 2] as const).map((s) => (
            <button
              key={s}
              onClick={() => onStrideChange(s)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all"
              style={{
                borderColor:
                  config.stride === s ? "#3bb4a4" : "rgba(255,255,255,0.1)",
                color: config.stride === s ? "#3bb4a4" : "#94a3b8",
                background:
                  config.stride === s ? "rgba(59,180,164,0.12)" : "transparent",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Output size formula */}
      <div className="rounded-lg bg-[#0f172a] border border-white/[0.06] px-4 py-2.5 flex items-center flex-wrap gap-2">
        <span className="text-[12px] text-[#475569] font-medium">Output size:</span>
        <span className="text-[13px] font-mono text-white">{formula}</span>
        <span className="text-[12px] text-[#475569]">
          ({inputSize}&times;{inputSize} input &rarr; {outputSize}&times;{outputSize} output)
        </span>
      </div>
    </div>
  );
}
